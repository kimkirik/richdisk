from pathlib import Path
import json
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
import server
from private_access import PrivateAccess

HEADERS = {"X-Drumscore-Client": "studio-v1"}


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.directory_patch = patch.object(server, "JOBS_DIR", Path(self.temp.name))
        self.directory_patch.start()
        server.jobs.clear()
        self.client = TestClient(server.app)

    def tearDown(self):
        self.client.close()
        self.directory_patch.stop()
        self.temp.cleanup()

    def test_health_and_private_engine_paths(self):
        self.assertEqual(self.client.get("/api/health").json()["protocolVersion"], 1)
        self.assertEqual(self.client.get("/").status_code, 200)
        self.assertEqual(self.client.get("/").headers["cache-control"], "no-cache")
        self.assertEqual(self.client.get("/app.js?v=test").headers["cache-control"], "no-cache")
        self.assertEqual(self.client.get("/timing.js").status_code, 200)
        self.assertEqual(self.client.get("/workspace-store.js").status_code, 200)
        self.assertEqual(self.client.get("/engine/server.py").status_code, 404)
        self.assertEqual(self.client.get("/.jobs").status_code, 404)

    def test_cross_origin_and_upload_limits(self):
        self.assertEqual(self.client.post("/api/jobs").status_code, 403)
        self.assertEqual(self.client.get("/api/health", headers={"Origin": "https://untrusted.example"}).status_code, 403)
        self.assertEqual(self.client.post("/api/jobs", headers={**HEADERS, "Content-Length": str(server.MAX_BYTES + 2000000)}).status_code, 413)
        response = self.client.options("/api/jobs", headers={"Origin": "http://localhost:8765",
            "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "x-drumscore-client"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:8765")

    def test_private_proxy_rejects_missing_or_different_owner(self):
        access = PrivateAccess("https://mac.example.ts.net", "mac.example.ts.net", "owner@example.com")
        with patch.object(server, "PRIVATE_ACCESS", access):
            proxy = {"X-Forwarded-For": "100.64.0.2"}
            self.assertEqual(self.client.get("/", headers=proxy).status_code, 403)
            self.assertEqual(self.client.get("/api/health", headers={**proxy,
                "Tailscale-User-Login": "other@example.com"}).status_code, 403)
            owner = {**proxy, "Tailscale-User-Login": "owner@example.com"}
            self.assertEqual(self.client.get("/", headers=owner).status_code, 200)
            response = self.client.get("/api/health", headers=owner)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["cache-control"], "no-store")
            self.assertEqual(response.headers["x-frame-options"], "DENY")
            self.assertEqual(self.client.post("/api/jobs", headers=owner).status_code, 403)
            self.assertEqual(self.client.get("/engine/.private-access.json", headers=owner).status_code, 404)

    def test_invalid_parameters_and_empty_input(self):
        self.assertEqual(self.client.post("/api/jobs", headers=HEADERS, data={"client_id": "../escape"},
            files={"file": ("a.wav", b"x")}).status_code, 422)
        self.assertEqual(self.client.post("/api/jobs", headers=HEADERS, data={"bpm": 900}, files={"file": ("a.wav", b"x")}).status_code, 422)
        self.assertEqual(self.client.post("/api/jobs", headers=HEADERS, files={"file": ("empty.wav", b"")}).status_code, 400)

    def test_repeated_upload_with_same_id_queues_inference_once(self):
        identifier = "a" * 32
        with patch.object(server.pool, "submit") as submit:
            for _ in range(2):
                response = self.client.post("/api/jobs", headers=HEADERS,
                    data={"client_id": identifier, "title": "내 음악", "input_is_drums": "true"},
                    files={"file": ("a.wav", b"audio")})
                self.assertEqual(response.status_code, 202)
                self.assertEqual(response.json()["id"], identifier)
            submit.assert_called_once()
            latest = self.client.get("/api/jobs/latest").json()["job"]
            self.assertEqual(latest["id"], identifier)
            self.assertEqual(latest["title"], "내 음악")
            self.assertTrue(latest["options"]["inputIsDrums"])

    def test_completed_result_and_metadata_survive_restart(self):
        identifier = "b" * 32
        directory = Path(self.temp.name) / identifier
        directory.mkdir()
        job = server.Job(identifier, directory, state="completed", title="저장한 곡")
        server.persist_job(job)
        result = {"schemaVersion": 1, "events": []}
        (directory / "result.json").write_text(json.dumps(result))
        server.jobs.clear()
        restored = self.client.get(f"/api/jobs/{identifier}").json()
        self.assertEqual(restored["state"], "completed")
        self.assertEqual(restored["title"], "저장한 곡")
        self.assertEqual(restored["result"], result)

    def test_interrupted_server_job_is_not_silently_restarted(self):
        identifier = "c" * 32
        directory = Path(self.temp.name) / identifier
        directory.mkdir()
        server.persist_job(server.Job(identifier, directory, state="running"))
        with patch.object(server.pool, "submit") as submit:
            restored = self.client.get(f"/api/jobs/{identifier}").json()
            self.assertEqual(restored["state"], "failed")
            self.assertIn("다시 시작", restored["error"])
            submit.assert_not_called()

    def test_old_version_result_recovers_without_manifest(self):
        identifier = "d" * 32
        directory = Path(self.temp.name) / identifier
        directory.mkdir()
        (directory / "result.json").write_text('{"schemaVersion": 1}')
        self.assertEqual(self.client.get("/api/jobs/latest").json()["job"]["id"], identifier)

    def test_upload_error_status_and_input_cleanup(self):
        with patch.object(server.engine, "run", side_effect=ValueError("invalid audio")):
            response = self.client.post("/api/jobs", headers=HEADERS, files={"file": ("../../outside", b"invalid")})
            self.assertEqual(response.status_code, 202)
            identifier = response.json()["id"]
            for _ in range(100):
                job = self.client.get(f"/api/jobs/{identifier}").json()
                if job["state"] == "failed":
                    break
                time.sleep(.01)
            self.assertEqual(job["state"], "failed")
            # Wait for the finally block, not just the terminal state assignment.
            server.pool.submit(lambda: None).result(timeout=5)
            self.assertFalse((Path(self.temp.name) / identifier / "input.audio").exists())
            self.assertEqual(self.client.get(f"/api/jobs/{identifier}/files/drums.wav").status_code, 404)


if __name__ == "__main__":
    unittest.main()
