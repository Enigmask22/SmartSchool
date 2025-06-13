# 🚀 Smart School System - Quick Start

## 📋 **Bước 1: Setup (chỉ cần 1 lần)**

```bash
py setup.py
```

**Thế thôi!** Script sẽ tự động:
- ✅ Tạo virtual environment  
- ✅ Cài đặt tất cả Python packages
- ✅ Setup React frontend
- ✅ Tạo environment files
- ✅ Test import packages

## 🏃‍♂️ **Bước 2: Chạy hệ thống**

### Option A: Manual (Recommended)

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate     # Windows
uvicorn main:app --host 0.0.0.0 --port 8000
 --reload
# source venv/bin/activate  # Linux/Mac
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### Option B: Auto (một lệnh)
```bash
start.bat    # Windows
# ./start.sh   # Linux/Mac
```

## 🌐 **Bước 3: Truy cập**

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000  
- **API Docs:** http://localhost:8000/docs

## 👤 **Đăng nhập**

- **Admin:** admin@smartschool.edu.vn / admin123
- **Teacher:** teacher@smartschool.edu.vn / teacher123

## 🧪 **Test Backend (Optional)**

```bash
cd backend
venv\Scripts\activate
python test_imports.py
```

## ⚠️ **Troubleshooting**

### Lỗi Python 3.12 compatibility:
- ✅ **Đã fix** - Script tự động cài setuptools==68.2.2

### Lỗi OpenCV/NumPy:
- ✅ **Đã fix** - Script tự động cài NumPy 1.26.4

### Lỗi face_recognition:
- ✅ **Đã fix** - Sử dụng OpenCV thay thế

### Node.js PATH issues:
```bash
# Thêm vào PATH nếu cần:
$env:PATH += ";C:\Program Files\nodejs"
```

## 📂 **Cấu trúc Project**

```
smart_school/
├── backend/               # FastAPI backend
│   ├── venv/             # Virtual environment  
│   ├── main.py           # Entry point
│   ├── requirements.txt  # Python packages
│   └── test_imports.py   # Test script
├── frontend/             # React frontend
├── database/             # Database schemas
├── setup.py             # One-click setup
└── start.bat           # Auto start script
```

## 💡 **Tips**

1. **Chỉ cần chạy `py setup.py` một lần duy nhất**
2. **Sau đó luôn dùng venv để chạy backend**
3. **Mở 2 terminals để chạy song song backend + frontend**
4. **Kiểm tra http://localhost:8000/docs để xem API**

---

🎓 **Smart School System** - AI Computer Vision for Attendance Tracking 