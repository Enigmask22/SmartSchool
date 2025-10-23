# 🎓 Smart School System - AI-Powered Multi-School Management Platform

<div align="center">

![Smart School](https://img.shields.io/badge/Smart_School-Modular_v2.0-blue?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Modular_Monolithic-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)

![AI Engine](https://img.shields.io/badge/AI-InsightFace_95--99%25-red?style=for-the-badge)
![LLM](https://img.shields.io/badge/LLM-Gemini_2.0_Flash-4285F4?style=for-the-badge&logo=google)
![OCR](https://img.shields.io/badge/OCR-Qwen2.5--VL-orange?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Enterprise-Grade School Management với AI Face Recognition, Auto Grading OCR, và Multi-School Support**

[🚀 Quick Start](GETTING_STARTED.md) • [📖 API Docs](#-api-documentation) • [🏗️ Architecture](#️-kiến-trúc-hệ-thống) • [🤝 Contributing](#-đóng-góp)

</div>

---

## 🌟 Tính năng nổi bật

### 🏫 Multi-School Database Architecture

- **Multiple Schools, One Codebase** - Quản lý nhiều trường học độc lập
- **Automatic Database Routing** - Tự động chuyển database theo user login
- **Encrypted Configuration** - HMAC-SHA256 encryption cho database credentials
- **Isolated Data** - Mỗi trường có database Supabase riêng
- **Default School Support** - Login không cần suffix cho trường chính

### 🤖 AI Computer Vision - InsightFace (ArcFace)

- **95-99% Accuracy** - State-of-the-art face recognition
- **GPU Acceleration** - CUDA support với auto CPU fallback
- **Real-time Recognition** - < 2s recognition time
- **Smart Device Selection** - Auto detect GPU, adaptive sizing
- **Multiple Face Registration** - 3-15 ảnh/người cho độ chính xác cao
- **Quality Assessment** - Tự động đánh giá và filter ảnh kém

### 📄 OCR Grade Processing - Dual Engine

- **Qwen2.5-VL Local** - Free, GPU-based (6-8GB VRAM), offline processing
- **Gemini Vision API** - Cloud-based, không cần GPU, $0.002/image
- **Queue Management** - Tránh GPU OOM với concurrent limiting
- **Auto Table Extraction** - Nhận dạng bảng điểm tự động
- **Excel Export** - Xuất kết quả ra Excel với formatting

### 🧠 AI Feedback System - Google Gemini 2.0 Flash

- **Automated Comments** - Nhận xét học sinh tự động, văn phong chuyên nghiệp
- **Smart Analysis** - Phân tích điểm số, xu hướng, chuyên cần
- **Batch Generation** - Xử lý hàng loạt cả lớp trong vài giây
- **Contextual Tone** - Khích lệ hoặc phê bình xây dựng
- **Teacher Integration** - Kết hợp ghi chú giáo viên

### 👥 Complete School Management

- **👨‍🎓 Students** - CRUD đầy đủ, face registration, academic records
- **📚 Grades** - Quản lý điểm, OCR import, transcript, analytics
- **📊 Attendance** - Face recognition check-in, real-time tracking
- **🏠 Homeroom** - Dashboard riêng cho GVCN với class insights
- **👨‍💼 Admin** - User management, permissions, system monitoring
- **� OTP Email** - Email verification với Mailtrap/Gmail SMTP
- **📅 School Config** - School days, holidays, academic calendar

### 🔐 Enterprise Security

- **JWT Authentication** - Access + Refresh tokens với expiration
- **Role-Based Access Control** - Admin, Teacher, Staff roles
- **Multi-Tenant Isolation** - Mỗi school hoàn toàn độc lập
- **Database Encryption** - HMAC-SHA256 cho sensitive config
- **OTP Verification** - Email-based 2FA
- **Secure File Upload** - Validation, virus scanning, size limits
- **Audit Logs** - Track all critical operations

## 🏗️ Kiến trúc hệ thống

### 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        SMART SCHOOL SYSTEM                       │
│                     Modular Monolithic Architecture              │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   React Frontend     │◄────────┤   REST API + WS      │
│   - Dashboard        │  HTTP   │   - FastAPI          │
│   - Face Recognition │  WebSocket  - CORS Middleware    │
│   - OCR Upload       │         │   - JWT Auth         │
│   - Grade Management │         │   - Rate Limiting    │
└──────────────────────┘         └──────────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
        ┌───────────▼──────────┐ ┌───────▼────────┐ ┌─────────▼────────┐
        │  CORE LAYER          │ │  AI SERVICES   │ │  UTILS           │
        │  - Database Router   │ │  - InsightFace │ │  - Timezone      │
        │  - School Config     │ │  - Gemini LLM  │ │  - Logger        │
        │  - Auth Service      │ │  - Qwen OCR    │ │  - Email SMTP    │
        │  - Encryption        │ │  - Queue Mgr   │ │  - OTP Service   │
        └──────────────────────┘ └────────────────┘ └──────────────────┘
                    │
        ┌───────────┴────────────────────────────────────────────┐
        │                  FEATURE MODULES                        │
        ├──────────┬──────────┬──────────┬──────────┬───────────┤
        │ Students │ Grades   │Attendance│ Homeroom │   Admin   │
        │ - CRUD   │ - OCR    │ - Face   │ - Stats  │ - Users   │
        │ - Face   │ - AI     │   Check  │ - Class  │ - Config  │
        │   Reg    │   Feedback│ - Stats  │   Mgmt   │ - System  │
        └──────────┴──────────┴──────────┴──────────┴───────────┘
                    │
        ┌───────────┴────────────────────────────────────────────┐
        │              MULTI-SCHOOL DATABASE LAYER               │
        │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
        │  │ Supabase DB1 │  │ Supabase DB2 │  │ Supabase DB3 │ │
        │  │ School A     │  │ School B     │  │ School C     │ │
        │  │ PostgreSQL   │  │ PostgreSQL   │  │ PostgreSQL   │ │
        │  └──────────────┘  └──────────────┘  └──────────────┘ │
        └────────────────────────────────────────────────────────┘
```

### 🔄 Database Routing Flow

```
User Login: admin@school2
           ↓
Extract school_id from username (school2)
           ↓
Lookup school_databases.json → Get Supabase credentials
           ↓
HMAC-SHA256 Decrypt with SECRET_KEY
           ↓
Connect to SUPABASE_URL_2 + SUPABASE_KEY_2
           ↓
All subsequent operations use School 2's database
```

### 📦 Module Structure (backend_modular/)

```
backend_modular/
├── 🎯 main.py                    # Application entry point
├── 🏭 app_factory.py             # FastAPI app factory with startup events
├── 📋 requirements.txt           # Python dependencies
│
├── 🔧 core/                      # Core layer (shared services)
│   ├── database_router.py        # Multi-school database connection
│   ├── encode_school_config.py   # HMAC encryption/decryption
│   ├── dependencies.py           # FastAPI dependencies
│   └── middleware.py             # Custom middlewares
│
├── 🤖 ai_services/               # AI Module
│   ├── api.py                    # Face recognition endpoints
│   ├── services.py               # InsightFace service
│   └── models.py                 # Pydantic schemas
│
├── 🎓 students/                  # Students Module
│   ├── api.py                    # Student CRUD endpoints
│   ├── services.py               # Business logic
│   └── models.py                 # Pydantic schemas
│
├── 📚 grades/                    # Grades Module
│   ├── api.py                    # Grade management + OCR
│   ├── services.py               # Grade calculation + cleanup
│   └── models.py                 # Pydantic schemas
│
├── 📊 attendance/                # Attendance Module
│   ├── api.py                    # Check-in/out endpoints
│   ├── services.py               # Attendance logic
│   └── models.py                 # Pydantic schemas
│
├── 🧠 feedback/                  # AI Feedback Module
│   ├── api.py                    # Gemini feedback endpoints
│   ├── services.py               # Gemini service integration
│   └── models.py                 # Pydantic schemas
│
├── 🏠 homeroom/                  # Homeroom Module
│   ├── api.py                    # Teacher dashboard endpoints
│   ├── services.py               # Class statistics
│   └── models.py                 # Pydantic schemas
│
├── 👨‍💼 admin/                      # Admin Module
│   ├── api.py                    # Admin operations
│   ├── services.py               # User management
│   └── models.py                 # Pydantic schemas
│
├── 🔐 auth/                      # Authentication Module
│   ├── api.py                    # Login, register, OTP
│   ├── services.py               # JWT, OTP, Email service
│   └── models.py                 # Pydantic schemas
│
├── 📅 school_config/             # School Config Module
│   ├── api.py                    # School days configuration
│   ├── services.py               # Calendar logic
│   └── models.py                 # Pydantic schemas
│
└── 👤 users/                     # Users Module
    ├── api.py                    # User profile endpoints
    ├── services.py               # User operations
    └── models.py                 # Pydantic schemas
```

## 🛠️ Tech Stack

### 🔙 Backend (backend_modular/)

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.12-3776AB?style=flat&logo=python&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat&logo=postgresql&logoColor=white)

**Framework & Architecture:**

- **FastAPI** - Modern async Python web framework
- **Modular Monolithic** - Clean separation, easy maintenance
- **Uvicorn** - Lightning-fast ASGI server
- **Pydantic** - Data validation với type hints
- **APScheduler** - Background tasks và cleanup jobs

**Database & Storage:**

- **Supabase** - Managed PostgreSQL với real-time features
- **Multi-tenant** - Automatic routing per school
- **HMAC-SHA256** - Database credential encryption
- **Auto cleanup** - Expired OTPs, grade sheets

**Security:**

- **JWT** - Access + Refresh tokens
- **bcrypt** - Password hashing
- **python-dotenv** - Environment management
- **CORS Middleware** - Secure cross-origin requests

### 🤖 AI & Computer Vision

![InsightFace](https://img.shields.io/badge/InsightFace-FF6B6B?style=flat&logo=opencv&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_2.0-4285F4?style=flat&logo=google&logoColor=white)
![Qwen](https://img.shields.io/badge/Qwen2.5--VL-orange?style=flat)

**Face Recognition:**

- **InsightFace (ArcFace)** - 95-99% accuracy, state-of-the-art
- **PyTorch** - Deep learning framework với CUDA support
- **OpenCV** - Image processing và preprocessing
- **NumPy** - Efficient array operations
- **CUDA Support** - GPU acceleration (optional)

**OCR & LLM:**

- **Google Gemini 2.0 Flash** - AI feedback generation + OCR fallback
- **Qwen2.5-VL** - Local GPU-based OCR (offline, free)
- **Transformers** - Hugging Face model loading
- **ONNX Runtime** - Optimized inference

**Email Services:**

- **Gmail SMTP** - Production email delivery
- **Mailtrap** - Development/testing email sandbox
- **python-otp** - OTP generation và verification

### ⚛️ Frontend

![React](https://img.shields.io/badge/React_18-61DAFB?style=flat&logo=react&logoColor=black)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

**Core Framework:**

- **React 18** - Latest hooks, concurrent features
- **React Router v6** - Client-side routing
- **Context API** - State management (Auth, School)
- **Axios** - HTTP client với interceptors
- **React Webcam** - Camera integration

**UI & Styling:**

- **Tailwind CSS** - Utility-first framework
- **Heroicons** - Beautiful SVG icons
- **Chart.js** - Interactive charts và analytics
- **React Hot Toast** - Beautiful notifications
- **Responsive Design** - Mobile-first approach

**Features:**

- **Code Splitting** - Lazy loading components
- **Error Boundaries** - Graceful error handling
- **WebSocket Client** - Real-time updates
- **File Upload** - Drag-and-drop OCR upload

## 🚀 Quick Start

### 📋 Prerequisites

**System Requirements:**

- **Python 3.12+** (recommended 3.12.8)
- **Node.js 16+** và npm
- **8GB+ RAM** (16GB recommended cho GPU)
- **10GB free storage**
- **NVIDIA GPU** (optional, cho InsightFace + Qwen OCR)

**Accounts Needed:**

- **Supabase** (free tier OK) - PostgreSQL database
- **Google AI Studio** - Gemini API key (free tier available)
- **Gmail Account** - SMTP email (optional)

### ⚡ Installation

```bash
# 1. Clone repository
git clone <repository-url>
cd smart_school

# 2. Backend setup (backend_modular)
cd backend_modular
python -m venv venv

# Windows PowerShell:
venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env với Supabase URLs, API keys

# 4. Setup multi-school database
# Edit school_databases.json với school configurations
python -m core.encode_school_config
# This encrypts school_databases.json → school_databases.encoded

# 5. Frontend setup
cd ../frontend
npm install

# Edit .env với API URL
# REACT_APP_API_URL=http://localhost:8000

# 6. Run the application
# Terminal 1 - Backend:
cd backend_modular
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend:
cd frontend
npm start
```

### 🌐 Access Points

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs (Swagger)
- **ReDoc**: http://localhost:8000/redoc

### 👤 Default Login

```
Email: admin@smartschool.edu.vn
Password: admin123
```

**⚠️ Change password immediately after first login!**

📖 **Detailed setup guide**: [GETTING_STARTED.md](GETTING_STARTED.md)

## 📖 API Documentation

### 🔐 Authentication

```http
POST   /api/auth/login                # Login với multi-school routing
POST   /api/auth/register             # Register new user
POST   /api/auth/refresh              # Refresh access token
POST   /api/auth/logout               # Logout và invalidate tokens
POST   /api/auth/request-otp          # Request OTP via email
POST   /api/auth/verify-otp           # Verify OTP code
GET    /api/auth/me                   # Current user info
```

**Multi-School Login:**

```json
{
  "username": "admin@school2", // @school2 routes to DB #2
  "password": "password"
}
```

### 👨‍🎓 Students

```http
GET    /api/students                  # List all students (paginated)
POST   /api/students                  # Create new student
GET    /api/students/{id}             # Get student details
PUT    /api/students/{id}             # Update student
DELETE /api/students/{id}             # Delete student
POST   /api/students/{id}/upload-photo    # Upload face photos
GET    /api/students/stats            # Student statistics
```

### 📚 Grades

```http
GET    /api/grades/student/{id}       # Get student grades
POST   /api/grades                    # Create grade entry
PUT    /api/grades/{id}               # Update grade
DELETE /api/grades/{id}               # Delete grade
POST   /api/grades/ocr-upload         # Upload grade sheet image for OCR
GET    /api/grades/ocr-status/{job_id}    # Check OCR job status
POST   /api/grades/import-ocr-results     # Import OCR results to database
GET    /api/grades/transcript/{student_id} # Get full transcript
```

**OCR Workflow:**

1. `POST /ocr-upload` → Returns `job_id`
2. `GET /ocr-status/{job_id}` → Check progress
3. `POST /import-ocr-results` → Save to DB

### 📊 Attendance

```http
GET    /api/attendance                # List attendance records
POST   /api/attendance/check-in       # Manual check-in
PUT    /api/attendance/{id}/check-out # Manual check-out
GET    /api/attendance/today          # Today's attendance
GET    /api/attendance/stats/today    # Real-time statistics
GET    /api/attendance/student/{id}/history  # Student history
```

### 🤖 AI Services

```http
POST   /api/ai/recognize              # Recognize face from image
POST   /api/ai/register/{student_id}  # Register face encoding
GET    /api/ai/student/{id}/encodings # Get student's encodings
DELETE /api/ai/student/{id}/encodings # Delete face data
GET    /api/ai/system-status          # GPU/CPU status, VRAM usage
GET    /api/ai/stats                  # Recognition statistics
```

**Face Recognition Request:**

```json
{
  "image": "base64_encoded_image",
  "confidence_threshold": 0.6 // Optional
}
```

### 🧠 AI Feedback

```http
POST   /api/feedback/generate         # Generate feedback for 1 student
POST   /api/feedback/generate-batch   # Batch generate for class
GET    /api/feedback/health           # Check Gemini API status
```

**Generate Feedback:**

```json
{
  "student_id": "uuid",
  "semester": "HK1",
  "teacher_notes": "Học sinh chăm chỉ" // Optional
}
```

### 🏠 Homeroom

```http
GET    /api/homeroom/dashboard        # Teacher dashboard
GET    /api/homeroom/class/{id}/students     # Class roster
GET    /api/homeroom/class/{id}/attendance   # Class attendance
GET    /api/homeroom/class/{id}/grades       # Class grades
GET    /api/homeroom/class/{id}/stats        # Class statistics
```

### 👨‍💼 Admin

```http
GET    /api/admin/users               # List all users
POST   /api/admin/users               # Create user
PUT    /api/admin/users/{id}          # Update user
DELETE /api/admin/users/{id}          # Delete user
PUT    /api/admin/users/{id}/role     # Change user role
GET    /api/admin/system/stats        # System statistics
GET    /api/admin/logs                # Application logs
```

### 📅 School Configuration

```http
GET    /api/school-config/days        # Get school days configuration
PUT    /api/school-config/days        # Update school calendar
GET    /api/school-config/holidays    # Get holiday list
POST   /api/school-config/holidays    # Add holiday
```

### 👤 Users

```http
GET    /api/users/profile             # Get current user profile
PUT    /api/users/profile             # Update profile
PUT    /api/users/change-password     # Change password
GET    /api/users/preferences         # Get user preferences
PUT    /api/users/preferences         # Update preferences
```

**📚 Complete API Documentation**: http://localhost:8000/docs

## 🎯 Key Features Deep Dive

### 🏫 Multi-School Database System

**Problem Solved**: Một hệ thống quản lý nhiều trường học độc lập với database riêng.

**How It Works**:

1. **Username-based Routing**: `admin@school2` → Route to School 2 database
2. **Encrypted Config**: `school_databases.json` → HMAC-SHA256 encrypted
3. **Auto Connection**: Backend tự động switch database based on user
4. **Isolated Data**: Mỗi trường có Supabase project riêng, hoàn toàn độc lập

**Configuration** (`school_databases.json`):

```json
{
  "schools": [
    {
      "school_id": "school1",
      "school_name": "Trường THPT ABC",
      "supabase_url": "https://project1.supabase.co",
      "supabase_key": "eyJhbGci...",
      "is_default": true
    },
    {
      "school_id": "school2",
      "school_name": "Trường THPT XYZ",
      "supabase_url": "https://project2.supabase.co",
      "supabase_key": "eyJhbGci..."
    }
  ]
}
```

**Encryption**: File encrypted với SECRET_KEY → `school_databases.encoded`

### 📄 OCR Grade Processing

**Problem Solved**: Nhập điểm từ ảnh bảng điểm tự động thay vì manual entry.

**Dual Engine Support**:

| Feature      | Qwen2.5-VL (Local) | Gemini Vision (Cloud) |
| ------------ | ------------------ | --------------------- |
| **Cost**     | Free               | $0.002/image          |
| **Speed**    | 2-3s               | 1-2s                  |
| **Requires** | GPU 6-8GB VRAM     | Internet only         |
| **Accuracy** | 85-90%             | 90-95%                |
| **Offline**  | ✅ Yes             | ❌ No                 |

**Workflow**:

```
1. Upload grade sheet image (JPG/PNG) via frontend
      ↓
2. Backend creates OCR job → Queue system (prevent GPU OOM)
      ↓
3. Qwen/Gemini processes image → Extract table
      ↓
4. Return JSON: {student_name, math, physics, chemistry, ...}
      ↓
5. Frontend displays results → Teacher reviews/edits
      ↓
6. Import to database → Update student grades
```

**Queue Management**:

- `OCR_MAX_CONCURRENT=2` → Max 2 parallel jobs
- Prevents GPU out-of-memory crashes
- Auto cleanup old grade sheets (>24 hours)

### 🤖 InsightFace Face Recognition

**Why InsightFace?** 95-99% accuracy vs MediaPipe 75-80%.

**Technical Details**:

- **Model**: ArcFace (buffalo_l)
- **Embedding**: 512-dimensional face vectors
- **Detection**: RetinaFace detector
- **GPU Support**: CUDA acceleration (optional)

**Device Selection** (`INSIGHTFACE_DEVICE`):

```env
# auto (recommended): GPU if available, fallback to CPU
INSIGHTFACE_DEVICE=auto

# cuda: GPU only (fails if no GPU)
INSIGHTFACE_DEVICE=cuda

# cpu: CPU only (slower but universal)
INSIGHTFACE_DEVICE=cpu
```

**Performance**:

- **GPU (CUDA)**: 1280x1280 detection, ~50-100ms/face
- **CPU**: 640x640 detection, ~500-1000ms/face

**Registration Process**:

1. Upload 3-15 ảnh khuôn mặt (different angles)
2. InsightFace extracts 512-dim embeddings
3. Store in database as JSON array
4. Recognition: Compare new face vs stored embeddings
5. Match if similarity > threshold (default 0.6)

### 🧠 Gemini AI Feedback

**Purpose**: Tự động tạo nhận xét học sinh từ điểm số, chuyên cần.

**Input Data**:

- Điểm số các môn học
- Tỷ lệ chuyên cần (%)
- Xu hướng (tăng/giảm)
- Ghi chú của giáo viên (optional)

**Output**: Professional comment (Vietnamese), 100-150 words:

```
Em Nguyễn Văn A có kết quả học tập khá tốt trong học kỳ này với
điểm trung bình 8.2. Điểm nổi bật là môn Toán (9.0) và Lý (8.5).
Tuy nhiên, em cần chú ý hơn đến môn Hóa (6.5). Tỷ lệ chuyên cần
95% cho thấy em rất nghiêm túc. Cô khuyến khích em tiếp tục phát
huy và cải thiện các môn còn yếu.
```

**API Usage**:

```python
# Single student
POST /api/feedback/generate
{
  "student_id": "uuid",
  "semester": "HK1",
  "teacher_notes": "Em khá ngoan"
}

# Batch (entire class)
POST /api/feedback/generate-batch
{
  "class_id": "10A1",
  "semester": "HK1"
}
```

**Cost**: Free tier 15 requests/min, 1500/day.

## 🚀 Performance & Optimization

### ⚡ Benchmarks

| Component             | Metric       | Performance     |
| --------------------- | ------------ | --------------- |
| **Face Recognition**  | GPU (CUDA)   | 50-100ms/face   |
| **Face Recognition**  | CPU          | 500-1000ms/face |
| **OCR Processing**    | Qwen (GPU)   | 2-3s/image      |
| **OCR Processing**    | Gemini (API) | 1-2s/image      |
| **API Response**      | Average      | < 100ms         |
| **Database Query**    | Supabase     | < 50ms          |
| **Frontend Load**     | Initial      | < 3s            |
| **WebSocket Latency** | Real-time    | < 50ms          |

### 🔧 Optimization Techniques

**Backend:**

- ✅ **Async/Await** - FastAPI async endpoints
- ✅ **Database Indexing** - Optimized Supabase queries
- ✅ **Queue Management** - OCR job queuing (prevent GPU OOM)
- ✅ **Auto Cleanup** - Expired OTPs, old grade sheets (>24h)
- ✅ **Lazy Loading** - Models loaded on-demand
- ✅ **Connection Pooling** - Supabase connection reuse

**AI Services:**

- ✅ **GPU Acceleration** - CUDA for InsightFace + Qwen
- ✅ **Smart Device Selection** - Auto GPU detection with CPU fallback
- ✅ **Adaptive Sizing** - GPU: 1280px, CPU: 640px detection
- ✅ **VRAM Monitoring** - Log GPU memory usage
- ✅ **Batch Processing** - Multiple faces in one image

**Frontend:**

- ✅ **Code Splitting** - React lazy loading
- ✅ **Component Caching** - Memoization with useMemo
- ✅ **Image Optimization** - Lazy image loading
- ✅ **Debouncing** - Search input debounce 300ms
- ✅ **Virtualization** - Large lists with react-window

## 🐛 Troubleshooting

<details>
<summary><strong>🔴 Backend won't start</strong></summary>

```bash
# Check Python version (must be 3.12+)
python --version

# Verify virtual environment is activated
which python  # Should point to venv

# Check for port conflicts
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:8000 | xargs kill -9

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

</details>

<details>
<summary><strong>🔴 "No module named 'X'" errors</strong></summary>

```bash
# Activate venv first
venv\Scripts\Activate.ps1  # Windows
source venv/bin/activate    # macOS/Linux

# Install missing package
pip install <package-name>

# Or reinstall all dependencies
pip install -r requirements.txt
```

</details>

<details>
<summary><strong>🔴 Database connection failed</strong></summary>

1. **Check `.env` file**:

   - `SUPABASE_URL_1` correct?
   - `SUPABASE_KEY_1` correct?
   - No trailing spaces/newlines?

2. **Verify Supabase project is active**:

   - Login to Supabase dashboard
   - Check project status

3. **Test connection manually**:

```python
from supabase import create_client
import os

url = os.getenv("SUPABASE_URL_1")
key = os.getenv("SUPABASE_KEY_1")
supabase = create_client(url, key)
print(supabase.table("users").select("*").limit(1).execute())
```

</details>

<details>
<summary><strong>🔴 Multi-school routing not working</strong></summary>

1. **Check `school_databases.json`** format:

```json
{
  "schools": [
    {
      "school_id": "school1",
      "is_default": true,
      ...
    }
  ]
}
```

2. **Re-encode configuration**:

```bash
cd backend_modular
python -m core.encode_school_config
# Generates school_databases.encoded
```

3. **Verify SECRET_KEY** in `.env` matches encoding key

4. **Test login** with `username@school_id` format
</details>

<details>
<summary><strong>🔴 OCR not working / GPU errors</strong></summary>

**Option 1: Switch to Gemini (cloud)**

```env
# .env
OCR_MODEL=gemini
GEMINI_API_KEY=your_api_key
```

**Option 2: Fix GPU setup (for Qwen)**

```bash
# Check CUDA installation
nvidia-smi

# Check PyTorch CUDA
python -c "import torch; print(torch.cuda.is_available())"

# Reinstall PyTorch with CUDA
pip uninstall torch torchvision torchaudio -y
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

**Option 3: Reduce concurrent jobs**

```env
# .env - Prevent GPU OOM
OCR_MAX_CONCURRENT=1
```

</details>

<details>
<summary><strong>🔴 InsightFace installation failed</strong></summary>

**Windows**:

1. Install **Visual C++ Build Tools**: https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. Reinstall:

```bash
pip uninstall insightface -y
pip install insightface
```

**macOS/Linux**:

```bash
# Install build dependencies
sudo apt-get install build-essential cmake  # Ubuntu
brew install cmake  # macOS

pip install insightface
```

**Fallback**: Use CPU only

```env
INSIGHTFACE_DEVICE=cpu
```

</details>

<details>
<summary><strong>🔴 Email/OTP not sending</strong></summary>

1. **Gmail SMTP Setup**:

   - Enable 2FA in Google Account
   - Generate **App Password**: https://myaccount.google.com/apppasswords
   - Use App Password in `.env`:

   ```env
   SMTP_PASSWORD=your_16_char_app_password
   ```

2. **Check SMTP settings**:

```env
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=app_password
SMTP_USE_TLS=True
```

3. **Test email**:

```python
from auth.services import OTPService
otp_service = OTPService()
otp_service.send_otp("test@email.com")
```

</details>

<details>
<summary><strong>� Frontend blank page / errors</strong></summary>

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check .env file
# REACT_APP_API_URL=http://localhost:8000 (no trailing slash)

# Clear browser cache and reload
Ctrl + Shift + R  # Hard reload
```

</details>

<details>
<summary><strong>🔴 CORS errors in frontend</strong></summary>

1. **Check backend CORS settings** in `app_factory.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

2. **Verify API URL** in frontend `.env`:

```env
REACT_APP_API_URL=http://localhost:8000  # No trailing slash
```

</details>

📚 **More help**: Check [GETTING_STARTED.md](GETTING_STARTED.md) or create an issue.

## 🧪 Testing

### Backend Tests

```bash
cd backend_modular
pytest tests/ -v

# Test specific module
pytest tests/test_auth.py -v

# Test with coverage
pytest --cov=. --cov-report=html
```

### Database Tests

```bash
# Test multi-school routing
python -c "from core.database_router import get_school_database; print(get_school_database('school2'))"

# Verify encryption
python -m core.encode_school_config
```

### AI Service Tests

```bash
# Test InsightFace
python -c "from ai_services.services import FaceRecognitionService; svc = FaceRecognitionService(); print(svc.get_system_status())"

# Test Gemini API
python -c "from feedback.services import GeminiService; svc = GeminiService(); print(svc.test_connection())"
```

### Frontend Tests

```bash
cd frontend
npm test

# E2E tests (if configured)
npm run test:e2e

# Build test
npm run build
```

## 📦 Deployment

### 🐳 Docker Deployment

**Backend Dockerfile** (`backend_modular/Dockerfile`):

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopencv-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Frontend Dockerfile** (`frontend/Dockerfile`):

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build app
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Docker Compose** (`docker-compose.yml`):

```yaml
version: "3.8"

services:
  backend:
    build: ./backend_modular
    ports:
      - "8000:8000"
    env_file:
      - ./backend_modular/.env
    volumes:
      - ./backend_modular/logs:/app/logs
      - ./backend_modular/uploads:/app/uploads
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

**Run**:

```bash
docker-compose up -d
```

### ☁️ Cloud Deployment Options

| Platform         | Backend      | Frontend         | Database | Cost         |
| ---------------- | ------------ | ---------------- | -------- | ------------ |
| **Railway**      | ✅ Python    | ✅ Static        | Supabase | ~$5/mo       |
| **Render**       | ✅ Docker    | ✅ Static        | Supabase | Free tier OK |
| **DigitalOcean** | ✅ Droplet   | ✅ App Platform  | Supabase | ~$6/mo       |
| **AWS**          | ✅ EC2/ECS   | ✅ S3+CloudFront | Supabase | Variable     |
| **Heroku**       | ✅ Container | ✅ Static        | Supabase | ~$7/mo       |

**Recommended**: Railway (backend) + Vercel (frontend) + Supabase (database)

### 🚀 Production Checklist

- [ ] **Environment Variables**:

  - [ ] Generate secure `SECRET_KEY` (64+ characters)
  - [ ] Set `DEBUG=False`
  - [ ] Configure production SMTP
  - [ ] Add all Supabase URLs/Keys

- [ ] **Security**:

  - [ ] Change default admin password
  - [ ] Enable HTTPS/SSL
  - [ ] Configure CORS for production domains
  - [ ] Set up rate limiting
  - [ ] Review Supabase RLS policies

- [ ] **Performance**:

  - [ ] Enable CDN for static assets
  - [ ] Configure database connection pooling
  - [ ] Set up logging and monitoring
  - [ ] Configure auto-scaling (if needed)

- [ ] **Backup**:
  - [ ] Supabase automated backups enabled
  - [ ] Export `school_databases.json` securely
  - [ ] Backup face encodings periodically

## 🤝 Đóng góp

Chúng tôi hoan nghênh mọi đóng góp! Xem [CONTRIBUTING.md](CONTRIBUTING.md) để biết chi tiết.

### 📝 Development Workflow

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Tạo Pull Request

### 🎨 Code Standards

- **Python**: PEP 8 + Black formatter
- **JavaScript**: ESLint + Prettier
- **Commits**: Conventional Commits
- **Documentation**: Docstrings cho mọi function

## 📄 License

MIT License - xem [LICENSE](LICENSE) để biết chi tiết.

## 🙏 Acknowledgments

- [InsightFace](https://github.com/deepinsight/insightface) - State-of-the-art face recognition
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://reactjs.org/) - A JavaScript library for building user interfaces
- [Supabase](https://supabase.com/) - The open source Firebase alternative
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

---

<div align="center">

**Được phát triển với ❤️ bởi Smart School Team**

[![GitHub Stars](https://img.shields.io/github/stars/your-repo/smart-school?style=social)](https://github.com/your-repo/smart-school)
[![GitHub Forks](https://img.shields.io/github/forks/your-repo/smart-school?style=social)](https://github.com/your-repo/smart-school/fork)

[⭐ Star repo này nếu nó hữu ích!](https://github.com/your-repo/smart-school)

</div>
