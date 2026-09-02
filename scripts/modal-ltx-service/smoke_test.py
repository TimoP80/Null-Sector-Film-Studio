"""Safe authenticated smoke test for the deployed Modal LTX service."""
from __future__ import annotations

import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.request

BASE_URL = os.environ.get(
    "MODAL_LTX_ENDPOINT",
    "https://timop80--nullsector-ltx-http-api.modal.run",
).rstrip("/")


def safe_error(exc: Exception) -> str:
    text = str(exc)
    token = os.environ.get("MODAL_LTX_TOKEN", "")
    return text.replace(token, "[REDACTED]") if token else text


def request(path: str, token: str, method: str = "GET", body: dict | None = None):
    headers = {"Authorization": f"Bearer {token}"}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    req = urllib.request.Request(f"{BASE_URL}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            raw = response.read()
            content_type = response.headers.get("content-type", "")
            return response.status, json.loads(raw) if "json" in content_type else raw
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"error": {"code": f"HTTP_{exc.code}"}}
        return exc.code, payload


def main() -> int:
    token = os.environ.get("MODAL_LTX_TOKEN")
    if not token:
        print("Missing MODAL_LTX_TOKEN. Set it only in the current PowerShell session.")
        return 2

    status, payload = request("/v1/jobs/no-such-job", token)
    print(f"Protected API check: HTTP {status}")
    if status != 404:
        print("Expected authenticated request to reach the protected route.")
        return 1

    job_request = {
        "type": "t2v",
        "prompt": "A cinematic post-apocalyptic landscape, abandoned industrial structures, dust drifting through the air, dramatic atmospheric lighting, realistic film look",
        "negativePrompt": "blurry, distorted, low quality, text, watermark",
        "resolution": "864x480",
        "frames": 25,
        "fps": 24,
        "duration": 1.041667,
        "steps": 25,
        "cfg": 3,
        "seed": 42,
        "outputFormat": "mp4",
    }
    key = f"nullsector-smoke-{secrets.token_urlsafe(12)}"
    req = urllib.request.Request(
        f"{BASE_URL}/v1/jobs",
        data=json.dumps(job_request).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Idempotency-Key": key,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read())
            print(f"POST /v1/jobs: HTTP {response.status}")
    except urllib.error.HTTPError as exc:
        try:
            result = json.loads(exc.read())
        except Exception:
            result = {}
        print(f"POST /v1/jobs: HTTP {exc.code}")
        print(f"Error: {safe_error(Exception(result.get('error', {}).get('message', 'request failed')))}")
        return 1
    except Exception as exc:
        print(f"POST /v1/jobs: request failed ({safe_error(exc)})")
        return 1

    job_id = result.get("id") or result.get("providerJobId")
    if not job_id:
        print("No job ID returned.")
        return 1
    print(f"Job ID: {job_id}")
    print(f"Status: {result.get('status', 'unknown')}")

    while True:
        status, current = request(f"/v1/jobs/{job_id}", token)
        print(f"GET job: HTTP {status}, status={current.get('status', 'unknown')}")
        if current.get("status") in {"completed", "failed", "cancelled"}:
            if current.get("status") != "completed":
                print(f"Error: {safe_error(Exception(current.get('error', {}).get('message', 'job failed')))}")
                return 1
            break
        time.sleep(5)

    status, result_data = request(f"/v1/jobs/{job_id}/result", token)
    print(f"GET result: HTTP {status}, bytes={len(result_data) if isinstance(result_data, bytes) else 'json'}")
    return 0 if status == 200 else 1


if __name__ == "__main__":
    sys.exit(main())
