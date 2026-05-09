"""
Integration tests for Admin User Management API (TS-ADM01-01 to 07)
Tests all user CRUD operations with proper authentication and validation
"""

import pytest
import sys
import bcrypt
from pathlib import Path
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from app_factory import create_app
from core.database import get_db

# =========================================================
# FIXTURES
# =========================================================

@pytest.fixture(scope="session")
def app():
    """Create test app instance"""
    return create_app()


@pytest.fixture
def client(app):
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def db():
    """Get real database connection for tests"""
    try:
        # Import the database instance
        from core.database import db as database_instance
        if database_instance is None or database_instance.client is None:
            pytest.skip("Database not initialized")
        return database_instance.client
    except Exception as e:
        pytest.skip(f"Database connection failed: {str(e)}")


# =========================================================
# TEST CASES: TS-ADM01-01 to TS-ADM01-07
# =========================================================

class TestAdminUserManagement:
    """Test suite for admin user management API"""
    
    # =========================================================
    # TS-ADM01-01: Happy Path - Get Users with Valid JWT
    # =========================================================
    
    @pytest.mark.integration
    def test_TS_ADM01_01_get_users_with_valid_jwt(self, client, admin_jwt_token):
        """
        TS-ADM01-01: Admin retrieves all users with valid JWT token
        Expected: HTTP 200 OK with list of users
        """
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        response = client.get("/api/admin/users", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["success"] is True, "Response success flag should be True"
        assert isinstance(data["data"], list), "Response data should be a list"
        
        # Verify user fields in response
        if len(data["data"]) > 0:
            user = data["data"][0]
            required_fields = ["id", "username", "email", "full_name", "role"]
            for field in required_fields:
                assert field in user, f"User missing required field: {field}"
            
            # Password hash should never be in response
            assert "password_hash" not in user, "Password hash should not be in response"
    
    
    # =========================================================
    # TS-ADM01-02: Security - Access Denied Without JWT
    # =========================================================
    
    @pytest.mark.integration
    def test_TS_ADM01_02a_get_users_without_token(self, client):
        """
        TS-ADM01-02a: Get users without JWT token
        Expected: HTTP 401 Unauthorized or 403 Forbidden (HTTPBearer returns 403 for missing credentials)
        """
        response = client.get("/api/admin/users")
        
        # HTTPBearer with auto_error=True returns 403 for missing credentials (not 401)
        assert response.status_code in [401, 403], \
            f"Expected 401 or 403, got {response.status_code}"
    
    
    @pytest.mark.integration
    def test_TS_ADM01_02b_get_users_with_invalid_token(self, client, invalid_jwt_token):
        """
        TS-ADM01-02b: Get users with invalid JWT token
        Expected: HTTP 401 Unauthorized
        """
        headers = {"Authorization": f"Bearer {invalid_jwt_token}"}
        response = client.get("/api/admin/users", headers=headers)
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    
    @pytest.mark.integration
    def test_TS_ADM01_02c_get_users_non_admin_role(self, client, teacher_jwt_token):
        """
        TS-ADM01-02c: Get users with valid token but non-admin role
        Expected: HTTP 403 Forbidden
        """
        headers = {"Authorization": f"Bearer {teacher_jwt_token}"}
        response = client.get("/api/admin/users", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "Chỉ admin mới có quyền truy cập" in data.get("detail", ""), \
            "Should return admin-only error message"
    
    
    # =========================================================
    # TS-ADM01-03: Create User Successfully
    # =========================================================
    
    @pytest.mark.integration
    def test_TS_ADM01_03a_create_user_teacher(self, client, admin_jwt_token, new_teacher_data, db):
        """
        TS-ADM01-03a: Create teacher user successfully
        Expected: HTTP 200/201 Created with user data (no password hash)
        """
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        try:
            response = client.post(
                "/api/admin/users",
                json=new_teacher_data,
                headers=headers
            )
            
            assert response.status_code in [200, 201], \
                f"Expected 200/201, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert data["success"] is True
            assert data["data"]["username"] == new_teacher_data["username"]
            assert data["data"]["email"] == new_teacher_data["email"]
            assert data["data"]["full_name"] == new_teacher_data["full_name"]
            assert data["data"]["role"] == "teacher"
            
            # Verify password hash not in response
            assert "password_hash" not in data["data"], \
                "Password hash should not be returned"
            
            # Verify password was hashed in database
            created_user_id = data["data"]["id"]
            user_in_db = db.table("users").select("*").eq("id", created_user_id).execute()
            assert len(user_in_db.data) == 1
            assert user_in_db.data[0]["password_hash"] is not None
            
            # Cleanup: Delete created test user
            db.table("users").delete().eq("id", created_user_id).execute()
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    
    @pytest.mark.integration
    def test_TS_ADM01_03b_create_user_admin_role(self, client, admin_jwt_token, new_admin_data, db):
        """
        TS-ADM01-03b: Create admin user successfully
        Expected: HTTP 200/201 Created with admin role
        """
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        try:
            response = client.post(
                "/api/admin/users",
                json=new_admin_data,
                headers=headers
            )
            
            assert response.status_code in [200, 201]
            data = response.json()
            assert data["data"]["role"] == "admin"
            
            # Cleanup
            created_user_id = data["data"]["id"]
            db.table("users").delete().eq("id", created_user_id).execute()
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    
    @pytest.mark.integration
    def test_TS_ADM01_03c_create_user_homeroom_role(self, client, admin_jwt_token, new_homeroom_data, db):
        """
        TS-ADM01-03c: Create homeroom teacher successfully
        Expected: HTTP 200/201 Created with homeroom_teacher role
        """
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        try:
            response = client.post(
                "/api/admin/users",
                json=new_homeroom_data,
                headers=headers
            )
            
            assert response.status_code in [200, 201]
            data = response.json()
            assert data["data"]["role"] == "homeroom_teacher"
            
            # Cleanup
            created_user_id = data["data"]["id"]
            db.table("users").delete().eq("id", created_user_id).execute()
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    
    # =========================================================
    # TS-ADM01-04: Duplicate Username Validation
    # =========================================================
    
    @pytest.mark.integration
    def test_TS_ADM01_04a_duplicate_username_existing_admin(self, client, admin_jwt_token):
        """
        TS-ADM01-04a: Attempt to create user with existing admin username
        Expected: HTTP 400 Bad Request - "Username đã được sử dụng"
        """
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        duplicate_data = {
            "username": "admin",  # Existing user
            "email": f"new_email_{datetime.now().timestamp()}@school.edu.vn",
            "full_name": "New User",
            "password": "Password123!",
            "role": "teacher"
        }
        
        response = client.post(
            "/api/admin/users",
            json=duplicate_data,
            headers=headers
        )
        
        assert response.status_code in [400, 409], \
            f"Expected 400/409, got {response.status_code}: {response.text}"
        data = response.json()
        assert "Tên đăng nhập" in data.get("detail", "") or "username" in data.get("detail", "").lower(), \
            "Should return username already exists error"
    
    
    @pytest.mark.integration
    def test_TS_ADM01_04b_duplicate_username_existing_teacher(self, client, admin_jwt_token):
        """
        TS-ADM01-04b: Attempt to create user with existing teacher username
        Expected: HTTP 400 Bad Request
        """
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        duplicate_data = {
            "username": "tran_van_nam",  # Existing teacher
            "email": f"new_email_{datetime.now().timestamp()}@school.edu.vn",
            "full_name": "New User",
            "password": "Password123!",
            "role": "teacher"
        }
        
        response = client.post(
            "/api/admin/users",
            json=duplicate_data,
            headers=headers
        )
        
        assert response.status_code in [400, 409], \
            f"Expected 400/409, got {response.status_code}: {response.text}"
    
    
    # =========================================================
    # TS-ADM01-05: Duplicate Email Validation
    # =========================================================
    
    @pytest.mark.integration
    def test_TS_ADM01_05_duplicate_email(self, client, admin_jwt_token, db):
        """
        TS-ADM01-05: Attempt to create user with duplicate email
        Expected: HTTP 400/500 Error (DB unique constraint)
        """
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        # Get an existing user's email
        existing_users = db.table("users").select("email").limit(1).execute()
        if len(existing_users.data) == 0:
            pytest.skip("No existing users to test with")
        
        existing_email = existing_users.data[0]["email"]
        
        duplicate_data = {
            "username": f"new_user_{datetime.now().timestamp()}",
            "email": existing_email,  # Duplicate email
            "full_name": "New User",
            "password": "Password123!",
            "role": "teacher"
        }
        
        response = client.post(
            "/api/admin/users",
            json=duplicate_data,
            headers=headers
        )
        
        # Database constraint should catch this - 409 Conflict is correct for duplicate
        assert response.status_code in [400, 409, 500], \
            f"Expected 400/409/500, got {response.status_code}: {response.text}"
    
    
    # =========================================================
    # TS-ADM01-07: Deactivate User (Soft Delete)
    # =========================================================
    
    @pytest.mark.integration
    def test_TS_ADM01_07_deactivate_user(self, client, admin_jwt_token, new_teacher_data, db):
        """
        TS-ADM01-07: Deactivate (soft delete) an existing user
        Expected: HTTP 200 OK, user.is_active = false
        """
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        try:
            # Step 1: Create a test user
            create_response = client.post(
                "/api/admin/users",
                json=new_teacher_data,
                headers=headers
            )
            
            assert create_response.status_code in [200, 201]
            created_user_id = create_response.json()["data"]["id"]
            
            # Step 2: Deactivate the user
            update_data = {"is_active": False}
            
            deactivate_response = client.put(
                f"/api/admin/users/{created_user_id}",
                json=update_data,
                headers=headers
            )
            
            assert deactivate_response.status_code == 200, \
                f"Expected 200, got {deactivate_response.status_code}: {deactivate_response.text}"
            
            data = deactivate_response.json()
            assert data["data"]["is_active"] is False, \
                "User should be deactivated (is_active = false)"
            
            # Step 3: Verify in database
            db_user = db.table("users").select("*").eq("id", created_user_id).execute()
            assert len(db_user.data) == 1
            assert db_user.data[0]["is_active"] is False, \
                "Database record should show is_active = false"
            
            # Cleanup
            db.table("users").delete().eq("id", created_user_id).execute()
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")


# =========================================================
# EDGE CASES AND VALIDATION
# =========================================================

class TestAdminUserValidation:
    """Additional validation tests"""
    
    @pytest.mark.integration
    def test_TS_ADM01_07_password_hashing_bcrypt(self, client, admin_jwt_token, new_teacher_data, db):
        """
        Verify that password is properly hashed using bcrypt
        Expected: password_hash in DB matches bcrypt verification
        """
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        try:
            response = client.post(
                "/api/admin/users",
                json=new_teacher_data,
                headers=headers
            )
            
            assert response.status_code in [200, 201]
            created_user_id = response.json()["data"]["id"]
            
            # Get password hash from DB
            user_in_db = db.table("users").select("*").eq("id", created_user_id).execute()
            password_hash = user_in_db.data[0]["password_hash"]
            
            # Verify bcrypt hash
            is_valid = bcrypt.checkpw(
                new_teacher_data["password"].encode('utf-8'),
                password_hash.encode('utf-8')
            )
            assert is_valid, "Bcrypt password verification failed"
            
            # Cleanup
            db.table("users").delete().eq("id", created_user_id).execute()
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    
    @pytest.mark.integration
    def test_TS_ADM01_03_create_user_without_username(self, client, admin_jwt_token, db):
        """
        Test creating user without username (should be optional)
        """
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        user_no_username = {
            "email": f"no_username_{datetime.now().timestamp()}@school.edu.vn",
            "full_name": "User Without Username",
            "password": "Password123!",
            "role": "teacher"
        }
        
        try:
            response = client.post(
                "/api/admin/users",
                json=user_no_username,
                headers=headers
            )
            
            # Should succeed - username is optional
            assert response.status_code in [200, 201], \
                f"Expected 200/201, got {response.status_code}: {response.text}"
            
            created_user_id = response.json()["data"]["id"]
            
            # Cleanup
            db.table("users").delete().eq("id", created_user_id).execute()
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
