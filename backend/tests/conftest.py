"""
Shared pytest fixtures for backend tests
Contains common test data, mocks, setup/teardown logic, and JWT token generation
"""
import pytest
import os
import sys
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from datetime import datetime, timedelta
from pathlib import Path
from jose import jwt

# Add backend_modular to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from fastapi.testclient import TestClient
from app_factory import create_app


# =========================================================
# API CLIENT FIXTURE
# =========================================================

@pytest.fixture(scope="module")
def client():
    """FastAPI TestClient for integration tests"""
    app = create_app()
    return TestClient(app)


@pytest.fixture
def mock_gemini_api():
    """Mock Google Gemini API for feedback tests"""
    with patch('feedback.gemini_service.genai') as mock_genai:
        mock_instance = MagicMock()
        mock_instance.generate_content.return_value = MagicMock(
            text="Học sinh có tiến độ học tập tốt."
        )
        mock_genai.GenerativeModel.return_value = mock_instance
        yield mock_genai


@pytest.fixture
def mock_database():
    """Mock database connection"""
    with patch('core.database.get_school_db') as mock:
        mock_db = MagicMock()
        mock.return_value = mock_db
        yield mock


@pytest.fixture
def db():
    """Get real database connection for integration tests"""
    try:
        # Import the database instance
        from core.database import db as database_instance
        if database_instance is None or database_instance.client is None:
            pytest.skip("Database not initialized")
        return database_instance.client
    except Exception as e:
        pytest.skip(f"Database connection failed: {str(e)}")


@pytest.fixture
def test_student_data():
    """Sample student data for testing"""
    return {
        'student_code': 'HS001',
        'full_name': 'Nguyễn Văn A',
        'class_id': 'CLS001',
        'email': 'student@example.com',
        'date_of_birth': '2008-01-15'
    }


@pytest.fixture
def test_score_data():
    """Sample score data for testing"""
    return {
        'student_id': 1,
        'subject_id': 1,
        'score': 8.5,
        'term': 1,
        'school_year': '2024-2025',
        'created_at': datetime.now()
    }


# =========================================================
# JWT TOKEN FIXTURES FOR INTEGRATION TESTS
# =========================================================

def create_jwt_token(username: str, role: str, expires_delta: timedelta = None) -> str:
    """Helper function to create JWT tokens for testing"""
    if expires_delta is None:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    expire = datetime.utcnow() + expires_delta
    to_encode = {
        "sub": username,
        "exp": expire,
        "type": "access",
        "role": role
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


@pytest.fixture
def admin_jwt_token():
    """JWT token with admin role (existing 'admin' user) - TS-ADM01"""
    return create_jwt_token("admin", "admin")


@pytest.fixture
def homeroom_jwt_token():
    """JWT token with homeroom_teacher role (existing 'nguyen_thi_lan' user) - TS-ADM01"""
    return create_jwt_token("nguyen_thi_lan", "homeroom_teacher")


@pytest.fixture
def teacher_jwt_token():
    """JWT token with teacher role (existing 'tran_van_nam' user) - TS-ADM01"""
    return create_jwt_token("tran_van_nam", "teacher")


@pytest.fixture
def invalid_jwt_token():
    """Invalid JWT token for testing auth failure - TS-ADM01"""
    return "invalid.token.here.xyz"


@pytest.fixture
def expired_jwt_token():
    """Expired JWT token for testing auth failure - TS-ADM01"""
    # Create token with past expiration
    expired_delta = timedelta(minutes=-1)  # Expired 1 minute ago
    return create_jwt_token("admin", "admin", expired_delta)


# =========================================================
# TEST DATA FIXTURES
# =========================================================

@pytest.fixture
def new_teacher_data():
    """Data for creating a new teacher user - TS-ADM01-03"""
    timestamp = str(datetime.now().timestamp()).replace(".", "")
    return {
        "username": f"test_teacher_{timestamp}",
        "email": f"test_teacher_{timestamp}@school.edu.vn",
        "full_name": "Test Teacher User",
        "password": "TestPassword123!@#",
        "role": "teacher"
    }


@pytest.fixture
def new_admin_data():
    """Data for creating a new admin user - TS-ADM01-03"""
    timestamp = str(datetime.now().timestamp()).replace(".", "")
    return {
        "username": f"test_admin_{timestamp}",
        "email": f"test_admin_{timestamp}@school.edu.vn",
        "full_name": "Test Admin User",
        "password": "AdminPassword123!@#",
        "role": "admin"
    }


@pytest.fixture
def new_homeroom_data():
    """Data for creating a new homeroom teacher - TS-ADM01-03"""
    timestamp = str(datetime.now().timestamp()).replace(".", "")
    return {
        "username": f"test_homeroom_{timestamp}",
        "email": f"test_homeroom_{timestamp}@school.edu.vn",
        "full_name": "Test Homeroom Teacher",
        "password": "HomeroomPassword123!@#",
        "role": "homeroom_teacher"
    }


@pytest.fixture
def existing_admin_account():
    """Existing admin account for credentials testing"""
    return {
        "username": "admin",
        "role": "admin"
    }


@pytest.fixture
def existing_homeroom_account():
    """Existing homeroom teacher account"""
    return {
        "username": "nguyen_thi_lan",
        "role": "homeroom_teacher"
    }


@pytest.fixture
def existing_teacher_account():
    """Existing teacher account"""
    return {
        "username": "tran_van_nam",
        "role": "teacher"
    }


@pytest.fixture
def test_user_data():
    """Sample user data for testing"""
    return {
        'username': 'admin.chuyen_le_quy_don.tphcm',
        'email': 'admin@example.com',
        'full_name': 'Admin User',
        'role': 'admin',
        'school_id': 1
    }


@pytest.fixture
def test_attendance_data():
    """Sample attendance data for testing"""
    return {
        'student_id': 1,
        'class_id': 1,
        'date': datetime.now().date(),
        'status': 'present',  # present, late, absent, excused
        'check_in_time': datetime.now(),
    }


@pytest.fixture
def test_class_data():
    """Sample class data for testing"""
    return {
        'class_name': 'Lớp 10A',
        'grade_level': 10,
        'homeroom_teacher_id': 1,
        'school_year': '2024-2025',
        'max_students': 40
    }


# Async support
@pytest.fixture
async def async_mock_gemini_api():
    """Mock Gemini API for async tests"""
    mock = AsyncMock()
    mock.call_gemini_api.return_value = "Học sinh có tiến độ tốt (async)."
    return mock


# Environment fixtures
@pytest.fixture
def test_env(monkeypatch):
    """Setup test environment variables"""
    monkeypatch.setenv('ENV', 'testing')
    monkeypatch.setenv('DEBUG', 'true')
    monkeypatch.setenv('DATABASE_URL', 'sqlite:///test.db')
    yield
    # Cleanup
    try:
        os.remove('test.db')
    except:
        pass


# =========================================================
# TEST DATA CLEANUP FIXTURES
# =========================================================

@pytest.fixture
def cleanup_attendance():
    """
    Fixture to track and cleanup test data after each test.
    Prevents database pollution for all test data.
    
    Tracks: students, classes, attendance, teachers, face_embeddings, subjects, class_subjects, scores
    """
    cleanup_data = {
        "students": [],
        "classes": [],
        "attendance": [],
        "teachers": [],
        "face_embeddings": [],
        "subjects": [],
        "class_subjects": [],
        "scores": [],
    }
    
    yield cleanup_data
    
    # CLEANUP PHASE - Always run, even if test fails
    # Delete in reverse order of creation to respect foreign key constraints
    try:
        from core.database import get_db
        db = get_db()
        
        # Delete scores (depends on student_id and class_subject_id)
        if cleanup_data["scores"]:
            try:
                db.table("scores").delete().in_("id", cleanup_data["scores"]).execute()
            except Exception as e:
                print(f"Warning: Failed to cleanup scores: {e}")
        
        # Delete class_subjects (depends on class_id and subject_id)
        if cleanup_data["class_subjects"]:
            try:
                db.table("class_subjects").delete().in_("id", cleanup_data["class_subjects"]).execute()
            except Exception as e:
                print(f"Warning: Failed to cleanup class_subjects: {e}")
        
        # Delete attendance records
        if cleanup_data["attendance"]:
            try:
                db.table("attendance").delete().in_("id", cleanup_data["attendance"]).execute()
            except Exception as e:
                print(f"Warning: Failed to cleanup attendance records: {e}")
        
        # Delete face embeddings
        if cleanup_data["face_embeddings"]:
            for embedding_id in cleanup_data["face_embeddings"]:
                try:
                    db.table("face_embeddings").delete().eq("id", embedding_id).execute()
                except:
                    pass
        
        # Delete students (after scores and face_embeddings)
        if cleanup_data["students"]:
            try:
                db.table("students").delete().in_("id", cleanup_data["students"]).execute()
            except Exception as e:
                print(f"Warning: Failed to cleanup students: {e}")
        
        # Delete subjects (after class_subjects)
        if cleanup_data["subjects"]:
            try:
                db.table("subjects").delete().in_("id", cleanup_data["subjects"]).execute()
            except Exception as e:
                print(f"Warning: Failed to cleanup subjects: {e}")
        
        # Delete classes (after attendance and class_subjects)
        if cleanup_data["classes"]:
            try:
                db.table("classes").delete().in_("id", cleanup_data["classes"]).execute()
            except Exception as e:
                print(f"Warning: Failed to cleanup classes: {e}")
        
        # Delete teachers
        if cleanup_data["teachers"]:
            try:
                db.table("teachers").delete().in_("id", cleanup_data["teachers"]).execute()
            except Exception as e:
                print(f"Warning: Failed to cleanup teachers: {e}")
    except Exception as e:
        print(f"Warning: Cleanup fixture encountered error: {e}")
