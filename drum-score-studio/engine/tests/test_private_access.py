from pathlib import Path
import json
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from private_access import PrivateAccess, allowed_client, load_private_access


class PrivateAccessTests(unittest.TestCase):
    def test_config_validation_and_no_implicit_access(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "config.json"
            self.assertEqual(load_private_access(path), PrivateAccess())
            for origin in ("http://mac.example.ts.net", "https://evil.example",
                           "https://mac.example.ts.net.evil.example", "https://mac.example.ts.net/path",
                           "https://user@mac.example.ts.net", "https://mac.example.ts.net:8443"):
                path.write_text(json.dumps({"origin": origin, "login": "owner@example.com"}))
                with self.assertRaises(ValueError):
                    load_private_access(path)
            path.write_text(json.dumps({"origin": "https://mac.example.ts.net/", "login": "Owner@example.com"}))
            self.assertEqual(load_private_access(path),
                             PrivateAccess("https://mac.example.ts.net", "mac.example.ts.net", "owner@example.com"))

    def test_identity_is_required_for_all_forwarded_traffic(self):
        access = PrivateAccess("https://mac.example.ts.net", "mac.example.ts.net", "owner@example.com")
        self.assertTrue(allowed_client(access, "127.0.0.1", "localhost", {}))
        self.assertFalse(allowed_client(access, "127.0.0.1", access.hostname, {}))
        self.assertFalse(allowed_client(access, "127.0.0.1", "localhost", {"x-forwarded-for": "100.64.0.2"}))
        self.assertFalse(allowed_client(access, "127.0.0.1", access.hostname, {"tailscale-user-login": "other@example.com"}))
        identity = {"tailscale-user-login": "owner@example.com"}
        self.assertTrue(allowed_client(access, "127.0.0.1", access.hostname, identity))
        # Spoofing identity directly from the LAN/tailnet cannot bypass auth.
        self.assertFalse(allowed_client(access, "100.64.0.2", access.hostname, identity))
        self.assertFalse(allowed_client(PrivateAccess(), "127.0.0.1", access.hostname, identity))


if __name__ == "__main__":
    unittest.main()
