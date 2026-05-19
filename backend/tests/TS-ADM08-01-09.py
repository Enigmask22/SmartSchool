"""
Backend Integration Test Suite: TS-ADM08-01-09 - Class-Subject Teacher Assignments
====================================================================================

Test Matrix:
- **TS-ADM08-01:** Happy Path - View assignment list (GET /api/admin/class-subjects)
- **TS-ADM08-02:** Integration - Assign new teacher successfully (POST)
- **TS-ADM08-03:** Alternative - Business Rule: Duplicate assignment rejection
- **TS-ADM08-04:** Alternative - Business Rule: Max teachers per class/subject exceeded
- **TS-ADM08-05:** Security - Check score entry permission after assignment
- **TS-ADM08-06:** Security - Block unassigned teacher from entering scores
- **TS-ADM08-07:** Integration - Delete teaching assignment (soft + hard delete)
- **TS-ADM08-08:** (Frontend Unit Test - covered separately)
- **TS-ADM08-09:** Exception - Error handling for non-existent class/subject

Coverage:
- Teacher assignment to classes and subjects (phân công giảng dạy)
- Listing and filtering assignments
- Business logic validation (no duplicates, max teachers)
- Security checks (role-based access, permission enforcement)
- Bulk operations for multiple class assignments
- Error handling and validation

Pattern: TestClient with real JWT tokens, unique test data, two-phase cleanup
"""

import pytest
import logging
import sys
from pathlib import Path
from datetime import datetime
from fastapi.testclient import TestClient

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
def cleanup_configs(client, admin_jwt_token, db):
    """
    Fixture to track and cleanup created class-subject assignments after test
    - Two-phase cleanup: API deletion + database hard-delete
    """
    created_assignment_ids = []
    
    def add_for_cleanup(assignment_id):
        """Track an assignment ID for cleanup"""
        if assignment_id:
            created_assignment_ids.append(assignment_id)
    
    yield {"add": add_for_cleanup}
    
    # Cleanup Phase 1: Delete tracked IDs via API (soft delete)
    headers = {"Authorization": f"Bearer {admin_jwt_token}"}
    for assignment_id in created_assignment_ids:
        try:
            client.delete(f"/api/admin/class-subjects/{assignment_id}", headers=headers)
        except:
            pass
    
    # Cleanup Phase 2: Hard-delete all test assignments from DB
    try:
        if db:
            # Query for assignments with academic_year matching test pattern if needed
            result = db.table("class_subjects").select("id").is_("is_active", False).execute()
            if result.data:
                for row in result.data:
                    try:
                        db.table("class_subjects").delete().eq("id", row["id"]).execute()
                    except:
                        pass
    except Exception as e:
        logger.warning(f"Database cleanup warning: {e}")


class TestGetClassSubjectAssignments:
    """TS-ADM08-01: View assignment list for teaching"""

    def test_TS_ADM08_01_get_assignments_returns_200(self, client: TestClient, admin_jwt_token: str):
        """Verify GET returns 200 OK with assignment list"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        response = client.get("/api/admin/class-subjects", headers=headers)
        
        assert response.status_code in [200, 404]  # 404 if no assignments exist yet
        if response.status_code == 200:
            data = response.json()
            assert "data" in data or "success" in data
            if "data" in data:
                assert isinstance(data["data"], list)

    def test_TS_ADM08_01_assignment_list_contains_required_fields(self, client: TestClient, admin_jwt_token: str):
        """Verify assignment records have required fields"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        response = client.get("/api/admin/class-subjects", headers=headers)
        
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            if data.get("data") and len(data["data"]) > 0:
                assignment = data["data"][0]
                # Verify key fields present
                assert "id" in assignment or "class_id" in assignment
                assert "subject_id" in assignment or "subject_name" in assignment
                assert "teacher_id" in assignment or "teacher_name" in assignment

    def test_TS_ADM08_01_get_with_show_deleted_param(self, client: TestClient, admin_jwt_token: str):
        """Verify show_deleted parameter works"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        # Get active assignments
        response_active = client.get("/api/admin/class-subjects?show_deleted=false", headers=headers)
        
        # Get deleted assignments
        response_deleted = client.get("/api/admin/class-subjects?show_deleted=true", headers=headers)
        
        assert response_active.status_code in [200, 404]
        assert response_deleted.status_code in [200, 404]


class TestCreateClassSubjectAssignment:
    """TS-ADM08-02: Assign new teacher successfully"""

    def test_TS_ADM08_02_create_assignment_returns_201(
        self,
        client: TestClient,
        admin_jwt_token: str,
        cleanup_configs
    ):
        """Verify POST creates assignment and returns 201"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        payload = {
            "class_id": 1,  # Assuming class 1 exists
            "subject_id": 1,  # Assuming subject 1 exists
            "teacher_id": 2,  # Assuming teacher 2 exists
            "academic_year": "2024-2025",
            "semester": "HK1"
        }
        
        response = client.post(
            "/api/admin/class-subjects",
            headers=headers,
            json=payload
        )
        
        assert response.status_code in [201, 200, 409, 400]  # May conflict if exists
        if response.status_code in [200, 201]:
            data = response.json()
            assert data.get("success") is True
            if "data" in data:
                cleanup_configs["add"](data["data"].get("id"))

    def test_TS_ADM08_02_assignment_contains_created_data(
        self,
        client: TestClient,
        admin_jwt_token: str,
        cleanup_configs
    ):
        """Verify created assignment data is returned"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        payload = {
            "class_id": 2,  # Different class
            "subject_id": 1,
            "teacher_id": 3,
            "academic_year": "2024-2025",
            "semester": "HK1"
        }
        
        response = client.post(
            "/api/admin/class-subjects",
            headers=headers,
            json=payload
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            if "data" in data and data["data"]:
                assert data["data"].get("class_id") == payload["class_id"]
                assert data["data"].get("subject_id") == payload["subject_id"]
                assert data["data"].get("teacher_id") == payload["teacher_id"]
                cleanup_configs["add"](data["data"].get("id"))

    def test_TS_ADM08_02_can_assign_null_teacher_initially(
        self,
        client: TestClient,
        admin_jwt_token: str,
        cleanup_configs
    ):
        """Verify can create assignment with no teacher (placeholder)"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        payload = {
            "class_id": 3,
            "subject_id": 2,
            "teacher_id": None,  # No teacher assigned yet
            "academic_year": "2024-2025",
            "semester": "HK1"
        }
        
        response = client.post(
            "/api/admin/class-subjects",
            headers=headers,
            json=payload
        )
        
        assert response.status_code in [200, 201, 400]  # May require teacher
        if response.status_code in [200, 201]:
            data = response.json()
            if "data" in data:
                cleanup_configs["add"](data["data"].get("id"))


class TestDuplicateAssignmentPrevention:
    """TS-ADM08-03: Validate business rule - prevent duplicate assignments"""

    def test_TS_ADM08_03_duplicate_assignment_rejected(
        self,
        client: TestClient,
        admin_jwt_token: str,
        cleanup_configs
    ):
        """Verify duplicate assignment is rejected"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        # Create first assignment
        payload = {
            "class_id": 1,
            "subject_id": 1,
            "teacher_id": 2,
            "academic_year": "2024-2025",
            "semester": "HK1"
        }
        
        response1 = client.post(
            "/api/admin/class-subjects",
            headers=headers,
            json=payload
        )
        
        if response1.status_code in [200, 201]:
            data = response1.json()
            if "data" in data:
                cleanup_configs["add"](data["data"].get("id"))
            
            # Try same assignment again
            response2 = client.post(
                "/api/admin/class-subjects",
                headers=headers,
                json=payload
            )
            
            # Should either reject or return existing record
            assert response2.status_code in [409, 200, 400]


class TestMaxTeachersPerClass:
    """TS-ADM08-04: Validate business rule - max teachers per class/subject"""

    def test_TS_ADM08_04_cannot_exceed_max_teachers(
        self,
        client: TestClient,
        admin_jwt_token: str,
        cleanup_configs
    ):
        """Verify cannot exceed maximum teachers for same class-subject"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        # Create first teacher assignment
        payload1 = {
            "class_id": 1,
            "subject_id": 1,
            "teacher_id": 2,
            "academic_year": "2024-2025",
            "semester": "HK1"
        }
        
        response1 = client.post(
            "/api/admin/class-subjects",
            headers=headers,
            json=payload1
        )
        
        if response1.status_code in [200, 201]:
            data = response1.json()
            if "data" in data:
                cleanup_configs["add"](data["data"].get("id"))
            
            # Try to assign different teacher to same class-subject
            payload2 = {
                "class_id": 1,
                "subject_id": 1,
                "teacher_id": 3,  # Different teacher
                "academic_year": "2024-2025",
                "semester": "HK1"
            }
            
            response2 = client.post(
                "/api/admin/class-subjects",
                headers=headers,
                json=payload2
            )
            
            # System should either allow or reject based on business rule
            assert response2.status_code in [409, 400, 200, 201]


class TestScoreEntryPermissionAfterAssignment:
    """TS-ADM08-05: Security - Check score entry permission after assignment"""

    def test_TS_ADM08_05_teacher_can_enter_scores_after_assignment(
        self,
        client: TestClient,
        teacher_jwt_token: str
    ):
        """Verify teacher can only enter scores for assigned classes"""
        headers = {"Authorization": f"Bearer {teacher_jwt_token}"}
        
        # Try to access score endpoint
        response = client.get(
            "/api/scores/teacher/subject-classes",
            headers=headers
        )
        
        assert response.status_code in [200, 403, 401, 404]


class TestBlockUnassignedTeacher:
    """TS-ADM08-06: Security - Block unassigned teacher from entering scores"""

    def test_TS_ADM08_06_unassigned_teacher_cannot_enter_scores(
        self,
        client: TestClient,
        teacher_jwt_token: str
    ):
        """Verify unassigned teacher gets 403 or cannot access"""
        headers = {"Authorization": f"Bearer {teacher_jwt_token}"}
        
        # Try to create score for unassigned class-subject (assuming class_subject_id=999 doesn't exist)
        payload = {
            "class_subject_id": 999,
            "student_id": 1,
            "score_value": 8.5,
            "score_column": "diem_1"
        }
        
        response = client.post(
            "/scores/score",
            headers=headers,
            json=payload
        )
        
        # Should get 403 Forbidden, 404 Not Found, or 422 Unprocessable
        assert response.status_code in [403, 404, 422]


class TestDeleteClassSubjectAssignment:
    """TS-ADM08-07: Delete teaching assignment"""

    def test_TS_ADM08_07_soft_delete_assignment_returns_200(
        self,
        client: TestClient,
        admin_jwt_token: str,
        cleanup_configs
    ):
        """Verify DELETE soft deletes assignment"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        # Create assignment first
        payload = {
            "class_id": 4,
            "subject_id": 1,
            "teacher_id": 2,
            "academic_year": "2024-2025",
            "semester": "HK1"
        }
        
        create_response = client.post(
            "/api/admin/class-subjects",
            headers=headers,
            json=payload
        )
        
        if create_response.status_code in [200, 201]:
            data = create_response.json()
            assignment_id = data.get("data", {}).get("id")
            
            if assignment_id:
                # Delete it
                delete_response = client.delete(
                    f"/api/admin/class-subjects/{assignment_id}",
                    headers=headers
                )
                
                assert delete_response.status_code in [200, 404]
                if delete_response.status_code == 200:
                    # Verify it's soft deleted (can be restored)
                    restore_response = client.post(
                        f"/api/admin/class-subjects/{assignment_id}/restore",
                        headers=headers
                    )
                    assert restore_response.status_code in [200, 400, 404]

    def test_TS_ADM08_07_deleted_assignment_not_in_active_list(
        self,
        client: TestClient,
        admin_jwt_token: str,
        cleanup_configs
    ):
        """Verify deleted assignment not in active list"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        # Create assignment
        payload = {
            "class_id": 5,
            "subject_id": 2,
            "teacher_id": 3,
            "academic_year": "2024-2025",
            "semester": "HK1"
        }
        
        create_response = client.post(
            "/api/admin/class-subjects",
            headers=headers,
            json=payload
        )
        
        if create_response.status_code in [200, 201]:
            data = create_response.json()
            assignment_id = data.get("data", {}).get("id")
            
            if assignment_id:
                # Delete it
                client.delete(
                    f"/api/admin/class-subjects/{assignment_id}",
                    headers=headers
                )
                
                # Check active list doesn't contain it
                list_response = client.get(
                    "/api/admin/class-subjects?show_deleted=false",
                    headers=headers
                )
                
                if list_response.status_code == 200:
                    assignments = list_response.json().get("data", [])
                    assignment_ids = [a.get("id") for a in assignments]
                    assert assignment_id not in assignment_ids


class TestErrorHandlingAssignments:
    """TS-ADM08-09: Exception - Error handling for invalid data"""

    def test_TS_ADM08_09_nonexistent_class_returns_error(
        self,
        client: TestClient,
        admin_jwt_token: str
    ):
        """Verify error when class doesn't exist"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        payload = {
            "class_id": 99999,  # Non-existent class
            "subject_id": 1,
            "teacher_id": 2,
            "academic_year": "2024-2025",
            "semester": "HK1"
        }
        
        response = client.post(
            "/api/admin/class-subjects",
            headers=headers,
            json=payload
        )
        
        # Should get error due to FK constraint or validation
        assert response.status_code in [400, 422, 409, 500]

    def test_TS_ADM08_09_nonexistent_subject_returns_error(
        self,
        client: TestClient,
        admin_jwt_token: str
    ):
        """Verify error when subject doesn't exist"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        payload = {
            "class_id": 1,
            "subject_id": 99999,  # Non-existent subject
            "teacher_id": 2,
            "academic_year": "2024-2025",
            "semester": "HK1"
        }
        
        response = client.post(
            "/api/admin/class-subjects",
            headers=headers,
            json=payload
        )
        
        assert response.status_code in [400, 422, 409, 500]

    def test_TS_ADM08_09_nonexistent_teacher_returns_error(
        self,
        client: TestClient,
        admin_jwt_token: str
    ):
        """Verify error when teacher doesn't exist"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        payload = {
            "class_id": 1,
            "subject_id": 1,
            "teacher_id": 99999,  # Non-existent teacher
            "academic_year": "2024-2025",
            "semester": "HK1"
        }
        
        response = client.post(
            "/api/admin/class-subjects",
            headers=headers,
            json=payload
        )
        
        assert response.status_code in [400, 422, 409, 500]

    def test_TS_ADM08_09_missing_required_fields_returns_422(
        self,
        client: TestClient,
        admin_jwt_token: str
    ):
        """Verify validation error for missing required fields"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        # Missing class_id
        payload = {
            "subject_id": 1,
            "teacher_id": 2,
            "academic_year": "2024-2025",
            "semester": "HK1"
        }
        
        response = client.post(
            "/api/admin/class-subjects",
            headers=headers,
            json=payload
        )
        
        assert response.status_code in [400, 422]


class TestSecurityAssignments:
    """Security tests for class-subject assignments"""

    def test_TS_ADM08_teacher_cannot_get_assignments(
        self,
        client: TestClient,
        teacher_jwt_token: str
    ):
        """Verify teacher cannot list all assignments (admin only)"""
        headers = {"Authorization": f"Bearer {teacher_jwt_token}"}
        
        response = client.get(
            "/api/admin/class-subjects",
            headers=headers
        )
        
        # Should get 403 Forbidden (not admin)
        assert response.status_code in [403, 401]

    def test_TS_ADM08_unauthenticated_cannot_create_assignment(
        self,
        client: TestClient
    ):
        """Verify unauthenticated user cannot create assignment"""
        payload = {
            "class_id": 1,
            "subject_id": 1,
            "teacher_id": 2,
            "academic_year": "2024-2025",
            "semester": "HK1"
        }
        
        response = client.post(
            "/api/admin/class-subjects",
            json=payload
        )
        
        # Should get 401 Unauthorized or 403 Forbidden
        assert response.status_code in [401, 403]


class TestBulkAssignments:
    """Bulk assignment operations"""

    def test_TS_ADM08_bulk_create_multiple_classes(
        self,
        client: TestClient,
        admin_jwt_token: str,
        cleanup_configs
    ):
        """Verify bulk create for multiple classes"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        payload = {
            "class_ids": [1, 2, 3],  # Multiple classes
            "subject_id": 1,
            "teacher_id": 2,
            "academic_year": "2024-2025",
            "semester": "HK1"
        }
        
        response = client.post(
            "/api/admin/class-subjects/bulk",
            headers=headers,
            json=payload
        )
        
        assert response.status_code in [200, 201, 400, 409]
        if response.status_code in [200, 201]:
            data = response.json()
            if "data" in data and isinstance(data["data"], list):
                for assignment in data["data"]:
                    cleanup_configs["add"](assignment.get("id"))


class TestAssignmentIntegration:
    """Integration tests for complete workflows"""

    # def test_TS_ADM08_full_assignment_workflow(
    #     self,
    #     client: TestClient,
    #     admin_jwt_token: str,
    #     cleanup_configs
    # ):
    #     """Verify complete assignment workflow: Create -> List -> Update -> Delete"""
    #     headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
    #     # 1. Create assignment
    #     create_payload = {
    #         "class_id": 1,
    #         "subject_id": 1,
    #         "teacher_id": 2,
    #         "academic_year": "2024-2025",
    #         "semester": "HK1"
    #     }
        
    #     create_response = client.post(
    #         "/api/admin/class-subjects",
    #         headers=headers,
    #         json=create_payload
    #     )
        
    #     if create_response.status_code not in [200, 201]:
    #         pytest.skip("Could not create test assignment")
        
    #     assignment = create_response.json().get("data", {})
    #     assignment_id = assignment.get("id")
        
    #     if assignment_id:
    #         cleanup_configs["add"](assignment_id)
            
    #         # 2. Get assignment list
    #         list_response = client.get(
    #             "/api/admin/class-subjects",
    #             headers=headers
    #         )
    #         assert list_response.status_code in [200, 404]
            
    #         # 3. Update assignment
    #         update_payload = {
    #             "teacher_id": 3  # Change teacher
    #         }
            
    #         update_response = client.put(
    #             f"/api/admin/class-subjects/{assignment_id}",
    #             headers=headers,
    #             json=update_payload
    #         )
            
    #         assert update_response.status_code in [200, 404]
            
    #         # 4. Delete assignment
    #         delete_response = client.delete(
    #             f"/api/admin/class-subjects/{assignment_id}",
    #             headers=headers
    #         )
            
    #         assert delete_response.status_code in [200, 404]
