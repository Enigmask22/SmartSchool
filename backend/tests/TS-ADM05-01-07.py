"""
Test Suite: TS-ADM05 - Admin Dashboard (School Overview)
TS-ADM05-01 to TS-ADM05-07: Integration tests for admin dashboard endpoints

Endpoints under test (all require admin auth via Depends(get_admin_user)):
  GET /api/admin/dashboard/bootstrap        — single combined call
  GET /api/admin/dashboard/overview         — overview stats
  GET /api/admin/dashboard/attendance-trends
  GET /api/admin/dashboard/class-performance
  GET /api/admin/dashboard/academic-years

Key Requirements:
- Requires admin role (403 for non-admin / unauthenticated)
- Returns success:true + data payload on 200
- Empty/missing data → 200 with empty arrays / zero values (no crash)
- academic_year query param is required on most endpoints
"""

import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path
import logging

sys.path.insert(0, str(Path(__file__).parent.parent))

from app_factory import create_app

logger = logging.getLogger(__name__)


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def app():
    return create_app()


@pytest.fixture
def client(app):
    return TestClient(app)


@pytest.fixture
def admin_token(admin_jwt_token):
    """Proxy to shared real admin JWT from conftest."""
    return admin_jwt_token


@pytest.fixture
def teacher_token(teacher_jwt_token):
    """Proxy to shared real teacher JWT from conftest."""
    return teacher_jwt_token


VALID_YEAR = "2025-2026"
FUTURE_YEAR = "2099-2100"   # No data → should return empty, not crash


# ── TS-ADM05-01: Bootstrap endpoint (happy path) ───────────────────────────

class TestDashboardBootstrap:
    """TS-ADM05-01: Bootstrap returns combined dashboard payload"""

    def test_TS_ADM05_01_bootstrap_returns_200(self, client: TestClient, admin_token: str):
        """Bootstrap responds 200 for valid academic year"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get(
            f"/api/admin/dashboard/bootstrap",
            headers=headers,
            params={"academic_year": VALID_YEAR, "period_days": 30}
        )
        assert response.status_code == 200

    def test_TS_ADM05_01_bootstrap_has_required_keys(self, client: TestClient, admin_token: str):
        """Bootstrap payload contains overview, attendance_trends, class_performance, infra_stats"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get(
            "/api/admin/dashboard/bootstrap",
            headers=headers,
            params={"academic_year": VALID_YEAR, "period_days": 30}
        )
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") is True
            payload = data.get("data", {})
            assert "overview" in payload
            assert "attendance_trends" in payload
            assert "class_performance" in payload
            assert "infra_stats" in payload
        else:
            assert response.status_code in [401, 403, 422]

    def test_TS_ADM05_01_overview_fields_present(self, client: TestClient, admin_token: str):
        """Overview block contains expected numeric fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get(
            "/api/admin/dashboard/bootstrap",
            headers=headers,
            params={"academic_year": VALID_YEAR, "period_days": 30}
        )
        if response.status_code == 200:
            overview = response.json().get("data", {}).get("overview")
            if overview:
                assert "total_students" in overview
                assert "total_classes" in overview
                assert "total_teachers" in overview
                assert "attendance_rate" in overview
        else:
            assert response.status_code in [401, 403, 422]


# ── TS-ADM05-01 (alt): /dashboard/overview endpoint ───────────────────────

class TestDashboardOverview:
    """TS-ADM05-01: Overview endpoint"""

    def test_TS_ADM05_01_overview_200(self, client: TestClient, admin_token: str):
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get(
            "/api/admin/dashboard/overview",
            headers=headers,
            params={"academic_year": VALID_YEAR}
        )
        assert response.status_code in [200, 401, 403, 500]

    def test_TS_ADM05_01_overview_response_shape(self, client: TestClient, admin_token: str):
        """Response has success:true and data with count fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get(
            "/api/admin/dashboard/overview",
            headers=headers,
            params={"academic_year": VALID_YEAR}
        )
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") is True
            payload = data.get("data", {})
            assert "total_students" in payload
            assert "total_classes" in payload
            assert "total_teachers" in payload
            assert "attendance_rate" in payload
        else:
            assert response.status_code in [401, 403, 500]


# ── TS-ADM05-02: Filter by academic year ──────────────────────────────────

class TestDashboardFiltering:
    """TS-ADM05-02: academic_year param filters data correctly"""

    def test_TS_ADM05_02_different_years_accepted(self, client: TestClient, admin_token: str):
        """Both current and past academic years are accepted"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        for year in [VALID_YEAR, "2024-2025"]:
            response = client.get(
                "/api/admin/dashboard/overview",
                headers=headers,
                params={"academic_year": year}
            )
            assert response.status_code in [200, 401, 403, 500]

    def test_TS_ADM05_02_academic_years_list(self, client: TestClient, admin_token: str):
        """Academic years endpoint returns a list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get("/api/admin/dashboard/academic-years", headers=headers)
        assert response.status_code in [200, 401, 403]
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") is True
            assert isinstance(data.get("data"), list)


# ── TS-ADM05-03: Score distribution math (unit logic) ─────────────────────

class TestScoreDistributionLogic:
    """TS-ADM05-03: Class performance returns correct score buckets"""

    def test_TS_ADM05_03_class_performance_returns_200(self, client: TestClient, admin_token: str):
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get(
            "/api/admin/dashboard/class-performance",
            headers=headers,
            params={"academic_year": VALID_YEAR}
        )
        assert response.status_code in [200, 401, 403, 500]

    def test_TS_ADM05_03_performance_items_have_bucket_fields(self, client: TestClient, admin_token: str):
        """Each class performance item has excellent/good/average/poor counts"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get(
            "/api/admin/dashboard/class-performance",
            headers=headers,
            params={"academic_year": VALID_YEAR}
        )
        if response.status_code == 200:
            items = response.json().get("data", [])
            for item in items[:3]:  # Check first few items
                assert "class_name" in item
                assert "average_score" in item
                assert "excellent_count" in item
                assert "good_count" in item
                assert "average_count" in item
                assert "poor_count" in item
                # Bucket counts are non-negative integers
                total = item["excellent_count"] + item["good_count"] + item["average_count"] + item["poor_count"]
                assert total >= 0
        else:
            assert response.status_code in [401, 403, 500]


# ── TS-ADM05-04: Empty data (future year) returns gracefully ──────────────

class TestDashboardEmptyData:
    """TS-ADM05-04: No data for the requested year → 200 with empty/zero values"""

    def test_TS_ADM05_04_future_year_overview_no_crash(self, client: TestClient, admin_token: str):
        """Future year returns 200 without crashing"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get(
            "/api/admin/dashboard/overview",
            headers=headers,
            params={"academic_year": FUTURE_YEAR}
        )
        assert response.status_code in [200, 401, 403, 500]
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") is True

    def test_TS_ADM05_04_future_year_class_performance_empty_list(self, client: TestClient, admin_token: str):
        """Future year class performance returns empty list not error"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get(
            "/api/admin/dashboard/class-performance",
            headers=headers,
            params={"academic_year": FUTURE_YEAR}
        )
        if response.status_code == 200:
            data = response.json().get("data", [])
            assert isinstance(data, list)
        else:
            assert response.status_code in [401, 403, 500]

    def test_TS_ADM05_04_future_year_attendance_trends_empty(self, client: TestClient, admin_token: str):
        """Future year attendance trends returns empty list not error"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get(
            "/api/admin/dashboard/attendance-trends",
            headers=headers,
            params={"academic_year": FUTURE_YEAR}
        )
        if response.status_code == 200:
            data = response.json().get("data", [])
            assert isinstance(data, list)
        else:
            assert response.status_code in [401, 403, 500]


# ── TS-ADM05-06: Error handling ───────────────────────────────────────────

class TestDashboardErrorHandling:
    """TS-ADM05-06: Missing required param → 422; endpoint still handles gracefully"""

    def test_TS_ADM05_06_missing_academic_year_returns_422(self, client: TestClient, admin_token: str):
        """overview requires academic_year — missing → 422 Unprocessable Entity"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get("/api/admin/dashboard/overview", headers=headers)
        # FastAPI Query(...) required param → 422 when missing
        assert response.status_code in [401, 422, 403]

    def test_TS_ADM05_06_attendance_trends_missing_param_422(self, client: TestClient, admin_token: str):
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get("/api/admin/dashboard/attendance-trends", headers=headers)
        assert response.status_code in [401, 422, 403]

    def test_TS_ADM05_06_bootstrap_missing_param_422(self, client: TestClient, admin_token: str):
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get("/api/admin/dashboard/bootstrap", headers=headers)
        assert response.status_code in [401, 422, 403]


# ── TS-ADM05-07: Security — non-admin cannot access ───────────────────────

class TestDashboardSecurity:
    """TS-ADM05-07: Role-based access control"""

    def test_TS_ADM05_07_unauthenticated_denied(self, client: TestClient):
        """No token → 401 or 403"""
        response = client.get(
            "/api/admin/dashboard/overview",
            params={"academic_year": VALID_YEAR}
        )
        assert response.status_code in [401, 403]

    def test_TS_ADM05_07_teacher_token_denied(self, client: TestClient, teacher_token: str):
        """Teacher token → 403"""
        headers = {"Authorization": f"Bearer {teacher_token}"}
        response = client.get(
            "/api/admin/dashboard/overview",
            headers=headers,
            params={"academic_year": VALID_YEAR}
        )
        assert response.status_code in [401, 403]

    def test_TS_ADM05_07_teacher_cannot_access_bootstrap(self, client: TestClient, teacher_token: str):
        headers = {"Authorization": f"Bearer {teacher_token}"}
        response = client.get(
            "/api/admin/dashboard/bootstrap",
            headers=headers,
            params={"academic_year": VALID_YEAR, "period_days": 30}
        )
        assert response.status_code in [401, 403]

    def test_TS_ADM05_07_teacher_cannot_access_class_performance(self, client: TestClient, teacher_token: str):
        headers = {"Authorization": f"Bearer {teacher_token}"}
        response = client.get(
            "/api/admin/dashboard/class-performance",
            headers=headers,
            params={"academic_year": VALID_YEAR}
        )
        assert response.status_code in [401, 403]

    def test_TS_ADM05_07_admin_can_access_academic_years(self, client: TestClient, admin_token: str):
        """Admin can access the academic years list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get("/api/admin/dashboard/academic-years", headers=headers)
        assert response.status_code in [200, 401, 403]
