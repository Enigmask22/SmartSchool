---
title: Smart School Backend
emoji: 🏫
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# Smart School — Backend

<div align="center">

**Modular Monolithic FastAPI Backend with AI Services**

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![CUDA](https://img.shields.io/badge/CUDA-12.4-76B900?style=flat-square&logo=nvidia&logoColor=white)](https://developer.nvidia.com/cuda-toolkit)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)

</div>

---

## Architecture

This backend follows a **modular monolithic** pattern: a single FastAPI application organized into self-contained feature modules, each with its own `api.py` (routes), `services.py` (business logic), and `models.py` (Pydantic schemas).

```
backend/
├── main.py                    # Entry point
├── app_factory.py             # FastAPI app factory, CORS, middleware, router registration
│
├── core/                      # Shared infrastructure
│   ├── database.py            # Supabase client singleton (supports multi-DB routing)
│   ├── database_router.py     # Dynamic DB switching per school
│   ├── config.py              # Environment config
│   ├── dependencies.py        # FastAPI dependency injection
│   ├── middleware.py           # Request middleware (school DB resolution)
│   ├── logger.py              # Structured logging
│   └── schema/                # Database schema SQL files
│
├── auth/                      # Authentication & authorization
│   ├── api.py                 # Login, register, OTP, token refresh, password reset
│   ├── services.py            # JWT creation/validation, OTP generation, email
│   └── models.py              # Auth request/response schemas
│
├── admin/                     # Administrative management
│   ├── api.py                 # School config, user CRUD, class/subject/teacher CRUD
│   ├── services.py            # HMAC-SHA256 config encryption, school setup
│   └── models.py              # Admin schemas
│
├── students/                  # Student management
│   ├── api.py                 # CRUD, import/export, face encoding status
│   ├── services.py            # Bulk operations, face count tracking
│   └── models.py              # Student schemas
│
├── scores/                    # Grade management
│   ├── api.py                 # Score CRUD, OCR import, transcript generation
│   ├── services.py            # Score calculation engine, OCR pipeline orchestration
│   └── models.py              # Score schemas
│
├── attendance/                # Attendance tracking
│   ├── api.py                 # Check-in/out, manual records, status updates
│   ├── services.py            # Attendance logic, cutoff time evaluation
│   └── models.py              # Attendance schemas
│
├── homeroom/                  # Homeroom teacher dashboard
│   ├── api.py                 # Bootstrap, student list, attendance, leave requests, notebook
│   ├── services.py            # Dashboard aggregation
│   └── models.py              # Homeroom schemas
│
├── feedback/                  # AI feedback engine
│   ├── api.py                 # Comment CRUD, AI generation, batch, email report cards
│   ├── services.py            # Gemini/OpenRouter integration, template fallback
│   └── models.py              # Feedback & comment schemas
│
├── ai_services/               # AI/ML services
│   ├── insightface_engine.py  # Face detection, embedding extraction (ArcFace)
│   ├── faiss_index.py         # Vector search index management
│   ├── face_matcher.py        # Real-time face matching pipeline
│   └── models.py              # AI service schemas
│
├── camera_manager/            # IP camera management
│   ├── api.py                 # Camera CRUD, discovery, connection testing
│   ├── services.py            # Stream management, RTSP/HTTP handling
│   └── models.py              # Camera schemas
│
├── score_settings/            # Score configuration
│   ├── api.py                 # Scoring rubric CRUD per subject
│   ├── services.py            # Config validation, default templates
│   └── models.py              # Score settings schemas
│
├── users/                     # User profile
│   ├── api.py                 # Profile CRUD, preferences
│   └── models.py              # User schemas
│
└── tests/                     # Test suite (pytest)
    ├── conftest.py            # Shared fixtures
    ├── TS-AUTH-*.py           # Auth tests
    ├── TS-ADM-*.py            # Admin tests
    ├── TS-HOM-*.py            # Homeroom tests
    └── ...
```

### Design Principles

| Principle                 | Implementation                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Module Isolation**      | Each module has its own router, service layer, and models — can be developed and tested independently |
| **Dependency Injection**  | FastAPI's `Depends()` for database sessions, current user, and permissions                            |
| **Thin Routes**           | Route handlers delegate to service functions; no business logic in `api.py`                           |
| **Shared Core**           | Database client, auth utilities, and middleware live in `core/` — imported by all modules             |
| **Database-Agnostic API** | All DB access goes through Supabase client; switch to any PostgreSQL-compatible backend               |

---

## Database

### Multi-School Architecture

The platform supports multiple schools from a single codebase. Each school has its own isolated Supabase project (separate PostgreSQL database). The `database_router.py` middleware resolves which database to use based on the authenticated user's school affiliation.

```
User Login → JWT (contains school_id) → Middleware resolves Supabase project → All queries routed to correct DB
```

Configuration is stored encrypted (HMAC-SHA256) in a master database, decrypted at runtime.

### Key Schema Design Decisions

- **Face embeddings in separate table** (`face_embeddings`): Normalized structure for Faiss vector search — avoids loading full student rows during recognition
- **JSONB score data** (`scores.score_data`): Flexible scoring rubrics — each subject defines its own column structure (weights, sub-columns) via `subjects.score_column_config`
- **Homeroom student history** (`homeroom_students_history`): Tracks teacher-class-student relationships over time with unique constraint enforcement
- **Timezone-aware timestamps**: All `TIMESTAMP WITH TIME ZONE` columns default to `Asia/Ho_Chi_Minh` via database configuration

---

## AI Services

### Face Recognition Pipeline

```
Camera Frame → InsightFace Detection → ArcFace Embedding (512-dim)
    → Faiss Index Search → Cosine Similarity → Match Decision (threshold > 0.6)
    → Attendance Record (auto check-in with Vietnam timezone)
```

- **Model**: InsightFace `buffalo_l` (ArcFace-ResNet100, trained on Glint360K)
- **Embedding**: 512-dimensional L2-normalized vectors
- **Search**: Faiss `IndexFlatIP` (inner product) with batch processing
- **Device**: CUDA GPU (configurable fallback to CPU)
- **Recognition cooldown**: Configurable per student (default 30s)

### OCR Grade Import Pipeline

```
Teacher Photo → Resize/Preprocess
    → Gemini Vision API (primary, cloud) OR Qwen2.5-VL (local, fallback)
    → Structured JSON {subject_code, columns, scores}
    → Score validation → Database upsert → Final score recalculation
```

- **Primary Engine**: Gemini 2.0 Flash Vision (fast, accurate)
- **Local Engine**: Qwen2.5-VL-7B-Instruct (privacy-preserving, offline-capable)
- **Rate Limiting**: Configurable RPM/TPM queues per engine
- **Output**: Structured JSON matching `score_column_config` schema

### AI Feedback Generation

```
Student Grades + Attendance Rate + Subject Performance
    → Gemini 2.0 Flash (structured prompt with Vietnamese tone guidelines)
    → Context-aware feedback (top subjects, weak subjects, attendance)
    → Teacher review & edit → Save to comments table
```

- **Provider**: Gemini (primary) with OpenRouter fallback
- **Batch Mode**: Generate comments for entire class in one API call
- **Template Fallback**: Hardcoded Vietnamese templates if all providers are unavailable
- **Comment Types**: GK (mid-term) and CK (end-of-term) per semester

---

## Getting Started

### Prerequisites

- Python 3.12+
- Supabase project (free tier works)
- CUDA GPU (optional — for local face recognition and OCR)

### Installation

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
# .venv\Scripts\activate    # Windows

pip install -r requirements.txt
```

### Configuration

Copy and edit the environment file:

```bash
cp .env.example .env
```

Required variables:

```env
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# Security
SECRET_KEY=your-32-byte-hex-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=60

# AI (optional — face recognition works without these)
GEMINI_API_KEY=your-gemini-api-key
FEEDBACK_PROVIDER=gemini

# Email (optional)
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-resend-api-key
```

### Database Schema

Apply the schema to your Supabase project:

```bash
# Via Supabase SQL Editor, paste the contents of:
# core/schema/schema_final_timezone_fix.sql
```

### Run

```bash
# Development
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

API docs available at `http://localhost:8000/docs`.

### Docker

```bash
docker build -t smart-school-backend .
docker run --gpus all -p 7860:7860 --env-file .env smart-school-backend
```

The Dockerfile includes CUDA 12.4, ONNX Runtime, and all system dependencies for OpenCV and ML libraries.

---

## Testing

```bash
# Run all tests
pytest tests/ -v

# Run specific test suites
pytest tests/ -v -k "TS-HOM04"     # Homeroom feedback tests
pytest tests/ -v -k "TS-ADM"       # Admin tests
pytest tests/ -v -k "TS-AUTH"      # Auth tests

# With coverage
pytest tests/ -v --cov=. --cov-report=html
```

Tests are organized by feature area with naming convention: `TS-{MODULE}{TEST_NUMBER}-{sequence}.py`

---

## Deployment

### Hugging Face Spaces

The `Dockerfile` is pre-configured for HF Spaces:

1. Create a new Space with Docker SDK
2. Set environment variables in Space settings
3. Push this directory to the Space repository

The build process takes 15-20 minutes (CUDA base image + Python deps). Health check runs every 60s with a 180s startup grace period.

### Standalone Server

```bash
# With systemd
sudo cp smart-school-backend.service /etc/systemd/system/
sudo systemctl enable --now smart-school-backend

# Or with supervisor
[program:smart-school]
command=/path/to/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
directory=/path/to/backend
```

### Environment Variables Reference

| Variable                      | Required | Default          | Description                                                    |
| ----------------------------- | -------- | ---------------- | -------------------------------------------------------------- |
| `SUPABASE_URL`                | Yes      | —                | Supabase project URL                                           |
| `SUPABASE_KEY`                | Yes      | —                | Supabase service role key                                      |
| `SECRET_KEY`                  | Yes      | —                | HMAC-SHA256 32-byte hex key                                    |
| `HOST`                        | No       | `0.0.0.0`        | Server bind address                                            |
| `PORT`                        | No       | `8000`           | Server port                                                    |
| `DEBUG`                       | No       | `true`           | Debug mode (set `false` in production)                         |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No       | `60`             | JWT access token TTL                                           |
| `REFRESH_TOKEN_EXPIRE_DAYS`   | No       | `1`              | JWT refresh token TTL                                          |
| `GEMINI_API_KEY`              | No\*     | —                | Google Gemini API key (\*required for AI feedback & cloud OCR) |
| `OPENROUTER_API_KEY`          | No       | —                | OpenRouter fallback for AI feedback                            |
| `FEEDBACK_PROVIDER`           | No       | `gemini`         | AI feedback provider (`gemini` or `openrouter`)                |
| `INSIGHTFACE_DEVICE`          | No       | `cuda`           | Face recognition device (`cuda` or `cpu`)                      |
| `RESEND_API_KEY`              | No\*     | —                | Resend API key (\*required for email report cards)             |
| `SMTP_SERVER`                 | No       | `smtp.gmail.com` | SMTP server for email fallback                                 |
| `OCR_DEFAULT_ENGINE`          | No       | `gemini`         | OCR engine (`gemini` or `qwen`)                                |

---

## License

MIT — see the root [LICENSE](../LICENSE) file.
