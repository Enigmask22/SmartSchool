# Backend Module Analysis & Testing Prioritization

## Executive Summary
The SmartSchool backend contains 14 modules with varying complexity levels. **Critical infrastructure modules (auth, core, ai_services)** should be tested first due to their high impact on other modules. **Complex business logic modules (scores, feedback)** have many dependencies and require mock strategies for external APIs.

---

## Module-by-Module Analysis

| Module | Files | Purpose | Key Dependencies | Business Logic Complexity | Testing Priority |
|--------|-------|---------|-------|-----|-----|
| **auth** | api.py, models.py, services.py | OTP generation, email verification, password hashing, JWT authentication | SMTP, bcrypt, python-jose, Supabase | **MEDIUM** | 🔴 **WEEK 1** |
| **core** | config.py, database.py, dependencies.py, logger.py, school_database_manager.py, system_settings.py, encode_school_config.py | Database connections, multi-school support, configuration management, dependency injection | Supabase, python-jose | **HIGH** | 🔴 **WEEK 1** |
| **ai_services** | api.py, models.py, services.py, insightface_cache/ | Face recognition (InsightFace), face embeddings, face similarity search (Faiss), student face registration/deletion | InsightFace, Faiss, OpenCV, scikit-learn, numpy | **VERY HIGH** | 🔴 **WEEK 1** |
| **users** | api.py, models.py, services.py | User CRUD operations, password management, user authentication | Bcrypt, Supabase | **MEDIUM** | 🟠 **WEEK 1-2** |
| **scores** | api.py, models.py, services.py, ocr_services/ | Grade calculation, OCR for score sheets, Qwen2.5-VL integration, Gemini OCR, OpenRouter OCR | Gemini API, OpenRouter API, Qwen2.5-VL, transformers, torch, faiss | **VERY HIGH** | 🟠 **WEEK 2** |
| **feedback** | api.py, models.py, services.py, gemini_service.py, openrouter_service.py, email_report_card_service.py | AI-generated student feedback, report card generation, email sending | Gemini API, OpenRouter API, SMTP | **HIGH** | 🟠 **WEEK 2** |
| **students** | api.py, models.py, services.py | Student CRUD, student data validation | Supabase | **MEDIUM** | 🟠 **WEEK 2** |
| **attendance** | api.py, models.py, services.py | Attendance tracking, Vietnam timezone handling | Supabase, core.database | **MEDIUM** | 🟠 **WEEK 2** |
| **admin** | api.py, models.py, services.py | Admin operations, school admin functionality, automatic student ID generation | Supabase | **MEDIUM** | 🟡 **WEEK 3** |
| **homeroom** | api.py, models.py, services.py, subject_import.py | Homeroom teacher management, subject importing | Supabase | **MEDIUM** | 🟡 **WEEK 3** |
| **camera_manager** | api.py, models.py, services.py, db_service.py | Multi-camera management, frame capture, video streaming, camera status | OpenCV, threading | **MEDIUM** | 🟡 **WEEK 3** |
| **grades** | ocr_services/ only | OCR for grade sheets (empty directory) | OCR providers | **LOW** | 🟡 **WEEK 4** |
| **score_settings** | api.py, models.py | Score configuration, grading scale settings | Supabase | **LOW** | 🟢 **WEEK 4** |
| **school_config** | (empty) | School-specific configuration | N/A | **N/A** | 🟢 **WEEK 4** |

---

## Detailed Module Descriptions

### 🔴 WEEK 1 CRITICAL MODULES

#### 1. **auth** Module
**Files:** `api.py`, `models.py`, `services.py`

**Purpose:**
- OTP (One-Time Password) generation and verification
- Email-based authentication
- Password hashing using bcrypt
- JWT token generation (via python-jose)
- Login/logout functionality

**Critical Business Logic:**
- `OTPService` class: Generates OTPs, stores in temp_otp directory, manages expiry & attempts
- `EmailService` class: Sends OTP via SMTP, creates HTML email templates
- Password verification and hashing with bcrypt

**External Dependencies:**
- ✓ SMTP (email service) - **NEEDS MOCKING**
- ✓ Bcrypt for password hashing
- ✓ python-jose for JWT tokens
- ✓ Python built-in email libraries

**Known Issues:**
- OTP stored in local files (not ideal for distributed systems)
- Email SMTP configuration required
- 3 max attempts hardcoded

**Testing Strategy:**
```
Unit Tests:
  ✓ Password hashing/verification
  ✓ OTP generation & expiry logic
  ✓ OTP attempt limiting
  ✓ OTP cleanup
  
Integration Tests:
  ✓ Email sending (with mock SMTP)
  ✓ OTP workflow end-to-end
  
Mocking:
  → Mock SMTP email service
  → Mock filesystem for OTP storage
```

---

#### 2. **core** Module
**Files:** `config.py`, `database.py`, `dependencies.py`, `logger.py`, `school_database_manager.py`, `system_settings.py`, `encode_school_config.py`

**Purpose:**
- Centralized database connection management
- Multi-school/multi-tenant database support
- Configuration loading from environment
- Dependency injection for FastAPI
- Logging setup
- School database encoding/decoding

**Critical Business Logic:**
- `Database` class: Singleton pattern with Supabase client management
- `SchoolDatabaseManager`: Maps usernames to school databases, caches connections
- Legacy vs. school-specific database routing
- `get_db_for_user()`: Returns appropriate database based on username

**External Dependencies:**
- ✓ Supabase (PostgreSQL backend) - **NEEDS MOCKING**
- ✓ python-jose for encryption
- ✓ Logging framework

**Known Issues:**
- Complex multi-school routing logic
- Fallback mechanisms may hide errors
- School database mapping not fully documented

**Testing Strategy:**
```
Unit Tests:
  ✓ Database initialization
  ✓ School database selection logic
  ✓ Configuration loading
  
Integration Tests:
  ✓ Multi-school database switching
  ✓ Fallback to default database
  
Mocking:
  → Mock Supabase client
  → Mock environment variables
  → Mock school configuration
```

---

#### 3. **ai_services** Module
**Files:** `api.py`, `models.py`, `services.py`, `insightface_cache/`

**Purpose:**
- Face recognition using InsightFace (ArcFace algorithm)
- Face embedding extraction from images
- Face similarity matching
- Faiss index for fast similarity search (scales to 1000-2000 students)
- Student face registration and deletion
- Face detection and counting

**Critical Business Logic:**
- `FaissIndexManager`: Builds & maintains similarity index for fast lookup (~50-200ms per query)
- `InsightFaceRecognitionService`: Main service with:
  - `extract_face_embeddings()`: Gets embeddings from image
  - `find_best_match()`: Finds matching student from embeddings
  - `recognize_face()`: End-to-end face recognition
  - `register_student_face()`: Stores student face embeddings in DB
  - Face similarity calculation using cosine distance

**External Dependencies:**
- ✓ InsightFace (0.7.3+) - state-of-the-art face recognition
- ✓ Faiss (for fast similarity search) - **CPU version only on Windows**
- ✓ OpenCV (image processing)
- ✓ scikit-learn (cosine similarity)
- ✓ numpy (array operations)
- ✓ Supabase (store embeddings)
- ✓ PIL/Pillow (image conversion)

**Known Issues:**
- Complex initialization with multiple steps
- Faiss GPU version not available on Windows (CPU fallback)
- Index persistence across restarts
- Embedding storage format needs optimization

**Testing Strategy:**
```
Unit Tests:
  ✓ Embedding distance calculation
  ✓ Base64 image conversion
  ✓ Faiss index operations (build, search, update)
  
Integration Tests:
  ✓ Face recognition workflow
  ✓ Student face registration
  ✓ Face similarity matching
  
Mocking:
  → Mock InsightFace model (return synthetic embeddings)
  → Mock Faiss index
  → Mock Supabase for face storage
  → Mock OpenCV image processing
```

---

#### 4. **users** Module
**Files:** `api.py`, `models.py`, `services.py`

**Purpose:**
- User CRUD operations
- User password management
- User role management
- User data validation

**Critical Business Logic:**
- `hash_password()`: Bcrypt password hashing
- `verify_password()`: Password verification
- User creation, update, delete operations

**External Dependencies:**
- ✓ Bcrypt for password hashing
- ✓ Supabase for storage

**Testing Strategy:**
```
Unit Tests:
  ✓ Password hashing/verification
  ✓ User data validation
  
Integration Tests:
  ✓ User CRUD operations
  
Mocking:
  → Mock Supabase
  → Mock password operations
```

---

### 🟠 WEEK 2 HIGH PRIORITY MODULES

#### 5. **scores** Module
**Files:** `api.py`, `models.py`, `services.py`, `ocr_services/`

**OCR Services Submodule:**
- `gemini_ocr_service.py`: Gemini Vision API for OCR
- `openrouter_ocr_service.py`: OpenRouter API for OCR
- `qwen_ocr_service.py`: Qwen2.5-VL local model (3B parameters)
- `qwen_queue_manager.py`: Queue management for Qwen processing
- `ocr_factory.py`: Factory pattern to select OCR provider

**Purpose:**
- Grade calculation (automatic + final grades)
- Score sheet OCR (extract grades from images)
- Support for multiple OCR providers:
  - Gemini Vision API (cloud)
  - OpenRouter API (cloud)
  - Qwen2.5-VL (local model on GPU)
- Grade format conversion (numeric ↔ letter grades)

**Critical Business Logic:**
- `calculate_final_grade()`: Complex grade calculation with:
  - Support for nested score structures
  - Mixed letter & numeric grades
  - Weighted averaging
  - Multiple grading stages
- `cleanup_old_score_sheets()`: Automatic cleanup
- OCR providers with fallback strategy

**External Dependencies:**
- ✓ Gemini Vision API - **NEEDS MOCKING**
- ✓ OpenRouter API - **NEEDS MOCKING**
- ✓ Qwen2.5-VL model (torch, transformers, accelerate, einops, timm)
- ✓ PyTorch with CUDA 12.4
- ✓ TorchVision, TorchAudio
- ✓ Supabase (store scores)

**Known Issues:**
- Complex grade calculation logic (nested structures)
- Multiple OCR providers add complexity
- Qwen model requires GPU (3B parameters)
- Queue management for Qwen processing
- File cleanup logic timing issues

**Testing Strategy:**
```
Unit Tests:
  ✓ Grade calculation (various formats)
  ✓ Grade format conversion
  ✓ Nested score structure handling
  ✓ OCR factory selection
  
Integration Tests:
  ✓ OCR workflow with different providers
  ✓ Score persistence
  ✓ Grade aggregation
  
Mocking:
  → Mock Gemini API
  → Mock OpenRouter API
  → Mock Qwen model (return synthetic text)
  → Mock Supabase for score storage
  → Mock file operations for cleanup
```

---

#### 6. **feedback** Module
**Files:** `api.py`, `models.py`, `services.py`, `gemini_service.py`, `openrouter_service.py`, `email_report_card_service.py`

**Purpose:**
- Generate AI-based student feedback
- Support for multiple AI providers:
  - Gemini (default)
  - OpenRouter (fallback)
- Email report cards with feedback
- Batch feedback generation

**Critical Business Logic:**
- `FeedbackService`: Factory pattern to initialize AI provider
- Provider fallback: Gemini → OpenRouter
- `_create_ai_service()`: Dynamic service initialization
- `generate_feedback()`: Creates personalized feedback
- `generate_batch_feedback()`: Batch processing
- Report card email generation with HTML templates

**External Dependencies:**
- ✓ Gemini API (Google Generative AI) - **NEEDS MOCKING**
- ✓ OpenRouter API - **NEEDS MOCKING**
- ✓ SMTP for email sending
- ✓ Supabase (fetch student data)

**Known Issues:**
- Fallback logic between providers
- API key management
- Email template consistency
- Batch processing performance

**Testing Strategy:**
```
Unit Tests:
  ✓ AI provider selection
  ✓ Fallback mechanism
  ✓ Feedback prompt generation
  
Integration Tests:
  ✓ Feedback generation workflow
  ✓ Batch feedback processing
  ✓ Email sending (with mock)
  
Mocking:
  → Mock Gemini & OpenRouter APIs
  → Mock SMTP email service
  → Mock Supabase for student data
```

---

#### 7. **students** Module
**Files:** `api.py`, `models.py`, `services.py`

**Purpose:**
- Student CRUD operations
- Student data validation
- Student search and filtering

**Critical Business Logic:**
- `validate_student_data()`: Data validation
- Student creation, update, delete
- Student enumeration/search

**External Dependencies:**
- ✓ Supabase (storage)

**Testing Strategy:**
```
Unit Tests:
  ✓ Student data validation
  
Integration Tests:
  ✓ Student CRUD operations
  ✓ Student searching
  
Mocking:
  → Mock Supabase
```

---

#### 8. **attendance** Module
**Files:** `api.py`, `models.py`, `services.py`

**Purpose:**
- Attendance tracking and logging
- Vietnam timezone support (UTC+7)
- Check-in/check-out operations
- Attendance reports

**Critical Business Logic:**
- `get_vietnam_timezone()`: Timezone handling
- `get_vietnam_now()`: Current time in Vietnam timezone
- Attendance logic based on time
- Check-in/out validation

**External Dependencies:**
- ✓ Supabase (attendance records)
- ✓ Python datetime (timezone support)

**Testing Strategy:**
```
Unit Tests:
  ✓ Timezone conversion
  ✓ Time formatting
  ✓ Attendance validation
  
Integration Tests:
  ✓ Attendance recording
  ✓ Report generation
  
Mocking:
  → Mock Supabase
  → Mock datetime for time-dependent tests
```

---

### 🟡 WEEK 3 MEDIUM PRIORITY MODULES

#### 9. **admin** Module
**Files:** `api.py`, `models.py`, `services.py`

**Purpose:**
- Admin-only operations
- Automatic student ID generation
- School management
- Data administration

**Critical Business Logic:**
- `generate_student_id()`: Creates unique student IDs based on grade

**External Dependencies:**
- ✓ Supabase

**Testing Strategy:**
```
Unit Tests:
  ✓ Student ID generation
  
Integration Tests:
  ✓ Admin operations
  
Mocking:
  → Mock Supabase
```

---

#### 10. **homeroom** Module
**Files:** `api.py`, `models.py`, `services.py`, `subject_import.py`

**Purpose:**
- Homeroom teacher management
- Subject importing and configuration
- Class management

**External Dependencies:**
- ✓ Supabase

**Testing Strategy:**
```
Unit Tests:
  ✓ Subject import validation
  
Integration Tests:
  ✓ Homeroom operations
  ✓ Subject management
  
Mocking:
  → Mock Supabase
```

---

#### 11. **camera_manager** Module
**Files:** `api.py`, `models.py`, `services.py`, `db_service.py`

**Purpose:**
- Multi-camera management
- Frame capture from multiple camera sources
- Live video streaming
- Camera status monitoring
- Thread-safe frame access

**Critical Business Logic:**
- `CameraCapture`: Per-camera capture with threading
  - Multi-threaded frame capture
  - Status monitoring
  - Error handling per camera
  - Frame buffering
- `CameraManager`: Orchestrates multiple cameras
  - Add/remove cameras dynamically
  - Start/stop capture
  - Frame aggregation

**External Dependencies:**
- ✓ OpenCV (video capture, frame processing)
- ✓ Threading (multi-camera support)
- ✓ numpy (frame manipulation)

**Known Issues:**
- Threading synchronization complexity
- Frame buffer management
- Error recovery per camera
- Hardware-dependent behavior

**Testing Strategy:**
```
Unit Tests:
  ✓ Camera URL building
  ✓ Frame format conversion (base64)
  ✓ Status tracking
  
Integration Tests:
  ✓ Multi-camera capture
  ✓ Thread safety
  ✓ Error handling
  
Mocking:
  → Mock OpenCV VideoCapture
  → Mock threading
  → Synthetic frame generation
```

---

### 🟢 WEEK 4 LOWER PRIORITY MODULES

#### 12. **grades** Module
**Files:** `ocr_services/` (empty - for future use)

**Purpose:** Grade-specific OCR processing (currently unused)

#### 13. **score_settings** Module
**Files:** `api.py`, `models.py`

**Purpose:** Score configuration management

#### 14. **school_config** Module
**Files:** (empty)

**Purpose:** School-specific configuration (currently unused)

---

## Testing Prioritization Schedule

### 🔴 **WEEK 1: Foundation & Critical Infrastructure**
**Why first?** Other modules depend on these. Get them solid.

1. **core** (priority 1.1)
   - Database connections
   - Multi-school routing
   - Configuration management
   - Duration: 2-3 days

2. **auth** (priority 1.2)
   - Password security
   - OTP flow
   - JWT tokens
   - Duration: 1-2 days

3. **ai_services** (priority 1.3)
   - Face recognition pipeline
   - Similarity search
   - Database integration
   - Duration: 3-4 days (complex)

4. **users** (priority 1.4)
   - User CRUD
   - Password operations
   - Duration: 1 day

**Week 1 Total:** ~1-2 weeks (4 modules)

---

### 🟠 **WEEK 2: Core Business Logic**
**Why second?** Depends on Week 1 foundation.

1. **scores** (priority 2.1) ⭐ **MOST COMPLEX**
   - Grade calculation (complex logic)
   - OCR integration (3 providers)
   - Duration: 3-4 days
   
2. **feedback** (priority 2.2)
   - AI provider integration
   - Email generation
   - Batch processing
   - Duration: 2-3 days

3. **students** (priority 2.3)
   - CRUD operations
   - Validation
   - Duration: 1 day

4. **attendance** (priority 2.4)
   - Attendance tracking
   - Timezone handling
   - Duration: 1-2 days

**Week 2 Total:** ~1-2 weeks (4 modules)

---

### 🟡 **WEEK 3: Supporting Features**
**Why third?** Less critical but important for completeness.

1. **admin** (priority 3.1)
   - Admin operations
   - ID generation
   - Duration: 1-2 days

2. **homeroom** (priority 3.2)
   - Homeroom management
   - Subject importing
   - Duration: 1-2 days

3. **camera_manager** (priority 3.3)
   - Multi-camera support
   - Threading
   - Duration: 2-3 days (complex threading)

**Week 3 Total:** ~1 week (3 modules)

---

### 🟢 **WEEK 4: Configuration & Cleanup**
**Why last?** Nice-to-have, configuration-heavy.

1. **score_settings** (priority 4.1)
   - Config management
   - Duration: 0.5-1 day

2. **grades** (priority 4.2)
   - Currently empty
   - Duration: N/A

3. **school_config** (priority 4.3)
   - Currently empty
   - Duration: N/A

**Week 4 Total:** ~0.5 days (1 module with content)

---

## Critical External Dependencies & Mocking Strategy

### High-Priority Mocking (for Week 1-2 testing)

| Dependency | Module(s) | Type | Mocking Strategy |
|---|---|---|---|
| **Supabase** | core, auth, users, scores, feedback, students, attendance, admin, homeroom, camera_manager | Database | Mock entire client with in-memory storage |
| **InsightFace** | ai_services | ML Model | Return synthetic embeddings |
| **Faiss** | ai_services | Similarity Search | Mock index with simple linear search |
| **Gemini API** | scores (OCR), feedback | Cloud API | Mock with predetermined responses |
| **OpenRouter API** | scores (OCR), feedback | Cloud API | Mock with predetermined responses |
| **Qwen2.5-VL** | scores (OCR) | ML Model | Mock with synthetic OCR output |
| **SMTP Email** | auth, feedback | Email Service | Mock with in-memory queue |
| **OpenCV** | camera_manager | Video Library | Mock VideoCapture with synthetic frames |

### Medium-Priority Mocking (for Week 3-4)

| Dependency | Module(s) | Mocking Strategy |
|---|---|---|
| **Threading** | camera_manager | Mock with synchronous alternatives |
| **Filesystem** | auth (OTP temp storage) | Mock with in-memory storage |

---

## Known Issues & Risk Factors

### 🔴 **Critical Issues (Fix Before Testing)**

1. **scores.ocr_services**: No OCR implementation exists yet
   - Factory pattern ready but no concrete providers
   - Qwen2.5-VL integration incomplete
   - Gemini/OpenRouter integration needs testing

2. **ai_services**: Complex initialization with multiple steps
   - Faiss GPU unavailable on Windows
   - Embedding persistence across restarts untested
   - Index corruption scenarios not handled

3. **core.database**: Multi-school routing logic is complex
   - Fallback behavior may mask errors
   - School database mapping not documented

### 🟠 **High Issues (Test Extensively)**

1. **feedback**: Provider fallback logic untested
   - Gemini → OpenRouter fallback behavior
   - Email template consistency
   - Batch processing performance

2. **scores**: Grade calculation with nested structures
   - Multiple grading stages
   - Letter vs. numeric conversion
   - Edge cases with mixed formats

3. **camera_manager**: Thread safety and synchronization
   - Multiple concurrent camera operations
   - Frame buffer management
   - Resource cleanup on errors

### 🟡 **Medium Issues (Monitor During Testing)**

1. **auth**: OTP storage in local files
   - Not scalable for distributed systems
   - Cleanup logic timing-dependent

2. **attendance**: Timezone handling consistency
   - Vietnam UTC+7 hardcoded
   - Daylight saving considerations

---

## Test Infrastructure Requirements

### Mock/Stub Libraries
```python
# Required packages for testing
pytest>=7.0
pytest-asyncio>=0.21.0
pytest-cov>=4.0.0
unittest.mock (built-in)
mongomock (if MongoDB tests needed)
responses (for HTTP mocking)
```

### Test Database Strategy
```python
# Option 1: In-memory Supabase mock
@pytest.fixture
def mock_supabase():
    return MockSupabaseClient()  # In-memory implementation

# Option 2: SQLite for integration tests
@pytest.fixture
def test_db():
    # SQLite database for realistic integration tests
    return TestDatabase()
```

### Fixture Dependencies
```
core.database → auth, users, students, scores, attendance, admin
ai_services → attendance (face recognition)
users → all modules (user context)
```

---

## Recommended Testing Tools & Setup

```bash
# Install testing dependencies
pip install pytest pytest-asyncio pytest-cov pytest-mock

# Run tests with coverage
pytest --cov=backend_modular --cov-report=html

# Run specific module tests
pytest backend_modular/auth/tests/
pytest backend_modular/core/tests/

# Run async tests
pytest --asyncio-mode=auto
```

---

## Summary Table: Module Priority Matrix

| Priority | Weeks | Modules | Key Focus | Risk Level |
|---|---|---|---|---|
| 🔴 **CRITICAL** | 1-2 | core, auth, ai_services, users | Infrastructure & security | **HIGH** |
| 🟠 **HIGH** | 2-3 | scores, feedback, students, attendance | Business logic & APIs | **HIGH** |
| 🟡 **MEDIUM** | 3-4 | admin, homeroom, camera_manager | Supporting features | **MEDIUM** |
| 🟢 **LOW** | 4 | grades, score_settings, school_config | Configuration | **LOW** |

---

**Generated:** March 2026 | **Total Modules:** 14 | **Estimated Testing Timeline:** 4-6 weeks
