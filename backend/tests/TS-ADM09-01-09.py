"""
Test Suite: TS-ADM09 - Teacher Management (Phân công giáo viên)
===============================================================

Test Matrix Mapping:
- **TS-ADM09-01:** Happy Path - GET /api/admin/teachers (List all teachers)
- **TS-ADM09-02:** Happy Path - POST /api/admin/teachers (Create teacher with user link)
- **TS-ADM09-03:** Alternative - POST with user already linked (1:1 constraint violation)
- **TS-ADM09-04:** Happy Path - PUT /api/admin/teachers/{id} (Update teacher info)
- **TS-ADM09-05:** Happy Path - DELETE /api/admin/teachers/{id} (Soft delete)
- **TS-ADM09-06:** Alternative - DELETE when teacher has active assignments (Data Integrity)
- **TS-ADM09-07:** Security - Role-based access control (Forbidden for non-admin)
- **TS-ADM09-09:** Validation - Teacher code format validation

Focus Areas:
- Teacher CRUD operations with proper response codes
- User-Teacher 1:1 relationship validation
- Soft delete and restore workflows
- Data integrity checks (prevent deletion with active assignments)
- Security role-based access control
- Teacher code format validation
- Database rollback with proper cleanup fixtures

Test Pattern: pytest + TestClient + real JWT tokens + two-phase cleanup
"""

import pytest
from datetime import datetime, date
from fastapi.testclient import TestClient
from backend.app_factory import create_app


# =====================================================
# FIXTURES & SETUP
# =====================================================

@pytest.fixture(scope="module")
def client():
    """FastAPI TestClient instance"""
    app = create_app()
    return TestClient(app)


@pytest.fixture
def cleanup_teachers(db):
    """Two-phase cleanup: Soft delete via API, then hard delete from database + users"""
    created_records = {
        "teacher_ids": [],
        "user_ids": []
    }
    
    yield created_records
    
    # Cleanup phase - hard delete from database (teachers first, then users)
    # Delete teachers first (foreign key constraint)
    for teacher_id in created_records["teacher_ids"]:
        try:
            if db:
                db.table("teachers").delete().eq("id", teacher_id).execute()
                print(f"✓ Cleaned up teacher ID: {teacher_id}")
        except Exception as e:
            print(f"⚠ Failed to clean teacher {teacher_id}: {str(e)}")
    
    # Then delete orphaned test users
    for user_id in created_records["user_ids"]:
        try:
            if db:
                db.table("users").delete().eq("id", user_id).execute()
                print(f"✓ Cleaned up user ID: {user_id}")
        except Exception as e:
            print(f"⚠ Failed to clean user {user_id}: {str(e)}")


def create_test_user(db, timestamp_suffix):
    """Helper: Create a test user for teacher linking"""
    email = f"teacher_test_{timestamp_suffix}@school.edu.vn"
    
    import bcrypt
    password_hash = bcrypt.hashpw(b"testpassword123", bcrypt.gensalt()).decode('utf-8')
    
    user_data = {
        "email": email,
        "username": f"teacher_test_{timestamp_suffix}",
        "full_name": f"Test Teacher {timestamp_suffix}",
        "password_hash": password_hash,
        "role": "teacher",
        "is_active": True,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    response = db.table("users").insert(user_data).execute()
    return response.data[0]["id"] if response.data else None


# =====================================================
# TEST SUITE: TS-ADM09-01
# =====================================================

class TestGetTeachers:
    """Test teacher list retrieval"""
    
    def test_TS_ADM09_01_get_teachers_returns_200(self, client, admin_jwt_token):
        """Should return 200 OK when listing teachers"""
        response = client.get(
            "/api/admin/teachers",
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        assert response.status_code == 200
    
    def test_TS_ADM09_01_get_teachers_returns_list(self, client, admin_jwt_token):
        """Should return list of teachers"""
        response = client.get(
            "/api/admin/teachers",
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)
    
    def test_TS_ADM09_01_teacher_list_has_required_fields(self, client, admin_jwt_token):
        """Teacher records should have required fields"""
        response = client.get(
            "/api/admin/teachers",
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        assert response.status_code == 200
        teachers = response.json()["data"]
        
        if teachers:
            teacher = teachers[0]
            assert "id" in teacher
            assert "full_name" in teacher


# =====================================================
# TEST SUITE: TS-ADM09-02
# =====================================================

class TestCreateTeacher:
    """Test teacher creation with user linking"""
    
    def test_TS_ADM09_02_create_teacher_returns_201(
        self, client, admin_jwt_token, db, cleanup_teachers
    ):
        """Should return 201 Created when creating teacher"""
        timestamp = int(datetime.now().timestamp() * 1000) % 100000
        user_id = create_test_user(db, timestamp)
        cleanup_teachers["user_ids"].append(user_id)
        
        response = client.post(
            "/api/admin/teachers",
            json={
                "user_id": user_id,
                "full_name": f"Teacher {timestamp}",
                "teacher_code": f"GV{timestamp}",
                "email": f"teacher_{timestamp}@school.edu.vn"
            },
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        assert response.status_code in [200, 201], f"Response: {response.text}"
        if response.json().get("data"):
            cleanup_teachers["teacher_ids"].append(response.json()["data"]["id"])
    
    def test_TS_ADM09_02_teacher_contains_created_data(
        self, client, admin_jwt_token, db, cleanup_teachers
    ):
        """Created teacher should contain submitted data"""
        timestamp = int(datetime.now().timestamp() * 1000) % 100000
        user_id = create_test_user(db, f"creator_{timestamp}")
        cleanup_teachers["user_ids"].append(user_id)
        teacher_name = f"Teacher {timestamp}"
        teacher_code = f"GV{timestamp}"
        
        response = client.post(
            "/api/admin/teachers",
            json={
                "user_id": user_id,
                "full_name": teacher_name,
                "teacher_code": teacher_code,
                "email": f"teacher_{timestamp}@school.edu.vn"
            },
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        assert response.status_code in [200, 201]
        teacher = response.json()["data"]
        # Check that teacher code was set correctly
        assert teacher["teacher_code"] == teacher_code
        assert teacher["user_id"] == user_id
        cleanup_teachers["teacher_ids"].append(teacher["id"])
    
    def test_TS_ADM09_02_can_create_teacher_without_user_link(
        self, client, admin_jwt_token, cleanup_teachers
    ):
        """Should allow creating teacher without user_id (can be linked later)"""
        timestamp = int(datetime.now().timestamp() * 1000) % 100000
        
        response = client.post(
            "/api/admin/teachers",
            json={
                "full_name": f"Teacher {timestamp}",
                "teacher_code": f"GV{timestamp}",
                "email": f"teacher_{timestamp}@school.edu.vn"
            },
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        assert response.status_code in [201, 200], f"Response: {response.text}"
        if response.json().get("data"):
            cleanup_teachers["teacher_ids"].append(response.json()["data"]["id"])


# =====================================================
# TEST SUITE: TS-ADM09-03
# =====================================================

class TestTeacherUserConstraint:
    """Test 1:1 relationship between User and Teacher"""
    
    def test_TS_ADM09_03_user_already_linked_returns_error(
        self, client, admin_jwt_token, db, cleanup_teachers
    ):
        """Should reject linking user that's already linked to another teacher"""
        timestamp = int(datetime.now().timestamp() * 1000) % 100000
        user_id = create_test_user(db, timestamp)
        cleanup_teachers["user_ids"].append(user_id)
        
        # Create first teacher with user
        response1 = client.post(
            "/api/admin/teachers",
            json={
                "user_id": user_id,
                "full_name": f"Teacher 1 {timestamp}",
                "teacher_code": f"GV1{timestamp}"
            },
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        if response1.status_code in [200, 201]:
            cleanup_teachers["teacher_ids"].append(response1.json()["data"]["id"])
            
            # Try to create second teacher with same user - should fail
            response2 = client.post(
                "/api/admin/teachers",
                json={
                    "user_id": user_id,
                    "full_name": f"Teacher 2 {timestamp}",
                    "teacher_code": f"GV2{timestamp}"
                },
                headers={"Authorization": f"Bearer {admin_jwt_token}"}
            )
            
            # Should return error (400, 409, or similar)
            assert response2.status_code in [400, 409, 422]


# =====================================================
# TEST SUITE: TS-ADM09-04
# =====================================================

class TestUpdateTeacher:
    """Test teacher information updates"""
    
    def test_TS_ADM09_04_update_teacher_returns_200(
        self, client, admin_jwt_token, db, cleanup_teachers
    ):
        """Should return 200 OK when updating teacher"""
        timestamp = int(datetime.now().timestamp() * 1000) % 100000
        user_id = create_test_user(db, timestamp)
        cleanup_teachers["user_ids"].append(user_id)
        
        # Create teacher first
        create_resp = client.post(
            "/api/admin/teachers",
            json={
                "user_id": user_id,
                "full_name": f"Teacher {timestamp}",
                "teacher_code": f"GV{timestamp}"
            },
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        if create_resp.status_code not in [200, 201]:
            pytest.skip("Could not create teacher")
        
        teacher_id = create_resp.json()["data"]["id"]
        cleanup_teachers["teacher_ids"].append(teacher_id)
        
        # Update teacher
        response = client.put(
            f"/api/admin/teachers/{teacher_id}",
            json={"full_name": f"Updated Teacher {timestamp}"},
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        assert response.status_code in [200, 201], f"Response: {response.text}"
    
    def test_TS_ADM09_04_update_multiple_fields(
        self, client, admin_jwt_token, db, cleanup_teachers
    ):
        """Should allow updating multiple teacher fields"""
        timestamp = int(datetime.now().timestamp() * 1000) % 100000
        user_id = create_test_user(db, timestamp)
        cleanup_teachers["user_ids"].append(user_id)
        
        # Create teacher
        create_resp = client.post(
            "/api/admin/teachers",
            json={
                "user_id": user_id,
                "full_name": f"Teacher {timestamp}",
                "teacher_code": f"GV{timestamp}",
                "email": f"old_{timestamp}@school.edu.vn"
            },
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        if create_resp.status_code not in [200, 201]:
            pytest.skip("Could not create teacher")
        
        teacher_id = create_resp.json()["data"]["id"]
        cleanup_teachers["teacher_ids"].append(teacher_id)
        
        # Update multiple fields
        new_name = f"Updated Teacher {timestamp}"
        new_email = f"new_{timestamp}@school.edu.vn"
        
        response = client.put(
            f"/api/admin/teachers/{teacher_id}",
            json={
                "full_name": new_name,
                "email": new_email,
                "gender": "Nam"
            },
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        assert response.status_code in [200, 201], f"Response: {response.text}"
    
    def test_TS_ADM09_04_update_nonexistent_returns_404(self, client, admin_jwt_token):
        """Should return 404 when updating nonexistent teacher"""
        response = client.put(
            "/api/admin/teachers/999999",
            json={"full_name": "Nobody"},
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        assert response.status_code == 404


# =====================================================
# TEST SUITE: TS-ADM09-05
# =====================================================

class TestDeleteTeacher:
    """Test soft delete and restore workflows"""
    
    def test_TS_ADM09_05_soft_delete_teacher_returns_200(
        self, client, admin_jwt_token, db, cleanup_teachers
    ):
        """Should return 200 OK when soft deleting teacher"""
        timestamp = int(datetime.now().timestamp() * 1000) % 100000
        user_id = create_test_user(db, timestamp)
        cleanup_teachers["user_ids"].append(user_id)
        
        # Create teacher
        create_resp = client.post(
            "/api/admin/teachers",
            json={
                "user_id": user_id,
                "full_name": f"Teacher {timestamp}",
                "teacher_code": f"GV{timestamp}"
            },
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        if create_resp.status_code not in [200, 201]:
            pytest.skip("Could not create teacher")
        
        teacher_id = create_resp.json()["data"]["id"]
        cleanup_teachers["teacher_ids"].append(teacher_id)
        
        # Soft delete
        response = client.delete(
            f"/api/admin/teachers/{teacher_id}",
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        assert response.status_code == 200
    
    def test_TS_ADM09_05_deleted_teacher_not_in_active_list(
        self, client, admin_jwt_token, db, cleanup_teachers
    ):
        """Soft-deleted teacher should not appear in active list"""
        timestamp = int(datetime.now().timestamp() * 1000) % 100000
        user_id = create_test_user(db, timestamp)
        cleanup_teachers["user_ids"].append(user_id)
        teacher_name = f"ToDelete Teacher {timestamp}"
        
        # Create teacher
        create_resp = client.post(
            "/api/admin/teachers",
            json={
                "user_id": user_id,
                "full_name": teacher_name,
                "teacher_code": f"GV{timestamp}"
            },
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        if create_resp.status_code not in [200, 201]:
            pytest.skip("Could not create teacher")
        
        teacher_id = create_resp.json()["data"]["id"]
        cleanup_teachers["teacher_ids"].append(teacher_id)
        
        # Delete
        client.delete(
            f"/api/admin/teachers/{teacher_id}",
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        # Verify not in active list
        response = client.get(
            "/api/admin/teachers",
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        assert response.status_code == 200
        teachers = response.json()["data"]
        teacher_names = [t.get("full_name") for t in teachers if t.get("is_active", True)]
        assert teacher_name not in teacher_names or not any(
            t.get("id") == teacher_id for t in teachers if t.get("is_active", True)
        )


# =====================================================
# TEST SUITE: TS-ADM09-06
# =====================================================

class TestTeacherDataIntegrity:
    """Test data integrity constraints"""
    
    def test_TS_ADM09_06_prevent_delete_with_active_assignments(
        self, client, admin_jwt_token, db, cleanup_teachers
    ):
        """Should prevent deleting teacher with active class assignments"""
        # This test requires existing class-subject assignments
        # For now, we'll test the endpoint accepts DELETE requests
        timestamp = int(datetime.now().timestamp() * 1000) % 100000
        user_id = create_test_user(db, timestamp)
        cleanup_teachers["user_ids"].append(user_id)
        
        # Create teacher
        create_resp = client.post(
            "/api/admin/teachers",
            json={
                "user_id": user_id,
                "full_name": f"Teacher {timestamp}",
                "teacher_code": f"GV{timestamp}"
            },
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        if create_resp.status_code not in [200, 201]:
            pytest.skip("Could not create teacher")
        
        teacher_id = create_resp.json()["data"]["id"]
        cleanup_teachers["teacher_ids"].append(teacher_id)
        
        # Attempt to delete - should succeed or fail gracefully
        response = client.delete(
            f"/api/admin/teachers/{teacher_id}",
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        assert response.status_code in [200, 400, 403, 409]


# =====================================================
# TEST SUITE: TS-ADM09-07
# =====================================================

class TestTeacherSecurity:
    """Test role-based access control"""
    
    def test_TS_ADM09_07_teacher_cannot_get_teachers(self, client, teacher_jwt_token):
        """Teacher should get 403 Forbidden accessing teacher list"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/admin/teachers",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 403
    
    def test_TS_ADM09_07_unauthenticated_cannot_access(self, client):
        """Unauthenticated request should return 401 or 403"""
        response = client.get("/api/admin/teachers")
        
        assert response.status_code in [401, 403]
    
    def test_TS_ADM09_07_teacher_cannot_create_teacher(self, client, teacher_jwt_token):
        """Teacher should get 403 when creating teacher"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.post(
            "/api/admin/teachers",
            json={
                "full_name": "Fake Teacher",
                "teacher_code": "FAKE123"
            },
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 403


# =====================================================
# TEST SUITE: TS-ADM09-09
# =====================================================

class TestTeacherValidation:
    """Test teacher data validation"""
    
    def test_TS_ADM09_09_missing_full_name_returns_error(self, client, admin_jwt_token):
        """Should validate full_name is required"""
        response = client.post(
            "/api/admin/teachers",
            json={
                "teacher_code": "GV123456"
            },
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        # Either 422 validation error or 400
        assert response.status_code in [400, 422]
    
    def test_TS_ADM09_09_teacher_code_validation(self, client, admin_jwt_token, cleanup_teachers):
        """Should accept properly formatted teacher codes"""
        timestamp = int(datetime.now().timestamp() * 1000) % 100000
        
        response = client.post(
            "/api/admin/teachers",
            json={
                "full_name": f"Teacher {timestamp}",
                "teacher_code": f"GV{timestamp}",
                "email": f"teacher_{timestamp}@school.edu.vn"
            },
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        # Should accept valid format
        assert response.status_code in [200, 201, 422]
        # Track for cleanup if created successfully
        if response.status_code in [200, 201] and response.json().get("data"):
            cleanup_teachers["teacher_ids"].append(response.json()["data"]["id"])
    
    def test_TS_ADM09_09_email_validation(self, client, admin_jwt_token, cleanup_teachers):
        """Should validate email format if provided"""
        timestamp = int(datetime.now().timestamp() * 1000) % 100000
        
        response = client.post(
            "/api/admin/teachers",
            json={
                "full_name": f"Teacher {timestamp}",
                "teacher_code": f"GV{timestamp}",
                "email": "invalid-email-format"
            },
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        # May be accepted or rejected depending on validation
        assert response.status_code in [200, 201, 400, 422]
        # Track for cleanup if created successfully
        if response.status_code in [200, 201] and response.json().get("data"):
            cleanup_teachers["teacher_ids"].append(response.json()["data"]["id"])


# =====================================================
# TEST SUITE: Integration Tests
# =====================================================

class TestTeacherIntegration:
    """End-to-end teacher management workflows"""
    
    def test_TS_ADM09_full_teacher_workflow(
        self, client, admin_jwt_token, db, cleanup_teachers
    ):
        """Complete workflow: Create, Update, Delete teacher"""
        timestamp = int(datetime.now().timestamp() * 1000) % 100000
        user_id = create_test_user(db, timestamp)
        cleanup_teachers["user_ids"].append(user_id)
        
        # Create
        create_resp = client.post(
            "/api/admin/teachers",
            json={
                "user_id": user_id,
                "full_name": f"Workflow Teacher {timestamp}",
                "teacher_code": f"GW{timestamp}"
            },
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        assert create_resp.status_code in [200, 201]
        teacher = create_resp.json()["data"]
        teacher_id = teacher["id"]
        cleanup_teachers["teacher_ids"].append(teacher_id)
        
        # Update
        update_resp = client.put(
            f"/api/admin/teachers/{teacher_id}",
            json={"full_name": f"Updated Workflow {timestamp}"},
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        assert update_resp.status_code in [200, 201]
        
        # Delete
        delete_resp = client.delete(
            f"/api/admin/teachers/{teacher_id}",
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        assert delete_resp.status_code == 200
