"""
Locust Performance Test: TS-HOM01-09 — Homeroom Dashboard Load Test
====================================================================

Scenario (appendix-C TS-HOM01-09):
  Spawn 30 concurrent GVCN users, each repeatedly calling GET /api/homeroom/dashboard/bootstrap.
  Pass condition: p95 Response Time < 2s.

Rationale: A typical school has 30-40 homeroom teachers. Morning homeroom period
(7:30-8:00) is peak traffic — all teachers open the dashboard simultaneously.

Run:
    cd backend
    locust -f tests/locustfiles/TS-HOM01-09-homeroom-dashboard-load.py \
           --host http://localhost:8000 \
           --users 30 --spawn-rate 5 \
           --run-time 60s --headless \
           --html reports/TS-HOM01-09-report.html

Environment notes:
  Dev environment against remote Supabase will show higher latency than production.
  Adjust PERF_P95_THRESHOLD_MS accordingly:
    set PERF_P95_THRESHOLD_MS=2000   # production target
    set PERF_P95_THRESHOLD_MS=5000   # relaxed dev threshold
"""

from locust import HttpUser, task, between, events
import logging
import os

logger = logging.getLogger("TS-HOM01-09")

LOGIN_USERNAME = "nguyen_thi_lan"
LOGIN_PASSWORD = "password"


class HomeroomDashboardUser(HttpUser):
    """Simulates a homeroom teacher repeatedly loading their class dashboard."""

    wait_time = between(1, 3)
    token: str = ""

    def on_start(self):
        """Login once and store the bearer token."""
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
            logger.error(f"Login failed: {resp.status_code} {resp.text[:200]}")
            self.token = ""

    @task
    def load_dashboard(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        with self.client.get(
            "/api/homeroom/dashboard/bootstrap",
            headers=headers,
            catch_response=True,
            name="GET /api/homeroom/dashboard/bootstrap",
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if not data.get("success"):
                        response.failure(f"success=false: {data.get('message', '')}")
                    else:
                        response.success()
                except Exception as e:
                    response.failure(f"JSON parse error: {e}")
            elif response.status_code == 401:
                response.failure("Unauthorized — token may have expired")
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

    logger.info("=== TS-HOM01-09 Results ===")
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
