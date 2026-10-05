"""Isolated browser lifecycle fixture; does NOT evaluate transcription accuracy.

Run manually on loopback 8767. Temporary jobs never touch the owner's real jobs.
"""
from pathlib import Path
import shutil
import sys
import tempfile
import time
import wave

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
import uvicorn


def simulate(source, directory, *, progress, cancel, **options):
    with wave.open(str(source)) as audio:
        duration = audio.getnframes() / audio.getframerate()
    for step in range(1, 21):
        if cancel.is_set():
            raise server.Cancelled()
        progress(step * 4, "창 복구 테스트용 처리 중 (모델 정확도 테스트 아님)")
        time.sleep(1)
    shutil.copyfile(source, directory / "drums.wav")
    return {"schemaVersion": 1, "duration": duration, "bpm": 120,
            "events": [{"instrument": "kick", "time": .5, "velocity": 90, "confidence": .9}],
            "beatTimes": [.5 * i for i in range(1, int(duration * 2))], "warnings": []}


if __name__ == "__main__":
    with tempfile.TemporaryDirectory(prefix="drum-resume-test-") as directory:
        server.JOBS_DIR = Path(directory)
        server.ORIGINS.append("http://127.0.0.1:8767")
        server.engine.run = simulate
        uvicorn.run(server.app, host="127.0.0.1", port=8767, proxy_headers=False)
