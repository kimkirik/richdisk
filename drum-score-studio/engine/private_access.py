"""Owner-only Tailscale Serve access; the engine must stay on loopback."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit


@dataclass(frozen=True)
class PrivateAccess:
    origin: str = ""
    hostname: str = ""
    login: str = ""


def load_private_access(path: Path) -> PrivateAccess:
    if not path.exists():
        return PrivateAccess()
    data = json.loads(path.read_text(encoding="utf-8"))
    origin, login = data.get("origin", ""), data.get("login", "")
    parsed = urlsplit(origin)
    if (parsed.scheme != "https" or not parsed.hostname or
            not parsed.hostname.endswith(".ts.net") or parsed.port not in (None, 443) or
            parsed.username or parsed.password or parsed.path not in ("", "/") or
            parsed.query or parsed.fragment or not isinstance(login, str) or not login.strip()):
        raise ValueError("개인 연결 설정에는 정확한 Tailscale HTTPS 주소와 소유자 계정이 필요합니다.")
    return PrivateAccess(f"https://{parsed.hostname}", parsed.hostname, login.strip().casefold())


def allowed_client(access: PrivateAccess, peer: str, hostname: str, headers) -> bool:
    # Uvicorn --no-proxy-headers preserves the actual socket peer. Never trust
    # identity headers on a listener reachable from the LAN or the internet.
    if peer not in ("127.0.0.1", "::1", "testclient"):
        return False
    forwarded = any(name in headers for name in (
        "forwarded", "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto",
        "tailscale-user-login", "tailscale-user-name"))
    remote = forwarded or hostname not in ("127.0.0.1", "localhost", "testserver")
    if remote:
        # Serve strips spoofed headers and inserts authenticated identity;
        # Funnel and tagged devices have no user identity and fail closed.
        return bool(access.login and headers.get("tailscale-user-login", "").casefold() == access.login)
    return True
