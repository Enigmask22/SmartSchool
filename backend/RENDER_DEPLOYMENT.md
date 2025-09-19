# Hướng dẫn Deploy Backend lên Render

## Vấn đề đã được giải quyết

Các thư viện như `opencv-python`, `insightface`, `onnxruntime` đã có **pre-built wheels cho Linux** trên PyPI. Bạn không cần build từ source nữa!

## 🚀 Giải pháp Deploy (Khuyến nghị)

### Phương án 1: Sử dụng Requirements tối ưu (KHUYẾN NGHỊ)

```bash
# 1. Upload code lên Render
# 2. Sử dụng file requirements-render.txt
# 3. Cấu hình Render:
```

**Cấu hình Render:**
- **Build Command**: `bash render-build.sh`
- **Start Command**: `python main.py` hoặc `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Phương án 2: Sử dụng requirements-wheels.txt hiện tại

```bash
# Build Command:
pip install -r requirements-wheels.txt

# Start Command: 
uvicorn main:app --host 0.0.0.0 --port $PORT
```

## 📋 Files đã tạo

1. **`requirements-render.txt`** - Requirements tối ưu cho Linux
2. **`render-build.sh`** - Build script với system dependencies
3. **`requirements-wheels.txt`** - Đã cập nhật uncomment các packages
4. **`Dockerfile.wheels`** - Build wheels trên Linux (nếu cần)
5. **`build-linux-wheels.sh`** - Script build wheels với Docker

## 🔧 Giải thích kỹ thuật

### Tại sao hoạt động được:

1. **OpenCV**: Sử dụng `opencv-python-headless` - phiên bản server không có GUI
2. **InsightFace**: Có pre-built wheels cho Linux x86_64
3. **ONNX Runtime**: Microsoft cung cấp pre-built wheels
4. **NumPy/Pandas/Scikit-learn**: Có pre-built wheels từ nhiều năm

### System dependencies được cài:

```bash
libgl1-mesa-glx      # OpenGL support
libglib2.0-0         # GLib library
libsm6 libxext6      # X11 extensions
libxrender-dev       # X Render extension
libgomp1             # OpenMP support
libgthread-2.0-0     # GLib threading
```

## 🚀 Các bước deploy

### Bước 1: Chuẩn bị files
```bash
# Ensure có các files:
backend/
├── requirements-render.txt    # ✅ Tối ưu nhất
├── render-build.sh           # ✅ Build script
├── main.py                   # ✅ App chính
└── ...
```

### Bước 2: Cấu hình Render
1. Tạo new Web Service trên Render
2. Connect GitHub repository
3. Cấu hình:
   - **Root Directory**: `backend`
   - **Build Command**: `bash render-build.sh`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Bước 3: Environment Variables
Thêm các biến môi trường cần thiết:
```
DATABASE_URL=your_supabase_url
SECRET_KEY=your_secret_key
GEMINI_API_KEY=your_gemini_key
```

## 🔍 Troubleshooting

### Nếu vẫn gặp lỗi build:

1. **Sử dụng Docker build** (offline):
   ```bash
   # Trên máy local có Docker:
   cd backend
   bash build-linux-wheels.sh
   # Upload folder 'wheels' cùng code lên Render
   ```

2. **Downgrade versions nếu cần**:
   ```
   numpy==1.24.0
   pandas==2.0.3
   opencv-python-headless==4.8.0.76
   ```

3. **Thay thế packages**:
   ```
   # Thay vì opencv-python:
   opencv-python-headless
   
   # Thay vì insightface (nếu vẫn lỗi):
   face-recognition  # Library khác
   ```

## ✅ Xác nhận hoạt động

Sau khi deploy thành công, kiểm tra logs:
```
🔍 Verifying installation...
OpenCV: 4.8.1
InsightFace: OK
ONNX Runtime: 1.17.x
NumPy: 1.24.x
FastAPI: 0.104.1
🎉 All packages verified successfully!
```

## 📞 Support

Nếu vẫn gặp vấn đề:
1. Kiểm tra Render logs
2. Thử phương án Docker build wheels
3. Liên hệ hỗ trợ với logs cụ thể
