<div align="center">

# Smart School System

**AI-Powered School Management Platform with Face Recognition, OCR Grading, and Multi-School Architecture**

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Docker](https://img.shields.io/badge/Docker-CUDA_12.4-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[![AI Engine](https://img.shields.io/badge/AI-InsightFace_95--99%25-red?style=flat-square)](https://insightface.ai)
[![LLM](https://img.shields.io/badge/LLM-Gemini_2.0_Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev)
[![OCR](https://img.shields.io/badge/OCR-Qwen2.5--VL-orange?style=flat-square)](https://huggingface.co/Qwen)
[![Tests](https://img.shields.io/badge/Tests-Pytest_|_Vitest_|_Playwright-success?style=flat-square)]()

</div>

---

## Overview

Smart School is a **production-grade** school management platform that combines traditional SIS (Student Information System) capabilities with cutting-edge AI: **face recognition attendance**, **AI-powered student feedback**, and **OCR-based grade import**. Built with a modular monolithic architecture on FastAPI and React, it supports multiple schools from a single deployment with isolated databases per school.

> **Why this project?** Traditional school management tools rely on manual attendance, paper-based grade sheets, and generic report cards. Smart School automates attendance with 95-99% accurate face recognition, lets teachers snap a photo of handwritten grades for instant OCR import, and uses Gemini to generate personalized, context-aware student feedback — all in one integrated platform.

---

## Key Features

### Face Recognition Attendance
- **95-99% accuracy** using InsightFace (ArcFace) with 512-dimensional embeddings
- Multi-camera support with concurrent real-time streams
- Configurable confidence thresholds and recognition cooldowns
- Faiss-optimized vector search for sub-100ms matching at scale
- Excused absence tracking with leave request image uploads

### AI-Powered Student Feedback
- **Gemini 2.0 Flash** generates personalized comments based on grades, attendance, and subject performance
- OpenRouter fallback for provider redundancy
- Batch generation for entire classes in a single click
- Teacher-editable output before saving — AI suggests, teachers decide
- GK/CK (mid-term/end-of-term) comment categorization per semester

### OCR Grade Import
- Dual-engine architecture: **Gemini Vision** (cloud) + **Qwen2.5-VL** (local)
- Snap a photo of handwritten grade sheets → structured JSON scores
- Supports configurable scoring rubrics per subject (weights, sub-columns)
- Automatic final score calculation with Vietnamese grading scale

### Classroom Notebook ("Sổ đầu bài")
- Upload daily classroom logbook photos per class per date
- Keeps visual records alongside attendance data for auditing
- Supabase Storage with public URL generation

### Homeroom Teacher Dashboard
- Dedicated dashboard with class overview, student list, and attendance management
- Face registration and encoding management per student
- Student report card export (Excel) with grades, attendance, and AI feedback
- Email report cards directly to parents via Resend/SMTP

### Admin Panel
- Multi-school configuration with encrypted database credentials (HMAC-SHA256)
- User management with role-based access (admin, teacher, homeroom_teacher, staff)
- Class and subject management with teacher assignments
- System settings with runtime configuration (cutoff times, thresholds, academic years)

### Security & Access Control
- JWT-based authentication with refresh tokens
- Role-based route protection (frontend) and endpoint authorization (backend)
- Row-Level Security policies on Supabase
- Attendance and grade edit locking with per-user override permissions

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND (React 18 + Vite)            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │  Admin   │ │ Homeroom │ │ Subject  │ │    Auth &     │  │
│  │  Panel   │ │   Hub    │ │  Teacher │ │   Profile     │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│                          │ HTTP/WS                           │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                       BACKEND (FastAPI)                      │
│                          │                                    │
│  ┌──────────┬──────────┬─┴──────┬──────────┬───────────┐   │
│  │  Auth    │ Students │ Scores │Attendance│ Homeroom  │   │
│  │  (JWT)   │ (CRUD)   │ (OCR)  │ (Face AI)│ (Dashboard)│   │
│  ├──────────┼──────────┼────────┼──────────┼───────────┤   │
│  │  Admin   │ Feedback │ Camera │  School  │   Core    │   │
│  │ (Config) │ (Gemini) │Manager │  Config  │ (DB/Util) │   │
│  └──────────┴──────────┴────────┴──────────┴───────────┘   │
│                          │                                    │
└──────────────────────────┼──────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │   Supabase   │
                    │ (PostgreSQL) │
                    └─────────────┘
```

### Module Structure

```
backend/
├── auth/              # JWT auth, OTP, email verification
├── admin/             # School config, user/class/subject CRUD
├── students/          # Student profiles, face encoding management
├── scores/            # Grade management, OCR import, transcript calc
├── attendance/        # Attendance records, manual/auto check-in
├── homeroom/          # Homeroom dashboard, leave requests, notebook
├── feedback/          # AI feedback generation (Gemini/OpenRouter)
├── ai_services/       # InsightFace engine, face matching, Faiss index
├── camera_manager/    # IP camera discovery, stream management
├── score_settings/    # Score rubric configuration per subject
├── users/             # User profile management
└── core/              # Database client, middleware, config, logger
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | FastAPI + Uvicorn | REST API server |
| **Frontend** | React 18 + Vite + TypeScript | SPA with HMR |
| **Database** | Supabase (PostgreSQL) | Primary data store + Storage |
| **Auth** | python-jose + bcrypt | JWT auth + password hashing |
| **AI Face** | InsightFace (ArcFace) + Faiss + ONNX | Face detection & recognition |
| **AI Vision** | Gemini Vision + Qwen2.5-VL | OCR from handwritten grade sheets |
| **AI Text** | Gemini 2.0 Flash + OpenRouter | Student feedback generation |
| **UI** | Tailwind CSS + Radix UI + shadcn/ui | Component library |
| **Charts** | Recharts + Chart.js | Data visualization |
| **Testing** | Pytest + Vitest + Playwright | Unit, integration, E2E |
| **Infra** | Docker (CUDA 12.4) + Hugging Face Spaces | Deployment |

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- Supabase project (free tier works)
- CUDA-capable GPU (optional, for local face recognition)

### 1. Clone & Configure

```bash
git clone https://github.com/Enigmask22/smart-school.git
cd smart_school
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate    # Windows
# source .venv/bin/activate  # Linux/macOS

pip install -r requirements.txt

# Copy and fill in your Supabase keys
cp .env.example .env
# Edit .env: SUPABASE_URL, SUPABASE_KEY, SECRET_KEY, GEMINI_API_KEY
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env: VITE_APP_API_URL=http://localhost:8000/api
```

### 4. Database Setup

Run the schema SQL file against your Supabase project:
```bash
# Via Supabase SQL Editor or CLI:
psql -h <your-supabase-host> -d postgres -f backend/core/schema/schema_final_timezone_fix.sql
```

### 5. Launch

```bash
# Terminal 1: Backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — default admin login: `admin.chuyen_le_quy_don.tphcm` / `password`

---

## API Overview

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Auth** | `/api/auth/*` | Login, register, OTP, token refresh |
| **Students** | `/api/students/*` | CRUD, face encoding, subject selection |
| **Scores** | `/api/scores/*` | Grade entry, OCR import, transcript export |
| **Attendance** | `/api/attendance/*`, `/api/homeroom/attendance/*` | Check-in/out, manual edit, leave requests, notebook |
| **AI** | `/api/ai/*` | Face recognition, encoding management, model reload |
| **Feedback** | `/api/feedback/*` | AI comment generation, CRUD, email report cards |
| **Homeroom** | `/api/homeroom/*` | Bootstrap, students, attendance stats, faces |
| **Admin** | `/api/admin/*` | School config, users, classes, subjects, teachers |
| **Cameras** | `/api/cameras/*` | Camera CRUD, discovery, connection testing |

Full API documentation available at `http://localhost:8000/docs` (Swagger UI) when the backend is running.

---

## Key Database Tables

| Table | Purpose | Notable Columns |
|-------|---------|-----------------|
| `users` | Authentication & roles | `username`, `role`, `can_edit_grade`, `can_edit_attendance` |
| `students` | Student profiles | `subject_selected` (JSONB), `face_samples_count`, `received_email` |
| `face_embeddings` | Face vectors (512-dim) | `embedding_vector` (float[]), `quality_score` |
| `attendance` | Daily attendance records | `check_in_time`, `status`, `leave_request_image` |
| `scores` | Grade records | `score_data` (JSONB), `final_score` |
| `comments` | AI/teacher feedback | `description`, `semester`, `type` (GK/CK) |
| `notebook` | Classroom logbook photos | `image_url`, `date` |
| `classes` | Class metadata | `homeroom_teacher_id`, `academic_year` |
| `subjects` | Subject catalog | `subject_code`, `score_column_config` (JSONB) |
| `cameras` | IP camera configuration | `source`, `status`, `metadata` |
| `system_settings` | Runtime configuration | `setting_key`, `setting_value` |

---

## Testing

```bash
# Backend unit & integration tests
cd backend
pytest tests/ -v

# Frontend unit tests
cd frontend
npx vitest run

# Frontend E2E tests
npx playwright test
```

---

## Deployment

### Docker (CUDA GPU)

```bash
cd backend
docker build -t smart-school-backend .
docker run --gpus all -p 7860:7860 --env-file .env smart-school-backend
```

### Hugging Face Spaces

The `backend/` directory includes a Dockerfile configured for HF Spaces deployment with automatic CUDA detection. Set your environment variables in the Space settings and push.

### Production Checklist

- [ ] Set `ENV=production` in backend `.env`
- [ ] Generate a strong `SECRET_KEY` (HMAC-SHA256 32-byte)
- [ ] Configure proper CORS origins in `app_factory.py`
- [ ] Enable RLS policies on all Supabase tables
- [ ] Set up SMTP/Resend for email delivery
- [ ] Run `npm run build` for optimized frontend bundle
- [ ] Set up HTTPS reverse proxy (Nginx/Caddy)

---

## Screenshots

<details>
<summary>Click to expand</summary>

### Homeroom Attendance Dashboard
Attendance tracking with face recognition status, leave request management, and classroom notebook upload.

### AI Feedback Generation
Gemini-powered student comments with grade-aware context and teacher-editable output.

### Face Registration
Multi-angle face capture (front, left, right, up, down) with quality scoring for reliable recognition.

### OCR Grade Import
Snap a photo of handwritten grades → structured score data with automatic final score calculation.

</details>

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: your feature"`
4. Push and open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with FastAPI, React, InsightFace, and Gemini**

⭐ Star this repo if you find it useful!

</div>
