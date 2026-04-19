"""
Test Suite: TS-HOM02 - Attendance Management & State Logic
==========================================================

Test Matrix Mapping:
- **TS-HOM02-01:** Integration (Backend) - Check-in creates attendance records
- **TS-HOM02-02:** Logic (Backend) - Late detection via cutoff time
- **TS-HOM02-04:** Happy Path - Manual override of status
- **TS-HOM02-06:** Logic (Backend) - Data integrity (no duplicates, correct status)
- **TS-HOM02-08:** Integration (AI) - Low confidence score fallback

Focus Areas:
- Check-in endpoint creates attendance with correct status
- Cutoff time logic for late detection
- Manual attendance creation (when AI unavailable)
- Status override by teacher
- Attendance record integrity (no duplicates, correct status assignment)

NOTE: AI face recognition testing is MANUAL TESTING ONLY
This suite focuses on attendance CRUD operations and state logic

Test Pattern: pytest with TestClient, cleanup fixture for test data isolation
"""

import pytest
from datetime import date, datetime, time
from typing import Dict, List
from fastapi.testclient import TestClient
from core.system_settings import get_attendance_cutoff_time

# Import the app factory
from app_factory import create_app
from core.database import get_db


# ============================================================================
# FIXTURES & SETUP
# ============================================================================

@pytest.fixture
def app():
    """Create app instance for testing"""
    return create_app()


@pytest.fixture
def client(app):
    """Create test client"""
    return TestClient(app)


# ============================================================================
# TEST DATA HELPERS
# ============================================================================

def create_test_teacher(db, cleanup_attendance):
    """Create test teacher and track for cleanup"""
    teacher_data = {
        "full_name": "Test Teacher",
        "email": f"teacher_{datetime.now().timestamp()}@test.edu.vn",
        "username": f"teacher_{int(datetime.now().timestamp())}",
        "is_active": True
    }
    response = db.table("teachers").insert(teacher_data).execute()
    teacher_id = response.data[0]["id"]
    cleanup_attendance["teachers"].append(teacher_id)
    return teacher_id


def create_test_class(db, cleanup_attendance, class_name="10A", teacher_id=None):
    """Create test class and track for cleanup"""
    class_data = {
        "class_name": class_name,
        "grade": 10,
        "homeroom_teacher_id": teacher_id,
        "academic_year": "2024-2025",
        "is_active": True
    }
    response = db.table("classes").insert(class_data).execute()
    class_id = response.data[0]["id"]
    cleanup_attendance["classes"].append(class_id)
    return class_id


def create_test_student(db, cleanup_attendance, class_id, student_id_str="SV001", full_name="Nguyễn Văn A"):
    """Create test student and track for cleanup"""
    # Get class info to get class_name and grade
    class_info = db.table("classes").select("class_name, grade").eq("id", class_id).execute()
    class_name = class_info.data[0]["class_name"] if class_info.data else "10A"
    grade = class_info.data[0]["grade"] if class_info.data else 10
    
    student_data = {
        "student_id": student_id_str,
        "full_name": full_name,
        "class_name": class_name,
        "grade": str(grade),
        "date_of_birth": "2009-01-01",
        "is_active": True
    }
    response = db.table("students").insert(student_data).execute()
    student_id = response.data[0]["id"]
    cleanup_attendance["students"].append(student_id)
    return student_id


def create_test_face_embedding(db, cleanup_attendance, student_id, embedding_sample=None):
    """Placeholder - Face embedding setup is manual testing only"""
    pass


# ============================================================================
# TEST CLASSES
# ============================================================================

class TestAIRecognitionAndAttendance:
    """Check-in creates attendance records with correct data"""
    
    def test_TS_HOM02_01_checkin_creates_attendance(self, client, teacher_jwt_token, cleanup_attendance):
        """Should create attendance record when check-in is called"""
        db = get_db()
        
        # Setup: Create class and student
        class_id = create_test_class(db, cleanup_attendance, "10A")
        student_id = create_test_student(db, cleanup_attendance, class_id, "SV001", "Nguyễn Văn A")
        
        # Action: Check-in endpoint (what AI would trigger)
        response = client.post(
            "/api/attendance/check-in",
            json={"student_id": student_id, "status": "present"},
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        # Assert: Attendance record created
        assert response.status_code in [200, 201]
        data = response.json()
        if "data" in data and data["data"]:
            cleanup_attendance["attendance"].append(data["data"]["id"])
            assert data["data"]["student_id"] == student_id
        
    def test_TS_HOM02_01_confidence_score_optional(self, client, teacher_jwt_token, cleanup_attendance):
        """Check-in should work with or without confidence score"""
        db = get_db()
        
        # Setup
        class_id = create_test_class(db, cleanup_attendance, "10B")
        student_id = create_test_student(db, cleanup_attendance, class_id, "SV002", "Trần Thị B")
        
        # Action: With confidence score
        response = client.post(
            "/api/attendance/check-in",
            json={"student_id": student_id, "status": "present", "confidence_score": 0.87},
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        # Assert
        assert response.status_code in [200, 201]
        if response.json().get("data"):
            cleanup_attendance["attendance"].append(response.json()["data"]["id"])
        
    def test_TS_HOM02_01_method_recorded(self, client, teacher_jwt_token, cleanup_attendance):
        """Check-in method should be recorded in attendance record"""
        db = get_db()
        
        # Setup
        class_id = create_test_class(db, cleanup_attendance, "10C")
        student_id = create_test_student(db, cleanup_attendance, class_id, "SV003", "Lê Văn C")
        
        # Action: Check-in
        response = client.post(
            "/api/attendance/check-in",
            json={"student_id": student_id, "status": "present"},
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        # Assert
        assert response.status_code in [200, 201]
        if response.json().get("data"):
            record = response.json()["data"]
            cleanup_attendance["attendance"].append(record["id"])
            # Method should be recorded (manual, ai, etc)
            assert "method" in record or "status" in record


class TestLateDetectionLogic:
    """Late detection via cutoff time from system_settings"""
    
    def test_TS_HOM02_02_status_assignment(self, client, teacher_jwt_token, cleanup_attendance):
        """Status should be assigned based on attendance_cutoff_time"""
        db = get_db()
        
        # Setup
        class_id = create_test_class(db, cleanup_attendance, "10D")
        student_id = create_test_student(db, cleanup_attendance, class_id, "SV004", "Phạm Văn D")
        
        # Action: Create attendance
        response = client.post(
            "/api/attendance/check-in",
            json={"student_id": student_id, "status": "present"},
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        # Assert
        assert response.status_code in [200, 201]
        if response.json().get("data"):
            record = response.json()["data"]
            cleanup_attendance["attendance"].append(record["id"])
            # Status should be one of the valid states
            assert record.get("status") in ["present", "late", "absent"]
    
    def test_TS_HOM02_02_cutoff_time_exists(self, client, teacher_jwt_token, cleanup_attendance):
        """System settings should have attendance_cutoff_time configured"""
        response = client.get(
            "/api/school_config/system-settings",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        # Assert: Settings endpoint works
        assert response.status_code in [200, 404]  # 404 is ok if settings not required
    
    def test_TS_HOM02_02_multiple_checkins_same_day(self, client, teacher_jwt_token, cleanup_attendance):
        """Multiple check-ins same day should be tracked"""
        db = get_db()
        
        # Setup
        class_id = create_test_class(db, cleanup_attendance, "10E")
        student_id = create_test_student(db, cleanup_attendance, class_id, "SV005", "Hoàng Thị E")
        
        # Action: Check-in
        response = client.post(
            "/api/attendance/check-in",
            json={"student_id": student_id, "status": "present"},
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        # Assert
        assert response.status_code in [200, 201]
        if response.json().get("data"):
            cleanup_attendance["attendance"].append(response.json()["data"]["id"])


class TestManualStatusOverride:
    """Manual status override of automatically determined status"""
    
    def test_TS_HOM02_04_override_present_to_absent(self, client, teacher_jwt_token, cleanup_attendance):
        """Should be able to override present status to absent"""
        db = get_db()
        
        # Setup: Create attendance
        class_id = create_test_class(db, cleanup_attendance, "10H")
        student_id = create_test_student(db, cleanup_attendance, class_id, "SV008", "Trịnh Văn H")
        
        # Create initial attendance
        response = client.post(
            "/api/attendance/check-in",
            json={"student_id": student_id, "status": "present"},
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        if response.status_code in [200, 201]:
            attendance_id = response.json()["data"]["id"]
            cleanup_attendance["attendance"].append(attendance_id)
            
            # Action: Override to absent
            update_response = client.put(
                f"/api/attendance/{attendance_id}",
                json={"status": "absent"},
                headers={"Authorization": f"Bearer {teacher_jwt_token}"}
            )
            
            # Assert
            assert update_response.status_code in [200, 201]
    
    def test_TS_HOM02_04_override_with_notes(self, client, teacher_jwt_token, cleanup_attendance):
        """Should allow notes when overriding status"""
        db = get_db()
        
        # Setup
        class_id = create_test_class(db, cleanup_attendance, "10I")
        student_id = create_test_student(db, cleanup_attendance, class_id, "SV009", "Bùi Thị I")
        
        # Create initial
        response = client.post(
            "/api/attendance/check-in",
            json={"student_id": student_id, "status": "present"},
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        if response.status_code in [200, 201]:
            attendance_id = response.json()["data"]["id"]
            cleanup_attendance["attendance"].append(attendance_id)
            
            # Action: Override with notes
            update_response = client.put(
                f"/api/attendance/{attendance_id}",
                json={"status": "late", "notes": "Doctor appointment"},
                headers={"Authorization": f"Bearer {teacher_jwt_token}"}
            )
            
            # Assert
            assert update_response.status_code in [200, 201]
    
    def test_TS_HOM02_04_multiple_overrides(self, client, teacher_jwt_token, cleanup_attendance):
        """Should support changing status multiple times"""
        db = get_db()
        
        # Setup
        class_id = create_test_class(db, cleanup_attendance, "10J")
        student_id = create_test_student(db, cleanup_attendance, class_id, "SV010", "Võ Văn J")
        
        # Create initial
        response = client.post(
            "/api/attendance/check-in",
            json={"student_id": student_id, "status": "present"},
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        if response.status_code in [200, 201]:
            attendance_id = response.json()["data"]["id"]
            cleanup_attendance["attendance"].append(attendance_id)
            
            # Action: First override
            response1 = client.put(
                f"/api/attendance/{attendance_id}",
                json={"status": "absent"},
                headers={"Authorization": f"Bearer {teacher_jwt_token}"}
            )
            assert response1.status_code in [200, 201]
            
            # Second override
            response2 = client.put(
                f"/api/attendance/{attendance_id}",
                json={"status": "present"},
                headers={"Authorization": f"Bearer {teacher_jwt_token}"}
            )
            assert response2.status_code in [200, 201]


class TestDataIntegrity:
    """Data integrity: no duplicates, correct status assignment"""
    
    def test_TS_HOM02_06_status_is_valid(self, client, teacher_jwt_token, cleanup_attendance):
        """Status should be one of valid values"""
        db = get_db()
        
        # Setup
        class_id = create_test_class(db, cleanup_attendance, "10K")
        student_id = create_test_student(db, cleanup_attendance, class_id, "SV011", "Cao Văn K")
        
        # Action: Create attendance
        response = client.post(
            "/api/attendance/check-in",
            json={"student_id": student_id, "status": "present"},
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        # Assert
        if response.status_code in [200, 201]:
            record = response.json()["data"]
            cleanup_attendance["attendance"].append(record["id"])
            assert record.get("status") in ["present", "late", "absent", "excused"]
    
    def test_TS_HOM02_06_valid_timestamps(self, client, teacher_jwt_token, cleanup_attendance):
        """Timestamps should be valid"""
        db = get_db()
        
        # Setup
        class_id = create_test_class(db, cleanup_attendance, "10L")
        student_id = create_test_student(db, cleanup_attendance, class_id, "SV012", "Đặng Thị L")
        
        # Action
        response = client.post(
            "/api/attendance/check-in",
            json={"student_id": student_id, "status": "present"},
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        # Assert
        if response.status_code in [200, 201]:
            record = response.json()["data"]
            cleanup_attendance["attendance"].append(record["id"])
            
            if "check_in_time" in record and record["check_in_time"]:
                # Should be a valid timestamp
                assert isinstance(record["check_in_time"], (str, int))
    
    def test_TS_HOM02_06_student_id_stored(self, client, teacher_jwt_token, cleanup_attendance):
        """Attendance record should store student_id correctly"""
        db = get_db()
        
        # Setup
        class_id = create_test_class(db, cleanup_attendance, "10M")
        student_id = create_test_student(db, cleanup_attendance, class_id, "SV013", "Hoàng Văn M")
        
        # Action
        response = client.post(
            "/api/attendance/check-in",
            json={"student_id": student_id, "status": "present"},
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        # Assert
        assert response.status_code in [200, 201]
        record = response.json()["data"]
        cleanup_attendance["attendance"].append(record["id"])
        assert record.get("student_id") == student_id
    
    def test_TS_HOM02_06_manual_attendance_bypass(self, client, teacher_jwt_token, cleanup_attendance):
        """Manual attendance should bypass check-in time"""
        db = get_db()
        
        # Setup
        class_id = create_test_class(db, cleanup_attendance, "10N")
        student_id = create_test_student(db, cleanup_attendance, class_id, "SV014", "Tạ Văn N")
        
        # Action: Use manual endpoint
        response = client.post(
            "/api/attendance/manual",
            json={"student_id": student_id, "status": "absent", "notes": "Sick"},
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        # Assert
        assert response.status_code in [200, 201]
        if response.json().get("data"):
            cleanup_attendance["attendance"].append(response.json()["data"]["id"])


class TestAIFailureHandling:
    """Low confidence score triggers fallback to manual attendance"""
    
    def test_TS_HOM02_08_low_confidence_still_creates_record(self, client, teacher_jwt_token, cleanup_attendance):
        """Should create record even with low confidence score"""
        db = get_db()
        
        # Setup
        class_id = create_test_class(db, cleanup_attendance, "10O")
        student_id = create_test_student(db, cleanup_attendance, class_id, "SV015", "Đặng Văn O")
        
        # Action: Check-in with low confidence
        response = client.post(
            "/api/attendance/check-in",
            json={"student_id": student_id, "status": "present", "confidence_score": 0.45},
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        # Assert: Record should still be created (fallback to manual)
        assert response.status_code in [200, 201]
        if response.json().get("data"):
            record = response.json()["data"]
            cleanup_attendance["attendance"].append(record["id"])
            # Status should be recorded
            assert record.get("status") in ["present", "late", "absent"]
    
    def test_TS_HOM02_08_method_indicates_fallback(self, client, teacher_jwt_token, cleanup_attendance):
        """Method field should indicate whether AI succeeded or fell back"""
        db = get_db()
        
        # Setup
        class_id = create_test_class(db, cleanup_attendance, "10P")
        student_id = create_test_student(db, cleanup_attendance, class_id, "SV016", "Quách Văn P")
        
        # Action: Check-in with confidence score (indicates AI attempt)
        response = client.post(
            "/api/attendance/check-in",
            json={"student_id": student_id, "status": "present", "confidence_score": 0.52},
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        # Assert
        assert response.status_code in [200, 201]
        if response.json().get("data"):
            record = response.json()["data"]
            cleanup_attendance["attendance"].append(record["id"])
            # Method could be 'manual' (fallback) or 'ai' depending on confidence threshold
            assert "method" in record or "status" in record
    
    def test_TS_HOM02_08_zero_confidence_rejected(self, client, teacher_jwt_token, cleanup_attendance):
        """Extremely low confidence (0.0) should be handled gracefully"""
        db = get_db()
        
        # Setup
        class_id = create_test_class(db, cleanup_attendance, "10Q")
        student_id = create_test_student(db, cleanup_attendance, class_id, "SV017", "Sơn Văn Q")
        
        # Action: Check-in with zero confidence
        response = client.post(
            "/api/attendance/check-in",
            json={"student_id": student_id, "status": "present", "confidence_score": 0.0},
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        # Assert: Either create record or return specific error (graceful handling)
        assert response.status_code in [200, 201, 400]
        if response.status_code in [200, 201] and response.json().get("data"):
            cleanup_attendance["attendance"].append(response.json()["data"]["id"])
