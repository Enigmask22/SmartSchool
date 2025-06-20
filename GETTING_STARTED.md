# 🚀 Getting Started - Smart School InsightFace Edition v2.0

Hướng dẫn setup cho người mới clone project. Hệ thống điểm danh thông minh với độ chính xác 95-99% sử dụng InsightFace ArcFace.

## 🎯 Tổng quan

**Smart School InsightFace Edition** là hệ thống điểm danh tự động với:
- 🧠 **InsightFace (ArcFace)** - Độ chính xác 95-99%
- 🔄 **MediaPipe Fallback** - Backup system 75-80%
- ⚡ **Continuous Recognition** - Điểm danh liên tục không cần nhấn nút
- 🌐 **Real-time WebSocket** - Cập nhật trạng thái ngay lập tức
- 📊 **Advanced Analytics** - Phân tích chi tiết hiệu suất

## 📋 Requirements

### Hệ thống
- **OS**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **RAM**: Tối thiểu 8GB (khuyến nghị 16GB cho InsightFace)
- **Storage**: 5GB trống
- **Camera**: Webcam hoặc camera USB

### Software
- **Python 3.8+** (khuyến nghị 3.9-3.11)
- **Node.js 16+** và npm
- **Git** (để clone repository)
- **Visual C++ Build Tools** (Windows - để build InsightFace)

## 🛠️ Cài đặt từ đầu

### Bước 1: Clone Repository
```bash
# Clone project
git clone <repository-url>
cd smart_school

# Kiểm tra cấu trúc
ls -la
# Bạn sẽ thấy: backend/, frontend/, GETTING_STARTED.md, etc.
```

### Bước 2: Setup Backend

#### 2.1 Tạo Virtual Environment
```bash
cd backend

# Tạo virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Verify activation
which python  # Nên trỏ đến folder venv
```

#### 2.2 Install Dependencies
```bash
# Upgrade pip
python -m pip install --upgrade pip

# Install basic requirements
pip install -r requirements.txt

# Install InsightFace (production)
python install_insightface_production.py
```

**⚠️ Lỗi Windows:** Nếu gặp lỗi build InsightFace:
```bash
# Cài Visual C++ Build Tools từ:
# https://visualstudio.microsoft.com/visual-cpp-build-tools/

```

#### 2.3 Environment Configuration
```bash
# Tạo file .env từ template
cp .env.example .env

# Hoặc tạo file .env mới với nội dung:
```

**File `backend/.env`:**
```env
# === DATABASE (Supabase) ===
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# === SECURITY ===
SECRET_KEY=your-super-secret-key-here-minimum-32-characters
JWT_SECRET_KEY=another-secret-key-for-jwt-tokens

# === SERVER CONFIG ===
DEBUG=True
HOST=0.0.0.0
PORT=8000

# === AI RECOGNITION ===
FACE_RECOGNITION_MODEL=insightface
CONFIDENCE_THRESHOLD=0.6
FALLBACK_THRESHOLD=0.65
RECOGNITION_COOLDOWN_SECONDS=30

# === UPLOAD SETTINGS ===
MAX_UPLOAD_SIZE=10MB
UPLOAD_PATH=./uploads
```

### Bước 3: Setup Supabase Database

#### 3.1 Tạo Supabase Project
1. Truy cập [https://supabase.com](https://supabase.com)
2. Đăng ký/Đăng nhập → Create New Project
3. Chọn:
   - **Name**: Smart School InsightFace
   - **Database Password**: Tạo password mạnh (lưu lại)
   - **Region**: Chọn gần bạn nhất
4. Chờ 2-3 phút project được tạo

#### 3.2 Apply Database Schema
```bash
# Trong backend folder
# Sử dụng file schema clean để tránh conflicts
# Copy nội dung file schema_insightface_edition_clean.sql
```

1. Vào **Supabase Dashboard** → **SQL Editor**
2. **Copy toàn bộ** nội dung `backend/schema_insightface_edition_clean.sql`
3. **Paste** vào SQL Editor → **RUN**
4. Chờ 1-2 phút để tạo tables, functions, indexes

**⚠️ Quan trọng:** File `schema_insightface_edition_clean.sql` sẽ:
- **DROP** tất cả tables/functions cũ (nếu có)
- **Tạo lại** schema hoàn toàn mới cho InsightFace Edition v2.0
- **Tránh conflicts** với database hiện tại

#### 3.3 Lấy API Keys
1. **Settings** → **API**
2. Copy các thông tin:
   - **Project URL**
   - **anon/public key** 
   - **service_role key**
3. **Cập nhật vào** `backend/.env`

#### 3.4 Verify Database
```bash
# Test database connection
python test_database_migration.py

# Kết quả mong đợi:
# ✅ InsightFace Edition v2.0 schema is ready!
```

### Bước 4: Setup Frontend

#### 4.1 Install Dependencies
```bash
cd ../frontend

# Install Node.js packages
npm install

# Hoặc nếu gặp lỗi:
npm install --legacy-peer-deps
```

#### 4.2 Environment Configuration
**File `frontend/.env`:**
```env
# === API CONFIGURATION ===
REACT_APP_API_URL=http://localhost:8000
REACT_APP_API_BASE_URL=http://localhost:8000/api

# === SUPABASE CONFIGURATION ===
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key

# === FEATURES ===
REACT_APP_ENABLE_CONTINUOUS_RECOGNITION=true
REACT_APP_DEFAULT_CAMERA_FPS=1
REACT_APP_RECOGNITION_COOLDOWN=30

# === DEBUG ===
REACT_APP_DEBUG=true
```

## 🚀 Khởi chạy hệ thống

### Option 1: Manual Start (Khuyến nghị cho development)

**Terminal 1 - Backend:**
```bash
cd backend
# Activate venv nếu chưa
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Start backend server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### Option 2: Script Start
```bash
# Windows
start.bat

# macOS/Linux  
./start.sh
```

### Kiểm tra khởi chạy thành công
- **Backend**: http://localhost:8000 → Hiển thị API info
- **API Docs**: http://localhost:8000/docs → Swagger documentation
- **Frontend**: http://localhost:3000 → Smart School dashboard

## 👤 Đăng nhập lần đầu

### Tài khoản mặc định (được tạo bởi schema):

**Admin:**
- Email: `admin@smartschool.edu.vn`
- Password: `password` (MD5 hash trong database)

**Teacher:**
- Email: `teacher@smartschool.edu.vn`  
- Password: `password`

**⚠️ Đổi password ngay sau lần đăng nhập đầu!**

## 🧪 Test hệ thống

### 1. Test Backend API
```bash
# Test health check
curl http://localhost:8000/health

# Test AI status
curl http://localhost:8000/api/ai/status

# Test students API
curl http://localhost:8000/api/students
```

### 2. Test InsightFace Installation
```bash
cd backend
python test_insightface_upgrade.py

# Kết quả mong đợi:
# ✅ InsightFace installation successful
# ✅ Face recognition model loaded
# ✅ Test recognition passed
```

### 3. Test Database Functions
```bash
python test_database_migration.py

# Kết quả:
# ✅ InsightFace Edition v2.0 schema is ready!
```

## 📱 Quy trình sử dụng cơ bản

### 1. Đăng nhập và khám phá
1. Mở http://localhost:3000
2. Đăng nhập với tài khoản admin
3. Xem **Dashboard** với InsightFace statistics

### 2. Thêm học sinh và đăng ký khuôn mặt
1. **Students** → **Add Student**
2. Nhập thông tin đầy đủ
3. **Upload Photos** → Chọn 3-5 ảnh khuôn mặt từ góc độ khác nhau
4. **Register Face** → Hệ thống sẽ tự động training InsightFace

### 3. Sử dụng Continuous Recognition
1. **Điểm danh tự động** → **Start Camera**
2. Học sinh đi qua camera
3. Hệ thống tự động nhận diện và tạo attendance record
4. Cooldown 30 giây giữa các lần nhận diện

### 4. Monitor Performance
1. **Dashboard** → Xem real-time stats
2. **Analytics** → Recognition performance
3. **Logs** → Chi tiết recognition attempts

## ⚙️ Cấu hình nâng cao

### Điều chỉnh AI Recognition
**Backend `.env`:**
```env
# InsightFace confidence (càng cao càng strict)
CONFIDENCE_THRESHOLD=0.6  # 0.4-0.8

# MediaPipe fallback threshold
FALLBACK_THRESHOLD=0.65

# Cooldown between recognitions (seconds)
RECOGNITION_COOLDOWN_SECONDS=30

# Max daily recognitions per student
MAX_DAILY_RECOGNITIONS=5
```

### Performance Tuning
```env
# Camera FPS (lower = better performance)
REACT_APP_DEFAULT_CAMERA_FPS=1

# WebSocket update interval
WEBSOCKET_PING_INTERVAL=30

# Enable/disable features
REACT_APP_ENABLE_CONTINUOUS_RECOGNITION=true
REACT_APP_ENABLE_FALLBACK_RECOGNITION=true
```

## 🐛 Troubleshooting

### ❌ InsightFace installation failed
```bash
# Windows: Install Visual C++ Build Tools
# https://visualstudio.microsoft.com/visual-cpp-build-tools/

# Alternative: Use MediaPipe only
# System will automatically fallback
```

### ❌ "No module named 'cv2'"
```bash
cd backend
pip install opencv-python opencv-contrib-python
```

### ❌ Database connection error
1. Kiểm tra Supabase URL và keys trong `.env`
2. Verify Supabase project is active
3. Check network connectivity

### ❌ Camera không hoạt động
1. **Browser permissions**: Allow camera for localhost:3000
2. **Chrome**: Settings → Privacy → Site Settings → Camera
3. **Antivirus**: Check if blocking camera access

### ❌ Recognition không chính xác
1. **Ánh sáng**: Đảm bảo đủ sáng, tránh ngược sáng
2. **Góc độ**: Register từ nhiều góc độ khác nhau
3. **Chất lượng**: Sử dụng ảnh HD, khuôn mặt rõ nét
4. **Số lượng**: Train với 5-10 ảnh mỗi người

### ❌ Port conflicts
```bash
# Kill process on port
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:8000 | xargs kill -9
```

## 📁 Cấu trúc Project

```
smart_school/
├── backend/                          # FastAPI backend
│   ├── ai/
│   │   └── face_recognition_insightface.py  # Primary AI service
│   ├── routers/
│   │   ├── ai.py                    # AI endpoints
│   │   ├── students.py              # Student management
│   │   └── auth.py                  # Authentication
│   ├── database/
│   │   └── connection.py            # Supabase connection
│   ├── schema_insightface_edition_clean.sql  # Clean database schema (recommended)
│   ├── schema_insightface_edition.sql       # Original schema (có thể có conflicts)
│   ├── test_database_migration.py      # Schema validation
│   ├── install_insightface_production.py  # InsightFace installer
│   ├── requirements.txt             # Python dependencies
│   └── .env                         # Environment variables
├── frontend/                        # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ContinuousRecognition.jsx  # Auto recognition
│   │   │   └── StudentManagement.jsx     # Student CRUD
│   │   ├── pages/
│   │   └── utils/
│   ├── package.json
│   └── .env
└── GETTING_STARTED.md               # This file
```

## 🚀 Development Workflow

### Backend Development
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```bash
cd frontend
npm start
```

### Database Changes
1. Modify `schema_insightface_edition.sql`
2. Apply changes in Supabase SQL Editor
3. Run `python test_database_migration.py` to verify

### Adding New Features
1. **Backend**: Create new routers in `routers/`
2. **Frontend**: Add components in `src/components/`
3. **Database**: Update schema if needed
4. **Test**: Verify with test scripts

## 📊 Monitoring & Logs

### Application Logs
- **Backend**: `backend/logs/smart_school_YYYYMMDD.log`
- **Frontend**: Browser Developer Tools Console

### Performance Monitoring
```bash
# Check system status
curl http://localhost:8000/api/ai/system-status

# Check encoding statistics
curl http://localhost:8000/api/ai/encoding-stats

# Check recognition performance
curl http://localhost:8000/api/ai/recognition-stats
```

### Database Monitoring
```sql
-- In Supabase SQL Editor
SELECT * FROM check_system_status();
SELECT * FROM student_encoding_status;
SELECT * FROM daily_attendance_summary;
```

## 🔐 Security Notes

### Production Deployment
1. **Change default passwords** ngay lập tức
2. **Generate strong secret keys** (32+ characters)
3. **Enable HTTPS** cho production
4. **Configure CORS** properly
5. **Setup RLS policies** in Supabase

### API Security
- JWT tokens với expiration
- Rate limiting on endpoints
- Input validation và sanitization
- File upload restrictions

## 📞 Support & Documentation

### Resources
- **API Documentation**: http://localhost:8000/docs
- **Schema Guide**: `backend/SCHEMA_MIGRATION_GUIDE.md`
- **InsightFace Info**: [https://github.com/deepinsight/insightface](https://github.com/deepinsight/insightface)

### Debug Mode
```env
# Backend
DEBUG=True

# Frontend
REACT_APP_DEBUG=true
```

### Need Help?
1. Check logs first: `backend/logs/`
2. Run diagnostic scripts: `test_*.py`
3. Verify environment variables
4. Check Supabase connection
5. Review API documentation

---

🎉 **Chúc mừng!** Bạn đã setup thành công **Smart School InsightFace Edition v2.0**!

### Các bước tiếp theo:
1. 🔐 **Đổi password admin** ngay lập tức
2. 👥 **Thêm học sinh** và register faces
3. 📹 **Test continuous recognition**
4. 📊 **Khám phá analytics dashboard**
5. ⚙️ **Tùy chỉnh settings** theo nhu cầu

**Enjoy your 95-99% accuracy face recognition system! 🚀** 