"""
Locust Performance Test: TS-SUB02EXT1-08 — Bulk Grade Import Load Test
=======================================================================

Scenario (appendix-C TS-SUB02EXT1-08):
  Upload file điểm cho lớp 50 học sinh.
  Pass condition: Thời gian xử lý parse file và tính toán GPA lại cho 50 em phải < 2 giây.

This test uses a single user sending repeated POST /api/scores/bulk-import requests,
each carrying a 50-record JSON payload. The p95 measures per-batch processing time.

A small number of concurrent users (default 3) exercises light parallel load;
the core metric is individual response time per 50-record batch.

Required environment variables:
  LOCUST_CLASS_SUBJECT_ID  — ID of a class_subject owned by the test user
  LOCUST_ACADEMIC_YEAR     — e.g. "2024-2025" (default: "2024-2025")
  LOCUST_SEMESTER          — e.g. "1" (default: "1")

Run (single user — pure throughput):
    cd backend
    locust -f tests/locustfiles/TS-SUB02EXT1-08-bulk-import-load.py \
           --host http://localhost:8000 \
           --users 1 --spawn-rate 1 \
           --run-time 60s --headless \
           --html reports/TS-SUB02EXT1-08-report.html

Run (light parallel — 3 teachers uploading simultaneously):
    locust ... --users 3 --spawn-rate 1 ...

Environment notes:
    set PERF_P95_THRESHOLD_MS=2000   # production target
    set PERF_P95_THRESHOLD_MS=5000   # relaxed dev threshold
"""

from locust import HttpUser, task, between, events
import logging
import os

logger = logging.getLogger("TS-SUB02EXT1-08")

LOGIN_USERNAME = "nguyen_thi_lan"
LOGIN_PASSWORD = "password"

ACADEMIC_YEAR = os.environ.get("LOCUST_ACADEMIC_YEAR", "2024-2025")
SEMESTER = os.environ.get("LOCUST_SEMESTER", "1")

# Generate a 50-record payload at module load time (same payload reused each request)
# student_ids 1–50 are used; DB will upsert successfully for existing students
# and return error_count for any that don't exist — both paths exercise the code.
_GRADES_PAYLOAD = [
    {
        "student_id": i,
        "score_data": {
            "TX1": round(5.0 + (i % 5) * 1.0, 1),
            "TX2": round(6.0 + (i % 4) * 0.5, 1),
            "GK": round(7.0 + (i % 3) * 0.5, 1),
            "CK": round(7.5 + (i % 4) * 0.5, 1),
        },
    }
    for i in range(1, 51)
]


class BulkImportUser(HttpUser):
    """Simulates a teacher uploading a 50-student grade sheet."""

    wait_time = between(2, 4)
    token: str = ""
    class_subject_id: int = 0

    def on_start(self):
        resp = self.client.post(
            "/api/auth/login",
            json={"username": LOGIN_USERNAME, "password": LOGIN_PASSWORD},
            name="[setup] POST /api/auth/login",
        )
        if resp.status_code != 200:
            logger.error(f"Login failed: {resp.status_code}")
            return

        data = resp.json()
        self.token = (
            data.get("access_token")
            or data.get("data", {}).get("access_token", "")
        )

        # Get class_subject_id
        env_cs_id = os.environ.get("LOCUST_CLASS_SUBJECT_ID")
        if env_cs_id:
            self.class_subject_id = int(env_cs_id)
            return

        # Auto-discover
        headers = {"Authorization": f"Bearer {self.token}"}
        ar = self.client.get(
            "/api/scores/teacher/dashboard/analytics",
            headers=headers,
            params={"academic_year": ACADEMIC_YEAR, "semester": SEMESTER},
            name="[setup] GET analytics",
        )
        if ar.status_code == 200:
            cc = ar.json().get("data", {}).get("class_comparison", [])
            if cc and cc[0].get("class_subject_id"):
                self.class_subject_id = int(cc[0]["class_subject_id"])

        if not self.class_subject_id:
            self.class_subject_id = 1
            logger.warning(
                "class_subject_id not found via analytics; defaulting to 1. "
                "Set LOCUST_CLASS_SUBJECT_ID env var to override."
            )

    @task
    def bulk_import_grades(self):
        if not self.token:
            return

        headers = {"Authorization": f"Bearer {self.token}"}
        payload = {
            "class_subject_id": self.class_subject_id,
            "academic_year": ACADEMIC_YEAR,
            "semester": SEMESTER,
            "grades": _GRADES_PAYLOAD,
        }
        with self.client.post(
            "/api/scores/bulk-import",
            headers=headers,
            json=payload,
            catch_response=True,
            name="POST /api/scores/bulk-import (50 records)",
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if not data.get("success"):
                        response.failure(f"success=false: {data.get('message', '')}")
                    else:
                        d = data.get("data", {})
                        logger.debug(
                            f"Import done: success={d.get('success_count')}, "
                            f"errors={d.get('error_count')}"
                        )
                        response.success()
                except Exception as e:
                    response.failure(f"JSON parse error: {e}")
            elif response.status_code == 403:
                response.failure("403 Forbidden — check class_subject_id ownership")
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
    error_threshold = 0.10

    logger.info("=== TS-SUB02EXT1-08 Results ===")
    logger.info(f"  Total requests : {stats.num_requests}")
    logger.info(f"  Failures       : {stats.num_failures}")
    logger.info(f"  Error rate     : {failure_rate:.1%}")
    logger.info(f"  p95 resp time  : {p95_ms:.0f} ms")

    violations = []
    if p95_ms > p95_threshold_ms:
        violations.append(f"p95 {p95_ms:.0f}ms exceeds threshold {p95_threshold_ms}ms")
    if failure_rate > error_threshold:
        violations.append(f"Error rate {failure_rate:.1%} exceeds {error_threshold:.0%}")

    if violations:
        logger.error("FAILED: " + "; ".join(violations))
        environment.process_exit_code = 1
    else:
        logger.info("PASSED: All NFR.1 criteria met.")
        environment.process_exit_code = 0
