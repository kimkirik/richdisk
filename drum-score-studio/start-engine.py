"""Install an isolated environment once, start the engine, and open the app."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
import time
import urllib.request
import venv
import webbrowser

ROOT = Path(__file__).resolve().parent
URL = "http://127.0.0.1:8765"


def running():
    try:
        with urllib.request.urlopen(URL + "/api/health", timeout=2) as response:
            return json.load(response).get("service") == "drum-score-engine"
    except Exception:
        return False


def main():
    if running():
        if "--no-browser" not in sys.argv:
            webbrowser.open(URL)
        return
    if not (3, 10) <= sys.version_info[:2] <= (3, 12):
        raise SystemExit("Python 3.10~3.12가 필요합니다. Python 3.12 설치 후 다시 실행해 주세요.")
    environment = ROOT / "engine" / ".venv"
    python = environment / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    requirements = ROOT / "engine" / "requirements.txt"
    digest = hashlib.sha256(requirements.read_bytes()).hexdigest()
    marker = environment / ".requirements.sha256"
    if not python.exists():
        print("드럼스코어 전용 Python 환경을 만들고 있습니다…", flush=True)
        venv.create(environment, with_pip=True)
    if not marker.exists() or marker.read_text() != digest:
        print("AI 엔진을 설치합니다. 처음 한 번은 다운로드에 수분이 걸릴 수 있습니다.", flush=True)
        subprocess.run([str(python), "-m", "pip", "install", "-r", str(requirements)], check=True)
        marker.write_text(digest)

    def open_when_ready():
        for _ in range(90):
            if running():
                webbrowser.open(URL)
                return
            time.sleep(1)

    if "--no-browser" not in sys.argv:
        threading.Thread(target=open_when_ready, daemon=True).start()
    print(f"드럼스코어: {URL}\n이 창을 열어 두세요. 종료하려면 Ctrl+C를 누르세요.", flush=True)
    try:
        subprocess.run([str(python), "-m", "uvicorn", "server:app", "--host", "127.0.0.1", "--port", "8765", "--no-proxy-headers"],
                       cwd=ROOT / "engine", check=True)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
