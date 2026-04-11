# Backend Testing Implementation Guide - Getting Started

**Created:** March 17, 2026  
**Purpose:** Concrete code examples for writing first tests  
**Timeline:** Start immediately, complete first 5 test files by end of Week 1

---

## Quick Start: Your First Test File

### Step 1: Create `tests/unit/test_auth_services.py`

```python
# tests/unit/test_auth_services.py
"""Unit tests for authentication services (no database, no API calls)"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock
from backend_modular.auth.services import (
    hash_password,
    verify_password,
    create_jwt_token,
    verify_jwt_token,
    login_user,
)

# ============================================================================
# TEST CLASS 1: Password Hashing
# ============================================================================

class TestPasswordHashing:
    """Test password hashing and verification using bcrypt"""
    
    def test_hash_password_returns_non_empty_string(self):
        """Verify hash_password returns a valid bcrypt hash"""
        # Arrange
        password = "SecurePassword123!"
        
        # Act
        hashed = hash_password(password)
        
        # Assert
        assert hashed is not None
        assert isinstance(hashed, str)
        assert len(hashed) > 20  # bcrypt hashes are ~60 chars
    
    def test_hash_password_produces_different_hashes_each_call(self):
        """Verify each hash call produces different hash (due to salt)"""
        # Arrange
        password = "SamePassword123"
        
        # Act
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        # Assert
        assert hash1 != hash2  # Different due to salt
    
    def test_verify_password_correct_password_returns_true(self):
        """Verify correct password passes verification"""
        # Arrange
        password = "CorrectPassword123"
        hashed = hash_password(password)
        
        # Act
        result = verify_password(password, hashed)
        
        # Assert
        assert result is True
    
    def test_verify_password_incorrect_password_returns_false(self):
        """Verify incorrect password fails verification"""
        # Arrange
        hashed = hash_password("CorrectPassword123")
        
        # Act
        result = verify_password("WrongPassword123", hashed)
        
        # Assert
        assert result is False
    
    def test_verify_password_empty_password_returns_false(self):
        """Verify empty password fails"""
        # Arrange
        hashed = hash_password("HashedPassword123")
        
        # Act
        result = verify_password("", hashed)
        
        # Assert
        assert result is False
    
    def test_verify_password_empty_hash_returns_false(self):
        """Verify empty hash fails verification"""
        # Arrange
        password = "Password123"
        
        # Act
        result = verify_password(password, "")
        
        # Assert
        assert result is False


# ============================================================================
# TEST CLASS 2: JWT Token Creation
# ============================================================================

class TestJWTTokenCreation:
    """Test JWT token creation and claims"""
    
    def test_create_jwt_token_returns_string(self):
        """Verify create_jwt_token returns a valid JWT string"""
        # Arrange
        user_id = "user_001"
        user_data = {"id": user_id, "email": "test@school.com", "role": "teacher"}
        
        # Act
        token = create_jwt_token(user_data)
        
        # Assert
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 50  # JWT tokens are long
        assert token.count('.') == 2  # JWT has 3 parts separated by dots
    
    def test_create_jwt_token_includes_user_id(self):
        """Verify JWT token contains user_id in claims"""
        # Arrange
        user_id = "user_12345"
        user_data = {"id": user_id, "email": "test@school.com"}
        
        # Act
        token = create_jwt_token(user_data)
        decoded = verify_jwt_token(token)
        
        # Assert
        assert decoded is not None
        assert decoded['id'] == user_id
    
    def test_create_jwt_token_includes_email(self):
        """Verify JWT token contains email in claims"""
        # Arrange
        email = "teacher@school.com"
        user_data = {"id": "user_001", "email": email}
        
        # Act
        token = create_jwt_token(user_data)
        decoded = verify_jwt_token(token)
        
        # Assert
        assert decoded['email'] == email
    
    def test_create_jwt_token_sets_expiration(self):
        """Verify JWT token has expiration set"""
        # Arrange
        user_data = {"id": "user_001", "email": "test@school.com"}
        before_creation = datetime.utcnow()
        
        # Act
        token = create_jwt_token(user_data, expires_in_hours=24)
        decoded = verify_jwt_token(token)
        
        # Assert
        assert 'exp' in decoded
        exp_time = datetime.fromtimestamp(decoded['exp'])
        expected_min = before_creation + timedelta(hours=23)
        expected_max = before_creation + timedelta(hours=25)
        assert expected_min < exp_time < expected_max
    
    def test_create_jwt_token_includes_role(self):
        """Verify JWT token includes role claim"""
        # Arrange
        user_data = {"id": "user_001", "email": "test@school.com", "role": "admin"}
        
        # Act
        token = create_jwt_token(user_data)
        decoded = verify_jwt_token(token)
        
        # Assert
        assert decoded.get('role') == "admin"


# ============================================================================
# TEST CLASS 3: JWT Token Verification
# ============================================================================

class TestJWTTokenVerification:
    """Test JWT token verification and validation"""
    
    def test_verify_jwt_token_valid_token_returns_claims(self):
        """Verify valid JWT token can be decoded"""
        # Arrange
        user_data = {"id": "user_001", "email": "test@school.com"}
        token = create_jwt_token(user_data)
        
        # Act
        decoded = verify_jwt_token(token)
        
        # Assert
        assert decoded is not None
        assert decoded['id'] == "user_001"
    
    def test_verify_jwt_token_expired_token_returns_none(self):
        """Verify expired token fails verification"""
        # Arrange
        user_data = {"id": "user_001", "email": "test@school.com"}
        token = create_jwt_token(user_data, expires_in_hours=-1)  # Already expired
        
        # Act
        result = verify_jwt_token(token)
        
        # Assert
        assert result is None
    
    def test_verify_jwt_token_tampered_token_returns_none(self):
        """Verify tampered token fails verification"""
        # Arrange
        user_data = {"id": "user_001", "email": "test@school.com"}
        token = create_jwt_token(user_data)
        tampered_token = token[:-10] + "TAMPERED!!"  # Modify last chars
        
        # Act
        result = verify_jwt_token(tampered_token)
        
        # Assert
        assert result is None
    
    def test_verify_jwt_token_invalid_format_returns_none(self):
        """Verify invalid JWT format fails"""
        # Arrange
        invalid_token = "not.a.valid.jwt"
        
        # Act
        result = verify_jwt_token(invalid_token)
        
        # Assert
        assert result is None
    
    def test_verify_jwt_token_empty_token_returns_none(self):
        """Verify empty token fails"""
        # Act
        result = verify_jwt_token("")
        
        # Assert
        assert result is None
    
    def test_verify_jwt_token_none_token_returns_none(self):
        """Verify None token is handled gracefully"""
        # Act
        result = verify_jwt_token(None)
        
        # Assert
        assert result is None


# ============================================================================
# TEST CLASS 4: Login Function
# ============================================================================

class TestLoginUser:
    """Test login functionality with mocked database"""
    
    def test_login_user_valid_credentials_returns_tokens(self, mocker):
        """Verify login with valid email and password returns tokens"""
        # Arrange
        email = "teacher@school.com"
        password = "CorrectPassword123"
        user_id = "user_001"
        
        # Mock database lookup
        mock_db = mocker.patch('backend_modular.auth.services.get_user_by_email')
        mock_db.return_value = {
            'id': user_id,
            'email': email,
            'password_hash': hash_password(password),  # Use real hashing
            'role': 'teacher'
        }
        
        # Act
        result = login_user(email=email, password=password)
        
        # Assert
        assert result is not None
        assert 'access_token' in result
        assert 'refresh_token' in result or 'token_type' in result
        assert result.get('user_id') == user_id
    
    def test_login_user_invalid_email_returns_none(self, mocker):
        """Verify login with nonexistent email returns None"""
        # Arrange
        email = "nonexistent@school.com"
        password = "SomePassword123"
        
        # Mock database to return None (user not found)
        mock_db = mocker.patch('backend_modular.auth.services.get_user_by_email')
        mock_db.return_value = None
        
        # Act
        result = login_user(email=email, password=password)
        
        # Assert
        assert result is None
    
    def test_login_user_wrong_password_returns_none(self, mocker):
        """Verify login with wrong password returns None"""
        # Arrange
        email = "teacher@school.com"
        wrong_password = "WrongPassword123"
        correct_password = "CorrectPassword123"
        
        # Mock database to return user with correct password hash
        mock_db = mocker.patch('backend_modular.auth.services.get_user_by_email')
        mock_db.return_value = {
            'id': 'user_001',
            'email': email,
            'password_hash': hash_password(correct_password),
            'role': 'teacher'
        }
        
        # Act
        result = login_user(email=email, password=wrong_password)
        
        # Assert
        assert result is None
    
    def test_login_user_empty_email_returns_none(self, mocker):
        """Verify login with empty email fails"""
        # Act
        result = login_user(email="", password="Password123")
        
        # Assert
        assert result is None
    
    def test_login_user_empty_password_returns_none(self, mocker):
        """Verify login with empty password fails"""
        # Act
        result = login_user(email="teacher@school.com", password="")
        
        # Assert
        assert result is None


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
```

### Step 2: Run Your First Test File

```bash
cd backend_modular
pytest tests/unit/test_auth_services.py -v
```

**Expected Output:**
```
tests/unit/test_auth_services.py::TestPasswordHashing::test_hash_password_returns_non_empty_string PASSED
tests/unit/test_auth_services.py::TestPasswordHashing::test_hash_password_produces_different_hashes_each_call PASSED
tests/unit/test_auth_services.py::TestPasswordHashing::test_verify_password_correct_password_returns_true PASSED
... (and more tests passing)

========================= 16 passed in 0.45s =========================
```

---

## Test Pattern Reference

### Pattern 1: Simple Unit Test (No Mocking)

```python
def test_calculate_gpa_with_three_grades():
    """Test GPA calculation with real data"""
    from backend_modular.scores.services import calculate_gpa
    
    # Arrange
    grades = [8.5, 9.0, 7.5]
    weights = [0.2, 0.3, 0.5]
    
    # Act
    result = calculate_gpa(grades, weights)
    
    # Assert
    expected = (8.5 * 0.2) + (9.0 * 0.3) + (7.5 * 0.5)  # 8.35
    assert result == pytest.approx(expected, 0.01)
```

### Pattern 2: Test with Database Mock

```python
def test_get_student_by_id_found(mocker):
    """Test fetching student from mocked database"""
    from backend_modular.students.services import get_student_by_id
    
    # Arrange
    student_id = "student_001"
    expected_student = {
        'id': student_id,
        'name': 'Linh Tran',
        'email': 'linh@school.com'
    }
    mock_db = mocker.patch('backend_modular.students.services.db.get')
    mock_db.return_value = expected_student
    
    # Act
    result = get_student_by_id(student_id)
    
    # Assert
    assert result == expected_student
    mock_db.assert_called_once_with('students', student_id)
```

### Pattern 3: Test Error Handling

```python
def test_invalid_score_raises_validation_error():
    """Test that invalid score raises error"""
    from backend_modular.scores.services import validate_score
    from backend_modular.scores.models import InvalidScoreError
    
    # Arrange
    invalid_score = 15  # Max is 10
    
    # Act & Assert
    with pytest.raises(InvalidScoreError):
        validate_score(invalid_score)
```

### Pattern 4: Parametrized Tests (Test Multiple Cases)

```python
@pytest.mark.parametrize('score,expected_grade', [
    (9.5, 'A'),
    (8.5, 'B'),
    (7.5, 'C'),
    (6.5, 'D'),
    (5.0, 'F'),
])
def test_score_to_grade_conversion(score, expected_grade):
    """Test letter grade conversion for various scores"""
    from backend_modular.scores.services import convert_score_to_grade
    
    result = convert_score_to_grade(score)
    assert result == expected_grade
```

### Pattern 5: Async Test (For async functions)

```python
@pytest.mark.asyncio
async def test_async_get_face_embeddings():
    """Test async face embedding extraction"""
    from backend_modular.ai_services.services import extract_face_embedding
    
    # Arrange
    mock_image = b'fake_image_data'
    
    # Act
    result = await extract_face_embedding(mock_image)
    
    # Assert
    assert result is not None
    assert len(result) == 128  # Face embedding dimension
```

---

## Test Files to Create (In Order)

### Week 1 - Priority Order:

1. **tests/unit/test_auth_services.py** ← START HERE
   - 16 tests
   - No external dependencies
   - Foundation for other tests
   - Time estimate: 1.5 hours

2. **tests/unit/test_core_config.py**
   - 8 tests
   - Config loading and validation
   - Time estimate: 1 hour

3. **tests/unit/test_core_database.py**
   - 8 tests
   - Database connection and routing
   - Time estimate: 1.5 hours

4. **tests/unit/test_users_services.py**
   - 12 tests
   - User CRUD operations
   - Time estimate: 1.5 hours

5. **tests/unit/test_ai_services_embeddings.py**
   - 10 tests
   - Face embedding and similarity
   - Time estimate: 2 hours

---

## How to Add More Tests

### Template for New Test File:

```python
# tests/unit/test_[module_name]_[component].py
"""Unit tests for [module_name].services"""

import pytest
from backend_modular.[module_name].services import [function_name]

class Test[FeatureName]:
    """Test [Feature] functionality"""
    
    def test_[scenario_name]_[expected_behavior](self):
        """Test description - what we're testing and what we expect"""
        # Arrange - set up test data
        
        # Act - execute the function
        
        # Assert - verify results
        pass
```

---

## Running Tests

### Run All Backend Tests:
```bash
pytest tests/ -v
```

### Run Only Unit Tests:
```bash
pytest tests/unit/ -v
```

### Run Specific Test File:
```bash
pytest tests/unit/test_auth_services.py -v
```

### Run Specific Test Class:
```bash
pytest tests/unit/test_auth_services.py::TestPasswordHashing -v
```

### Run with Coverage:
```bash
pytest tests/ -v --cov=backend_modular --cov-report=html
```

### Run Only Tests Matching Pattern:
```bash
pytest tests/ -v -k "password"  # Runs all tests with "password" in name
```

### Watch Mode (Re-run on file change):
```bash
pytest-watch tests/unit/
```

---

## Common Issues & Solutions

### Issue 1: Import Error - Module Not Found

**Problem:**
```
ModuleNotFoundError: No module named 'backend_modular'
```

**Solution:**
Make sure you're in `backend_modular` directory:
```bash
cd backend_modular
pytest tests/
```

### Issue 2: Test Passes Locally But Fails in CI

**Problem:** Hardcoded paths or environment variables

**Solution:** Use fixtures from conftest.py or set environment variables:
```bash
export ENVIRONMENT=test
pytest tests/
```

### Issue 3: Test Extremely Slow

**Problem:** Making real external API calls

**Solution:** Use `mocker.patch()` to mock all external calls:
```python
def test_something(mocker):
    mocker.patch('backend_modular.ai_services.services.GeminiAPI')
    # Now test without actual API calls
```

### Issue 4: "Cannot find name 'V8CoverageProvider'"

**Don't worry** - This is a Vitest type warning, not a pytest issue. Ignore it.

---

## Checklist for First Week

- [ ] Create `tests/unit/test_auth_services.py` and verify all 16 tests pass
- [ ] Create `tests/unit/test_core_config.py` and verify all 8 tests pass
- [ ] Create `tests/unit/test_core_database.py` and verify all 8 tests pass
- [ ] Create `tests/unit/test_users_services.py` and verify all 12 tests pass
- [ ] Create `tests/unit/test_ai_services_embeddings.py` and verify all 10 tests pass
- [ ] Run all tests together: `pytest tests/unit/ -v`
- [ ] Generate coverage: `pytest tests/ --cov --cov-report=html`
- [ ] Goal: 60+ passing tests, 40%+ coverage

---

## Next Steps (After Week 1)

1. Create integration tests (tests that use real database mocks)
2. Add tests for error scenarios
3. Create parametrized tests for edge cases
4. Set up GitHub Actions to run tests on every PR
5. Track coverage trends weekly

---

## Questions?

Refer to:
- **BACKEND_TESTING_STRATEGY.md** - Full testing plan with all modules
- **tests/conftest.py** - Shared fixtures and mocking setup
- **tests/mocks/external_services.py** - Mock implementations

