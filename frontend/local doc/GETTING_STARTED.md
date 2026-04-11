# 🚀 Getting Started - Smart School Modular Edition v2.0

Hướng dẫn setup chi tiết cho **backend_modular** - Kiến trúc Modular Monolithic với Multi-School Support, AI Face Recognition, OCR Grading, và AI Feedback.

---

## 📋 Tổng quan hệ thống

**Smart School Modular Edition v2.0** là enterprise-grade school management platform với:

### 🏗️ Architecture

- **Modular Monolithic** - Dễ bảo trì hơn microservices, mạnh hơn monolithic
- **10 Feature Modules** - Auth, Students, Grades, Attendance, AI Services, Feedback, Homeroom, Admin, School Config, Users
- **Clean Separation** - Mỗi module có api.py, services.py, models.py riêng
- **Shared Core Layer** - Database router, encryption, dependencies

### 🏫 Multi-School Support

- **Multiple Databases** - Mỗi trường có Supabase project riêng
- **Auto Routing** - Username format `user@school_id` → Tự động chuyển database
- **Encrypted Config** - HMAC-SHA256 encryption cho database credentials
- **Isolated Data** - Hoàn toàn độc lập giữa các trường

### 🤖 AI-Powered Features

- **InsightFace (ArcFace)** - 95-99% accuracy face recognition với GPU support
- **Google Gemini 2.0 Flash** - AI feedback generation cho học sinh
- **Qwen2.5-VL / Gemini Vision** - OCR grade sheet processing (dual engine)
- **Smart Device Selection** - Auto GPU detection với CPU fallback

### 📧 Enterprise Features

- **JWT Authentication** - Access + Refresh tokens
- **OTP Email Verification** - Gmail/Mailtrap SMTP
- **Role-Based Access** - Admin, Teacher, Staff permissions
- **Auto Cleanup** - Expired OTPs, old grade sheets (>24h)
- **Audit Logging** - Track critical operations

---

## 🎯 Yêu cầu hệ thống

### 💻 Phần cứng

| Component   | Minimum                     | Recommended                               |
| ----------- | --------------------------- | ----------------------------------------- |
| **CPU**     | Intel Core i5 / AMD Ryzen 5 | Intel Core i7 / AMD Ryzen 7               |
| **RAM**     | 8GB                         | 16GB+                                     |
| **Storage** | 10GB free                   | 20GB+ SSD                                 |
| **GPU**     | None (CPU works)            | NVIDIA 6GB+ VRAM (for InsightFace + Qwen) |

### 📦 Phần mềm

- **Python**: 3.12+ (recommended 3.12.8)
- **pip**: Latest version
- **Node.js**: 16+ và npm
- **Git**: For cloning repository

### ☁️ Tài khoản dịch vụ

1. **Supabase** (Free tier OK)

   - PostgreSQL database hosting
   - 500MB storage, 50,000 rows
   - Signup: https://supabase.com

2. **Google AI Studio** (Free tier available)

   - Gemini API key for AI feedback + OCR
   - 15 requests/min, 1,500/day free
   - Get key: https://aistudio.google.com/app/apikey

3. **Gmail Account** (Optional)
   - SMTP email for OTP verification
   - App password required
   - Guide: https://support.google.com/accounts/answer/185833

---

## 📥 Bước 1: Clone Repository

```bash
# Clone project
git clone https://github.com/Enigmask22/SmartSchool.git
cd smart_school

# Kiểm tra cấu trúc
ls -la
# You should see: backend_modular/, frontend/, README.md, etc.

# Navigate to modular backend
cd backend_modular
```

---

## 🐍 Bước 2: Setup Python Environment

### 2.1 Create Virtual Environment

```bash
# Create venv
python -m venv venv

# Activate venv
# Windows PowerShell:
venv\Scripts\Activate.ps1

# Windows CMD:
venv\Scripts\activate.bat

# macOS/Linux:
source venv/bin/activate

# Verify activation (should point to venv)
where python  # Windows
which python  # macOS/Linux

# Check Python version (should be 3.12+)
python --version
```

### 2.2 Upgrade pip

```bash
python -m pip install --upgrade pip
pip --version  # Verify latest version
```

### 2.3 Install Dependencies

```bash
# Install all required packages
pip install -r requirements.txt

# This will install:
# - FastAPI (web framework)
# - Supabase (database client)
# - InsightFace (face recognition)
# - PyTorch (deep learning)
# - Google Generative AI (Gemini)
# - And 20+ other packages
```

**⚠️ Common Issues:**

**Windows - InsightFace build failed:**

1. Install **Visual C++ Build Tools**: https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. Retry: `pip install insightface`

**GPU Support (Optional):**

```bash
# Check CUDA availability
nvidia-smi

# Install PyTorch with CUDA (if GPU available)
pip uninstall torch torchvision torchaudio -y
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

---

## 🗄️ Bước 3: Setup Supabase Database

### 3.1 Create Supabase Projects

1. **Go to** https://supabase.com
2. **Sign up / Login**
3. **Create New Project** (for each school):
   - **Name**: Smart School - School 1
   - **Database Password**: Create strong password (save it!)
   - **Region**: Choose closest to you
   - **Click**: Create new project
4. **Wait 2-3 minutes** for project initialization

**Note**: For multi-school setup, create one project per school.

### 3.2 Get API Credentials

For each Supabase project:

1. **Go to**: Settings → API
2. **Copy**:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJhbGci...`)
3. **Save** these for `.env` configuration

### 3.3 Apply Database Schema

For **EACH** Supabase project:

1. **Go to**: SQL Editor (left sidebar)
2. **Create** a new query
3. **Copy entire** schema from `backend_modular/database/schema_final_timezone_fix.sql`
4. **Paste** into SQL Editor
5. **Click**: RUN (or press Ctrl+Enter)
6. **Wait** 1-2 minutes for schema creation

**Schema includes**:

- Tables: users, students, grades, attendance, face_encodings, etc.
- Functions: Database functions for business logic
- Indexes: Performance optimization
- RLS Policies: Row-level security

### 3.4 Create Admin User

For each Supabase project, run this SQL:

```sql
-- Create admin user with bcrypt hashed password
INSERT INTO users (
  id,
  username,
  email,
  password_hash,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin',
  'admin@smartschool.edu.vn',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5eidAVkYzBpxW',  -- password: admin123
  'System Administrator',
  'admin',
  true,
  now(),
  now()
);
```

**Default credentials**: `admin@smartschool.edu.vn` / `admin123`

**⚠️ CHANGE PASSWORD after first login!**

---

## ⚙️ Bước 4: Configure Environment Variables

### 4.1 Create .env File

```bash
# In backend_modular folder
cp .env.example .env

# Or create new .env file
```

### 4.2 Edit .env File

**Minimal configuration** (single school):

```env
# === DATABASE (Single School) ===
SUPABASE_URL_1=https://your-project-id.supabase.co
SUPABASE_KEY_1=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_anon_key_here

# === SECURITY ===
# Generate with: python -c "import secrets; print(secrets.token_urlsafe(64))"
SECRET_KEY=your-super-secret-key-minimum-64-characters-change-this-in-production

ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=1

# === SERVER ===
HOST=0.0.0.0
PORT=8000
DEBUG=True
ENV=development

# === AI SERVICES ===
# Get from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# InsightFace device selection
INSIGHTFACE_DEVICE=auto  # auto | cuda | cpu

# === OCR ===
OCR_MODEL=gemini  # gemini | qwen
OCR_MAX_CONCURRENT=2

# === EMAIL (Optional) ===
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_16_character_app_password
SMTP_USE_TLS=True
```

**Multi-school configuration**:

```env
# School 1 (default)
SUPABASE_URL_1=https://project1.supabase.co
SUPABASE_KEY_1=eyJhbGci...key1

# School 2
SUPABASE_URL_2=https://project2.supabase.co
SUPABASE_KEY_2=eyJhbGci...key2

# School 3
SUPABASE_URL_3=https://project3.supabase.co
SUPABASE_KEY_3=eyJhbGci...key3

# Add more as needed...
```

### 4.3 Generate Secure SECRET_KEY

```bash
# Generate 64-character secure key
python -c "import secrets; print(secrets.token_urlsafe(64))"

# Copy output and paste into .env as SECRET_KEY
```

---

## 🏫 Bước 5: Multi-School Database Setup

### 5.1 Create school_databases.json

```bash
# In backend_modular/ folder
# Edit school_databases.json
```

**Configuration:**

```json
{
  "schools": [
    {
      "school_id": "school1",
      "school_name": "Trường THPT ABC",
      "supabase_url": "https://project1.supabase.co",
      "supabase_key": "eyJhbGci...key1",
      "is_default": true
    },
    {
      "school_id": "school2",
      "school_name": "Trường THPT XYZ",
      "supabase_url": "https://project2.supabase.co",
      "supabase_key": "eyJhbGci...key2",
      "is_default": false
    }
  ]
}
```

**Fields:**

- `school_id`: Unique identifier (used in login: `user@school2`)
- `school_name`: Display name
- `supabase_url`: Supabase project URL
- `supabase_key`: Supabase anon key
- `is_default`: If true, users can login without `@school_id` suffix

### 5.2 Encrypt Configuration

```bash
# Encrypt school_databases.json → school_databases.encoded
python -m core.encode_school_config

# Output:
# ✅ Configuration encrypted successfully!
# File: school_databases.encoded
```

**Important**:

- Encrypted file uses `SECRET_KEY` from `.env`
- Keep `school_databases.json` as backup (don't commit to Git!)
- System reads from `school_databases.encoded` at runtime

### 5.3 Verify Encryption

```bash
# Test decryption
python -c "from core.encode_school_config import decrypt_school_config; print(decrypt_school_config())"

# Should output school configurations
```

---

## ⚛️ Bước 6: Setup Frontend

### 6.1 Install Dependencies

```bash
# Navigate to frontend
cd ../frontend

# Install packages
npm install

# Or if errors:
npm install --legacy-peer-deps
```

### 6.2 Configure Frontend Environment

Create `frontend/.env`:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:8000
REACT_APP_API_BASE_URL=http://localhost:8000/api

# Supabase (optional - for direct client access)
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key

# Features
REACT_APP_ENABLE_CONTINUOUS_RECOGNITION=true
REACT_APP_DEFAULT_CAMERA_FPS=1
REACT_APP_RECOGNITION_COOLDOWN=30

# Debug
REACT_APP_DEBUG=true
```

---

## 🚀 Bước 7: Run the Application

### 7.1 Start Backend

```bash
# Terminal 1
cd backend_modular

# Activate venv (if not already)
venv\Scripts\Activate.ps1  # Windows PowerShell
source venv/bin/activate    # macOS/Linux

# Run server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Output:
# INFO:     Uvicorn running on http://0.0.0.0:8000
# INFO:     Application startup complete.
```

**Startup Events**:

- ✅ Cleanup expired OTPs
- ✅ Cleanup old grade sheets (>24h)
- ✅ Initialize AI services
- ✅ Load school configurations

### 7.2 Start Frontend

```bash
# Terminal 2
cd frontend

# Run development server
npm start

# Output:
# Compiled successfully!
# Local:            http://localhost:3000
# On Your Network:  http://192.168.1.x:3000
```

### 7.3 Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 🎉 Congratulations!

You've successfully set up **Smart School Modular Edition v2.0**!

### What's working:

- ✅ FastAPI backend với 10 modules
- ✅ Multi-school database routing
- ✅ InsightFace face recognition (95-99% accuracy)
- ✅ OCR grade processing (Qwen + Gemini)
- ✅ AI feedback generation (Gemini 2.0)
- ✅ React frontend với responsive design
- ✅ JWT authentication + OTP verification
- ✅ Integrated teacher-subject management in Admin panel

### Recommended next actions:

1. 🔐 **Change default admin password**
2. 👥 **Add students and register faces**
3. 📄 **Test OCR with grade sheets**
4. 🧠 **Generate AI feedback**
5. 📊 **Explore analytics dashboard**
6. 👨‍🏫 **Add teachers with subject assignments**

**Need help?** Check [README.md](README.md) or create an issue.

**Enjoy your AI-powered school management system! 🚀**
