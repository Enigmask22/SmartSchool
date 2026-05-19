"""
Test Suite: TS-GEN04 - Quản lý hồ sơ cá nhân
==============================================

Test Matrix Mapping:
- **TS-GEN04-01:** Happy Path - PUT /api/scores/teacher/profile (Update phone/address)
- **TS-GEN04-02:** Happy Path - PUT /api/auth/change-password (Change password while logged in)
- **TS-GEN04-03:** Security  - PUT /api/auth/change-password with wrong current password -> 400
- **TS-GEN04-04:** Validation - Phone format validation (frontend unit -- see TS-GEN03-GEN04-FE.test.tsx)
- **TS-GEN04-05:** E2E       - Change password -> logout -> login with new pass (Playwright -- see TS-GEN04-05.spec.js)

Endpoints under test:
- PUT /api/scores/teacher/profile  (scores router, get_current_teacher dep, JSON body)
- PUT /api/auth/change-password    (auth router, get_current_user dep, Form data)

Test credentials:
- Teacher/homeroom: nguyen_thi_lan / password  (has teacher record in teachers table)

Test Pattern: pytest + TestClient + JWT fixture from conftest
"""

import pytest
from fastapi.testclient import TestClient
from backend.app_factory import create_app


# =====================================================
# FIXTURES
# =====================================================

@pytest.fixture(scope="module")
def client():
    app = create_app()
    return TestClient(app)


# =====================================================
# TEST SUITE: TS-GEN04-01 -- Update Profile
# =====================================================

class TestUpdateProfileHappyPath:
    """PUT /api/scores/teacher/profile -- update phone/address returns 200"""

    def test_TS_GEN04_01_update_phone_returns_200(self, client, homeroom_jwt_token):
        """Should return 200 when updating phone number"""
        response = client.put(
            "/api/scores/teacher/profile",
            json={"phone": "0901234567"},
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_TS_GEN04_01_response_contains_updated_data(self, client, homeroom_jwt_token):
        """Response should contain updated teacher record"""
        response = client.put(
            "/api/scores/teacher/profile",
            json={"phone": "0912345678"},
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_TS_GEN04_01_unauthenticated_returns_401(self, client):
        """Should reject update without authentication"""
        response = client.put(
            "/api/scores/teacher/profile",
            json={"phone": "0901234567"}
        )
        assert response.status_code in [401, 403]

    def test_TS_GEN04_01_empty_body_returns_400(self, client, homeroom_jwt_token):
        """Should reject update with no fields to update"""
        response = client.put(
            "/api/scores/teacher/profile",
            json={},
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        assert response.status_code == 400


# =====================================================
# TEST SUITE: TS-GEN04-02 -- Change Password (logged in)
# =====================================================

class TestChangePasswordHappyPath:
    """PUT /api/auth/change-password -- change password while logged in"""

    def test_TS_GEN04_02_change_password_returns_200(self, client, homeroom_jwt_token):
        """Should return 200 when changing password with correct current password"""
        response = client.put(
            "/api/auth/change-password",
            data={
                "current_password": "password",
                "new_password": "password"   # change to same value so DB stays intact
            },
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_TS_GEN04_02_response_message_present(self, client, homeroom_jwt_token):
        """Response should contain success message"""
        response = client.put(
            "/api/auth/change-password",
            data={
                "current_password": "password",
                "new_password": "password"
            },
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data

    def test_TS_GEN04_02_unauthenticated_returns_401(self, client):
        """Should reject without authentication"""
        response = client.put(
            "/api/auth/change-password",
            data={"current_password": "password", "new_password": "newpass"}
        )
        assert response.status_code in [401, 403]


# =====================================================
# TEST SUITE: TS-GEN04-03 -- Wrong Current Password
# =====================================================

class TestChangePasswordWrongCurrent:
    """PUT /api/auth/change-password with wrong current password -> 400"""

    def test_TS_GEN04_03_wrong_current_password_returns_400(self, client, homeroom_jwt_token):
        """Should return 400 when current password is wrong"""
        response = client.put(
            "/api/auth/change-password",
            data={
                "current_password": "thisiswrongpassword",
                "new_password": "newpassword123"
            },
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        assert response.status_code == 400

    def test_TS_GEN04_03_error_message_mentions_password(self, client, homeroom_jwt_token):
        """Error message should indicate wrong current password"""
        response = client.put(
            "/api/auth/change-password",
            data={
                "current_password": "thisiswrongpassword",
                "new_password": "newpassword123"
            },
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        # Code returns "Password hiện tại không đúng"
        detail_lower = data["detail"].lower()
        assert any(word in detail_lower for word in ["password", "mật khẩu", "không đúng"])

    def test_TS_GEN04_03_missing_current_password_returns_422(self, client, homeroom_jwt_token):
        """Should return 422 when current_password field is missing"""
        response = client.put(
            "/api/auth/change-password",
            data={"new_password": "newpassword123"},
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        assert response.status_code == 422
