import re
from pathlib import Path

from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_security_headers():
    """Verify security headers are injected in all responses."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.headers.get("x-frame-options") == "DENY"
    assert resp.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert resp.headers.get("x-xss-protection") == "1; mode=block"

def test_path_traversal_protection():
    """Verify directory traversal attempts are blocked with 403 or 404."""
    traversal_paths = [
        "/../../etc/passwd",
        "/..%2f..%2fetc%2fpasswd",
        "/....//....//windows/win.ini",
        "/assets/../../secret.txt",
        "/assets/..\\..\\windows\\system32",
    ]
    for path in traversal_paths:
        resp = client.get(path)
        assert resp.status_code in (403, 404), f"Path traversal not blocked for {path}: status {resp.status_code}"

def test_input_validation_negative_seed():
    """Verify negative seed is rejected with 422."""
    resp = client.post("/api/simulations", json={"seed": -5})
    assert resp.status_code == 422

def test_input_validation_overflow_seed():
    """Verify oversized seed is rejected with 422."""
    resp = client.post("/api/simulations", json={"seed": 10_000_000_000})
    assert resp.status_code == 422

def test_input_validation_invalid_dispatcher_type():
    """Verify non-existent dispatcher type is rejected with 422."""
    resp = client.post("/api/simulations", json={"dispatcher_type": "quantum_neural_optimizer"})
    assert resp.status_code == 422

def test_input_validation_bounds():
    """Verify vehicle and incident counts outside bounds are rejected with 422."""
    # num_vehicles > 100
    resp1 = client.post("/api/simulations", json={"experimental_mode": True, "num_vehicles": 150})
    assert resp1.status_code == 422

    # num_vehicles < 1
    resp2 = client.post("/api/simulations", json={"experimental_mode": True, "num_vehicles": 0})
    assert resp2.status_code == 422

    # num_incidents > 500
    resp3 = client.post("/api/simulations", json={"experimental_mode": True, "num_incidents": 999})
    assert resp3.status_code == 422

def test_payload_size_limit():
    """Verify oversized request payloads (>1MB) are rejected with 413."""
    oversized_headers = {"Content-Length": "2000000"}  # 2MB header
    resp = client.post("/api/simulations", json={"seed": 1}, headers=oversized_headers)
    assert resp.status_code == 413
    assert "Payload too large" in resp.json()["detail"]

def test_error_sanitization():
    """Verify unhandled error response is sanitized and contains no stack traces."""
    resp = client.get("/api/simulations/invalid--uuid??!")
    assert resp.status_code in (404, 422)
    # Ensure no python traceback keywords
    body = resp.text
    assert "Traceback (most recent call last)" not in body
    assert "File \"" not in body

def test_no_eval_or_exec_in_codebase():
    """Verify AST / source scan shows no eval, exec, or os.system in backend/app."""
    app_dir = Path(__file__).parent.parent / "app"
    dangerous_patterns = [
        re.compile(r"\beval\s*\("),
        re.compile(r"\bexec\s*\("),
        re.compile(r"\bos\.system\s*\("),
        re.compile(r"\bsubprocess\.Popen\s*\("),
    ]
    for py_file in app_dir.rglob("*.py"):
        content = py_file.read_text(encoding="utf-8")
        for pat in dangerous_patterns:
            assert not pat.search(content), f"Dangerous pattern {pat.pattern} found in {py_file}!"
