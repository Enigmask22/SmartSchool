# 🚀 Getting Started - Smart School System

Hướng dẫn từng bước để thiết lập và chạy hệ thống trường học thông minh.

## 📋 Checklist trước khi bắt đầu

### ✅ Cài đặt Requirements

#### 1. Python 3.8+
```bash
# Kiểm tra version Python
python --version

# Nếu chưa có, download từ: https://www.python.org/downloads/
```

#### 2. Node.js 16+ và npm
```bash
# Download từ: https://nodejs.org/
# Chọn phiên bản LTS (Long Term Support)

# Kiểm tra sau khi cài
node --version
npm --version
```

#### 3. Git (tùy chọn)
```bash
# Download từ: https://git-scm.com/
git --version
```

## 🎯 Setup nhanh với Script

### Bước 1: Chạy Auto Setup
```bash
# Đảm bảo bạn đang ở thư mục dự án
cd smart_school

# Chạy script setup tự động
python setup.py
```

Script sẽ tự động:
- ✅ Kiểm tra system requirements
- ✅ Tạo Python virtual environment
- ✅ Cài đặt Python dependencies
- ✅ Cài đặt Node.js dependencies
- ✅ Tạo environment files
- ✅ Tạo startup scripts

### Bước 2: Cấu hình Supabase

#### 2.1 Tạo Supabase Project
1. Truy cập [https://supabase.com](https://supabase.com)
2. Đăng ký/Đăng nhập
3. Tạo New Project
4. Chọn Organization và nhập:
   - **Project Name**: Smart School System
   - **Database Password**: Tạo password mạnh
   - **Region**: Chọn gần vị trí của bạn

#### 2.2 Import Database Schema
1. Vào Supabase Dashboard → SQL Editor
2. Copy nội dung file `database/schema.sql`
3. Paste vào SQL Editor và chạy

#### 2.3 Lấy API Keys
1. Vào Settings → API
2. Copy các thông tin sau:
   - **Project URL**
   - **anon/public key**
   - **service_role/secret key**

#### 2.4 Cập nhật Environment Files

**Backend (.env):**
```env
# Cập nhật file backend/.env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

SECRET_KEY=your-random-secret-key-here
```

**Frontend (.env):**
```env
# Cập nhật file frontend/.env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_API_BASE_URL=http://localhost:8000/api
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### Bước 3: Khởi chạy hệ thống

#### Windows:
```bash
# Chạy file batch
start.bat
```

#### macOS/Linux:
```bash
# Chạy shell script
./start.sh
```

#### Manual (nếu script không hoạt động):
```bash
# Terminal 1 - Backend
cd backend
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux
python main.py

# Terminal 2 - Frontend
cd frontend
npm start
```

## 🌐 Truy cập hệ thống

Sau khi khởi chạy thành công:

- **🖥️ Frontend**: http://localhost:3000
- **🔌 Backend API**: http://localhost:8000
- **📚 API Documentation**: http://localhost:8000/docs

## 👤 Tài khoản mặc định

Sử dụng tài khoản sau để đăng nhập lần đầu:

**Admin:**
- Email: admin@smartschool.edu.vn
- Password: admin123

**Teacher:**
- Email: teacher@smartschool.edu.vn  
- Password: teacher123

## 🎓 Quy trình sử dụng cơ bản

### 1. Đăng nhập và khám phá Dashboard
1. Mở http://localhost:3000
2. Đăng nhập với tài khoản admin
3. Xem Dashboard overview

### 2. Thêm học sinh đầu tiên
1. Vào **Students** → **Add Student**
2. Nhập thông tin:
   - Mã học sinh: SV001
   - Họ tên: Nguyễn Văn A
   - Lớp: 10A1
   - Khối: 10
3. Click **Save**

### 3. Đăng ký khuôn mặt cho học sinh
1. Tại danh sách Students, click vào học sinh vừa tạo
2. Click **Upload Photo**
3. Chọn ảnh khuôn mặt rõ nét
4. Click **Register Face** để đăng ký AI

### 4. Thử điểm danh
1. Vào **Attendance** → **Camera**
2. Cho phép truy cập camera
3. Đưa khuôn mặt vào camera
4. Hệ thống sẽ tự động nhận dạng và điểm danh

### 5. Xem báo cáo
1. Vào **Dashboard** để xem tổng quan
2. Vào **Reports** để xem chi tiết
3. Filter theo ngày, lớp
4. Export báo cáo nếu cần

## ⚙️ Cấu hình nâng cao

### Điều chỉnh độ chính xác AI
Trong `backend/.env`:
```env
# Giảm để ít strict hơn (0.4-0.8)
FACE_RECOGNITION_TOLERANCE=0.6

# Kích thước tối thiểu khuôn mặt
MIN_FACE_SIZE=50
```

### Cấu hình port khác
```env
# Backend port
PORT=8080

# Frontend proxy trong package.json
"proxy": "http://localhost:8080"
```

## 🐛 Xử lý lỗi thường gặp

### ❌ "Module not found" error
```bash
cd backend
pip install -r requirements.txt
```

### ❌ Camera không hoạt động
1. Kiểm tra quyền camera trong browser
2. Chrome: Settings → Privacy → Site Settings → Camera
3. Allow cho localhost:3000

### ❌ Face recognition không chính xác
1. Sử dụng ảnh khuôn mặt rõ nét, ánh sáng tốt
2. Chụp từ nhiều góc độ khác nhau
3. Tăng số lượng ảnh training

### ❌ Database connection error
1. Kiểm tra Supabase URL và keys
2. Verify network connection
3. Check Supabase project status

### ❌ Port already in use
```bash
# Kill process sử dụng port
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID_NUMBER> /F

# macOS/Linux:
lsof -ti:8000 | xargs kill -9
```

## 📁 Cấu trúc thư mục sau setup

```
smart_school/
├── backend/
│   ├── venv/              # Virtual environment
│   ├── .env               # Environment variables
│   ├── uploads/           # File uploads
│   ├── ai_models/         # AI models storage
│   └── logs/              # Application logs
├── frontend/
│   ├── node_modules/      # Node.js dependencies
│   ├── .env               # Frontend environment
│   └── build/             # Production build (sau npm run build)
├── start.bat              # Windows startup script
├── start.sh               # Unix startup script
└── README.md              # Hướng dẫn chi tiết
```

## 🔄 Workflow phát triển

### Backend Development
```bash
cd backend
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows
python main.py
```

### Frontend Development
```bash
cd frontend
npm start
```

### Database Changes
1. Chỉnh sửa `database/schema.sql`
2. Apply changes trong Supabase SQL Editor
3. Test với dữ liệu mẫu

## 🚀 Production Deployment

### Chuẩn bị Production
1. Tạo Supabase project riêng cho production
2. Build frontend: `npm run build`
3. Setup environment variables cho production
4. Deploy backend lên Heroku/Railway
5. Deploy frontend lên Vercel/Netlify

### Environment Variables Production
```env
# Backend production
DEBUG=False
HOST=0.0.0.0
PORT=8000
SECRET_KEY=super-secure-secret-key
SUPABASE_URL=https://your-prod-project.supabase.co
```

## 📞 Hỗ trợ

### 🔍 Debug Mode
Để enable debug mode chi tiết:
```env
# Backend .env
DEBUG=True

# Frontend .env  
REACT_APP_DEBUG=true
```

### 📋 Log Files
- Backend logs: `backend/logs/smart_school_YYYYMMDD.log`
- Frontend logs: Browser Developer Tools

### 🆘 Cần hỗ trợ?
1. Check [FAQ trong README.md](README.md#faq)
2. Xem [API Documentation](http://localhost:8000/docs)
3. Tạo issue trên GitHub
4. Contact: support@smartschool.edu.vn

---

🎉 **Chúc mừng!** Bạn đã setup thành công Smart School System! 

Tiếp theo, hãy đọc [README.md](README.md) để tìm hiểu thêm về các tính năng nâng cao. 