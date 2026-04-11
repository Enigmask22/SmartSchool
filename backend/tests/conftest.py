"""
Shared pytest fixtures for backend tests
Contains common test data, mocks, and setup/teardown logic
"""
import pytest
import os
import sys
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from datetime import datetime
from pathlib import Path

# Add backend_modular to path
sys.path.insert(0, str(Path(__file__).parent.parent))


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
