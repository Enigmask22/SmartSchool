"""
Locust Performance Test: TS-SUB02EXT2-06 — OCR Queue Load Test
===============================================================

Scenario (appendix-C TS-SUB02EXT2-06):
  Giả lập 5 GV cùng nhấn "Nhập từ ảnh" đồng thời.
  Pass condition: Hệ thống đưa tác vụ vào Hàng đợi (Async Queue).
                 GV không bị treo trình duyệt — tất cả nhận HTTP 200 (queued).
                 Không ai nhận 503 Service Unavailable.

The OCR endpoint is async: it accepts the image, enqueues the AI job, and
returns immediately with {request_id, status: "queued"}.
This test verifies the queue handles concurrent submissions without 503.

Note: The AI processing itself is NOT tested here. We only verify the enqueue step.

Run:
    cd backend
    locust -f tests/locustfiles/TS-SUB02EXT2-06-ocr-queue-load.py \
           --host http://localhost:8000 \
           --users 5 --spawn-rate 1 \
           --run-time 60s --headless \
           --html reports/TS-SUB02EXT2-06-report.html

Pass criteria:
  - 0% failure rate (all requests get 200, never 503)
  - p95 < 2s (fast enqueue, no AI processing delay)
"""

import io
import base64
from locust import HttpUser, task, between, events
import logging
import os

logger = logging.getLogger("TS-SUB02EXT2-06")

LOGIN_USERNAME = "nguyen_thi_lan"
LOGIN_PASSWORD = "password"

# Minimal valid 1×1 white JPEG (~200 bytes) — avoids needing Pillow
# Generated from: PIL.Image.new("RGB",(1,1),(255,255,255)).save(buf, "JPEG", quality=10)
_MINIMAL_JPEG_B64 = (
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U"
    "HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIA"
    "AhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAU"
    "AQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8A"
    "JQAB/9k="
)
_MINIMAL_JPEG_BYTES = base64.b64decode(_MINIMAL_JPEG_B64)


class OCRQueueUser(HttpUser):
    """Simulates a teacher uploading an image for OCR score parsing."""

    wait_time = between(2, 5)
    token: str = ""

    def on_start(self):
        resp = self.client.post(
            "/api/auth/login",
            json={"username": LOGIN_USERNAME, "password": LOGIN_PASSWORD},
            name="[setup] POST /api/auth/login",
        )
        if resp.status_code == 200:
            data = resp.json()
            self.token = (
                data.get("access_token")
                or data.get("data", {}).get("access_token", "")
            )
        else:
            logger.error(f"Login failed: {resp.status_code}")
            self.token = ""

    @task
    def upload_ocr_image(self):
        if not self.token:
            return

        headers = {"Authorization": f"Bearer {self.token}"}
        # Multipart upload — wrap bytes in BytesIO each time (safe to reuse bytes)
        files = {
            "files": ("test_score_sheet.jpg", io.BytesIO(_MINIMAL_JPEG_BYTES), "image/jpeg")
        }
        with self.client.post(
            "/api/scores/ocr/parse-score-sheet",
            headers=headers,
            files=files,
            catch_response=True,
            name="POST /api/scores/ocr/parse-score-sheet",
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    inner = data.get("data", {})
                    request_id = inner.get("request_id")
                    status_val = inner.get("status")
                    if request_id and status_val in ("queued", "processing", "completed"):
                        response.success()
                        logger.debug(f"Queued: request_id={request_id}, status={status_val}")
                    else:
                        response.failure(
                            f"Unexpected queue response: request_id={request_id}, "
                            f"status={status_val}"
                        )
                except Exception as e:
                    response.failure(f"JSON parse error: {e}")
            elif response.status_code == 503:
                response.failure("503 Service Unavailable — queue is full!")
            elif response.status_code == 401:
                response.failure("Unauthorized")
            else:
                response.failure(f"Unexpected status: {response.status_code}")


# ---------------------------------------------------------------------------
# Post-test assertion hook
# ---------------------------------------------------------------------------

@events.quitting.add_listener
def assert_pass_criteria(environment, **kwargs):
    stats = environment.runner.stats.total

    p95_ms = stats.get_response_time_percentile(0.95)
    failure_rate = stats.fail_ratio

    p95_threshold_ms = int(os.environ.get("PERF_P95_THRESHOLD_MS", "2000"))
    # For OCR queue test: zero tolerance for failures (503 = queue rejected a user)
    error_threshold = 0.0

    logger.info("=== TS-SUB02EXT2-06 Results ===")
    logger.info(f"  Total requests : {stats.num_requests}")
    logger.info(f"  Failures       : {stats.num_failures}")
    logger.info(f"  Error rate     : {failure_rate:.1%}")
    logger.info(f"  p95 resp time  : {p95_ms:.0f} ms")

    violations = []
    if p95_ms > p95_threshold_ms:
        violations.append(f"p95 {p95_ms:.0f}ms exceeds threshold {p95_threshold_ms}ms")
    if failure_rate > error_threshold:
        violations.append(
            f"Error rate {failure_rate:.1%} > 0% — some requests were NOT queued"
        )

    if violations:
        logger.error("FAILED: " + "; ".join(violations))
        environment.process_exit_code = 1
    else:
        logger.info("PASSED: All 5 concurrent uploads accepted by queue.")
        environment.process_exit_code = 0
