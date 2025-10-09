# Smart School System - AI Coding Agent Guide

## Project Overview

Full-stack school management system with **InsightFace (ArcFace)** facial recognition (95-99% accuracy) for automated attendance and **Google Gemini 2.0 Flash** for AI-generated student feedback.

**Stack:** FastAPI (Python 3.8+) backend + React 18 frontend + Supabase (PostgreSQL) + InsightFace + Gemini LLM

## Critical Setup Patterns

### InsightFace Monkey Patching (ESSENTIAL)

InsightFace MUST be initialized with custom cache path BEFORE any imports. See `backend/main.py:19-24`:

```python
from utils.insightface_monkey_patch import ensure_insightface_patch
ensure_insightface_patch("./insightface_cache")  # BEFORE importing routers
from routers import ai, students, attendance  # AFTER patch
```

**Why:** InsightFace ignores `INSIGHTFACE_HOME` env var; monkey patch overrides `os.path.expanduser()` to redirect `~/.insightface` to local cache. See `backend/utils/insightface_monkey_patch.py` for implementation.

### Timezone Handling (Vietnam UTC+7)

All timestamps MUST use Vietnam timezone. Never use naive `datetime.now()`.

```python
from utils.timezone_helper import get_vietnam_time_string, convert_utc_to_vietnam

# Creating timestamps
attendance_data = {
    "check_in_time": get_vietnam_time_string(),  # ISO string with +07:00
    "date": get_vietnam_date_string()  # YYYY-MM-DD
}

# Converting database responses (Supabase returns UTC)
fixed_record = fix_attendance_timestamps(db_record)
```

**Pattern:** Database stores UTC; API responses converted to Vietnam time. See `backend/utils/timezone_helper.py` for helpers.

## Architecture Deep Dive

### Face Recognition System (Primary Feature)

**Service:** `backend/ai/face_recognition_insightface.py` - Singleton `insightface_service` instance

**Key Concepts:**

- **ArcFace embeddings:** 512-dimensional face vectors stored in memory (`face_database` dict)
- **Multiple samples per student:** Up to 15 face encodings for robustness across angles/lighting
- **Similarity threshold:** Cosine similarity 0.20 (lower = more flexible matching)
- **Quality thresholds:** `detection_confidence=0.6`, `quality_threshold=0.6`

**Registration Flow:**

1. Student uploads photo → `POST /api/ai/register-face/{student_id}`
2. InsightFace extracts 512-dim embedding
3. Stored in memory (`face_database[student_id].append(embedding)`)
4. Persisted to `ai_models/{student_id}_faces.pkl` for reloading

**Recognition Flow:**

1. Camera captures base64 image → WebSocket `/api/ai/recognition/stream`
2. `insightface_service.recognize_face()` compares against all stored embeddings
3. Returns best match if similarity > 0.20
4. Auto-creates attendance record if recognized

### WebSocket Continuous Recognition

**Endpoint:** `backend/routers/ai.py:157` - `/api/ai/recognition/stream`

**State Management:**

```python
continuous_recognition_state = {
    "is_running": False,
    "active_connections": set(),  # WebSocket connections
    "recognized_today": {},  # student_id -> timestamp (prevents duplicates)
    "frame_skip": 2  # Process every 2nd frame for performance
}
```

**Protocol:**

- Client sends: `{"type": "frame", "image": "base64_data"}` or `{"type": "start"}`
- Server responds: `{"status": "recognized", "student": {...}, "confidence": 0.85}`

### Authentication & Authorization

**JWT Strategy:** Access token (15 min) + Refresh token (30 days)

**Roles:** `admin`, `homeroom_teacher`, `subject_teacher`

- Homeroom teachers: Filter all views by their `homeroom_class` (see `App.jsx:73-96`)
- Subject teachers: Default to grades page, no filtering
- Admin: Full access

**Token Refresh Pattern** (`frontend/src/services/api.jsx:44-75`):

```javascript
// Auto-refresh on 401 with retry queue
if (response.status === 401 && !originalRequest._retry) {
  return this.refreshAccessToken().then((token) => retry(originalRequest));
}
```

### Database Schema (Supabase)

**Key Tables:**

- `students`: Core entity with `face_encoding` (JSON), `profile_image` (upload path)
- `attendance`: Daily records with `check_in_time`, `status` (present/absent/late), `confidence_score`
- `users`: Auth with `role`, `homeroom_class` (for homeroom teachers)
- `school_days_config`: Per-grade weekly attendance requirements (reset Sundays via scheduler)
- `grades`: Subject grades with `semester`, `score`, `notes`

**Note:** Supabase returns UTC timestamps; always use `fix_database_response_timestamps()` or `prepare_attendance_data()`.

## Development Workflows

### Starting Development Servers

```powershell
# Terminal 1: Backend (from backend/)
venv\Scripts\activate
python main.py  # Uvicorn on port 8000

# Terminal 2: Frontend (from frontend/)
npm start  # React dev server on port 3000
```

**First-time setup:** Run `python install_insightface_production.py` to install InsightFace with pre-built wheels.

### Testing Face Recognition

1. Use `frontend/src/components/FaceManagement.jsx` to register student faces
2. Test with `ContinuousRecognition.jsx` component (WebSocket live stream)
3. Backend logs show similarity scores: `utils/logger.py` writes to `logs/smart_school_YYYYMMDD.log`

### Debugging InsightFace Issues

**Common problem:** Model files download to wrong location

**Solution:**

1. Verify cache path: Check `os.environ['INSIGHTFACE_HOME']` in startup logs
2. Models should be in `backend/insightface_cache/models/buffalo_l/`
3. If missing: Extract `backend/insightface_cache/models/buffalo_l.zip`
4. Restart server after fixing cache path

## Gemini AI Feedback System

**Service:** `backend/services/gemini_service.py` - LLM-powered student feedback

**API Key:** Loaded from `GEMINI_API_KEY` env var (fallback hardcoded for dev)

**Prompt Engineering** (`gemini_service.py:73-120`):

- Context: Student name, score, trend (tăng/giảm/ổn định), attendance rate
- Tone: Professional Vietnamese suitable for parents
- Output: 100-150 word feedback with encouragement/advice

**Usage:**

```python
feedback = await gemini_service.generate_feedback(
    student_name="Nguyễn Văn A",
    score=8.5,
    score_trend="tăng",
    attendance_rate=95
)
```

## Code Conventions

### API Response Format

All endpoints return standardized structure:

```python
ResponseModel(success=True, message="...", data={...})
```

### Async Patterns

- FastAPI endpoints: Always `async def` for database operations
- InsightFace service: Uses `_initialize_sync()` (library not async-compatible)
- WebSocket handlers: `async def` with `await websocket.accept()`

### Error Handling

```python
try:
    # Database operation
    result = db.table("students").select("*").execute()
except Exception as e:
    logger.error(f"ERROR: Failed to fetch students: {str(e)}")
    raise HTTPException(status_code=500, detail=str(e))
```

**Convention:** Log with `"ERROR: "` prefix for critical issues, `"WARNING: "` for non-fatal.

### Frontend Component Patterns

- AuthContext provides: `user`, `isAuthenticated()`, `isHomeroomTeacher()`, `isAdmin()`
- API calls via `api.jsx` service (handles token refresh)
- Role-based rendering: `{isHomeroomTeacher() && <HomeroomDashboard />}`

## File Upload Pattern

**Backend:** `routers/students.py:270` - `POST /students/{student_id}/upload-image`

```python
file_path = f"uploads/students/{student_id}/{filename}"
os.makedirs(os.path.dirname(file_path), exist_ok=True)
with open(file_path, "wb") as buffer:
    buffer.write(await file.read())
```

**Static serving:** `main.py:49` mounts `/uploads` directory

## Scheduled Tasks

**Scheduler:** `backend/services/scheduler_service.py` using `schedule` library

**Weekly reset:** Every Sunday 00:00 Vietnam time - resets `school_days_config.current_week_days` to `default_days_per_week`

**Adding tasks:**

```python
schedule.every().day.at("01:00").do(self._cleanup_old_logs)
```

## Integration Points

### Frontend → Backend API

- Base URL: `http://localhost:8000/api` (proxied in `frontend/package.json`)
- WebSocket: `ws://localhost:8000/api/ai/recognition/stream`
- Auth header: `Authorization: Bearer {access_token}`

### Backend → Supabase

- Direct client via `supabase-py`: `db.table("students").select("*").execute()`
- No ORM; raw queries via `.rpc()` for complex operations
- RLS policies: Some tables require service key (see `SUPABASE_SERVICE_KEY`)

### Backend → Gemini API

- REST API via `google-generativeai` SDK
- Model: `gemini-2.0-flash` (fast, cost-effective)
- Rate limiting: None currently (add if needed)

## Common Pitfalls

1. **Importing InsightFace too early:** Always import after monkey patch
2. **Timezone-naive dates:** Use `get_vietnam_time()`, never `datetime.now()`
3. **Missing face database:** Call `insightface_service.initialize()` on startup to load `.pkl` files
4. **WebSocket connection leaks:** Always clean up in `finally` block of WebSocket handlers
5. **Token expiry:** Frontend auto-refreshes; backend logs show `401` if token invalid

## Key Files Reference

- `backend/main.py`: App initialization, router registration, InsightFace setup
- `backend/routers/ai.py`: Face recognition endpoints + WebSocket
- `backend/ai/face_recognition_insightface.py`: Core AI service
- `frontend/src/components/ContinuousRecognition.jsx`: Live recognition UI
- `backend/utils/timezone_helper.py`: All timezone utilities
- `backend/services/gemini_service.py`: AI feedback generation

## General Coding Rules

- "Always output your answers in Vietnamese."
- "Please read the codebase and think carefully instead of constantly giving repetitive and incorrect codes, I want you to be very careful and sure with your codes then give the codes only once and most accurately according to the requirements."
- "Ensure the generated code is well-organized and modular, with clear separation of concerns."
- "Use descriptive variables, function and class names that reflect their purpose."
- "Include concise, meaningful inline comments and documentation to explain non-obvious logic."
- "Adhere to established coding standards and style guides relevant to the language or framework."
- "Write code that is maintainable, with proper error handling and clear boundaries for functionality."
