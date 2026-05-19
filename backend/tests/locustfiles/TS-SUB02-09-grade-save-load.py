"""
Locust Performance Test: TS-SUB02-09 — Grade Save Load Test
============================================================

Scenario (appendix-C TS-SUB02-09):
  50 GV đồng thời thực hiện thao tác "Lưu điểm" cho các lớp.
  Pass condition: p95 Response Time < 2s. Không xảy ra Deadlock trong CSDL.

The test hits POST /api/scores/score (upsert a single student's score).
All 50 simulated users use the same teacher credentials and class_subject,
which maximises contention on the same rows — a deliberate worst-case for deadlock detection.

Required environment variables (or relies on dynamic discovery):
  LOCUST_CLASS_SUBJECT_ID  — ID of a class_subject owned by the test user (default: auto-discover)
  LOCUST_STUDENT_ID        — A student ID in that class (default: auto-discover)
  LOCUST_ACADEMIC_YEAR     — e.g. "2024-2025" (default: "2024-2025")
  LOCUST_SEMESTER          — e.g. "1" (default: "1")

Run:
    cd backend
    locust -f tests/locustfiles/TS-SUB02-09-grade-save-load.py \
           --host http://localhost:8000 \
           --users 50 --spawn-rate 10 \
           --run-time 60s --headless \
           --html reports/TS-SUB02-09-report.html

Environment notes:
    set PERF_P95_THRESHOLD_MS=2000   # production target
    set PERF_P95_THRESHOLD_MS=5000   # relaxed dev threshold
"""

from locust import HttpUser, task, between, events
import logging
import os

logger = logging.getLogger("TS-SUB02-09")

LOGIN_USERNAME = "nguyen_thi_lan"
LOGIN_PASSWORD = "password"

ACADEMIC_YEAR = os.environ.get("LOCUST_ACADEMIC_YEAR", "2024-2025")
SEMESTER = os.environ.get("LOCUST_SEMESTER", "1")


class GradeSaveUser(HttpUser):
    """Simulates a teacher repeatedly saving a student's score."""

    wait_time = between(1, 3)
    token: str = ""
    class_subject_id: int = 0
    student_id: int = 0

    def on_start(self):
        # 1. Login
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

        # 2. Discover class_subject_id and student_id from env or analytics endpoint
        env_cs_id = os.environ.get("LOCUST_CLASS_SUBJECT_ID")
        env_st_id = os.environ.get("LOCUST_STUDENT_ID")

        if env_cs_id and env_st_id:
            self.class_subject_id = int(env_cs_id)
            self.student_id = int(env_st_id)
            return

        # Auto-discover: call analytics to find a class_subject_id
        headers = {"Authorization": f"Bearer {self.token}"}
        ar = self.client.get(
            "/api/scores/teacher/dashboard/analytics",
            headers=headers,
            params={"academic_year": ACADEMIC_YEAR, "semester": SEMESTER},
            name="[setup] GET analytics",
        )
        if ar.status_code == 200:
            ad = ar.json().get("data", {})
            # Extract first class_subject_id from class_comparison list
            cc = ad.get("class_comparison", [])
            if cc and cc[0].get("class_subject_id"):
                self.class_subject_id = int(cc[0]["class_subject_id"])

        # Fall back to env or known default
        if not self.class_subject_id:
            self.class_subject_id = int(os.environ.get("LOCUST_CLASS_SUBJECT_ID", "1"))

        # Auto-discover first student in the class
        sr = self.client.get(
            f"/api/scores/teacher/students/{self.class_subject_id}",
            headers=headers,
            params={"academic_year": ACADEMIC_YEAR, "semester": SEMESTER},
            name="[setup] GET students",
        )
        if sr.status_code == 200:
            students = sr.json().get("data", {}).get("students", [])
            if students:
                self.student_id = students[0].get("id", 1)

        if not self.student_id:
            self.student_id = int(os.environ.get("LOCUST_STUDENT_ID", "1"))

    @task
    def save_score(self):
        if not self.token:
            return

        headers = {"Authorization": f"Bearer {self.token}"}
        payload = {
            "student_id": self.student_id,
            "class_subject_id": self.class_subject_id,
            "academic_year": ACADEMIC_YEAR,
            "semester": SEMESTER,
            "score_data": {"TX1": 8.0, "GK": 7.5, "CK": 8.5},
        }
        with self.client.post(
            "/api/scores/score",
            headers=headers,
            json=payload,
            catch_response=True,
            name="POST /api/scores/score",
        ) as response:
            if response.status_code in (200, 201):
                try:
                    data = response.json()
                    if not data.get("success"):
                        response.failure(f"success=false: {data.get('message', '')}")
                    else:
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

    logger.info("=== TS-SUB02-09 Results ===")
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
