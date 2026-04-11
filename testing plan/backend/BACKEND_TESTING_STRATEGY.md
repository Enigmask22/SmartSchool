# Backend Testing Strategy - Detailed Plan

**Created:** March 17, 2026  
**Target:** 80%+ test coverage for critical modules  
**Timeline:** 8 weeks (concurrent with frontend refactoring)  
**Focus:** Unit tests + Integration tests for core backend modules

---

## Executive Summary

Based on backend_modular analysis, we'll create tests in 4-week phases prioritizing:
1. **Core infrastructure** (auth, core, users) - foundation for everything
2. **Complex business logic** (scores, feedback, ai_services) - high risk areas
3. **Entity management** (students, attendance, homeroom) - data integrity
4. **Supporting features** (admin, camera_manager, score_settings)

**Total Tests Target:** 200+ unit tests + 50+ integration tests by end of Week 8

---

## Module Testing Priority Matrix

### 🔴 PHASE 1: WEEK 1-2 (CRITICAL - FOUNDATION)

#### Module 1: `core/` - Database & Config Management
**Criticality:** CRITICAL (all modules depend on this)

**Files:**
- `database.py` - Supabase connection, query builder
- `config.py` - Environment, settings loader
- `school_database_manager.py` - Multi-tenant school routing
- `dependencies.py` - FastAPI dependency injection
- `logger.py` - Logging setup

**Business Logic:**
```
Multi-school database routing:
  ├─ get_school_db(school_id) → returns correct Supabase client
  ├─ Fallback to default school if not found
  └─ Connection pooling & retry logic

Config management:
  ├─ Load from .env / environment variables
  ├─ Validate required settings
  └─ Support development/staging/production modes
```

**Test Plan:**

**Unit Tests (12 tests):**
1. `test_database_connection_valid` - Verify Supabase connects
2. `test_database_connection_invalid_key` - Handle invalid credentials
3. `test_school_db_routing_existing_school` - Correct school selection
4. `test_school_db_routing_nonexistent_school` - Fallback behavior
5. `test_config_load_environment_variables` - Load from .env
6. `test_config_load_missing_required_field` - Validation error
7. `test_config_production_mode_strict` - Production security
8. `test_logger_initialization` - Logger setup
9. `test_logger_file_creation` - Log file created
10. `test_connection_retry_logic` - Retry on timeout
11. `test_connection_pool_reuse` - Pool reuses connections
12. `test_dependency_injection_get_db` - FastAPI depends_on works

**Integration Tests (5 tests):**
1. `test_multi_school_concurrent_queries` - Thread-safe routing
2. `test_config_environment_override` - Env vars override .env
3. `test_database_transaction_rollback` - Rollback on error
4. `test_logger_writes_to_file_and_console` - Dual output
5. `test_school_switching_in_same_request` - Request isolation

**Mocking Strategy:**
- Mock `supabase.Client` entirely - use in-memory fake
- Mock environment variables
- Real file I/O for log testing (use temp dir)

**Fixtures Needed:**
```python
@pytest.fixture
def mock_supabase_client():
    # Mock all Supabase methods
    
@pytest.fixture
def test_school_data():
    return {
        'school_id': 'school_001',
        'name': 'Test School',
        'db_url': 'postgresql://...'
    }

@pytest.fixture
def test_config():
    return {
        'SUPABASE_URL': 'http://localhost:54321',
        'SUPABASE_KEY': 'test-key',
        'ENVIRONMENT': 'test'
    }
```

---

#### Module 2: `auth/` - Authentication & Authorization
**Criticality:** CRITICAL (protects all endpoints)

**Files:**
- `models.py` - User, Role, Permission schemas
- `services.py` - JWT token creation, password hashing, login logic
- `api.py` - Login, logout, refresh endpoints

**Business Logic:**
```
Authentication pipeline:
  ├─ Hash password (bcrypt)
  ├─ Verify credentials against database
  ├─ Create JWT tokens (access + refresh)
  ├─ Set secure HTTP-only cookies
  └─ Handle token expiration & refresh

Authorization:
  ├─ Verify token signature
  ├─ Check token expiration
  ├─ Extract user info from token
  └─ Verify user permissions/roles
```

**Test Plan:**

**Unit Tests (18 tests):**
1. `test_hash_password_valid` - Bcrypt hashing works
2. `test_hash_password_different_each_time` - Salt varies
3. `test_verify_password_correct` - Valid hash matches
4. `test_verify_password_incorrect` - Invalid hash fails
5. `test_verify_password_empty_password` - Handle empty
6. `test_create_jwt_token_valid` - Token structure correct
7. `test_create_jwt_token_contains_user_id` - Claims present
8. `test_create_jwt_token_expires_in_correct_time` - Expiry set
9. `test_verify_jwt_token_valid` - Token decodes correctly
10. `test_verify_jwt_token_expired` - Expired token rejected
11. `test_verify_jwt_token_invalid_signature` - Tampered token rejected
12. `test_verify_jwt_token_missing_claims` - Required claims checked
13. `test_login_user_valid_credentials` - Return tokens
14. `test_login_user_invalid_email` - User not found error
15. `test_login_user_invalid_password` - Wrong password error
16. `test_refresh_token_valid` - New access token issued
17. `test_refresh_token_expired` - Expired refresh rejected
18. `test_logout_clears_session` - Session invalidated

**Integration Tests (6 tests):**
1. `test_login_endpoint_valid_returns_200_with_tokens`
2. `test_login_endpoint_invalid_returns_401_unauthorized`
3. `test_protected_endpoint_with_valid_token_allows_access`
4. `test_protected_endpoint_without_token_returns_401`
5. `test_protected_endpoint_with_expired_token_returns_401`
6. `test_refresh_endpoint_issues_new_access_token`

**Mocking Strategy:**
- Mock database user lookup (don't test DB, test auth logic)
- Real JWT library (don't mock cryptography)
- Mock email service if password reset exists

**Fixtures Needed:**
```python
@pytest.fixture
def test_user_data():
    return {
        'id': 'user_001',
        'email': 'test@school.com',
        'password_hash': bcrypt_hash('password123')
    }

@pytest.fixture
def jwt_secret():
    return 'test-secret-key-12345'

@pytest.fixture
def mock_db_get_user(mocker):
    return mocker.patch('auth.services.get_user_by_email')
```

---

#### Module 3: `users/` - User Management
**Criticality:** CRITICAL (user CRUD, roles/permissions)

**Files:**
- `models.py` - User, Teacher, Admin, Student schemas
- `services.py` - User CRUD, profile update, role assignment
- `api.py` - User endpoints

**Business Logic:**
```
User management:
  ├─ Create user with validations
  ├─ Update user profile
  ├─ Assign roles/permissions
  ├─ Soft delete user
  └─ List users with filters

Role-based access:
  ├─ Assign role (admin, teacher, student, parent)
  ├─ Check permissions before action
  └─ Handle role transitions
```

**Test Plan:**

**Unit Tests (16 tests):**
1. `test_create_user_valid_email` - Email validation
2. `test_create_user_invalid_email` - Reject bad email
3. `test_create_user_duplicate_email` - Prevent duplicates
4. `test_create_user_strong_password_required` - Password validation
5. `test_update_user_name` - Update field
6. `test_update_user_nonexistent` - Error handling
7. `test_assign_role_valid_role` - Role assignment works
8. `test_assign_role_invalid_role` - Reject invalid role
9. `test_assign_role_transition_student_to_teacher` - Role change
10. `test_delete_user_soft_delete` - Mark deleted, keep data
11. `test_delete_user_already_deleted` - Idempotent
12. `test_get_user_by_id_found` - Retrieve user
13. `test_get_user_by_id_not_found` - Return None
14. `test_list_users_with_filter_role` - Filter by role
15. `test_list_users_with_filter_school` - Filter by school
16. `test_list_users_pagination` - Limit and offset work

**Integration Tests (5 tests):**
1. `test_create_user_endpoint_returns_user_data`
2. `test_update_user_endpoint_only_own_profile_or_admin`
3. `test_delete_user_endpoint_soft_deletes`
4. `test_list_users_endpoint_respects_permissions`
5. `test_assign_role_endpoint_requires_admin`

**Fixtures Needed:**
```python
@pytest.fixture
def mock_db_user_operations(mocker):
    return {
        'insert': mocker.patch('users.services.db.insert'),
        'update': mocker.patch('users.services.db.update'),
        'delete': mocker.patch('users.services.db.delete')
    }

@pytest.fixture
def test_user_creation_data():
    return {
        'email': 'newuser@school.com',
        'password': 'StrongPass123!',
        'name': 'John Doe',
        'role': 'teacher'
    }
```

---

#### Module 4: `ai_services/` - AI/ML Services
**Criticality:** CRITICAL (face recognition, attendance)

**Files:**
- `services.py` - InsightFace embedding, similarity search
- `models.py` - Face data, embeddings
- `api.py` - Face registration, identification endpoints

**Business Logic:**
```
Face recognition:
  ├─ Extract face embeddings (InsightFace)
  ├─ Store embeddings in Faiss index
  ├─ Search similar faces (threshold: 0.6)
  ├─ Handle multi-face detection
  └─ Return top matches with confidence

Error handling:
  ├─ No face detected → return error
  ├─ Multiple faces detected → require selection or error
  ├─ Low confidence (< 0.6) → no match
  └─ Model not loaded → load on demand
```

**Test Plan:**

**Unit Tests (14 tests):**
1. `test_extract_face_embedding_valid_image` - Extract works
2. `test_extract_face_embedding_no_face_detected` - Handle no face
3. `test_extract_face_embedding_multiple_faces` - Detect multiple
4. `test_extract_face_embedding_low_quality_image` - Handle blurry
5. `test_face_similarity_identical_faces_high_score` - Same person ~1.0
6. `test_face_similarity_different_faces_low_score` - Different person ~0.0
7. `test_face_similarity_threshold_exact_boundary` - Test 0.6 threshold
8. `test_face_index_initialization` - Faiss index created
9. `test_face_index_add_embedding` - Add to index
10. `test_face_index_search_single_match` - Find one match
11. `test_face_index_search_no_matches_below_threshold` - No results
12. `test_face_index_search_multiple_matches_ranked` - Top 5 results
13. `test_face_index_persistence_save_and_load` - Save/load index
14. `test_face_cache_invalidation_on_add` - Cache clears

**Integration Tests (5 tests):**
1. `test_register_face_endpoint_stores_embedding`
2. `test_identify_face_endpoint_returns_matches_with_confidence`
3. `test_identify_face_with_no_match_returns_empty`
4. `test_face_search_after_registration_finds_it`
5. `test_face_search_across_multiple_students`

**Mocking Strategy:**
- Mock InsightFace model (don't download 100MB+ model)
- Create synthetic face embeddings (128-dim vectors)
- Mock Faiss operations
- Mock real image for one test (use test image file)

**Fixtures Needed:**
```python
@pytest.fixture
def mock_insightface_model(mocker):
    # Return synthetic embeddings
    def mock_get_embedding(image):
        return np.random.randn(128).astype(np.float32)
    return mocker.patch('ai_services.services.face_model.get_embedding', side_effect=mock_get_embedding)

@pytest.fixture
def test_face_embedding():
    return np.random.randn(128).astype(np.float32)

@pytest.fixture
def test_face_image_file():
    # Use actual test image or create placeholder
    return 'tests/fixtures/test_face.jpg'
```

---

### 🟠 PHASE 2: WEEK 3-4 (HIGH COMPLEXITY)

#### Module 5: `scores/` - Grade Management & Calculation
**Criticality:** HIGH (complex calculation logic)

**Files:**
- `models.py` - Score, Grade schemas  
- `services.py` - OCR processing, GPA calculation, grade aggregation
- `api.py` - Score endpoints
- `ocr_services/` - 3 OCR providers (Gemini, OpenRouter, Qwen2.5-VL)

**Business Logic:**
```
Score entry from OCR:
  ├─ Upload score sheet image
  ├─ Try Gemini API first
  ├─ Fallback to OpenRouter if Gemini fails
  ├─ Fallback to Qwen2.5-VL if OpenRouter fails
  ├─ Parse JSON response → extract scores
  ├─ Validate scores (0-10 scale, numeric)
  └─ Store scores with OCR confidence

Grade calculation:
  ├─ Weighted average: (assessment_1 * 0.2 + assessment_2 * 0.3 + exam * 0.5)
  ├─ Min score: 0, Max score: 10
  ├─ Letter grade mapping (A/B/C/D/F)
  └─ Class GPA: average of all student grades
```

**Test Plan:**

**Unit Tests (20 tests):**
1. `test_score_validation_valid_range_0_10` - Validate range
2. `test_score_validation_negative_score_rejected` - Reject <0
3. `test_score_validation_above_10_rejected` - Reject >10
4. `test_score_validation_non_numeric_rejected` - Reject strings
5. `test_gpa_calculation_simple_average` - Single grade
6. `test_gpa_calculation_weighted_average` - Weights applied
7. `test_gpa_calculation_multiple_subjects` - All subjects included
8. `test_gpa_calculation_zero_score` - Handle 0
9. `test_gpa_calculation_perfect_score` - Handle 10
10. `test_grade_mapping_score_9_0_to_10_0_maps_A` - A grade
11. `test_grade_mapping_score_8_0_to_8_9_maps_B` - B grade
12. `test_grade_mapping_score_7_0_to_7_9_maps_C` - C grade
13. `test_grade_mapping_score_6_0_to_6_9_maps_D` - D grade
14. `test_grade_mapping_score_below_6_maps_F` - F grade
15. `test_ocr_gemini_parsing_valid_json` - Parse response
16. `test_ocr_gemini_parsing_invalid_json_error` - Handle bad JSON
17. `test_ocr_fallback_gemini_fails_try_openrouter` - Fallback logic
18. `test_ocr_fallback_all_providers_fail_return_error` - All fail
19. `test_ocr_confidence_score_stored` - Save confidence
20. `test_score_import_bulk_multiple_students` - Bulk import

**Integration Tests (6 tests):**
1. `test_upload_score_sheet_triggers_ocr_processing`
2. `test_ocr_result_stored_in_database`
3. `test_score_update_recalculates_gpa`
4. `test_bulk_score_import_endpoint_processes_all_scores`
5. `test_score_validation_prevents_invalid_entries`
6. `test_gpa_calculated_correctly_across_semester`

**Mocking Strategy:**
- Mock all 3 OCR APIs (don't call real endpoints)
- Real GPA calculation logic (no mocking)
- Mock image upload (don't process real images)
- Real database for score storage (integration test)

**Fixtures Needed:**
```python
@pytest.fixture
def mock_gemini_ocr(mocker):
    return mocker.patch('scores.ocr_services.gemini.extract_scores', 
        return_value={'scores': [8.5, 9.0, 7.5], 'confidence': 0.95})

@pytest.fixture
def mock_openrouter_ocr(mocker):
    return mocker.patch('scores.ocr_services.openrouter.extract_scores',
        return_value={'scores': [8.5, 9.0, 7.5], 'confidence': 0.92})

@pytest.fixture
def test_score_sheet_data():
    return {
        'student_id': 'student_001',
        'subject': 'Math',
        'scores': [8.5, 9.0, 7.5],
        'semester': '1'
    }
```

---

#### Module 6: `feedback/` - Feedback & AI Suggestions
**Criticality:** HIGH (complex AI integration)

**Files:**
- `models.py` - Feedback schema
- `services.py` - Gemini feedback generation, storage
- `gemini_service.py` - Gemini API integration
- `api.py` - Feedback endpoints

**Business Logic:**
```
Generate feedback:
  ├─ Input: student name, subject, current grade, improvement areas
  ├─ Call Gemini API with prompt
  ├─ Parse response → extract feedback text
  ├─ Store feedback with timestamp
  └─ Handle API failures → return generic feedback

Feedback quality:
  ├─ Min 50 chars, max 500 chars
  ├─ Non-empty language
  ├─ Actionable (not just "good job")
  └─ Save confidence scores
```

**Test Plan:**

**Unit Tests (16 tests):**
1. `test_feedback_generation_gemini_success` - Valid response
2. `test_feedback_generation_gemini_timeout` - Handle timeout
3. `test_feedback_generation_gemini_invalid_response` - Bad JSON
4. `test_feedback_validation_minimum_length` - 50 char min
5. `test_feedback_validation_maximum_length` - 500 char max
6. `test_feedback_validation_empty_feedback_rejected` - Not empty
7. `test_feedback_validation_profanity_detected` - Filter bad words
8. `test_feedback_prompt_construction_includes_student_name` - Personalized
9. `test_feedback_prompt_construction_includes_grade` - Context
10. `test_feedback_prompt_construction_includes_areas_to_improve` - Focused
11. `test_feedback_storage_timestamp_recorded` - Track creation
12. `test_feedback_storage_gemini_response_saved` - Full response
13. `test_feedback_retrieval_by_student_id` - Query works
14. `test_feedback_retrieval_by_subject` - Filter works
15. `test_feedback_fallback_on_gemini_failure` - Generic response
16. `test_feedback_batch_generation_multiple_students` - Bulk

**Integration Tests (5 tests):**
1. `test_feedback_endpoint_triggers_gemini_generation`
2. `test_feedback_stored_after_generation`
3. `test_feedback_retrieval_endpoint_returns_feedback`
4. `test_feedback_generation_fails_gracefully_returns_generic`
5. `test_bulk_feedback_generation_for_class`

**Mocking Strategy:**
- Mock Gemini API entirely (expensive API)
- Real feedback validation logic
- Real database storage (integration test)

**Fixtures Needed:**
```python
@pytest.fixture
def mock_gemini_feedback(mocker):
    return mocker.patch('feedback.gemini_service.generate_feedback',
        return_value="Excellent work in Math! Keep practicing algebraic equations.")

@pytest.fixture
def test_feedback_params():
    return {
        'student_name': 'Linh',
        'subject': 'Math',
        'current_grade': 7.5,
        'areas_to_improve': ['Algebra', 'Geometry']
    }
```

---

#### Module 7: `attendance/` - Attendance Tracking
**Criticality:** HIGH (critical data)

**Files:**
- `models.py` - Attendance record schema
- `services.py` - Mark attendance, count absences, statistics
- `api.py` - Attendance endpoints

**Business Logic:**
```
Mark attendance:
  ├─ Session ID + student list
  ├─ Mark present/absent/excused/late
  ├─ Record timestamp
  ├─ Handle duplicate submissions (idempotent)
  └─ Prevent backdating (can't mark old sessions)

Analyze attendance:
  ├─ Count absences per student
  ├─ Flag excessive absences (>10%)
  ├─ Track attendance trends (increasing/decreasing)
  └─ Generate attendance report
```

**Test Plan:**

**Unit Tests (14 tests):**
1. `test_mark_attendance_present` - Valid mark
2. `test_mark_attendance_absent` - Valid mark
3. `test_mark_attendance_excused` - Valid mark
4. `test_mark_attendance_late` - Valid mark
5. `test_mark_attendance_invalid_status` - Reject invalid
6. `test_mark_attendance_duplicate_idempotent` - Can repeat
7. `test_mark_attendance_past_session_rejected` - No backdating
8. `test_attendance_count_absences_single_session` - Count works
9. `test_attendance_count_absences_multiple_sessions` - Aggregate
10. `test_attendance_count_excludes_excused` - Excused not counted
11. `test_attendance_rate_calculation_100_percent` - Perfect rate
12. `test_attendance_rate_calculation_50_percent` - Half present
13. `test_attendance_rate_calculation_zero_sessions` - Handle edge
14. `test_attendance_flag_excessive_missing_more_than_10_percent` - Flag

**Integration Tests (5 tests):**
1. `test_mark_attendance_endpoint_stores_record`
2. `test_mark_attendance_batch_endpoint_processes_all`
3. `test_attendance_report_endpoint_returns_statistics`
4. `test_attendance_filter_by_date_range`
5. `test_excessive_absence_alert_generated`

**Fixtures Needed:**
```python
@pytest.fixture
def test_attendance_session():
    return {
        'session_id': 'session_001',
        'class_id': 'class_001',
        'date': '2024-03-17',
        'subject': 'Math'
    }

@pytest.fixture
def test_attendance_records():
    return [
        {'student_id': 'student_001', 'status': 'present'},
        {'student_id': 'student_002', 'status': 'absent'},
        {'student_id': 'student_003', 'status': 'excused'}
    ]
```

---

#### Module 8: `students/` - Student Management
**Criticality:** HIGH (student data)

**Files:**
- `models.py` - Student profile schema
- `services.py` - Student CRUD, enrollment, class assignment
- `api.py` - Student endpoints

**Test Plan:**

**Unit Tests (12 tests):**
1. `test_create_student_valid_data`
2. `test_create_student_invalid_email`
3. `test_create_student_duplicate_email`
4. `test_enroll_student_in_class`
5. `test_unenroll_student_from_class`
6. `test_list_students_by_class`
7. `test_list_students_by_grade_level`
8. `test_bulk_student_import`
9. `test_student_profile_update`
10. `test_student_soft_delete`
11. `test_student_search_by_name`
12. `test_student_search_by_student_id`

**Integration Tests (4 tests):**
1. `test_create_student_endpoint`
2. `test_bulk_import_endpoint`
3. `test_class_enrollment_endpoint`
4. `test_student_list_endpoint_with_filters`

---

### 🟡 PHASE 3: WEEK 5-6 (MEDIUM COMPLEXITY)

#### Module 9: `homeroom/` - Class/Homeroom Management
#### Module 10: `admin/` - Admin Features
#### Module 11: `camera_manager/` - Camera Integration

(Similar breakdown as above - 10-15 tests each)

---

### 🟢 PHASE 4: WEEK 7-8 (LOW COMPLEXITY)

#### Module 12: `score_settings/` - Configuration Only

(5-8 configuration tests)

---

## Testing Best Practices

### 1. Mock External APIs Consistently

Use this pattern for all external API calls:

```python
# conftest.py
@pytest.fixture
def mock_all_external_apis(mocker):
    """Mock all external APIs in one fixture"""
    return {
        'gemini': mocker.patch('ai_services.services.GeminiAPI.call'),
        'supabase': mocker.patch('core.database.supabase.Client'),
        'insightface': mocker.patch('ai_services.services.InsightfaceModel.predict'),
        'openrouter': mocker.patch('scores.ocr_services.OpenRouterAPI.call'),
    }
```

### 2. Separate Unit & Integration Tests

```
tests/
├── unit/
│   ├── test_auth_logic.py          # No DB, no API calls
│   ├── test_score_calculation.py
│   └── test_attendance_rate.py
└── integration/
    ├── test_auth_flow.py           # With DB + API mocks
    ├── test_score_ocr.py
    └── test_attendance_recording.py
```

### 3. Use Fixtures for Common Test Data

```python
@pytest.fixture
def typical_school():
    """Realistic school data"""
    return {'id': 'school_001', 'name': 'Example School'}

@pytest.fixture
def typical_student():
    """Realistic student data"""
    return {
        'id': 'student_001',
        'name': 'Linh Tran',
        'email': 'linh@example.com',
        'class': 'year_10_a'
    }
```

### 4. Test Error Cases Explicitly

```python
def test_login_invalid_email_returns_401_unauthorized():
    """Test error path"""
    response = login(email='nonexistent@example.com', password='test')
    assert response.status_code == 401
    assert 'Invalid credentials' in response.message
```

### 5. Parametrize Similar Tests

```python
@pytest.mark.parametrize('score,expected_grade', [
    (9.5, 'A'),
    (8.5, 'B'),
    (7.5, 'C'),
    (6.5, 'D'),
    (5.0, 'F'),
])
def test_score_to_grade_mapping(score, expected_grade):
    assert convert_score_to_grade(score) == expected_grade
```

---

## Week-by-Week Schedule

### Week 1 (Days 1-5)
```
Mon-Tue: Auth + Core tests (30 tests)
Wed:     Users tests (16 tests)
Thu-Fri: AI Services tests (14 tests)
Total:   ~60 tests
Blocks:  None
```

### Week 2 (Days 8-12)
```
Mon-Tue: Scores tests (20 tests)
Wed:     Feedback tests (16 tests)
Thu-Fri: Attendance + Students tests (26 tests)
Total:   ~62 tests
Blocks:  Coordinate with refactoring (E2E must pass)
```

### Week 3 (Days 15-19)
```
Mon-Tue: Homeroom tests (12 tests)
Wed-Thu: Admin tests (14 tests)
Fri:     Camera Manager tests (10 tests)
Total:   ~36 tests
Blocks:  None
```

### Week 4 (Days 22-26)
```
Mon-Tue: Score Settings tests (8 tests)
Wed-Thu: Integration test coverage gaps (15 tests)
Fri:     Coverage reporting + cleanup (5 tests)
Total:   ~28 tests
Blocks:  None

Coverage Target: 70%+ across all critical modules
```

---

## Critical Dependencies for Testing

### Order of Implementation:

1. **Mock Library** (created ✅)
   - `tests/mocks/external_services.py`
   - Already includes: MockGemini, MockInsightFace, MockOCR, MockDatabase

2. **Test Fixtures** (in conftest.py)
   - School data, User data, Student data
   - Already created ✅

3. **Test Structure**
   - `tests/unit/` - Pure logic tests
   - `tests/integration/` - With DB/APIs
   - `tests/fixtures/` - Test data files

4. **CI/CD Integration** (Week 4+)
   - GitHub Actions runs pytest
   - Coverage report to Codecov
   - Blocks merge if coverage < 70%

---

## Success Metrics

By end of Week 8:
- ✅ 200+ unit tests written
- ✅ 50+ integration tests written
- ✅ 70%+ coverage for auth, core, users, scores, feedback
- ✅ 50%+ coverage for remaining modules
- ✅ All critical paths tested
- ✅ All external API calls mocked
- ✅ Zero warnings in pytest output
- ✅ Average test execution time < 3 seconds

---

## How to Start

### Next Action (This Week)
Create first real test file: `tests/unit/test_auth_services.py`

```python
# tests/unit/test_auth_services.py
import pytest
from auth.services import hash_password, verify_password, create_jwt_token

class TestPasswordHashing:
    def test_hash_password_valid(self):
        # Use patterns from hook-test-template.ts
        result = hash_password('mypassword123')
        assert result is not None
        assert len(result) > 10
    
    def test_verify_password_correct(self):
        hashed = hash_password('correct_password')
        assert verify_password('correct_password', hashed) == True
    
    def test_verify_password_incorrect(self):
        hashed = hash_password('correct_password')
        assert verify_password('wrong_password', hashed) == False
```

Then run:
```bash
pytest tests/unit/test_auth_services.py -v
```

### Progress Tracking
- Update this document weekly
- Track tests passing/failing
- Record issues discovered
- Estimate time per module

---

