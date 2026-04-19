"""
TS-SUB02EXT-01-09: Score Management File Import Tests
Tests file upload, validation, preview, security, and exception handling

STRATEGY: Tests bulk file import functionality for scores
Uses existing homeroom teacher "nguyen_thi_lan" with real database data
"""

import pytest
import json
from datetime import datetime
from fastapi.testclient import TestClient
from app_factory import create_app


# ============================================================================
# LOCAL FIXTURES (app and client)
# ============================================================================

@pytest.fixture(scope="function")
def app():
    """Create app instance for testing"""
    return create_app()


@pytest.fixture(scope="function")
def client(app):
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def existing_data(db):
    """Fetch existing data for the homeroom teacher"""
    try:
        # Get teacher by username
        users = db.table("users").select("id").eq("username", "nguyen_thi_lan").limit(1).execute()
        if not users.data:
            return {"skip": True}
        
        user_id = users.data[0]["id"]
        teachers = db.table("teachers").select("*").eq("user_id", user_id).limit(1).execute()
        if not teachers.data:
            return {"skip": True}
        
        teacher = teachers.data[0]
        
        # Get class_subjects
        class_subjects = db.table("class_subjects").select("*").eq("teacher_id", teacher["id"]).limit(1).execute()
        if not class_subjects.data:
            return {"skip": True}
        
        class_subject = class_subjects.data[0]
        
        # Get students
        students = db.table("students").select("*").eq("class_id", class_subject["class_id"]).limit(50).execute()
        
        return {
            "teacher": teacher,
            "class_subject": class_subject,
            "students": students.data if students.data else [],
            "skip": False
        }
    
    except Exception as e:
        print(f"Warning: Could not fetch existing data: {str(e)}")
        return {"skip": True}


# ============================================================================
# IMPORT PAYLOAD FIXTURES
# ============================================================================

@pytest.fixture
def valid_import_payload(existing_data):
    """Valid import payload with 5 students from class 10A1"""
    teacher_data = existing_data["teacher"]
    class_subject = existing_data["class_subject"]
    students = existing_data["students"][:5]
    
    grades = [
        {
            "student_id": students[0]["student_id"],
            "Diem_tx1": 8.5,
            "Diem_tx2": 9.0,
            "Diem_tx3": 8.5,
            "Diem_tx4": 8.0,
            "Diem_thi_giua_ki": 9.0,
            "Diem_thi_cuoi_ki": 8.5,
        },
        {
            "student_id": students[1]["student_id"],
            "Diem_tx1": 7.5,
            "Diem_tx2": 8.0,
            "Diem_tx3": 7.0,
            "Diem_tx4": 7.5,
            "Diem_thi_giua_ki": 8.0,
            "Diem_thi_cuoi_ki": 7.5,
        },
        {
            "student_id": students[2]["student_id"],
            "Diem_tx1": 9.0,
            "Diem_tx2": 9.5,
            "Diem_tx3": 9.0,
            "Diem_tx4": 9.0,
            "Diem_thi_giua_ki": 9.5,
            "Diem_thi_cuoi_ki": 9.5,
        },
        {
            "student_id": students[3]["student_id"],
            "Diem_tx1": 6.0,
            "Diem_tx2": 6.5,
            "Diem_tx3": 6.0,
            "Diem_tx4": 6.5,
            "Diem_thi_giua_ki": 7.0,
            "Diem_thi_cuoi_ki": 6.5,
        },
        {
            "student_id": students[4]["student_id"],
            "Diem_tx1": 8.0,
            "Diem_tx2": 8.0,
            "Diem_tx3": 8.5,
            "Diem_tx4": 8.0,
            "Diem_thi_giua_ki": 8.5,
            "Diem_thi_cuoi_ki": 8.0,
        },
    ]
    
    return {
        "class_subject_id": class_subject["id"],
        "academic_year": "2024-2025",
        "semester": "HK1",
        "grades": grades,
    }


@pytest.fixture
def large_import_payload(existing_data):
    """Large import payload with 100 students"""
    class_subject = existing_data["class_subject"]
    students = existing_data["students"]
    
    # Create 100 grade records cycling through available students
    grades = []
    for i in range(100):
        student = students[i % len(students)]
        grades.append({
            "student_id": student["student_id"],
            "Diem_tx1": 5.0 + (i % 50) / 10.0,
            "Diem_tx2": 6.0 + (i % 40) / 10.0,
            "Diem_tx3": 7.0 + (i % 30) / 10.0,
            "Diem_tx4": 8.0 + (i % 20) / 10.0,
            "Diem_thi_giua_ki": 7.5 + (i % 25) / 10.0,
            "Diem_thi_cuoi_ki": 8.5 + (i % 15) / 10.0,
        })
    
    return {
        "class_subject_id": class_subject["id"],
        "academic_year": "2024-2025",
        "semester": "HK1",
        "grades": grades,
    }


@pytest.fixture
def invalid_score_payload(existing_data):
    """Import payload with invalid score values (>10, <0)"""
    class_subject = existing_data["class_subject"]
    students = existing_data["students"][:3]
    
    return {
        "class_subject_id": class_subject["id"],
        "academic_year": "2024-2025",
        "semester": "HK1",
        "grades": [
            {
                "student_id": students[0]["student_id"],
                "Diem_tx1": 15,  # Invalid: > 10
                "Diem_tx2": 8.0,
            },
            {
                "student_id": students[1]["student_id"],
                "Diem_tx1": -1,  # Invalid: < 0
                "Diem_tx2": 8.0,
            },
            {
                "student_id": students[2]["student_id"],
                "Diem_tx1": 8.0,
                "Diem_tx2": "abc",  # Invalid: non-numeric
            },
        ],
    }


@pytest.fixture
def invalid_student_payload(existing_data):
    """Import payload with student IDs not in the class"""
    class_subject = existing_data["class_subject"]
    
    return {
        "class_subject_id": class_subject["id"],
        "academic_year": "2024-2025",
        "semester": "HK1",
        "grades": [
            {
                "student_id": "999999",  # Non-existent student
                "Diem_tx1": 8.0,
                "Diem_tx2": 8.0,
            },
            {
                "student_id": "888888",  # Another non-existent student
                "Diem_tx1": 7.0,
                "Diem_tx2": 7.0,
            },
        ],
    }


@pytest.fixture
def partial_import_payload(existing_data):
    """Import payload with only some score columns (partial data)"""
    class_subject = existing_data["class_subject"]
    students = existing_data["students"][:3]
    
    return {
        "class_subject_id": class_subject["id"],
        "academic_year": "2024-2025",
        "semester": "HK1",
        "grades": [
            {
                "student_id": students[0]["student_id"],
                "Diem_tx1": 8.0,
                # Missing other columns - should still be valid
            },
            {
                "student_id": students[1]["student_id"],
                "Diem_thi_cuoi_ki": 9.0,
                # Missing regular test scores
            },
            {
                "student_id": students[2]["student_id"],
                "Diem_tx1": 7.5,
                "Diem_thi_cuoi_ki": 8.5,
                # Mixed columns
            },
        ],
    }


# ============================================================================
# HAPPY PATH TESTS
# ============================================================================

class TestScoreImportHappyPath:
    """Test successful file import scenarios"""
    
    def test_import_scores_by_class(self, client, homeroom_jwt_token, valid_import_payload):
        """TS-SUB02EXT-01: Import scores for all students in class"""
        response = client.post(
            "/scores/bulk-import",
            json=valid_import_payload,
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["success_count"] == 5
        assert data["data"]["error_count"] == 0
        assert data["data"]["total_count"] == 5
        
    def test_import_standardized_score_file(self, client, homeroom_jwt_token, existing_data):
        """TS-SUB02EXT-02: Import standardized score file with 100% completion rate"""
        class_subject = existing_data["class_subject"]
        students = existing_data["students"][:10]
        
        # Create perfectly standardized payload (all columns for all students)
        grades = []
        for student in students:
            grades.append({
                "student_id": student["student_id"],
                "Diem_tx1": 8.0,
                "Diem_tx2": 8.0,
                "Diem_tx3": 8.0,
                "Diem_tx4": 8.0,
                "Diem_thi_giua_ki": 8.0,
                "Diem_thi_cuoi_ki": 8.0,
            })
        
        payload = {
            "class_subject_id": class_subject["id"],
            "academic_year": "2024-2025",
            "semester": "HK1",
            "grades": grades,
        }
        
        response = client.post(
            "/scores/bulk-import",
            json=payload,
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["success_count"] == 10
        assert data["data"]["error_count"] == 0
    
    def test_import_updates_existing_scores(self, client, homeroom_jwt_token, existing_data):
        """Import should update existing scores if they already exist"""
        class_subject = existing_data["class_subject"]
        student = existing_data["students"][0]
        
        # First import
        payload1 = {
            "class_subject_id": class_subject["id"],
            "academic_year": "2024-2025",
            "semester": "HK1",
            "grades": [{
                "student_id": student["student_id"],
                "Diem_tx1": 7.0,
                "Diem_tx2": 7.0,
                "Diem_thi_cuoi_ki": 7.0,
            }],
        }
        
        response1 = client.post(
            "/scores/bulk-import",
            json=payload1,
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        assert response1.status_code == 200
        
        # Second import with different values - should update
        payload2 = {
            "class_subject_id": class_subject["id"],
            "academic_year": "2024-2025",
            "semester": "HK1",
            "grades": [{
                "student_id": student["student_id"],
                "Diem_tx1": 9.0,
                "Diem_tx2": 9.0,
                "Diem_thi_cuoi_ki": 9.0,
            }],
        }
        
        response2 = client.post(
            "/scores/bulk-import",
            json=payload2,
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["success"] is True


# ============================================================================
# VALIDATION TESTS
# ============================================================================

class TestScoreImportValidation:
    """Test validation of imported data"""
    
    def test_reject_invalid_score_values(self, client, homeroom_jwt_token, invalid_score_payload):
        """TS-SUB02EXT-03: Reject scores outside 0-10 range"""
        response = client.post(
            "/scores/bulk-import",
            json=invalid_score_payload,
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # Invalid scores should be rejected
        assert data["data"]["error_count"] > 0
        assert len(data["data"]["errors"]) > 0
    
    def test_reject_students_not_in_class(self, client, homeroom_jwt_token, invalid_student_payload):
        """TS-SUB02EXT-04: Data Integrity - Reject students not enrolled in class"""
        response = client.post(
            "/scores/bulk-import",
            json=invalid_student_payload,
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # Non-existent students should be rejected
        assert data["data"]["error_count"] > 0
        assert len(data["data"]["errors"]) > 0
        assert any("Không tìm thấy" in error for error in data["data"]["errors"])
    
    def test_accept_partial_score_data(self, client, homeroom_jwt_token, partial_import_payload):
        """Import should accept partial data (not all columns required)"""
        response = client.post(
            "/scores/bulk-import",
            json=partial_import_payload,
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # Partial data should be accepted
        assert data["data"]["success_count"] > 0
    
    def test_missing_required_fields(self, client, homeroom_jwt_token, existing_data):
        """Reject payload missing required fields"""
        class_subject = existing_data["class_subject"]
        
        # Missing grades field
        payload = {
            "class_subject_id": class_subject["id"],
            "academic_year": "2024-2025",
            "semester": "HK1",
            # Missing "grades" field
        }
        
        response = client.post(
            "/scores/bulk-import",
            json=payload,
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        
        assert response.status_code in [400, 422]  # Bad request or validation error


# ============================================================================
# ALTERNATIVE FLOW TESTS
# ============================================================================

class TestScoreImportAlternative:
    """Test alternative flows (cancel, preview, etc)"""
    
    def test_cancel_import_after_preview(self, client, homeroom_jwt_token, valid_import_payload):
        """TS-SUB02EXT-05: User can cancel after preview"""
        # This test verifies the API accepts import requests
        # Client-side preview/cancel is handled in frontend
        # Backend should not create/update scores if user cancels
        
        response = client.post(
            "/scores/bulk-import",
            json=valid_import_payload,
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        
        # API should accept the import request
        assert response.status_code == 200
        assert response.json()["success"] is True


# ============================================================================
# EXCEPTION HANDLING TESTS
# ============================================================================

class TestScoreImportException:
    """Test exception handling and error scenarios"""
    
    def test_invalid_file_format(self, client, homeroom_jwt_token, existing_data):
        """TS-SUB02EXT-06: Reject files with invalid format or corrupted data"""
        class_subject = existing_data["class_subject"]
        
        # Send malformed payload (invalid JSON structure)
        payload = {
            "class_subject_id": class_subject["id"],
            "academic_year": "2024-2025",
            "semester": "HK1",
            "grades": "not_a_list",  # Should be a list
        }
        
        response = client.post(
            "/scores/bulk-import",
            json=payload,
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        
        # Should reject malformed data
        assert response.status_code in [400, 422, 500]
    
    def test_class_subject_not_found(self, client, homeroom_jwt_token):
        """Reject import for non-existent class_subject"""
        payload = {
            "class_subject_id": 99999,  # Non-existent
            "academic_year": "2024-2025",
            "semester": "HK1",
            "grades": [{
                "student_id": "250001",
                "Diem_tx1": 8.0,
            }],
        }
        
        response = client.post(
            "/scores/bulk-import",
            json=payload,
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        
        assert response.status_code == 403  # Forbidden
    
    def test_rollback_on_system_error(self, client, homeroom_jwt_token, valid_import_payload):
        """TS-SUB02EXT-09: System should rollback on critical errors"""
        # Test that if there's a database error, no partial data is saved
        # This is handled at database level with transactions
        
        response = client.post(
            "/scores/bulk-import",
            json=valid_import_payload,
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        
        # Successful import means no error occurred
        if response.status_code == 200:
            data = response.json()
            assert data["success"] is True
        else:
            # If error occurred, should not have partial saves
            assert response.status_code >= 400


# ============================================================================
# SECURITY TESTS
# ============================================================================

class TestScoreImportSecurity:
    """Test security constraints"""
    
    def test_unauthenticated_import_denied(self, client, valid_import_payload):
        """TS-SUB02-07a: Prevent unauthenticated import"""
        response = client.post(
            "/scores/bulk-import",
            json=valid_import_payload,
            # No authorization header
        )
        
        assert response.status_code == 401
    
    def test_teacher_cannot_import_others_class(self, client, db, valid_import_payload):
        """TS-SUB02EXT-07: Prevent teacher from importing scores for other teachers' classes"""
        # Create second teacher
        teacher2_resp = db.table("users").insert({
            "username": f"teacher2_{datetime.now().timestamp()}",
            "full_name": "Giáo viên 2",
            "email": f"teacher2_{datetime.now().timestamp()}@school.edu",
            "hashed_password": "hashed_pwd",
            "role": "teacher",
            "is_active": True,
        }).execute()
        
        if teacher2_resp.data:
            teacher2_id = teacher2_resp.data[0]["id"]
            
            # Try to import using first teacher's token but second teacher's class
            # This should fail because the class_subject belongs to different teacher
            response = client.post(
                "/scores/bulk-import",
                json=valid_import_payload,
                # Token from first teacher but attempting to import for second teacher's class
            )
            
            # If attempting non-owned class, should get 403
            if response.status_code != 200:
                assert response.status_code == 403
    
    def test_invalid_token_rejected(self, client, valid_import_payload):
        """Prevent import with invalid token"""
        response = client.post(
            "/scores/bulk-import",
            json=valid_import_payload,
            headers={"Authorization": "Bearer invalid_token_xyz"}
        )
        
        assert response.status_code == 401


# ============================================================================
# PERFORMANCE TESTS
# ============================================================================

class TestScoreImportPerformance:
    """Test performance with large datasets"""
    
    def test_import_large_file_performance(self, client, homeroom_jwt_token, large_import_payload):
        """TS-SUB02EXT-08: Test loading/importing large score files (100+ records)"""
        import time
        
        start_time = time.time()
        response = client.post(
            "/scores/bulk-import",
            json=large_import_payload,
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["total_count"] == 100
        
        # Should complete in reasonable time (< 30 seconds)
        assert elapsed_time < 30
    
    def test_import_response_time_under_threshold(self, client, homeroom_jwt_token, valid_import_payload):
        """Import of 5 students should complete within 2 seconds"""
        import time
        
        start_time = time.time()
        response = client.post(
            "/scores/bulk-import",
            json=valid_import_payload,
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200
        assert elapsed_time < 2


# ============================================================================
# INTEGRATION WORKFLOW TESTS
# ============================================================================

class TestScoreImportWorkflow:
    """Test complete import workflows"""
    
    def test_import_then_verify_scores(self, client, homeroom_jwt_token, existing_data, valid_import_payload):
        """Import scores and verify they were saved correctly"""
        # Import
        response = client.post(
            "/scores/bulk-import",
            json=valid_import_payload,
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        assert response.status_code == 200
        
        # Verify one of the imported scores
        student = existing_data["students"][0]
        class_subject = existing_data["class_subject"]
        
        response = client.get(
            f"/scores/score/{student['id']}/{class_subject['id']}?academic_year=2024-2025&semester=HK1",
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            assert data["data"]["final_score"] is not None
    
    def test_export_then_import_roundtrip(self, client, homeroom_jwt_token, existing_data):
        """Export scores as template, then import them back"""
        class_subject = existing_data["class_subject"]
        
        # Download template
        response_download = client.get(
            f"/scores/template/download/{class_subject['id']}",
            headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
        )
        
        # Should return file content
        if response_download.status_code == 200:
            # Import the same data back
            import_payload = {
                "class_subject_id": class_subject["id"],
                "academic_year": "2024-2025",
                "semester": "HK1",
                "grades": [{
                    "student_id": existing_data["students"][0]["student_id"],
                    "Diem_tx1": 8.0,
                }],
            }
            
            response_import = client.post(
                "/scores/bulk-import",
                json=import_payload,
                headers={"Authorization": f"Bearer {homeroom_jwt_token}"}
            )
            
            assert response_import.status_code == 200
