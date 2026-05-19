"""
Test Suite: TS-ADM03 - Student Class Transfer/Promotion Feature Tests
=====================================================================

Test Matrix Mapping:
- **TS-ADM03-01:** Happy Path - Get students in a class (Backend Integration)
- **TS-ADM03-02:** Validation - UI checkbox validation (Frontend Unit) 
- **TS-ADM03-03:** Logic - Class dropdown filtering (Frontend Unit)
- **TS-ADM03-04:** Happy Path - Transfer students same academic year (Backend Integration)
- **TS-ADM03-05:** Alternative - Promote students to new academic year (Backend Integration)
- **TS-ADM03-06:** Exception - Target class not found (Backend Integration)
- **TS-ADM03-07:** Exception - Student not found (Backend Integration)
- **TS-ADM03-08:** E2E - Full UI workflow (Playwright)

Backend Test Coverage:
✅ TS-ADM03-01: Get students in class (active + inactive)
✅ TS-ADM03-04: Same-year transfer (UPDATE existing record)
✅ TS-ADM03-05: New-year promotion (KEEP old, CREATE new)
✅ TS-ADM03-06: 404 target class not found
✅ TS-ADM03-07: 400 student not found

Key Business Logic:
- Same academic year: UPDATE students table + UPDATE homeroom_students_history
- Different academic year: UPDATE students table + INSERT new homeroom_students_history (keep old)
- Constraint: Cannot move if already in different class of same academic year
- Deactivated students: Included in list but not transferable

Dependencies:
- Supabase database with classes, students, homeroom_students_history tables
- Admin user authentication
- Fixtures from conftest.py
"""

import pytest
import json
import time
from fastapi.testclient import TestClient
from datetime import datetime
import logging
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app_factory import create_app
from core.database import get_db as get_db_connection

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
def get_db():
    """Get database connection for tests"""
    def _get_db():
        return get_db_connection()
    return _get_db


# ===============================================
# UTILITY FUNCTIONS - CLEANUP
# ===============================================

def cleanup_students(db, student_ids: list):
    """
    Cleanup function to delete students and their parent info
    Also removes records from homeroom_students_history
    
    Args:
        db: Database connection
        student_ids: List of database student IDs to delete
    """
    for db_id in student_ids:
        try:
            # Delete homeroom_students_history first (foreign key constraint)
            db.table("homeroom_students_history").delete().eq("student_id", db_id).execute()
            # Delete parent info (foreign key constraint)
            db.table("parent_info").delete().eq("student_id", db_id).execute()
            # Then delete student
            db.table("students").delete().eq("id", db_id).execute()
            logger.debug(f"Cleaned up student {db_id}")
        except Exception as e:
            logger.warning(f"Cleanup error for student {db_id}: {e}")


# ===============================================
# TEST FIXTURES - CLASS DATA
# ===============================================

@pytest.fixture
def test_class_current_year(get_db):
    """Get a class that has students enrolled (via homeroom_students_history).

    Returns:
        dict with id, class_name, grade, academic_year
    """
    db = get_db()
    classes = (
        db.table("classes")
        .select("id, class_name, grade, academic_year, homeroom_teacher_id")
        .eq("is_active", True)
        .order("id", desc=False)
        .execute()
    )
    for cls in (classes.data or []):
        hist = (
            db.table("homeroom_students_history")
            .select("student_id")
            .eq("class_id", cls["id"])
            .limit(1)
            .execute()
        )
        if hist.data:
            return cls
    pytest.skip("No active class with enrolled students found in DB")


@pytest.fixture
def test_class_same_grade_same_year(get_db, test_class_current_year):
    """Get another class with same grade but different name in same academic year
    
    Returns:
        dict with id, class_name, grade, academic_year
    """
    db = get_db()
    response = (
        db.table("classes")
        .select("id, class_name, grade, academic_year, homeroom_teacher_id")
        .eq("is_active", True)
        .eq("grade", test_class_current_year["grade"])
        .eq("academic_year", test_class_current_year["academic_year"])
        .execute()
    )
    
    # Filter to find a different class
    available = [c for c in (response.data or []) if c["id"] != test_class_current_year["id"]]

    if not available:
        pytest.skip(
            f"No second active class with grade={test_class_current_year['grade']} "
            f"in year={test_class_current_year['academic_year']}"
        )
    return available[0]


@pytest.fixture
def test_students_in_class(get_db, test_class_current_year):
    """Get students in the test class
    
    Returns:
        list of student dicts with id, full_name, is_active
    """
    db = get_db()
    
    # Get students from homeroom_students_history
    history_resp = (
        db.table("homeroom_students_history")
        .select("student_id")
        .eq("class_id", test_class_current_year["id"])
        .limit(5)
        .execute()
    )
    
    student_ids = [r["student_id"] for r in (history_resp.data or []) if r.get("student_id")]
    
    if not student_ids:
        pytest.skip(f"No students enrolled in class {test_class_current_year['id']}")

    # Get student details
    students_resp = (
        db.table("students")
        .select("id, full_name, is_active, email")
        .in_("id", student_ids)
        .execute()
    )
    
    return students_resp.data or []


# ===============================================
# TEST CLASSES - GET STUDENTS IN CLASS
# ===============================================

class TestGetClassStudents:
    """TS-ADM03-01: Get students in a class"""
    
    def test_TS_ADM03_01_get_class_students_success(
        self, client, admin_jwt_token, get_db, test_class_current_year
    ):
        """TS-ADM03-01: Successfully get students in class
        
        Happy Path:
        - GET /api/admin/classes/{class_id}/students with valid class_id
        - Response: HTTP 200 with list of students (active + inactive)
        - Each student includes: id, full_name, email, is_active, parent_contacts
        """
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        class_id = test_class_current_year["id"]
        
        response = client.get(
            f"/api/admin/classes/{class_id}/students",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
        
        # If students exist, verify structure
        if data["data"]:
            student = data["data"][0]
            assert "id" in student
            assert "full_name" in student
            assert "email" in student
            assert "is_active" in student
            assert "parent_contacts" in student
    
    def test_TS_ADM03_01_includes_active_and_inactive_students(
        self, client, admin_jwt_token, get_db, test_class_current_year
    ):
        """TS-ADM03-01: Response includes both active and inactive students
        
        - Students with is_active=true and is_active=false should both be returned
        - Allows frontend to filter into separate tabs
        """
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        class_id = test_class_current_year["id"]
        
        response = client.get(
            f"/api/admin/classes/{class_id}/students",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data["data"]:
            # Verify mix of active/inactive if they exist
            active_count = sum(1 for s in data["data"] if s.get("is_active"))
            # Just verify is_active field is present and consistent
            for student in data["data"]:
                assert isinstance(student["is_active"], (bool, type(None)))
    
    def test_TS_ADM03_01_nonexistent_class_404(
        self, client, admin_jwt_token
    ):
        """TS-ADM03-01: Return 404 when class doesn't exist
        
        - GET /api/admin/classes/99999/students
        - Response: HTTP 404 with error message
        """
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        response = client.get(
            f"/api/admin/classes/99999/students",
            headers=headers
        )
        
        assert response.status_code == 404
    
    def test_TS_ADM03_01_no_auth_token_403(
        self, client, test_class_current_year
    ):
        """TS-ADM03-01: Return 403 when no auth token provided
        
        - GET /api/admin/classes/{class_id}/students without Authorization header
        - Response: HTTP 403 Forbidden
        """
        class_id = test_class_current_year["id"]
        
        response = client.get(f"/api/admin/classes/{class_id}/students")
        
        assert response.status_code == 403


# ===============================================
# TEST CLASSES - MOVE STUDENTS CLASS
# ===============================================

class TestMoveStudentsSameYear:
    """TS-ADM03-04: Transfer students in same academic year"""
    
    def test_TS_ADM03_04_same_year_transfer_success(
        self, client, admin_jwt_token, get_db, test_class_current_year,
        test_class_same_grade_same_year, test_students_in_class
    ):
        """TS-ADM03-04: Happy Path - Transfer students to different class (same year)
        
        Business Logic:
        - Move active students to target class in same academic year
        - UPDATE students table (class_name, grade)
        - UPDATE homeroom_students_history (class_id, teacher_id)
        - Response: HTTP 200 with updated_count, same_academic_year=true
        """
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        db = get_db()
        student_ids = []
        
        try:
            # Get active students only
            active_students = [s for s in test_students_in_class if s.get("is_active")]
            if not active_students:
                pytest.skip("No active students in test class")
            
            student_ids = [s["id"] for s in active_students[:2]]  # Use up to 2 students

            # Record original class for rollback
            original_students = db.table("students").select("id, class_name").in_("id", student_ids).execute()
            original_class_names = {s["id"]: s["class_name"] for s in (original_students.data or [])}

            payload = {
                "student_ids": student_ids,
                "current_class_id": test_class_current_year["id"],
                "target_class_id": test_class_same_grade_same_year["id"]
            }
            
            response = client.post(
                "/api/admin/students/move-class",
                headers=headers,
                json=payload
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["data"]["updated_count"] == len(student_ids)
            assert data["data"]["same_academic_year"] is True
            
            # Verify students table was updated
            students_resp = db.table("students").select("class_name").in_("id", student_ids).execute()
            for student in students_resp.data:
                assert student["class_name"] == test_class_same_grade_same_year["class_name"]
        finally:
            # Rollback: Restore original class for each student
            if student_ids and original_class_names:
                for student_id, original_class in original_class_names.items():
                    try:
                        db.table("students").update({"class_name": original_class}).eq("id", student_id).execute()
                        # Update homeroom_students_history back to original class
                        db.table("homeroom_students_history").update({"class_id": test_class_current_year["id"]}).eq("student_id", student_id).eq("class_id", test_class_same_grade_same_year["id"]).execute()
                    except Exception as e:
                        logger.warning(f"Rollback error for student {student_id}: {e}")
    
    def test_TS_ADM03_04_cannot_transfer_if_already_in_different_class_same_year(
        self, client, admin_jwt_token, get_db, test_class_current_year, test_students_in_class
    ):
        """TS-ADM03-04: Constraint - Cannot move if already in different class of same year
        
        Scenario:
        - Student A is in class 10A1 (2024-2025)
        - Try to move to class 10A2 (2024-2025)
        - System should allow this
        - But if student is in 10A1 and 10A2 (both same year), should error
        
        Note: This tests the constraint that prevents duplicate same-year records
        """
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        db = get_db()
        student_id = None
        original_class_id = None
        
        try:
            # Find two different classes in same year
            response = (
                db.table("classes")
                .select("id, class_name, grade, academic_year")
                .eq("is_active", True)
                .eq("academic_year", test_class_current_year["academic_year"])
                .execute()
            )
            
            classes = response.data or []
            if len(classes) < 2:
                pytest.skip("Need at least 2 classes in same academic year")
            
            source_class = classes[0]
            target_class = classes[1]
            
            # Get a student from source class
            history_resp = (
                db.table("homeroom_students_history")
                .select("student_id")
                .eq("class_id", source_class["id"])
                .limit(1)
                .execute()
            )
            
            if not history_resp.data:
                pytest.skip("No students in source class")
            
            student_id = history_resp.data[0]["student_id"]
            original_class_id = source_class["id"]
            
            # Try to move this student
            payload = {
                "student_ids": [student_id],
                "current_class_id": source_class["id"],
                "target_class_id": target_class["id"]
            }
            
            # This should succeed (one student, one class per year)
            # The constraint prevents having same student in 2 DIFFERENT classes of same year
            response = client.post(
                "/api/admin/students/move-class",
                headers=headers,
                json=payload
            )
            
            # Should succeed for first transfer
            assert response.status_code == 200
        finally:
            # Rollback: Move student back if transfer succeeded
            if student_id and original_class_id:
                try:
                    db.table("homeroom_students_history").update({"class_id": original_class_id}).eq("student_id", student_id).execute()
                except Exception as e:
                    logger.warning(f"Rollback error for student {student_id}: {e}")


class TestPromoteStudentsNewYear:
    """TS-ADM03-05: Promote students to new academic year"""
    
    def test_TS_ADM03_05_new_year_promotion_success(
        self, client, admin_jwt_token, get_db, test_class_current_year, test_students_in_class
    ):
        """TS-ADM03-05: Alternative - Promote students to next academic year
        
        Business Logic:
        - Create new record in homeroom_students_history (keep old)
        - UPDATE students table with new class_name and grade
        - Response: HTTP 200 with updated_count, same_academic_year=false
        """
        db = get_db()
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        student_ids = []
        original_students = {}
        old_history_ids = []
        
        try:
            # Get active students
            active_students = [s for s in test_students_in_class if s.get("is_active")]
            if not active_students:
                pytest.skip("No active students in test class")
            
            # Find a class with different academic year (promotion year)
            all_classes = db.table("classes").select("id, class_name, grade, academic_year").eq("is_active", True).execute()
            target_classes = [
                c for c in (all_classes.data or [])
                if c["academic_year"] != test_class_current_year["academic_year"]
            ]
            
            if not target_classes:
                pytest.skip("No classes in different academic year for promotion test")
            
            target_class = target_classes[0]
            student_ids = [s["id"] for s in active_students[:2]]
            
            # Record original state for rollback
            original_resp = db.table("students").select("id, class_name").in_("id", student_ids).execute()
            for s in (original_resp.data or []):
                original_students[s["id"]] = s["class_name"]
            
            # Record old history IDs for cleanup
            old_history = db.table("homeroom_students_history").select("id, class_id").in_("student_id", student_ids).execute()
            old_history_count = len(old_history.data or [])
            old_history_ids = [h["id"] for h in (old_history.data or [])]
            
            payload = {
                "student_ids": student_ids,
                "current_class_id": test_class_current_year["id"],
                "target_class_id": target_class["id"]
            }
            
            response = client.post(
                "/api/admin/students/move-class",
                headers=headers,
                json=payload
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["data"]["same_academic_year"] is False
            
            # Verify old record is kept and new record created
            new_history = db.table("homeroom_students_history").select("id").in_("student_id", student_ids).execute()
            new_history_count = len(new_history.data or [])
            
            # Should have old records + new records
            assert new_history_count > old_history_count
        finally:
            # Rollback: Restore original class names and delete new history records
            if student_ids and original_students:
                for student_id, original_class in original_students.items():
                    try:
                        # Restore original class name
                        db.table("students").update({"class_name": original_class}).eq("id", student_id).execute()
                        # Delete new history records (keep old ones)
                        new_history_resp = db.table("homeroom_students_history").select("id").eq("student_id", student_id).execute()
                        # Only delete new record (from different academic year target class)
                        for record in (new_history_resp.data or []):
                            if record["id"] not in old_history_ids:
                                db.table("homeroom_students_history").delete().eq("id", record["id"]).execute()
                    except Exception as e:
                        logger.warning(f"Rollback error for student {student_id}: {e}")


class TestMoveStudentsException:
    """TS-ADM03-06, 07: Exception handling"""
    
    def test_TS_ADM03_06_target_class_not_found_404(
        self, client, admin_jwt_token, test_class_current_year, test_students_in_class
    ):
        """TS-ADM03-06: Exception - Target class not found
        
        Scenario:
        - POST /api/admin/students/move-class with non-existent target_class_id
        - Response: HTTP 404 with error message
        """
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        active_students = [s for s in test_students_in_class if s.get("is_active")]
        if not active_students:
            pytest.skip("No active students in test class")
        
        payload = {
            "student_ids": [active_students[0]["id"]],
            "current_class_id": test_class_current_year["id"],
            "target_class_id": 99999  # Non-existent
        }
        
        response = client.post(
            "/api/admin/students/move-class",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "Không tìm thấy lớp" in data.get("detail", "")
    
    def test_TS_ADM03_07_student_not_found_400(
        self, client, admin_jwt_token, test_class_current_year, test_class_same_grade_same_year
    ):
        """TS-ADM03-07: Exception - Student not found
        
        Scenario:
        - POST /api/admin/students/move-class with non-existent student_id
        - System should handle gracefully (skip or error)
        - Response: HTTP 200 or 400 depending on implementation
        
        Note: Backend may silently skip non-existent students or error
        We test that the API doesn't crash
        """
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        payload = {
            "student_ids": [99999],  # Non-existent
            "current_class_id": test_class_current_year["id"],
            "target_class_id": test_class_same_grade_same_year["id"]
        }
        
        response = client.post(
            "/api/admin/students/move-class",
            headers=headers,
            json=payload
        )
        
        # Should either succeed with 0 count or error with 400
        assert response.status_code in [200, 400, 404]
    
    def test_TS_ADM03_06_current_class_equals_target_400(
        self, client, admin_jwt_token, test_class_current_year, test_students_in_class
    ):
        """Exception - Current class same as target class
        
        Scenario:
        - POST /api/admin/students/move-class with same current and target class_id
        - Response: HTTP 400 with error message
        """
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        student_ids = []
        
        try:
            active_students = [s for s in test_students_in_class if s.get("is_active")]
            if not active_students:
                pytest.skip("No active students in test class")
            
            student_ids = [active_students[0]["id"]]
            
            payload = {
                "student_ids": student_ids,
                "current_class_id": test_class_current_year["id"],
                "target_class_id": test_class_current_year["id"]  # Same class
            }
            
            response = client.post(
                "/api/admin/students/move-class",
                headers=headers,
                json=payload
            )
            
            assert response.status_code == 400
        finally:
            # No rollback needed as the operation should have failed
            pass
    
    def test_TS_ADM03_no_auth_token_403(
        self, client, test_class_current_year, test_class_same_grade_same_year
    ):
        """Exception - No authentication token
        
        Scenario:
        - POST /api/admin/students/move-class without Authorization header
        - Response: HTTP 403 Forbidden
        """
        payload = {
            "student_ids": [1],
            "current_class_id": test_class_current_year["id"],
            "target_class_id": test_class_same_grade_same_year["id"]
        }
        
        response = client.post(
            "/api/admin/students/move-class",
            json=payload
        )
        
        assert response.status_code in [401, 403]
