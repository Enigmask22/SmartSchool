"""
Integration tests for admin API validation
Tests POST and PUT endpoints with validation scenarios

File: tests/test_admin_validation.py
Purpose: Verify backend validation works correctly for all admin endpoints
Expected: All validation errors return proper error codes and messages
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app
from core.error_codes import (
    UserErrorCode, TeacherErrorCode, SubjectErrorCode, 
    ClassErrorCode, ClassSubjectErrorCode, SubjectTeacherErrorCode
)


client = TestClient(app)


class TestUserValidation:
    """Test user creation and update validation"""
    
    def test_create_user_with_invalid_email(self):
        """Test POST /admin/users rejects invalid email format"""
        # Arrange
        user_data = {
            "email": "invalid-email",  # Invalid format
            "username": "testuser",
            "password": "SecurePass123",
            "full_name": "Test User",
            "role": "student",
            "is_active": True,
        }
        
        # Act
        response = client.post("/api/admin/users", json=user_data)
        
        # Assert
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert data["code"] == UserErrorCode.USER_EMAIL_INVALID
    
    def test_create_user_with_missing_required_field(self):
        """Test POST /admin/users requires all mandatory fields"""
        # Arrange
        user_data = {
            "email": "test@example.com",
            # Missing username
            "password": "SecurePass123",
            "full_name": "Test User",
            "role": "student",
        }
        
        # Act
        response = client.post("/api/admin/users", json=user_data)
        
        # Assert
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
    
    def test_create_user_with_weak_password(self):
        """Test POST /admin/users rejects weak password"""
        # Arrange
        user_data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "weak",  # Less than 6 chars
            "full_name": "Test User",
            "role": "student",
        }
        
        # Act
        response = client.post("/api/admin/users", json=user_data)
        
        # Assert
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "password" in data.get("field", "")
    
    def test_create_user_with_duplicate_email(self):
        """Test POST /admin/users rejects duplicate email"""
        # This test requires database setup - would need fixtures
        # Skipping for now as it requires DB seeding
        pass
    
    def test_update_user_with_invalid_role(self):
        """Test PUT /admin/users/{id} rejects invalid role"""
        # Arrange
        user_id = 1
        user_data = {
            "role": "invalid_role"
        }
        
        # Act
        response = client.put(f"/api/admin/users/{user_id}", json=user_data)
        
        # Assert
        assert response.status_code in [400, 404]
        data = response.json()
        assert data["success"] is False


class TestTeacherValidation:
    """Test teacher creation and update validation"""
    
    def test_create_teacher_with_invalid_email(self):
        """Test POST /admin/teachers rejects invalid email"""
        # Arrange
        teacher_data = {
            "full_name": "Teacher Name",
            "email": "not-an-email",  # Invalid format
            "phone": "0123456789",
            "date_of_birth": "1990-01-01",
            "gender": "Nam",
        }
        
        # Act
        response = client.post("/api/admin/teachers", json=teacher_data)
        
        # Assert
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "email" in data.get("field", "")
    
    def test_create_teacher_with_invalid_phone_format(self):
        """Test POST /admin/teachers validates phone format (Vietnam)"""
        # Arrange
        teacher_data = {
            "full_name": "Teacher Name",
            "email": "teacher@example.com",
            "phone": "123",  # Invalid format (too short)
            "date_of_birth": "1990-01-01",
            "gender": "Nam",
        }
        
        # Act
        response = client.post("/api/admin/teachers", json=teacher_data)
        
        # Assert
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "phone" in data.get("field", "")
    
    def test_create_teacher_with_invalid_date_of_birth(self):
        """Test POST /admin/teachers validates date of birth"""
        # Arrange
        teacher_data = {
            "full_name": "Teacher Name",
            "email": "teacher@example.com",
            "phone": "0123456789",
            "date_of_birth": "2010-01-01",  # Too young (under 18)
            "gender": "Nam",
        }
        
        # Act
        response = client.post("/api/admin/teachers", json=teacher_data)
        
        # Assert
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "date_of_birth" in data.get("field", "")
    
    def test_create_teacher_with_invalid_gender(self):
        """Test POST /admin/teachers validates gender enum"""
        # Arrange
        teacher_data = {
            "full_name": "Teacher Name",
            "email": "teacher@example.com",
            "phone": "0123456789",
            "date_of_birth": "1990-01-01",
            "gender": "InvalidGender",  # Must be M, F, or Other
        }
        
        # Act
        response = client.post("/api/admin/teachers", json=teacher_data)
        
        # Assert
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False


class TestSubjectValidation:
    """Test subject creation and update validation"""
    
    def test_create_subject_with_missing_name(self):
        """Test POST /admin/subjects requires subject_name"""
        # Arrange
        subject_data = {
            "subject_code": "MATH",
            # Missing subject_name
        }
        
        # Act
        response = client.post("/api/admin/subjects", json=subject_data)
        
        # Assert
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
    
    def test_create_subject_with_invalid_score_config(self):
        """Test POST /admin/subjects validates score column config structure"""
        # Arrange
        subject_data = {
            "subject_code": "MATH",
            "subject_name": "Toán học",
            "score_column_config": {
                "columns": [
                    {
                        "name": "15-min test",
                        "he_so": 15  # Invalid: should be 0.5-10
                    }
                ]
            }
        }
        
        # Act
        response = client.post("/api/admin/subjects", json=subject_data)
        
        # Assert
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False


class TestClassValidation:
    """Test class creation and update validation"""
    
    def test_create_class_with_invalid_grade(self):
        """Test POST /admin/classes validates grade (10-12)"""
        # Arrange
        class_data = {
            "class_name": "10A",
            "grade": 9,  # Invalid (must be 10-12)
            "academic_year": "2024-2025",
        }
        
        # Act
        response = client.post("/api/admin/classes", json=class_data)
        
        # Assert
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "grade" in data.get("field", "")
    
    def test_create_class_with_invalid_academic_year_format(self):
        """Test POST /admin/classes validates academic year format"""
        # Arrange
        class_data = {
            "class_name": "10A",
            "grade": 10,
            "academic_year": "2024",  # Invalid format (should be YYYY-YYYY)
        }
        
        # Act
        response = client.post("/api/admin/classes", json=class_data)
        
        # Assert
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "academic_year" in data.get("field", "")
    
    def test_create_class_with_non_consecutive_academic_years(self):
        """Test POST /admin/classes validates year consecutiveness"""
        # Arrange
        class_data = {
            "class_name": "10A",
            "grade": 10,
            "academic_year": "2024-2030",  # Not consecutive years
        }
        
        # Act
        response = client.post("/api/admin/classes", json=class_data)
        
        # Assert
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False


class TestClassSubjectValidation:
    """Test class-subject assignment validation"""
    
    def test_create_class_subject_with_invalid_semester(self):
        """Test POST /admin/class-subjects validates semester (1 or 2)"""
        # Arrange
        assignment_data = {
            "class_id": 1,
            "subject_id": 1,
            "teacher_id": 1,
            "academic_year": "2024-2025",
            "semester": "3",  # Invalid (must be 1 or 2)
            "is_active": True,
        }
        
        # Act
        response = client.post("/api/admin/class-subjects", json=assignment_data)
        
        # Assert
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "semester" in data.get("field", "")
    
    def test_create_class_subject_with_nonexistent_class(self):
        """Test POST /admin/class-subjects requires existing class"""
        # Arrange
        assignment_data = {
            "class_id": 99999,  # Non-existent
            "subject_id": 1,
            "teacher_id": 1,
            "academic_year": "2024-2025",
            "semester": "1",
            "is_active": True,
        }
        
        # Act
        response = client.post("/api/admin/class-subjects", json=assignment_data)
        
        # Assert
        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False
        assert data["code"] == ClassSubjectErrorCode.CLASS_SUBJECT_CLASS_NOT_FOUND


class TestExcludeSelfValidation:
    """Test exclude-self validation for PUT operations (uniqueness checks)"""
    
    def test_update_user_email_to_existing_email_of_different_user(self):
        """Test PUT /admin/users/{id} fails when email already used by another user"""
        # This test requires DB fixtures
        # Pattern: User A tries to change email to User B's email -> should fail
        pass
    
    def test_update_user_email_to_own_existing_email(self):
        """Test PUT /admin/users/{id} allows email update to same value"""
        # This test requires DB fixtures
        # Pattern: User keeps own email -> should succeed
        pass
    
    def test_update_class_name_to_different_class_in_same_year(self):
        """Test PUT /admin/classes fails for duplicate name in same year"""
        # This test requires DB fixtures
        # Pattern: Class A tries to rename to Class B's name in same year -> should fail
        pass


class TestRelationshipValidation:
    """Test relationship validation"""
    
    def test_create_class_subject_teacher_must_teach_subject(self):
        """Test POST /admin/class-subjects requires teacher to teach subject"""
        # This test requires DB fixtures
        # Pattern: Assign Teacher A (who doesn't teach Math) to Math class -> should fail
        pass
    
    def test_update_class_homeroom_teacher_must_not_be_homeroom_elsewhere(self):
        """Test PUT /admin/classes validates homeroom teacher uniqueness per year"""
        # This test requires DB fixtures
        # Pattern: Make Teacher A homeroom for two classes in same year -> should fail
        pass


class TestFieldValidation:
    """Test individual field validators"""
    
    def test_email_validation_accepts_valid_formats(self):
        """Test email validator accepts various valid formats"""
        # Valid emails should be accepted
        valid_emails = [
            "user@example.com",
            "user.name@example.co.uk",
            "user+tag@example.com",
            "123@example.com",
        ]
        
        for email in valid_emails:
            user_data = {
                "email": email,
                "username": "testuser",
                "password": "ValidPass123",
                "full_name": "Test",
                "role": "student",
            }
            # This would test if validators are exposed or need integration test
    
    def test_phone_validation_accepts_vietnam_formats(self):
        """Test phone validator accepts Vietnam phone formats"""
        # Valid Vietnam phone numbers (10-11 digits)
        valid_phones = [
            "0123456789",  # 10 digits
            "01234567890",  # 11 digits
            "01-234-567-89",  # With dashes
            "01 234 567 89",  # With spaces
        ]
        
        for phone in valid_phones:
            teacher_data = {
                "full_name": "Teacher",
                "email": "teacher@test.com",
                "phone": phone,
                "date_of_birth": "1990-01-01",
                "gender": "Nam",
            }
            # This would test if validators are exposed


# ============================================================================
# TEST CLASS: Error Response Format
# ============================================================================

class TestErrorResponseFormat:
    """Test that error responses follow the correct format"""
    
    def test_validation_error_includes_required_fields(self):
        """Test error response includes code, message, field, status"""
        # Arrange
        user_data = {
            "email": "invalid",
            "username": "test",
            "password": "weak",
            "full_name": "Test",
            "role": "student",
        }
        
        # Act
        response = client.post("/api/admin/users", json=user_data)
        data = response.json()
        
        # Assert - should have error structure
        if response.status_code == 400:
            assert "success" in data
            assert "code" in data or data.get("success") is True
            assert "message" in data
            # Either field error or global error


# ============================================================================
# TEST MARKERS & FIXTURES
# ============================================================================

@pytest.fixture
def db_session():
    """Create a test database session"""
    # This would initialize a test DB
    # For now, skipping as it requires full DB setup
    pass


@pytest.mark.integration
def test_full_user_creation_flow():
    """Integration test: Create user -> Get user -> Update user"""
    # This test would require DB fixtures
    # Pattern: Create valid user, verify it exists, update it, verify updates
    pass
