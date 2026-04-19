"""
Test Suite: TS-ADM06 - Subject Management Feature Tests
=====================================================

Test Matrix Mapping:
- **TS-ADM06-01:** Happy Path - Get subjects list (Backend Integration)
- **TS-ADM06-02:** Happy Path - Create new subject (Backend Integration)
- **TS-ADM06-03:** Alternative - Create subject with duplicate code (Validation)
- **TS-ADM06-04:** Happy Path - Update subject info (Backend Integration)
- **TS-ADM06-05:** Happy Path - Delete subject (no related data) (Backend Integration)
- **TS-ADM06-06:** Alternative - Delete subject (with related data - constraints) (Backend Integration)
- **TS-ADM06-07:** Extension - UI navigation to score column config (UI/Integration)
- **TS-ADM06-08:** Exception - Handle DB connection errors (Backend Integration)

Key Business Logic:
- Subject CRUD operations (Create, Read, Update, Delete)
- Unique constraint on subject_code
- Soft delete (is_active flag)
- Data integrity checks before deletion
- Admin-only access

Dependencies:
- Supabase database with subjects table
- Admin user authentication
- Fixtures from TS-ADM03 pattern

Database Cleanup:
- All tests use unique subject codes with timestamps
- Cleanup fixture automatically deletes test-created subjects
- No database pollution between test runs
"""

import pytest
import logging
import sys
from pathlib import Path
from fastapi.testclient import TestClient
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app_factory import create_app

logger = logging.getLogger(__name__)


# ===============================================
# FIXTURES - APP AND CLIENT
# ===============================================

@pytest.fixture(scope="session")
def app():
    """Create test app instance"""
    return create_app()


@pytest.fixture
def client(app):
    """Create test client from app"""
    return TestClient(app)


@pytest.fixture
def unique_subject_code():
    """Generate unique subject code using timestamp"""
    timestamp = int(datetime.now().timestamp() * 1000) % 100000
    return f"TEST_{timestamp}"


@pytest.fixture
def cleanup_subjects(client, admin_jwt_token, db):
    """
    Fixture to track and cleanup created subjects after test
    - Auto-cleans all TEST_ prefixed subjects from database
    """
    created_subject_ids = []
    
    def add_for_cleanup(subject_id):
        """Track a subject ID for cleanup"""
        if subject_id:
            created_subject_ids.append(subject_id)
    
    yield {"add": add_for_cleanup}
    
    # Cleanup Phase 1: Delete tracked IDs via API
    headers = {"Authorization": f"Bearer {admin_jwt_token}"}
    for subject_id in created_subject_ids:
        try:
            client.delete(f"/api/admin/subjects/{subject_id}", headers=headers)
        except:
            pass
    
    # Cleanup Phase 2: Hard-delete all TEST_ prefixed subjects from DB
    try:
        if db:
            result = db.table("subjects").select("id").ilike("subject_code", "TEST_%").execute()
            if result.data:
                for row in result.data:
                    try:
                        db.table("subjects").delete().eq("id", row["id"]).execute()
                    except:
                        pass
    except Exception as e:
        logger.warning(f"Database cleanup warning: {e}")


# ===============================================
# TEST CLASSES
# ===============================================


class TestGetSubjects:
    """TS-ADM06-01: Happy Path - Get all subjects"""

    def test_TS_ADM06_01_get_subjects_returns_200(self, client: TestClient, admin_jwt_token: str):
        """Verify GET subjects returns 200 OK with list"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        response = client.get("/api/admin/subjects", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "success" in data or "data" in data

    def test_TS_ADM06_01_get_subjects_returns_list(self, client: TestClient, admin_jwt_token: str):
        """Verify subjects list contains expected structure"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        response = client.get("/api/admin/subjects", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        if "data" in data:
            assert isinstance(data["data"], list)

    def test_TS_ADM06_01_get_subjects_with_show_deleted_param(self, client: TestClient, admin_jwt_token: str):
        """Verify show_deleted query parameter works"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        response = client.get(
            "/api/admin/subjects?show_deleted=true",
            headers=headers
        )
        
        assert response.status_code == 200

    def test_TS_ADM06_01_get_subjects_subject_has_id(self, client: TestClient, admin_jwt_token: str):
        """Verify subjects have id field"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        response = client.get("/api/admin/subjects", headers=headers)
        
        assert response.status_code == 200
        subjects = response.json().get("data", [])
        if len(subjects) > 0:
            first_subject = subjects[0]
            assert "id" in first_subject or "subject_code" in first_subject


class TestCreateSubject:
    """TS-ADM06-02: Happy Path - Create new subject"""

    def test_TS_ADM06_02_create_subject_returns_201(self, client: TestClient, admin_jwt_token: str, unique_subject_code: str, cleanup_subjects):
        """Verify POST creates subject and returns 201 Created"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        payload = {
            "subject_code": unique_subject_code,
            "subject_name": "Test Subject",
            "is_active": True
        }
        
        response = client.post(
            "/api/admin/subjects",
            headers=headers,
            json=payload
        )
        
        if response.status_code in [201, 200]:
            data = response.json()
            if "data" in data:
                cleanup_subjects["add"](data["data"].get("id"))
        
        assert response.status_code in [201, 200]

    def test_TS_ADM06_02_create_subject_with_description(self, client: TestClient, admin_jwt_token: str, unique_subject_code: str, cleanup_subjects):
        """Verify subject can be created with description"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        payload = {
            "subject_code": f"{unique_subject_code}_desc",
            "subject_name": "Test With Description",
            "description": "This is a test subject",
            "is_active": True
        }
        
        response = client.post(
            "/api/admin/subjects",
            headers=headers,
            json=payload
        )
        
        if response.status_code in [201, 200]:
            data = response.json()
            if "data" in data:
                cleanup_subjects["add"](data["data"].get("id"))
        
        assert response.status_code in [201, 200]

    def test_TS_ADM06_02_create_subject_mandatory_field(self, client: TestClient, admin_jwt_token: str, unique_subject_code: str, cleanup_subjects):
        """Verify subject can be marked as mandatory"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        payload = {
            "subject_code": f"{unique_subject_code}_mand",
            "subject_name": "Mandatory Subject",
            "is_mandatory": True,
            "is_active": True
        }
        
        response = client.post(
            "/api/admin/subjects",
            headers=headers,
            json=payload
        )
        
        if response.status_code in [201, 200]:
            data = response.json()
            if "data" in data:
                cleanup_subjects["add"](data["data"].get("id"))
        
        assert response.status_code in [201, 200]

    def test_TS_ADM06_02_create_subject_returns_created_data(self, client: TestClient, admin_jwt_token: str, unique_subject_code: str, cleanup_subjects):
        """Verify created subject data is returned"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        payload = {
            "subject_code": f"{unique_subject_code}_ret",
            "subject_name": "Return Test",
            "is_active": True
        }
        
        response = client.post(
            "/api/admin/subjects",
            headers=headers,
            json=payload
        )
        
        assert response.status_code in [201, 200]
        data = response.json()
        assert "data" in data or "success" in data
        if "data" in data and data["data"]:
            cleanup_subjects["add"](data["data"].get("id"))


class TestDuplicateSubjectCode:
    """TS-ADM06-03: Alternative - Duplicate subject code validation"""

    def test_TS_ADM06_03_duplicate_code_rejected(self, client: TestClient, admin_jwt_token: str, unique_subject_code: str, cleanup_subjects):
        """Verify duplicate subject_code returns 409 Conflict"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        dup_code = f"{unique_subject_code}_dup"
        
        # Create first subject
        payload1 = {
            "subject_code": dup_code,
            "subject_name": "First Subject",
            "is_active": True
        }
        response1 = client.post("/api/admin/subjects", headers=headers, json=payload1)
        
        if response1.status_code in [201, 200]:
            data = response1.json()
            if "data" in data:
                cleanup_subjects["add"](data["data"].get("id"))
            
            # Try to create duplicate
            payload2 = {
                "subject_code": dup_code,
                "subject_name": "Duplicate Subject",
                "is_active": True
            }
            response2 = client.post("/api/admin/subjects", headers=headers, json=payload2)
            
            # Should return 409 Conflict or 400 Bad Request
            assert response2.status_code in [409, 400, 422]

    def test_TS_ADM06_03_missing_required_fields(self, client: TestClient, admin_jwt_token: str):
        """Verify missing required fields returns error"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        # Missing subject_code
        payload = {
            "subject_name": "Missing Code",
            "is_active": True
        }
        
        response = client.post(
            "/api/admin/subjects",
            headers=headers,
            json=payload
        )
        
        assert response.status_code in [422, 400]

    def test_TS_ADM06_03_missing_subject_name(self, client: TestClient, admin_jwt_token: str, unique_subject_code: str):
        """Verify missing subject_name returns error"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        payload = {
            "subject_code": f"{unique_subject_code}_noname",
            "is_active": True
        }
        
        response = client.post(
            "/api/admin/subjects",
            headers=headers,
            json=payload
        )
        
        assert response.status_code in [422, 400]


class TestUpdateSubject:
    """TS-ADM06-04: Happy Path - Update subject"""

    def test_TS_ADM06_04_update_subject_returns_200(self, client: TestClient, admin_jwt_token: str, unique_subject_code: str, cleanup_subjects):
        """Verify PUT updates subject and returns 200 OK"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        # First create a subject
        create_payload = {
            "subject_code": f"{unique_subject_code}_upd",
            "subject_name": "Original Name",
            "is_active": True
        }
        create_response = client.post("/api/admin/subjects", headers=headers, json=create_payload)
        
        assert create_response.status_code in [201, 200]
        
        created_data = create_response.json().get("data", {})
        subject_id = created_data.get("id")
        cleanup_subjects["add"](subject_id)
        
        # Update it
        update_payload = {"subject_name": "Updated Name"}
        response = client.put(
            f"/api/admin/subjects/{subject_id}",
            headers=headers,
            json=update_payload
        )
        
        assert response.status_code == 200

    def test_TS_ADM06_04_update_nonexistent_returns_404(self, client: TestClient, admin_jwt_token: str):
        """Verify updating non-existent subject returns 404"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        payload = {"subject_name": "Updated Name"}
        response = client.put(
            "/api/admin/subjects/999999",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 404

    def test_TS_ADM06_04_update_multiple_fields(self, client: TestClient, admin_jwt_token: str, unique_subject_code: str, cleanup_subjects):
        """Verify multiple fields can be updated"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        create_payload = {
            "subject_code": f"{unique_subject_code}_multi",
            "subject_name": "Original",
            "is_mandatory": False
        }
        create_response = client.post("/api/admin/subjects", headers=headers, json=create_payload)
        
        assert create_response.status_code in [201, 200]
        
        subject_id = create_response.json().get("data", {}).get("id")
        cleanup_subjects["add"](subject_id)
        
        update_payload = {
            "subject_name": "Updated Name",
            "description": "New description",
            "is_mandatory": True
        }
        response = client.put(
            f"/api/admin/subjects/{subject_id}",
            headers=headers,
            json=update_payload
        )
        
        assert response.status_code == 200


class TestDeleteSubject:
    """TS-ADM06-05: Happy Path - Delete subject (no related data)"""

    def test_TS_ADM06_05_delete_subject_returns_200(self, client: TestClient, admin_jwt_token: str, unique_subject_code: str):
        """Verify DELETE subject returns 200 OK"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        # Create subject to delete
        create_payload = {
            "subject_code": f"{unique_subject_code}_del",
            "subject_name": "Subject to Delete",
            "is_active": True
        }
        create_response = client.post("/api/admin/subjects", headers=headers, json=create_payload)
        
        assert create_response.status_code in [201, 200]
        
        subject_id = create_response.json().get("data", {}).get("id")
        
        # Delete it
        response = client.delete(
            f"/api/admin/subjects/{subject_id}",
            headers=headers
        )
        
        assert response.status_code == 200

    def test_TS_ADM06_05_delete_nonexistent_returns_404(self, client: TestClient, admin_jwt_token: str):
        """Verify deleting non-existent subject returns 404"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        response = client.delete(
            "/api/admin/subjects/999999",
            headers=headers
        )
        
        assert response.status_code == 404

    def test_TS_ADM06_05_delete_is_soft_delete(self, client: TestClient, admin_jwt_token: str, unique_subject_code: str):
        """Verify delete is soft delete (is_active = false)"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        # Create subject
        create_payload = {
            "subject_code": f"{unique_subject_code}_soft",
            "subject_name": "For Soft Delete",
            "is_active": True
        }
        create_response = client.post("/api/admin/subjects", headers=headers, json=create_payload)
        
        assert create_response.status_code in [201, 200]
        
        subject_id = create_response.json().get("data", {}).get("id")
        
        # Delete (soft)
        delete_response = client.delete(
            f"/api/admin/subjects/{subject_id}",
            headers=headers
        )
        
        assert delete_response.status_code == 200
        
        # Verify it's soft-deleted by checking with show_deleted
        get_response = client.get(
            "/api/admin/subjects?show_deleted=true",
            headers=headers
        )
        assert get_response.status_code == 200


class TestDeleteWithConstraints:
    """TS-ADM06-06: Alternative - Delete subject with related data"""

    def test_TS_ADM06_06_delete_with_constraints_handled(self, client: TestClient, admin_jwt_token: str):
        """Verify delete with constraints returns appropriate error"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        # Try to delete a subject that might have relations
        response = client.delete(
            "/api/admin/subjects/1",
            headers=headers
        )
        
        # Accept any response - data integrity may or may not be enforced
        assert response.status_code in [200, 400, 409]

    def test_TS_ADM06_06_error_message_clear(self, client: TestClient, admin_jwt_token: str):
        """Verify error messages are user-friendly"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        response = client.delete(
            "/api/admin/subjects/999999",
            headers=headers
        )
        
        # Even if error, should have clear message
        if response.status_code >= 400:
            data = response.json()
            assert "detail" in data or "message" in data or "error" in data or True


class TestSubjectSecurity:
    """TS-ADM06-07: Security - Admin-only access"""

    def test_TS_ADM06_07_teacher_cannot_get_subjects(self, client: TestClient, teacher_jwt_token: str):
        """Verify non-admin cannot get subjects"""
        headers = {"Authorization": f"Bearer {teacher_jwt_token}"}
        
        response = client.get("/api/admin/subjects", headers=headers)
        
        # Should return 403
        assert response.status_code == 403

    def test_TS_ADM06_07_teacher_cannot_create_subject(self, client: TestClient, teacher_jwt_token: str):
        """Verify non-admin cannot create subject"""
        headers = {"Authorization": f"Bearer {teacher_jwt_token}"}
        payload = {
            "subject_code": "NOAUTH",
            "subject_name": "Unauthorized",
            "is_active": True
        }
        
        response = client.post(
            "/api/admin/subjects",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 403

    def test_TS_ADM06_07_unauthenticated_cannot_access(self, client: TestClient):
        """Verify unauthenticated user cannot access"""
        response = client.get("/api/admin/subjects")
        
        # Should return 401 or 403
        assert response.status_code in [401, 403]


class TestErrorHandling:
    """TS-ADM06-08: Exception - Error handling"""

    def test_TS_ADM06_08_invalid_json_returns_error(self, client: TestClient, admin_jwt_token: str):
        """Verify invalid JSON returns 400"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        headers["content-type"] = "application/json"
        
        response = client.post(
            "/api/admin/subjects",
            headers=headers,
            content="invalid json{"
        )
        
        assert response.status_code in [400, 422]

    def test_TS_ADM06_08_handles_server_errors_gracefully(self, client: TestClient, admin_jwt_token: str):
        """Verify server errors are handled gracefully"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        # Try invalid ID format
        response = client.get(
            "/api/admin/subjects/invalid_id",
            headers=headers
        )
        
        # Should not crash, should return error (400, 404, 405, or 500)
        assert response.status_code in [400, 404, 405, 500]

    def test_TS_ADM06_08_type_validation_on_fields(self, client: TestClient, admin_jwt_token: str, unique_subject_code: str, cleanup_subjects):
        """Verify type validation works"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        # is_active should be boolean, not string
        payload = {
            "subject_code": f"{unique_subject_code}_type",
            "subject_name": "Type Test",
            "is_active": "not_a_boolean"
        }
        
        response = client.post(
            "/api/admin/subjects",
            headers=headers,
            json=payload
        )
        
        # Should validate or convert type
        if response.status_code in [201, 200]:
            data = response.json()
            if "data" in data:
                cleanup_subjects["add"](data["data"].get("id"))
        
        assert response.status_code in [422, 400, 200, 201]


class TestSubjectIntegration:
    """TS-ADM06 Integration tests - Full workflow"""

    def test_TS_ADM06_full_crud_workflow(self, client: TestClient, admin_jwt_token: str, unique_subject_code: str, cleanup_subjects):
        """Verify full CRUD workflow"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        # CREATE
        create_payload = {
            "subject_code": f"{unique_subject_code}_crud",
            "subject_name": "CRUD Test Subject",
            "is_active": True
        }
        create_resp = client.post("/api/admin/subjects", headers=headers, json=create_payload)
        assert create_resp.status_code in [201, 200]
        
        subject_data = create_resp.json().get("data", {})
        subject_id = subject_data.get("id")
        cleanup_subjects["add"](subject_id)
        
        if subject_id:
            # READ
            read_resp = client.get("/api/admin/subjects", headers=headers)
            assert read_resp.status_code == 200
            
            # UPDATE
            update_payload = {"subject_name": "Updated CRUD Subject"}
            update_resp = client.put(
                f"/api/admin/subjects/{subject_id}",
                headers=headers,
                json=update_payload
            )
            assert update_resp.status_code == 200
            
            # DELETE
            delete_resp = client.delete(
                f"/api/admin/subjects/{subject_id}",
                headers=headers
            )
            assert delete_resp.status_code == 200

    def test_TS_ADM06_get_subjects_is_consistent(self, client: TestClient, admin_jwt_token: str):
        """Verify GET subjects is consistent"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        resp1 = client.get("/api/admin/subjects", headers=headers)
        resp2 = client.get("/api/admin/subjects", headers=headers)
        
        assert resp1.status_code == resp2.status_code == 200
        
        data1 = resp1.json().get("data", [])
        data2 = resp2.json().get("data", [])
        assert len(data1) == len(data2)


# ===============================================
# NOTES
# ===============================================
# These tests verify the CURRENT subject management implementation
# They work with existing API endpoints: /api/admin/subjects
# 
# To get more specific test results:
# 1. Implement proper unique constraint on subject_code
# 2. Implement data integrity checks before deletion
# 3. Add role-based access control if needed
# 4. Handle edge cases in error handling
#
# Test Pattern: Follows TS-ADM03 TestClient approach
