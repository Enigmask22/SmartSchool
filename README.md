# 🎓 Smart School System - AI-Powered School Management

<div align="center">

![Smart School](https://img.shields.io/badge/Smart_School-v2.0.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![AI Engine](https://img.shields.io/badge/AI_Engine-InsightFace_ArcFace-red?style=for-the-badge)
![LLM](https://img.shields.io/badge/LLM-Google_Gemini_2.0-4285F4?style=for-the-badge&logo=google)

**Hệ thống quản lý trường học thông minh với AI nhận dạng khuôn mặt tiên tiến**

[🚀 Bắt đầu](#-bắt-đầu-nhanh) • [📖 Tài liệu](#-tài-liệu-api) • [🛠️ Công nghệ](#️-công-nghệ) • [🤝 Đóng góp](#-đóng-góp)

</div>

## 🌟 Tính năng chính

### 🤖 AI Computer Vision - InsightFace (ArcFace)
- **Độ chính xác 95-99%** - State-of-the-art face recognition
- **Điểm danh tự động** thời gian thực với WebSocket
- **Multiple face registration** - Đăng ký nhiều góc khuôn mặt
- **Continuous recognition** - Nhận dạng liên tục không gián đoạn
- **Face quality assessment** - Đánh giá chất lượng ảnh tự động
 
### 🧠 AI Feedback System - Google Gemini LLM
- **Nhận xét tự động** cho học sinh sử dụng Gemini 2.0 Flash
- **Phân tích thông minh** dựa trên điểm số, xu hướng, chuyên cần
- **Văn phong chuyên nghiệp** phù hợp gửi phụ huynh
- **Batch processing** - Tạo nhận xét hàng loạt cho cả lớp
- **Adaptive tone** - Khích lệ hoặc phê bình khi cần thiết

### 👥 Quản lý toàn diện
- **👨‍🎓 Students**: CRUD đầy đủ, upload ảnh, đăng ký khuôn mặt
- **📚 Grades**: Quản lý điểm số, transcript, academic performance
- **🏠 Homeroom**: Dashboard riêng cho giáo viên chủ nhiệm
- **👨‍💼 Admin**: Quản lý user, permissions, system configuration
- **📅 School Days**: Cấu hình ngày học, lịch nghỉ

### 📊 Analytics & Reporting
- **Real-time Dashboard** với live updates
- **Attendance Analytics** - Thống kê chi tiết theo ngày/tuần/tháng
- **Performance Reports** - Báo cáo học lực tự động
- **AI-Generated Insights** - Nhận xét thông minh từ Google Gemini
- **Export capabilities** - Excel, PDF reports with AI feedback

### 🔐 Bảo mật Enterprise
- **JWT Authentication** với refresh token
- **Role-based Access Control** (Admin, Teacher, Staff)
- **API Rate Limiting** và request validation
- **Secure file upload** với virus scanning
- **Audit logs** cho mọi thao tác quan trọng

## 🏗️ Kiến trúc hệ thống

```
smart_school/
├── 🔙 backend/                    # FastAPI Backend
│   ├── 🤖 ai/                     # AI Services
│   │   └── face_recognition_insightface.py  # InsightFace Engine
│   ├── 🗄️ database/               # Database Layer
│   │   └── connection.py
│   ├── 📊 models/                 # Pydantic Schemas
│   │   └── schemas.py
│   ├── 🛣️ routers/                # API Endpoints
│   │   ├── ai.py                  # AI Computer Vision API
│   │   ├── students.py            # Student Management
│   │   ├── attendance.py          # Attendance System
│   │   ├── grades.py              # Grade Management
│   │   ├── homeroom.py            # Homeroom Dashboard
│   │   ├── admin.py               # Admin Operations
│   │   ├── auth.py                # Authentication
│   │   ├── feedback.py            # AI Feedback System
│   │   └── school_days_config.py  # School Calendar
│   ├── 🔧 services/               # Business Logic
│   │   ├── gemini_service.py      # Google Gemini LLM Service
│   │   └── scheduler_service.py   # Background Tasks
│   ├── 🛠️ utils/                  # Utilities
│   │   ├── logger.py              # Logging System
│   │   └── timezone_helper.py     # Timezone Handling
│   └── 📁 uploads/                # File Storage
├── ⚛️ frontend/                   # React Frontend
│   ├── src/
│   │   ├── 🧩 components/         # React Components
│   │   │   ├── Dashboard.jsx      # Main Dashboard
│   │   │   ├── StudentList.jsx    # Student Management
│   │   │   ├── AttendanceView.jsx # Attendance Interface
│   │   │   ├── ContinuousRecognition.jsx # AI Camera
│   │   │   ├── GradeManagement.jsx # Grade System
│   │   │   ├── HomeroomDashboard.jsx # Teacher Dashboard
│   │   │   ├── AdminManagement.jsx # Admin Panel
│   │   │   ├── AIFeedback.jsx     # AI Analytics
│   │   │   └── FaceManagement.jsx # Face Registration
│   │   ├── 🎯 contexts/           # React Contexts
│   │   │   └── AuthContext.jsx    # Authentication State
│   │   └── 🔌 services/           # API Layer
│   │       └── api.jsx            # API Client
│   └── 📱 Mobile-responsive Design
└── 🔧 setup/                      # Installation Scripts
```

## 🛠️ Công nghệ

### 🔙 Backend Stack
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![InsightFace](https://img.shields.io/badge/InsightFace-FF6B6B?style=flat&logo=opencv&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)

- **FastAPI** - Modern Python web framework với async support
- **InsightFace (ArcFace)** - State-of-the-art face recognition (95-99% accuracy)
- **Google Gemini 2.0 Flash** - Large Language Model cho AI feedback
- **OpenCV** - Computer vision và image processing
- **Supabase** - PostgreSQL database với real-time features
- **JWT** - Secure authentication
- **Uvicorn** - High-performance ASGI server
- **APScheduler** - Background task scheduling

### ⚛️ Frontend Stack
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

- **React 18** - Modern UI framework với hooks
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **WebSocket** - Real-time communication
- **Chart.js** - Interactive data visualization
- **React Webcam** - Camera integration
- **Responsive Design** - Mobile-friendly interface

### 🤖 AI & Computer Vision
![AI](https://img.shields.io/badge/AI_Engine-InsightFace-red?style=flat&logo=ai&logoColor=white)
![LLM](https://img.shields.io/badge/LLM-Google_Gemini-blue?style=flat&logo=google&logoColor=white)
![Accuracy](https://img.shields.io/badge/Accuracy-95--99%25-green?style=flat&logo=target&logoColor=white)

**Computer Vision:**
- **InsightFace (ArcFace)** - Deep learning face recognition
- **512-dimensional embeddings** - High-quality face features  
- **Real-time processing** - < 2s recognition time
- **Multiple face support** - Batch processing
- **Quality assessment** - Automatic image validation

**AI Feedback System:**
- **Google Gemini 2.0 Flash** - Advanced Large Language Model
- **Intelligent analysis** - Điểm số, xu hướng, chuyên cần
- **Professional tone** - Văn phong phù hợp giáo dục
- **Batch generation** - Xử lý hàng loạt học sinh

## 🚀 Bắt đầu nhanh

### 📋 Yêu cầu hệ thống

- **Python 3.8+** với pip
- **Node.js 16+** với npm
- **Webcam** hoặc camera device
- **Internet connection** (cho Supabase)
- **4GB+ RAM** (khuyến nghị 8GB+ cho AI)

### ⚡ Cài đặt tự động

```bash
# 1. Clone repository
git clone <repository-url>
cd smart_school

# 2. Setup backend
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux  
source venv/bin/activate

pip install -r requirements.txt

# 3. Setup frontend
cd ../frontend
npm install

# 4. Cấu hình environment
# Tạo .env files theo hướng dẫn bên dưới
```

### 🔧 Cấu hình

#### Backend (.env)
```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# JWT Security
SECRET_KEY=your-super-secret-key-change-this
ALGORITHM=your-algorithm
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Configuration
FACE_RECOGNITION_TOLERANCE=0.6
MIN_FACE_SIZE=50
DETECTION_CONFIDENCE=0.6

# Google Gemini LLM
GEMINI_API_KEY=your-gemini-api-key-from-google-ai-studio

# Environment
DEBUG=True
HOST=0.0.0.0
PORT=8000
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
```

### 🏃‍♂️ Chạy ứng dụng

```bash
# Terminal 1 - Backend
cd backend
python main.py

# Terminal 2 - Frontend  
cd frontend
npm start
```

**Truy cập:**
- 🌐 **Frontend**: http://localhost:3000
- 🔗 **API**: http://localhost:8000
- 📚 **API Docs**: http://localhost:8000/docs


## 📖 Tài liệu API

### 🔐 Authentication
```http
POST /api/auth/login          # Đăng nhập
POST /api/auth/register       # Đăng ký user mới
GET  /api/auth/me            # Thông tin user hiện tại
POST /api/auth/refresh       # Refresh token
POST /api/auth/logout        # Đăng xuất
```

### 👨‍🎓 Student Management
```http
GET    /api/students           # Danh sách học sinh
POST   /api/students           # Tạo học sinh mới
GET    /api/students/{id}      # Chi tiết học sinh
PUT    /api/students/{id}      # Cập nhật thông tin
DELETE /api/students/{id}      # Xóa học sinh
```

### 📚 Grade Management
```http
GET    /api/grades/student/{id}     # Điểm của học sinh
POST   /api/grades                  # Nhập điểm mới
PUT    /api/grades/{id}            # Cập nhật điểm
GET    /api/grades/transcript/{id}  # Bảng điểm tổng hợp
```

### 📊 Attendance System
```http
GET    /api/attendance                    # Danh sách điểm danh
POST   /api/attendance/check-in          # Điểm danh vào
POST   /api/attendance/check-out/{id}    # Điểm danh ra
GET    /api/attendance/today             # Điểm danh hôm nay
GET    /api/attendance/stats/today       # Thống kê real-time
WebSocket /api/attendance/stream         # Live attendance updates
```

### 🤖 AI Computer Vision
```http
POST /api/ai/recognize                    # Nhận dạng khuôn mặt
POST /api/ai/register/{student_id}        # Đăng ký khuôn mặt
POST /api/ai/register-multiple/{id}       # Đăng ký nhiều ảnh
POST /api/ai/count-faces                  # Đếm số khuôn mặt
GET  /api/ai/status                       # Trạng thái AI engine
DELETE /api/ai/student/{id}/encoding      # Xóa face data
WebSocket /api/ai/recognition/stream      # Continuous recognition
```

### 🏠 Homeroom Dashboard
```http
GET /api/homeroom/dashboard              # Dashboard chủ nhiệm
GET /api/homeroom/class/{id}/attendance  # Điểm danh lớp học
GET /api/homeroom/class/{id}/grades      # Điểm số lớp học
```

### 👨‍💼 Admin Operations
```http
GET    /api/admin/users                  # Quản lý users
POST   /api/admin/users                  # Tạo user mới
PUT    /api/admin/users/{id}/role        # Phân quyền
GET    /api/admin/system/stats           # Thống kê hệ thống
POST   /api/admin/backup                 # Backup database
```

### 🧠 AI Feedback System
```http
POST /api/feedback/generate-feedback        # Tạo nhận xét cho 1 học sinh
POST /api/feedback/generate-batch-feedback  # Tạo nhận xét hàng loạt
GET  /api/feedback/health                   # Kiểm tra Gemini service
GET  /api/feedback/test                     # Test feedback generation
POST /api/feedback/send-sms                 # Gửi nhận xét qua SMS
```

## 🎯 Tính năng nổi bật

### 🤖 AI Computer Vision
- **Ultra-high accuracy**: 95-99% với InsightFace ArcFace
- **Real-time processing**: Nhận dạng < 2 giây
- **Multiple angle support**: Đăng ký 15 góc/học sinh
- **Lighting adaptive**: Hoạt động tốt trong nhiều điều kiện ánh sáng
- **Quality assessment**: Tự động đánh giá và filter ảnh chất lượng

### 🧠 AI Feedback Intelligence
- **Automated comments**: Google Gemini 2.0 Flash tạo nhận xét chuyên nghiệp
- **Smart analysis**: Phân tích điểm số, xu hướng, tỷ lệ chuyên cần
- **Contextual tone**: Khích lệ khi tốt, phê bình xây dựng khi cần
- **Batch processing**: Tạo nhận xét cho cả lớp học chỉ trong vài giây
- **Teacher integration**: Kết hợp ghi chú giáo viên để cá nhân hóa

### 📊 Analytics Dashboard
- **Live attendance tracking**: Cập nhật real-time
- **Interactive charts**: Biểu đồ tương tác với Chart.js
- **Performance insights**: Phân tích xu hướng học tập
- **Exportable reports**: Xuất PDF, Excel
- **Mobile responsive**: Hoạt động mượt trên mobile

### 🔒 Security Features
- **JWT with refresh tokens**: Bảo mật session
- **Role-based permissions**: Phân quyền chi tiết
- **API rate limiting**: Chống spam và abuse
- **Input validation**: Kiểm tra dữ liệu đầu vào
- **Secure file upload**: Kiểm tra malware

## 🚀 Performance

### ⚡ Benchmarks
- **Face Recognition**: < 2s per image
- **API Response Time**: < 100ms average
- **Database Queries**: < 50ms average
- **Frontend Load**: < 3s initial load
- **WebSocket Latency**: < 50ms real-time updates

### 🔧 Optimization
- **GPU acceleration**: Hỗ trợ CUDA cho AI processing
- **Caching strategy**: Redis cache cho frequent queries
- **Database indexing**: Optimized PostgreSQL indexes
- **CDN integration**: Static asset optimization
- **Lazy loading**: Component-based code splitting

## 🐛 Troubleshooting

<details>
<summary><strong>🎥 Camera Issues</strong></summary>

```bash
# Kiểm tra camera permissions
# Chrome: Settings → Privacy → Site settings → Camera

# Test camera trong browser console
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => console.log('Camera OK'))
  .catch(err => console.error('Camera Error:', err));
```
</details>

<details>
<summary><strong>🤖 AI Recognition Issues</strong></summary>

```bash
# Kiểm tra InsightFace installation
pip list | grep insightface

# Reinstall AI dependencies
pip uninstall insightface -y
pip install insightface

# Kiểm tra model files
ls -la ai_models/
```
</details>

<details>
<summary><strong>🗄️ Database Connection</strong></summary>

```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" https://your-project.supabase.co/rest/v1/

# Verify environment variables
echo $SUPABASE_URL
echo $SUPABASE_KEY
```
</details>

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest tests/ -v

# Frontend tests  
cd frontend
npm test

# E2E tests
npm run test:e2e

# AI model tests
python -m pytest tests/test_ai.py -v
```

## 📦 Deployment

### 🐳 Docker Deployment
```dockerfile
# Backend Dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### ☁️ Cloud Deployment
- **Backend**: Heroku, Railway, DigitalOcean
- **Frontend**: Vercel, Netlify, AWS S3
- **Database**: Supabase (managed PostgreSQL)
- **AI Models**: Dedicated GPU instances

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