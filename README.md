# 🎓 Smart School System - Hệ thống Trường học Thông minh

Hệ thống quản lý trường học hiện đại với tính năng điểm danh tự động bằng AI Computer Vision, tích hợp hoàn toàn với Supabase và giao diện React responsive.

## 🌟 Tính năng nổi bật

### 🤖 AI Computer Vision
- **Nhận dạng khuôn mặt** với độ chính xác cao
- **Điểm danh tự động** thời gian thực
- **Training model** tự động khi có học sinh mới
- **Confidence scoring** để đảm bảo độ tin cậy

### 👥 Quản lý học sinh
- **CRUD operations** đầy đủ cho học sinh
- **Upload ảnh** và đăng ký khuôn mặt
- **Thông tin chi tiết** học sinh và phụ huynh
- **Phân lớp** và quản lý theo khối

### 📊 Báo cáo và thống kê
- **Dashboard** hiển thị số liệu thời gian thực
- **Biểu đồ** attendance theo ngày/tuần/tháng
- **Export** báo cáo Excel/PDF
- **Thống kê** theo lớp và cá nhân

### 🔐 Bảo mật và Authentication
- **JWT Authentication** với Supabase
- **Role-based access** (Admin, Teacher, Staff)
- **Row Level Security** trên database
- **API rate limiting** và validation

## 🏗️ Kiến trúc hệ thống

```
smart_school/
├── 🐍 backend/                 # FastAPI Backend
│   ├── ai/                     # AI Services
│   │   └── face_recognition_service.py
│   ├── routers/                # API Endpoints
│   │   ├── auth.py            # Authentication
│   │   ├── students.py        # Student Management
│   │   ├── attendance.py      # Attendance System
│   │   └── ai.py              # AI API
│   ├── models/                # Pydantic Models
│   ├── database/              # Database Connection
│   └── utils/                 # Utilities
├── ⚛️ frontend/                # React Frontend
│   ├── src/
│   │   ├── components/        # React Components
│   │   ├── pages/             # Page Components
│   │   ├── contexts/          # React Contexts
│   │   ├── hooks/             # Custom Hooks
│   │   └── utils/             # Utilities
│   └── public/                # Static Assets
├── 🗄️ database/               # Database Schema
│   └── schema.sql             # Supabase Schema
├── 📁 ai_models/              # AI Models Storage
├── 📁 uploads/                # File Uploads
└── 📋 setup.py                # Auto Setup Script
```

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **OpenCV** - Computer vision library
- **face_recognition** - Face recognition library
- **Supabase Python Client** - Database client
- **JWT** - Authentication
- **Uvicorn** - ASGI server

### Frontend
- **React 18** - UI framework
- **Tailwind CSS** - Utility-first CSS
- **React Router** - Navigation
- **React Query** - Data fetching
- **Chart.js** - Data visualization
- **React Webcam** - Camera integration
- **React Hook Form** - Form management

### Database & Infrastructure
- **Supabase** - Backend as a Service
- **PostgreSQL** - Primary database
- **Supabase Storage** - File storage
- **Supabase Auth** - Authentication

### AI & Computer Vision
- **OpenCV** - Image processing
- **dlib** - Face detection
- **face_recognition** - Face encoding
- **NumPy** - Numerical computing

## 📋 Yêu cầu hệ thống

### Phần mềm
- **Python 3.8+** 
- **Node.js 16+** 
- **npm 8+**
- **Git** (tùy chọn)

### Phần cứng
- **Webcam** hoặc camera IP
- **RAM**: 4GB+ (khuyến nghị 8GB+)
- **Storage**: 2GB+ free space
- **CPU**: Dual-core+ (khuyến nghị có GPU cho AI)

### Dịch vụ
- **Supabase Account** (miễn phí)
- **Internet connection** cho API calls

## 🚀 Cài đặt nhanh

### Tự động (Khuyến nghị)
```bash
# Clone repository
git clone <repository-url>
cd smart_school

# Chạy script setup tự động
python setup.py
```

### Manual Setup

#### 1. Backend Setup
```bash
cd backend

# Tạo virtual environment
python -m venv venv

# Kích hoạt virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt

# Tạo .env file
cp .env.example .env
# Chỉnh sửa .env với thông tin Supabase

# Chạy server
python main.py
```

#### 2. Frontend Setup
```bash
cd frontend

# Cài đặt dependencies
npm install

# Tạo .env file
cp .env.example .env
# Chỉnh sửa .env với API URL

# Chạy development server
npm start
```

#### 3. Database Setup

### Cách 1: Sử dụng Schema Đơn giản (Khuyến nghị)
```sql
-- Trong Supabase SQL Editor, chạy file: database/simple_schema.sql
-- File này không sử dụng RLS policies để tránh infinite recursion
```

### Cách 2: Manual Setup
1. Vào [Supabase Dashboard](https://supabase.com/dashboard)
2. Tạo project mới hoặc sử dụng project có sẵn
3. Vào **SQL Editor** và chạy script từ `database/simple_schema.sql`
4. Lấy URL và Key từ **Settings > API**

### Environment Variables
Tạo file `.env` trong thư mục `backend/`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SECRET_KEY=your_secret_key_for_jwt
DEBUG=True
```

## 🔧 Cấu hình

### Backend Environment (.env)
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# API Security
SECRET_KEY=your-secret-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Configuration
FACE_RECOGNITION_TOLERANCE=0.6
MIN_FACE_SIZE=50
```

### Frontend Environment (.env)
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_API_BASE_URL=http://localhost:8000/api
```

## 📖 Hướng dẫn sử dụng

### 1. Khởi chạy hệ thống
```bash
# Sử dụng script (Windows)
start.bat

# Sử dụng script (macOS/Linux)
./start.sh

# Manual
cd backend && python main.py
cd frontend && npm start
```

### 2. Truy cập hệ thống
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 3. Đăng nhập
- **Admin**: admin@smartschool.edu.vn / admin123
- **Teacher**: teacher@smartschool.edu.vn / teacher123

### 4. Quy trình sử dụng

#### Quản lý học sinh
1. Vào **Students** → **Add Student**
2. Nhập thông tin học sinh
3. Upload ảnh đại diện
4. **Register Face** để đăng ký khuôn mặt

#### Điểm danh
1. Vào **Attendance** → **Camera**
2. Cho phép quyền truy cập camera
3. Hướng camera về phía học sinh
4. Hệ thống tự động nhận dạng và điểm danh

#### Xem báo cáo
1. Vào **Dashboard** để xem tổng quan
2. Vào **Reports** để xem báo cáo chi tiết
3. Lọc theo ngày, lớp, học sinh
4. Export báo cáo nếu cần

## 🔌 API Documentation

### Authentication
```bash
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
POST /api/auth/refresh
```

### Students
```bash
GET    /api/students          # Danh sách học sinh
POST   /api/students          # Tạo học sinh mới
GET    /api/students/{id}     # Chi tiết học sinh
PUT    /api/students/{id}     # Cập nhật học sinh
DELETE /api/students/{id}     # Xóa học sinh
```

### Attendance
```bash
GET  /api/attendance          # Danh sách điểm danh
POST /api/attendance/check-in # Điểm danh vào
POST /api/attendance/check-out/{id} # Điểm danh ra
GET  /api/attendance/today    # Điểm danh hôm nay
GET  /api/attendance/stats/today # Thống kê hôm nay
```

### AI Computer Vision
```bash
POST /api/ai/recognize                    # Nhận dạng khuôn mặt
POST /api/ai/register/{student_id}        # Đăng ký khuôn mặt
POST /api/ai/count-faces                  # Đếm khuôn mặt
GET  /api/ai/status                       # Trạng thái AI
```

## 🎨 Components chính

### Frontend Components
```
components/
├── Layout/
│   ├── Layout.jsx              # Main layout
│   ├── Header.jsx              # Top navigation
│   └── Sidebar.jsx             # Side navigation
├── Students/
│   ├── StudentList.jsx         # Danh sách học sinh
│   ├── StudentForm.jsx         # Form thêm/sửa
│   └── StudentCard.jsx         # Card học sinh
├── Attendance/
│   ├── AttendanceTable.jsx     # Bảng điểm danh
│   ├── CameraCapture.jsx       # Camera component
│   └── AttendanceStats.jsx     # Thống kê
└── Common/
    ├── Button.jsx              # Button component
    ├── Modal.jsx               # Modal component
    └── LoadingSpinner.jsx      # Loading spinner
```

## 🚢 Deployment

### Backend (FastAPI)
```bash
# Sử dụng Docker
docker build -t smart-school-backend .
docker run -p 8000:8000 smart-school-backend

# Hoặc deploy lên Heroku/Railway
```

### Frontend (React)
```bash
# Build production
npm run build

# Deploy lên Vercel/Netlify
npm install -g vercel
vercel

# Hoặc Netlify
npm install -g netlify-cli
netlify deploy
```

## 🐛 Troubleshooting

### Lỗi thường gặp

#### Camera không hoạt động
```bash
# Kiểm tra quyền camera trong browser
# Chrome: Settings → Privacy and security → Site settings → Camera
```

#### Face recognition không chính xác
```bash
# Tăng số lượng ảnh training
# Chỉnh sửa FACE_RECOGNITION_TOLERANCE trong .env
```

#### Database connection error
```bash
# Kiểm tra Supabase URL và keys trong .env
# Verify network connection
```

#### Import error với Python packages
```bash
# Reinstall requirements
pip uninstall -r requirements.txt -y
pip install -r requirements.txt
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/
```

### Frontend Tests
```bash
cd frontend
npm test
```

### E2E Tests
```bash
npm run test:e2e
```

## 📊 Performance

### Benchmarks
- **Face Recognition**: < 2s per image
- **API Response**: < 100ms average
- **Database Queries**: < 50ms average
- **Frontend Load**: < 3s initial load

### Optimization Tips
- Sử dụng GPU để tăng tốc AI processing
- Enable browser camera hardware acceleration  
- Optimize database indexes
- Use CDN cho static assets

## 🤝 Contributing

### Quy trình đóng góp
1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

### Code Standards
- **Python**: Follow PEP 8
- **JavaScript**: Use ESLint + Prettier
- **Commits**: Conventional Commits format
- **Documentation**: Update README cho mọi thay đổi

## 📞 Support

### Liên hệ
- **Email**: support@smartschool.edu.vn
- **Documentation**: [Wiki](link-to-wiki)
- **Issues**: [GitHub Issues](link-to-issues)
- **Discussions**: [GitHub Discussions](link-to-discussions)

### FAQ
**Q: Hệ thống có hoạt động offline không?**
A: Hiện tại cần internet để kết nối Supabase, nhưng có thể cấu hình local database.

**Q: Có thể tích hợp với hệ thống trường học hiện tại?**
A: Có, qua API endpoints và có thể customize theo yêu cầu.

**Q: Độ chính xác của face recognition?**
A: > 95% trong điều kiện ánh sáng tốt và ảnh chất lượng cao.

## 📝 License

MIT License - xem [LICENSE](LICENSE) file để biết chi tiết.

## 🙏 Acknowledgments

- [OpenCV](https://opencv.org/) cho computer vision
- [Supabase](https://supabase.com/) cho backend infrastructure
- [React](https://reactjs.org/) cho frontend framework
- [Tailwind CSS](https://tailwindcss.com/) cho styling
- Face Recognition community cho algorithms

---

<div align="center">
  <p>Được phát triển với ❤️ bởi Smart School Team</p>
  <p>🌟 Nếu project hữu ích, hãy star repository!</p>
</div> 