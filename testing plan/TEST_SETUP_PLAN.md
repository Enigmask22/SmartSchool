# Testing Setup Plan - SynapseS Project
## Comprehensive Testing Infrastructure & Implementation Strategy

**Date Created:** March 17, 2026  
**Status:** READY FOR IMPLEMENTATION  
**Scope:** Frontend + Backend Testing Integration  

---

## Executive Summary

This plan establishes a **concurrent testing & refactoring strategy** that:
1. ✅ Implements foundational testing infrastructure for both frontend and backend
2. ✅ Supports incremental code refactoring with safety nets
3. ✅ Follows the TEST_DESIGN.md recommendations using Risk-Based & Black-Box testing
4. ✅ Uses industry-standard tools (Vitest, pytest, Playwright, Locust)
5. ✅ Integrates with existing E2E test suite
6. ✅ Can be executed in parallel with PHASE 1 Cleanup of frontend

---

## Part 1: Current Testing Status Assessment

### Frontend Testing Status

| Type | Tool | Status | Coverage |
|------|------|--------|----------|
| E2E Tests | Playwright ✅ | COMPLETE | 6 specs, role-based fixtures, visual snapshots |
| Unit Tests | None ❌ | NOT STARTED | 0% - 9 hooks, 5 components untest |
| Integration Tests | None ❌ | NOT STARTED | 0% - Context/API integration untested |
| Performance Tests | None ❌ | NOT STARTED | 0% |

**Frontend Test Score:** 3/10 - E2E only, missing unit/integration tests

---

### Backend Testing Status

| Type | Tool | Status | Coverage |
|------|------|--------|----------|
| Unit Tests | pytest ❌ | NOT STARTED | 0% - No test files found |
| Integration Tests | pytest ❌ | NOT STARTED | 0% - API/DB integration untested |
| E2E Tests | None ❌ | NOT STARTED | 0% - Only frontend E2E exists |
| Performance Tests | None ❌ | NOT STARTED | 0% |

**Backend Test Score:** 0/10 - No testing infrastructure exists

---

### Key Findings from Codebase Analysis

**Backend Modules Requiring Tests (Priority Order):**
1. **auth/** - Authentication, JWT, password hashing - CRITICAL
2. **scores/** - GPA calculation, score validation - HIGH
3. **feedback/** - GenAI integration (Gemini), fallback logic - HIGH
4. **ai_services/** - Face recognition, image processing - HIGH
5. **attendance/** - Attendance tracking, status updates - MEDIUM
6. **homeroom/** - Homeroom-specific operations - MEDIUM
7. **admin/** - Admin operations - MEDIUM
8. **users/** - User management - LOW

**Backend Services with External Dependencies (Need Mocking):**
- `feedback/gemini_service.py` - Google Gemini API (mock required)
- `feedback/openrouter_service.py` - OpenRouter API (mock required)
- `scores/ocr_services/*.py` - Multiple OCR services (mock required)
- `ai_services/` - InsightFace AI model (mock required for unit tests)
- `core/database.py` - Supabase (need test database)

**Frontend Critical Hooks Needing Unit Tests:**
- `useAdminDashboard.ts` - Admin dashboard logic
- `useAttendanceData.ts` - Attendance filtering/fetching
- `useContinuousRecognition.ts` - Real-time recognition logic
- `useHomeroomDashboard.ts` - Homeroom dashboard
- `useLogin.ts` - Authentication flow
- Others: useFaceManagement, useDashboardSelector, useForgotPassword, useSubjectDashboard

---

## Part 2: Testing Technology Stack & Setup

### Frontend Testing Stack

```
Testing Framework: Vitest (Vite-native, faster than Jest)
├── Unit & Component Tests: @vitest/ui for visual runner
├── Mocking: vitest built-in mocking + @testing-library/react
├── Coverage: vitest --coverage (c8 provider)
├── E2E Tests: Playwright ✅ (already setup)
└── Performance: Vitest benchmarking + Playwright metrics
```

**Frontend Test Pyramid:**
```
           Performance Tests (5%)
              ↑
    Automated Visual Regression (10%)
        ↑
    Integration Tests (25%)
        ↑
    Unit Tests (60%)
```

---

### Backend Testing Stack

```
Testing Framework: pytest (industry standard for Python)
├── Unit Tests: pytest + pytest-parametrize
├── Fixtures: pytest fixtures for test data & setup
├── Mocking: pytest-mock for external service mocking
├── API Testing: pytest + httpx client
├── Database Testing: Testcontainers (optional) or test DB
├── Coverage: pytest-cov (coverage.py)
└── Performance: Locust for load testing
```

**Backend Test Pyramid:**
```
         Load/Performance Tests (5%)
              ↑
    Integration Tests (35%)
        ↑
    Unit Tests (60%)
```

---

## Part 3: Phased Implementation Plan

### PHASE 0: Setup Foundation (Days 1-2) ⚡

**Effort:** ~8 hours  
**Outcome:** Tools installed, configurations ready, first test examples working

#### 3.0.1 Frontend Unit Testing Setup

**Step 1: Install Vitest**
```bash
cd frontend
npm install -D vitest @vitest/ui @vitest/coverage-c8 
npm install -D @testing-library/react @testing-library/jest-dom jsdom
npm install -D vi
```

**Step 2: Create Vitest Configuration**

Create `frontend/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/tests/setup.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ]
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/contexts': path.resolve(__dirname, './src/contexts'),
      '@/utils': path.resolve(__dirname, './src/utils'),
    },
  },
});
```

**Step 3: Create Test Setup File**

Create `frontend/src/tests/setup.ts`:
```typescript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

**Step 4: Update package.json Scripts**

```json
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage",
  "test:watch": "vitest --watch"
}
```

**Step 5: Create Example Test**

Create `frontend/src/hooks/__tests__/useLogin.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLogin } from '../useLogin';

describe('useLogin Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty form values', () => {
    const { result } = renderHook(() => useLogin());
    
    expect(result.current.formData.username).toBe('');
    expect(result.current.formData.password).toBe('');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should update form data on input change', () => {
    const { result } = renderHook(() => useLogin());
    
    act(() => {
      result.current.setFormData({
        username: 'testuser',
        password: 'testpass123'
      });
    });
    
    expect(result.current.formData.username).toBe('testuser');
    expect(result.current.formData.password).toBe('testpass123');
  });
});
```

---

#### 3.0.2 Backend Unit Testing Setup

**Step 1: Install pytest and dependencies**

```bash
cd backend_modular
pip install pytest pytest-mock pytest-asyncio pytest-cov httpx
```

**Step 2: Create pytest Configuration**

Create `backend_modular/pytest.ini`:
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
asyncio_mode = auto
markers =
    unit: Unit tests
    integration: Integration tests
    slow: Slow tests
    skip_in_ci: Skip in CI environment
```

**Step 3: Create Test Directory Structure**

```
backend_modular/
├── tests/
│   ├── conftest.py (Shared fixtures)
│   ├── test_auth/
│   │   ├── __init__.py
│   │   ├── test_auth_service.py
│   │   └── test_jwt_validation.py
│   ├── test_scores/
│   │   ├── __init__.py
│   │   ├── test_score_validation.py
│   │   └── test_gpa_calculation.py
│   ├── test_feedback/
│   │   ├── __init__.py
│   │   ├── test_gemini_fallback.py
│   │   └── test_feedback_generation.py
│   ├── test_attendance/
│   │   ├── __init__.py
│   │   └── test_attendance_logic.py
│   └── fixtures/
│       ├── __init__.py
│       ├── auth_fixtures.py
│       ├── student_fixtures.py
│       └── score_fixtures.py
```

**Step 4: Create Shared Fixtures**

Create `backend_modular/tests/conftest.py`:
```python
"""
Shared pytest fixtures for backend tests
"""
import pytest
import os
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

@pytest.fixture
def mock_gemini_api():
    """Mock Google Gemini API for feedback tests"""
    with patch('feedback.gemini_service.genai.GenerativeModel') as mock:
        mock_instance = MagicMock()
        mock_instance.generate_content.return_value = MagicMock(
            text="Học sinh có tiến độ học tập tốt."
        )
        mock.return_value = mock_instance
        yield mock

@pytest.fixture
def mock_database():
    """Mock database connection"""
    with patch('core.database.get_school_db') as mock:
        mock.return_value = MagicMock()
        yield mock

@pytest.fixture
def test_student_data():
    """Sample student data for testing"""
    return {
        'student_code': 'HS001',
        'full_name': 'Nguyễn Văn A',
        'class_id': 'CLS001',
        'email': 'student@example.com'
    }

@pytest.fixture
def test_score_data():
    """Sample score data for testing"""
    return {
        'student_id': 1,
        'subject_id': 1,
        'score': 8.5,
        'term': 1,
        'school_year': '2024-2025'
    }
```

**Step 5: Create Example Backend Tests**

Create `backend_modular/tests/test_scores/test_score_validation.py`:
```python
"""
Unit tests for score validation using Boundary Value Analysis
Maps to FR.3 - Score Management
"""
import pytest
from scores.services import validate_score

class TestScoreValidation:
    """Test score validation with boundary values"""
    
    # Partition 1: Valid scores (0-10)
    @pytest.mark.parametrize("score", [0, 0.5, 5.0, 9.5, 10])
    def test_valid_scores(self, score):
        """Score within valid range should pass"""
        assert validate_score(score) is True
    
    # Partition 2: Invalid scores (negative or > 10)
    @pytest.mark.parametrize("score", [-0.5, -1, 10.1, 11, 100])
    def test_invalid_scores_out_of_range(self, score):
        """Score outside valid range should fail"""
        assert validate_score(score) is False
    
    # Partition 3: Invalid data types
    @pytest.mark.parametrize("score", ["ten", None, [], {}])
    def test_invalid_data_types(self, score):
        """Non-numeric scores should fail"""
        with pytest.raises((TypeError, ValueError)):
            validate_score(score)
    
    # Boundary: Exact boundaries
    def test_boundary_zero(self):
        """Score of exactly 0 is valid"""
        assert validate_score(0) is True
    
    def test_boundary_ten(self):
        """Score of exactly 10 is valid"""
        assert validate_score(10) is True
```

Create `backend_modular/tests/test_feedback/test_gemini_fallback.py`:
```python
"""
Integration tests for GenAI Feedback with Fallback Logic
Maps to FR.7 - Student Feedback Generation
Tests the reliability requirement (NFR.4)
"""
import pytest
from unittest.mock import patch, MagicMock
from feedback.services import generate_student_feedback

class TestGeminiFallback:
    """Test GenAI feedback generation with fallback"""
    
    @pytest.mark.asyncio
    async def test_feedback_with_working_gemini(self, mock_gemini_api, test_student_data):
        """When Gemini API works, use AI-generated feedback"""
        mock_gemini_api.generate_content.return_value = MagicMock(
            text="An sinh có tiến độ tốt, tích cực tham gia lớp."
        )
        
        result = await generate_student_feedback(
            student_id=1,
            scores=[8.5, 9.0, 8.0],
            attendance_rate=95
        )
        
        assert result['type'] == 'ai_generated'
        assert 'tiến độ' in result['text'].lower()
    
    @pytest.mark.asyncio
    async def test_feedback_fallback_on_timeout(self, mock_gemini_api, test_student_data):
        """When Gemini times out, use rule-based template"""
        mock_gemini_api.generate_content.side_effect = TimeoutError()
        
        result = await generate_student_feedback(
            student_id=1,
            scores=[8.5, 9.0, 8.0],
            attendance_rate=95,
            fallback_enabled=True
        )
        
        assert result['type'] == 'rule_based'
        assert result['text'] is not None
    
    @pytest.mark.asyncio
    async def test_feedback_insufficient_data(self):
        """When data is incomplete, return error with hint"""
        result = await generate_student_feedback(
            student_id=1,
            scores=[],  # Empty scores
            attendance_rate=None
        )
        
        assert result['type'] == 'error'
        assert 'missing data' in result['message'].lower()
```

**Step 6: Update requirements.txt**

Add to `backend_modular/requirements.txt`:
```
# Testing dependencies
pytest>=7.4.0
pytest-asyncio>=0.21.0
pytest-mock>=3.11.1
pytest-cov>=4.1.0
httpx>=0.24.0
```

---

### PHASE 1: Advanced Setup & Integration (Days 3-5) ⏰

**Effort:** ~12 hours  
**Outcome:** Full test infrastructure ready, first 20% of tests written

#### 3.1.1 Frontend Advanced Setup

**Step 1: Add Test Coverage Goals**

Create `frontend/tests.config.ts`:
```typescript
// Coverage targets per module
export const COVERAGE_GOALS = {
  'src/hooks': {
    statements: 90,
    branches: 85,
    functions: 90,
    lines: 90,
  },
  'src/contexts': {
    statements: 85,
    branches: 80,
    functions: 85,
    lines: 85,
  },
  'src/components': {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
};
```

**Step 2: Create Hook Testing Template**

Create `frontend/src/tests/hook-test-template.ts`:
```typescript
/**
 * Template for testing custom hooks
 * Copy and adapt this for each hook test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

describe('useHookName', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useHookName());
      // Assert initial state
    });
  });

  describe('User Interactions', () => {
    it('should handle user action correctly', () => {
      const { result } = renderHook(() => useHookName());
      
      act(() => {
        result.current.someHandler();
      });
      
      // Assert state after action
    });
  });

  describe('Side Effects', () => {
    it('should fetch data on mount', async () => {
      const { result } = renderHook(() => useHookName());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.data).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // Mock API failure
      vi.mock('@/services/api', () => ({
        // Mock implementation
      }));
      
      const { result } = renderHook(() => useHookName());
      
      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });
  });
});
```

**Step 3: Create Component Test Example**

Create `frontend/src/components/__tests__/ContinuousRecognitionHeader.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContinuousRecognitionHeader } from '../ContinuousRecognitionHeader';

describe('ContinuousRecognitionHeader Component', () => {
  const mockProps = {
    recognitionCount: 25,
    confidence: 0.95,
    selectedCameras: ['camera1', 'camera2'],
    isRunning: true,
    onStart: vi.fn(),
    onStop: vi.fn(),
    onCameraSelect: vi.fn(),
  };

  it('should render header with recognition stats', () => {
    render(<ContinuousRecognitionHeader {...mockProps} />);
    
    expect(screen.getByText(/25/)).toBeInTheDocument();
    expect(screen.getByText(/95%/)).toBeInTheDocument();
  });

  it('should call onStop when stop button clicked', async () => {
    const user = userEvent.setup();
    render(<ContinuousRecognitionHeader {...mockProps} />);
    
    await user.click(screen.getByRole('button', { name: /stop/i }));
    
    expect(mockProps.onStop).toHaveBeenCalled();
  });
});
```

---

#### 3.1.2 Backend Advanced Setup

**Step 1: Create Mock Services Library**

Create `backend_modular/tests/mocks/external_services.py`:
```python
"""
Mock implementations for external services
Used in unit tests to avoid API calls
"""
from unittest.mock import MagicMock, AsyncMock
from typing import Optional

class MockGeminiService:
    """Mock Google Gemini API"""
    
    def __init__(self, should_fail: bool = False, timeout: bool = False):
        self.should_fail = should_fail
        self.timeout = timeout
    
    async def call_gemini_api(self, prompt: str) -> str:
        """Mock API call"""
        if self.timeout:
            raise TimeoutError("Gemini API timeout (mocked)")
        if self.should_fail:
            raise Exception("Gemini API error (mocked)")
        return "Học sinh có tiến độ học tập tốt. (Mocked response)"

class MockInsightFaceService:
    """Mock Face Recognition Service"""
    
    def __init__(self, recognition_data: Optional[dict] = None):
        self.recognition_data = recognition_data or {
            'student_id': 1,
            'name': 'Nguyễn Văn A',
            'confidence': 0.98
        }
    
    def recognize_face(self, image_data):
        """Mock face recognition"""
        return self.recognition_data

# Convenience functions
def create_mock_gemini_working():
    return MockGeminiService()

def create_mock_gemini_timeout():
    return MockGeminiService(timeout=True)

def create_mock_gemini_failed():
    return MockGeminiService(should_fail=True)
```

**Step 2: Add Database Test Fixtures**

Create `backend_modular/tests/fixtures/test_db.py`:
```python
"""
Test database fixtures
Provides in-memory or test SQLite database for testing
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture
def test_db():
    """Create in-memory SQLite database for testing"""
    engine = create_engine('sqlite:///:memory:')
    
    # Create all tables (pseudo-code - adapt to your models)
    # Base.metadata.create_all(engine)
    
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    yield session
    
    session.close()
    engine.dispose()
```

**Step 3: Create API Testing Example**

Create `backend_modular/tests/test_auth/test_login_api.py`:
```python
"""
API endpoint tests for authentication
Uses httpx TestClient to test FastAPI endpoints
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

class TestLoginEndpoint:
    """Test /auth/login endpoint"""
    
    def test_login_valid_credentials(self):
        """Valid credentials should return token"""
        response = client.post(
            "/auth/login",
            json={
                "username": "admin.chuyen_le_quy_don.tphcm",
                "password": "password"
            }
        )
        
        assert response.status_code == 200
        assert "access_token" in response.json()
        assert response.json()["token_type"] == "bearer"
    
    def test_login_invalid_password(self):
        """Invalid password should return 401"""
        response = client.post(
            "/auth/login",
            json={
                "username": "admin.chuyen_le_quy_don.tphcm",
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401
        assert "detail" in response.json()
    
    @pytest.mark.parametrize("username,password", [
        ("", "password"),  # Empty username
        ("admin", ""),     # Empty password
        ("nonexistent", "password"),  # Non-existent user
    ])
    def test_login_invalid_formats(self, username, password):
        """Various invalid formats should fail"""
        response = client.post(
            "/auth/login",
            json={"username": username, "password": password}
        )
        
        assert response.status_code != 200
```

---

### PHASE 2: Test Development (Weeks 2-3) 📝

**Effort:** ~40 hours  
**Outcome:** 60% of critical paths tested, 50%+ coverage

#### 3.2.1 Frontend Test Development Priority

**Priority Order:**
1. **Critical Hooks (Week 1)** - 15 hours
   - `useLogin.ts` ✅ (Example already created)
   - `useAdminDashboard.ts` (15-20 tests)
   - `useHomeroomDashboard.ts` (15-20 tests)
   - `useAttendanceData.ts` (15-20 tests)

2. **Important Hooks (Week 2)** - 10 hours
   - `useContinuousRecognition.ts` (Complex, 20-25 tests)
   - `useFaceManagement.ts` (15-20 tests)

3. **Context Testing (Week 2)** - 8 hours
   - `AuthContext.jsx` → Test with hook
   - `SystemSettingsContext.jsx` → Test with hook

4. **Component Testing (Week 3)** - 12 hours
   - Attendance module (4 components)
   - ContinuousRecognition components
   - Sidebar critical UI

---

#### 3.2.2 Backend Test Development Priority

**Priority Order:**
1. **Authentication (Days 1-2)** - 8 hours
   - JWT token generation/validation
   - Password hashing
   - Role-based access control
   - Login endpoint tests

2. **Score Management (Days 3-4)** - 8 hours
   - Score validation (boundary value analysis)
   - GPA calculation
   - Score creation/update/delete endpoints

3. **GenAI Feedback (Day 5)** - 6 hours
   - Gemini API integration
   - Fallback logic when API fails
   - Template generation

4. **Attendance System (Week 2)** - 6 hours
   - Attendance record creation
   - Status updates (Present/Late/Absent)
   - Filtering and reporting

5. **Face Recognition (Week 2)** - 6 hours
   - Mock InsightFace service
   - Recognition endpoint testing
   - Confidence threshold validation

---

### PHASE 3: Integration & CI/CD Setup (Week 4) 🔄

**Effort:** ~12 hours  
**Outcome:** Automated testing in pipeline, quality gates established

#### 3.3.1 GitHub Actions CI/CD

Create `.github/workflows/test-frontend.yml`:
```yaml
name: Frontend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [20.x]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      
      - name: Install dependencies
        run: cd frontend && npm install
      
      - name: Run unit tests
        run: cd frontend && npm run test:coverage
      
      - name: Run E2E tests
        run: cd frontend && npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/lcov.info
      
      - name: Quality gate check
        run: |
          if [ $(cat ./frontend/coverage/coverage-final.json | grep -o '"lines"' | wc -l) -lt 70 ]; then
            echo "Coverage below 70%"
            exit 1
          fi
```

Create `.github/workflows/test-backend.yml`:
```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.13'
      
      - name: Install dependencies
        run: |
          cd backend_modular
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-mock pytest-cov
      
      - name: Run unit tests
        run: cd backend_modular && pytest tests -v --cov --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend_modular/coverage.xml
      
      - name: Run integration tests
        run: cd backend_modular && pytest tests -v -m integration
```

---

## Part 4: Testing Strategy by Module

### Module 1: Authentication & Authorization

**Risk Level:** 🔴 CRITICAL  
**Test Coverage Target:** 95%+

```python
# Test Cases (Black-Box Testing)
1. Valid login with correct credentials
   - Partition: (valid_user, valid_password)
   - Boundary: (min_username_length, max_password_length)
   
2. Invalid credentials
   - Partition: (invalid_user, valid_pass), (valid_user, invalid_pass)
   
3. Account lockout after N failures
   - Test: (3 failed attempts → locked), (wait X mins → unlocked)
   
4. JWT token refresh
   - Test: (expired_token → refresh_token_returns_new_token)
   - Boundary: (token_ttl edges)
   
5. Role-Based Access Control
   - Test: (admin_can_access_admin_api), (teacher_cannot_access_admin_api)
   - Decision Table:
     | Role | Endpoint | Expected |
     |------|----------|----------|
     | admin | /admin/* | 200 |
     | teacher | /admin/* | 403 |
     | student | /teacher/* | 403 |
```

---

### Module 2: Score Management

**Risk Level:** 🟡 HIGH  
**Test Coverage Target:** 90%

```python
# Test Cases (Black-Box + Boundary Value Analysis)
1. Score validation (0-10 range)
   - Valid: [0, 0.5, 5, 9.5, 10] → PASS
   - Boundary: [0, 10] → PASS, [-0.1, 10.1] → FAIL
   - Invalid: ["text", null, {}, []] → TypeError
   
2. GPA calculation
   - Input: scores=[8, 9, 7], weights=[0.2, 0.3, 0.5]
   - Expected: 8.0
   - Test with edge cases (all 10s, all 0s, mixed)
   
3. Score history tracking
   - Can retrieve historical scores
   - Cannot modify old grades
   - Supports grade appeals (adds note)
```

---

### Module 3: GenAI Feedback with Fallback

**Risk Level:** 🟡 HIGH  
**Test Coverage Target:** 85%

```python
# Test Cases (Integration + Error Handling)
1. Gemini API Success Path
   - Precondition: (Gemini API working, valid student data)
   - Action: generate_feedback(student_id)
   - Expected: (type='ai_generated', text contains feedback)
   
2. Gemini API Timeout → Fallback
   - Precondition: (Gemini API timeout after 5s)
   - Action: generate_feedback(student_id, enable_fallback=True)
   - Expected: (type='rule_based', text from template)
   - Decision Table:
     | API Status | Fallback | Expected |
     |-----------|----------|----------|
     | Working | False | AI text |
     | Timeout | False | Error 500 |
     | Timeout | True | Template text |
     | Failed | True | Error msg |
     | No data | True | "Missing data" |
   
3. Insufficient Data Handling
   - Student with no scores → Graceful error
   - Student with no attendance → Use available data
```

---

### Module 4: Face Recognition

**Risk Level:** 🟡 HIGH  
**Test Coverage Target:** 80%

```python
# Test Cases (Black-Box + Error Guessing)
1. Valid Face Recognition
   - Input: Clear face image, frontal angle
   - Expected: (recognized=True, confidence>0.95, student_id identified)
   
2. Edge Case: Low Confidence Match
   - Input: Partial face, side angle
   - Expected: (recognized=False OR confidence<0.85, no_match_returned)
   
3. Error Handling
   - No face in image → "No face detected"
   - Multiple faces → "Ambiguous - multiple faces detected"
   - Blurry image → "Image quality too low"
   
4. Performance (Important for real-time)
   - Single recognition: < 200ms
   - Batch 50 recognitions: < 5s total
```

---

### Module 5: Attendance System

**Risk Level:** 🟡 HIGH  
**Test Coverage Target:** 85%

```python
# Test Cases
1. Attendance Record Creation
   - Valid: (student_id, class_id, date, status)
   - Status enum: [Present, Late, Absent, Excused]
   
2. Real-time Updates
   - Create attendance → Update status → Verify in DB
   - WebSocket broadcast → Client receives update
   
3. Filtering & Reporting
   - Filter by class → Returns correct students
   - Filter by status → Returns correct counts
   - Monthly report → Sums correctly
```

---

## Part 5: Concurrent Execution Schedule

### Month 1: Foundational Testing

```
Week 1: Setup + Example Tests
├─ PHASE 0: Vitest + pytest setup (Days 1-2)
├─ PHASE 1: Advanced config & templates (Days 3-5)
└─ Parallel: FRONTEND PHASE 1 Cleanup (code refactoring)

Week 2-3: Critical Path Testing
├─ Auth tests (backend)
├─ Login hook tests (frontend)
├─ Score validation tests (backend)
├─ useAdminDashboard tests (frontend)
└─ E2E tests running alongside

Week 4: Integration & CI/CD
├─ GitHub Actions setup
├─ Coverage reporting
├─ Quality gates enforcement
└─ First complete E2E test run
```

---

## Part 6: Test Execution Commands Reference

### Frontend Testing

```bash
# Run unit tests in watch mode
npm run test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run specific test file
npm run test src/hooks/__tests__/useLogin.test.ts

# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode (visible browser)
npm run test:e2e -- --headed

# Run E2E tests with debug
npm run test:e2e -- --debug
```

### Backend Testing

```bash
# Run all unit tests
pytest tests -v

# Run with coverage
pytest tests -v --cov=. --cov-report=html

# Run specific test file
pytest tests/test_auth/test_login_api.py -v

# Run tests by marker
pytest tests -v -m unit
pytest tests -v -m integration

# Run with detailed output
pytest tests -v -s

# Run single test
pytest tests/test_auth/test_login_api.py::TestLoginEndpoint::test_login_valid_credentials -v

# Run tests matching pattern
pytest tests -v -k "login"

# Performance testing with Locust
locust -f tests/load_tests/locustfile.py --host=http://localhost:8000
```

---

## Part 7: Quality Metrics & Success Criteria

### Coverage Targets by Phase

| Phase | Frontend Coverage | Backend Coverage | E2E Pass Rate |
|-------|:---------------:|:---------------:|:-------------:|
| PHASE 0 (Setup) | - | - | 100% |
| PHASE 1 (Basic) | 20% | 30% | 100% |
| PHASE 2 (Dev) | 50% | 60% | 100% |
| PHASE 3 (Integration) | 70% | 75% | 100% |
| PHASE 4 (Final) | 85%+ | 85%+ | 100% |

### Code Quality Gates (CI/CD)

✅ **Pass Criteria:**
- Unit test pass rate: 100%
- Code coverage: ≥ 70% (statements)
- E2E test pass rate: 100%
- No critical security issues
- No console errors in E2E

❌ **Fail Criteria:**
- Coverage < 70%
- Any test failure
- API response time > 2s (average)
- Bundle size increase > 20%

---

## Part 8: Documentation & Resources

### Test Documentation Template

For each test file, include:
```markdown
# Test Suite: [Module Name]
**Purpose:** [What is being tested and why]
**Coverage:** [Black-Box techniques used]
**Risk Level:** [Critical/High/Medium/Low]
**Dependencies:** [External mocks, fixtures, data]
**Maintenance:** [Known issues, flaky tests]
```

### Key Files to Create

1. `TESTING_GUIDE.md` - How to write tests, naming conventions
2. `MOCK_STRATEGY.md` - External API mocking approach
3. `CI_CD_GUIDE.md` - GitHub Actions setup & troubleshooting
4. `COVERAGE_REPORT.md` - Generate and interpret coverage reports
5. `PERFORMANCE_BASELINE.md` - API response times, thresholds

---

## Part 9: Risk Mitigation

### Potential Issues & Solutions

**Issue 1: E2E tests are flaky**
- **Solution:** Use proper waits, retry logic in Playwright
- **Monitoring:** Track flaky test dashboard in CI

**Issue 2: Mocking external APIs is complex**
- **Solution:** Use `pytest-mock`, `unittest.mock` library
- **Reference:** `tests/mocks/external_services.py` template

**Issue 3: Database state pollution between tests**
- **Solution:** Use fixtures that rollback transactions
- **Reference:** Create `test_db` fixture in conftest.py

**Issue 4: Performance tests too slow**
- **Solution:** Mark with `@pytest.mark.slow`, run separately in CI
- **Reference:** Can skip with `pytest -m "not slow"`

---

## Part 10: Implementation Checklist

### PHASE 0 Checklist (Days 1-2)

- [ ] Install Vitest on frontend
- [ ] Install pytest on backend
- [ ] Create `vitest.config.ts`
- [ ] Create `pytest.ini`
- [ ] Create test directories structure
- [ ] Create `conftest.py` with fixtures
- [ ] Create example hook test (useLogin)
- [ ] Create example API test (login endpoint)
- [ ] Update package.json scripts
- [ ] Verify first tests run successfully
- [ ] Document setup in TEST_SETUP_GUIDE.md

### PHASE 1 Checklist (Days 3-5)

- [ ] Setup Vitest coverage reporting
- [ ] Create hook testing template
- [ ] Create component testing example
- [ ] Create mock service library for backend
- [ ] Create API testing example
- [ ] Setup test database fixtures
- [ ] Document testing conventions
- [ ] Create first 5 hook tests (frontend)
- [ ] Create first 5 endpoint tests (backend)
- [ ] Verify coverage reports generate correctly
- [ ] Setup coverage badges in README

### PHASE 2 Checklist (Weeks 2-3)

- [ ] Write all critical hook tests (useLogin, useAdminDashboard, etc.)
- [ ] Write all critical endpoint tests (auth, scores, feedback)
- [ ] Achieve 50%+ coverage on both stacks
- [ ] Fix any flaky tests
- [ ] Create GitHub Actions workflows
- [ ] Test CI/CD pipeline with real PR
- [ ] Document any patterns discovered
- [ ] Update CURRENT_STATE.md with test progress

### PHASE 3 Checklist (Week 4+)

- [ ] Enable quality gates in CI
- [ ] Configure coverage thresholds
- [ ] Setup codecov integration
- [ ] Create coverage reports in PRs
- [ ] Monitor test execution times
- [ ] Identify slow tests for optimization
- [ ] Create performance baseline
- [ ] Document troubleshooting guide

---

## Summary & Next Actions

### Current State
- ✅ Frontend: E2E tests complete (6 specs), 0% unit test coverage
- ❌ Backend: No automated tests, 0% coverage
- ⚠️ Integration between frontend & backend: Basic E2E coverage only

### After PHASE 0 (Days 1-2)
- ✅ Both stacks have testing infrastructure
- ✅ Example tests demonstrate each pattern
- ✅ CI/CD configuration ready
- ⏳ Ready for mass test development

### Timeline to Full Coverage (70%+)
- PHASE 0: 2 days (setup)
- PHASE 1: 3 days (templates + 10 tests)
- PHASE 2: 10 days (60+ tests)
- PHASE 3: 5 days (CI/CD + optimization)
- **Total: ~3 weeks to meaningful test coverage**

### Parallel Work During Refactoring
While PHASE 1 Frontend Cleanup happens:
- **Week 1:** Setup testing infrastructure (no code impact)
- **Week 2:** Refactoring + test development (orthogonal work)
- **Week 3:** E2E verification of refactored code
- **Week 4:** Full regression test suite

---

**Report Status:** ✅ READY FOR IMPLEMENTATION  
**Recommended Start Date:** Immediate (start PHASE 0 today)  
**Estimated Completion:** 3-4 weeks for 70% coverage  

---

## Appendix: Quick Start Commands

```bash
# Frontend - Get started with unit tests
cd frontend
npm install -D vitest @vitest/ui @testing-library/react
npx vitest --help   # Verify installation

# Backend - Get started with pytest
cd backend_modular
pip install pytest pytest-asyncio pytest-mock pytest-cov
pytest --version   # Verify installation

# Run example tests
cd frontend && npm run test          # Will fail (no tests yet)
cd backend_modular && pytest tests   # Will fail (no tests yet)

# After PHASE 0 setup, examples will pass
```

