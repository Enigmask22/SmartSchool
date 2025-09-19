# Hướng Dẫn Deploy Smart School Backend Lên Render

## Vấn Đề InsightFace Cache

InsightFace mặc định tạo cache trong thư mục user home (`~/.insightface`), điều này sẽ gây lỗi trên Render vì:
- Render có ephemeral file system (file bị mất sau mỗi deployment)
- Không có quyền write vào user home directory
- GPU không available trên Render free tier

## Giải Pháp Đã Implement ✅

### 1. Monkey Patch Solution (WORKING!)
**Vấn đề:** InsightFace không respect `INSIGHTFACE_HOME` environment variable trong một số cases.

**Giải pháp:** Monkey patch `os.path.expanduser` để force redirect cache path:

```python
# backend/utils/insightface_monkey_patch.py
def patched_expanduser(path):
    path_str = str(path) if hasattr(path, '__fspath__') else path
    
    if path_str == "~/.insightface" or path_str.endswith("/.insightface"):
        return custom_cache_path  # Redirect to project directory
    return original_expanduser(path)

os.path.expanduser = patched_expanduser
```

**Kết quả:**
```
download_path: D:\project\backend\insightface_cache\models\buffalo_l  ✅
# Thay vì: C:\Users\USER\.insightface\models\buffalo_l  ❌
```

### 2. Auto Environment Detection & CPU Provider
Code tự động detect môi trường và chuyển sang CPU provider cho production:
```python
# Trong _initialize_sync()
is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
is_render = os.getenv("RENDER", "false").lower() == "true"

if is_production or is_render:
    providers = ['CPUExecutionProvider']
    production_det_size = (640, 640)  # Optimized for production
```

## Cấu Hình Render

### Environment Variables Cần Set Trên Render

1. **ENVIRONMENT** = `production`
2. **RENDER** = `true`
3. **INSIGHTFACE_CACHE_PATH** = `/opt/render/project/insightface_cache` (optional)
4. **INSIGHTFACE_MODEL_PATH** = `/opt/render/project/ai_models` (optional)

### Bước 1: Chuẩn Bị Wheels (Local)

**Vấn đề:** Một số packages như `opencv-python`, `insightface`, `scikit-learn` cần Microsoft Build Tools để compile.

**Giải pháp:** Build wheels trước trên Windows với Build Tools, sau đó deploy với wheels.

```bash
# Trên Windows với Microsoft Build Tools
cd backend
python build_wheels.py
```

**Output:** Tạo thư mục `wheels/` chứa pre-built wheel files.

### Bước 2: Tạo Service Trên Render

1. Kết nối GitHub repository với Render
2. Chọn **Web Service**
3. **QUAN TRỌNG:** Cấu hình build settings với wheels:

#### Option A: Sử dụng Install Script (Recommended)
```
Build Command: cd backend && bash install_with_wheels.sh
Start Command: cd backend && python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

#### Option B: Manual Pip Command
```
Build Command: cd backend && pip install -r requirements-wheels.txt --find-links wheels
Start Command: cd backend && python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Bước 3: Set Environment Variables

Trong Render dashboard:
```
ENVIRONMENT=production
RENDER=true
DATABASE_URL=your_supabase_url
DATABASE_KEY=your_supabase_key
```

### Bước 4: Persistent Disk (Không Còn Cần Thiết ✅)

**Với monkey patch solution, persistent disk không còn cần thiết vì:**
- ✅ InsightFace cache trong project directory (ephemeral OK)  
- ✅ Models download vào `./insightface_cache` mỗi deployment (~2-3 phút)
- ✅ Không cần quyền write vào user home directory
- ✅ Zero-downtime deployment có thể hoạt động
- ✅ Có thể horizontal scale

**Nếu vẫn muốn dùng persistent disk để tăng tốc:**
1. Render service → tab **Disks** → Add disk
2. Mount path: `/opt/render/project/insightface_cache`  
3. Environment: `INSIGHTFACE_CACHE_PATH=/opt/render/project/insightface_cache`

### Bước 5: Files Structure Check

Đảm bảo repository có structure:
```
backend/
├── wheels/                          # Pre-built wheel files
│   ├── opencv_python-4.8.1.78-*.whl
│   ├── insightface-0.7.3-*.whl
│   └── ...
├── build_wheels.py                  # Script build wheels
├── install_with_wheels.sh           # Render install script
├── requirements-wheels.txt          # Requirements với wheels support
├── requirements.txt                 # Original requirements
├── utils/
│   └── insightface_monkey_patch.py  # Monkey patch solution
└── ...
```

**Critical Files for Render:**
- ✅ `wheels/` directory (if using pre-built wheels)
- ✅ `install_with_wheels.sh` hoặc `requirements-wheels.txt`
- ✅ `utils/insightface_monkey_patch.py`

## Testing Monkey Patch Fix ✅

### Quick Test
```bash
# Test monkey patch logic
python test_insightface_monkey_patch.py
```

### Backend Test
```bash
# Test với real backend
cd backend && venv\Scripts\activate && python main.py
```

### Verify Success
Kiểm tra log output để confirm monkey patch working:
```
🎯 Redirecting ~/.insightface to D:\project\backend\insightface_cache
download_path: D:\project\backend\insightface_cache\models\buffalo_l ✅
find model: D:\project\backend\insightface_cache\models\buffalo_l\det_10g.onnx ✅
```

### Manual Verification
1. Xóa folder `C:\Users\LENOVO\.insightface` (nếu có)
2. Chạy backend: `python backend/main.py`
3. Verify:
   - ✅ Models download vào `./backend/insightface_cache/models/`
   - ❌ **KHÔNG** tạo folder `C:\Users\LENOVO\.insightface`
   - ✅ Log hiện: `Redirecting ~/.insightface to project/cache`

## Testing Local Với Production Mode

```bash
# Test với production mode
export ENVIRONMENT=production
export RENDER=true
cd backend
python main.py
```

## Monitoring & Troubleshooting

### Common Issues & Solutions

1. **"Models not found" error:**
   ```
   Solution: Đảm bảo InsightFace có thể download models
   Check: Network connectivity và disk space
   ```

2. **Memory issues:**
   ```
   Solution: Detection size đã được giảm xuống (640x640)
   Consider: Upgrade Render plan nếu cần
   ```

3. **CPU performance slow:**
   ```
   Expected: CPU chậm hơn GPU nhưng vẫn hoạt động
   Solution: Consider upgrading to paid plan với better CPU
   ```

### Logs Monitoring

```bash
# Render automatically shows logs
# Look for these success messages:
✅ InsightFace initialized successfully
🖥️ Using CPU provider for production deployment
📁 Set InsightFace cache path: ./insightface_cache
```

## Performance Expectations

| Mode | Provider | Detection Size | Speed | Accuracy |
|------|----------|---------------|-------|----------|
| Local Dev | CUDA | 1280x1280 | Fast | 95-99% |
| Render | CPU | 640x640 | Slower | 90-95% |

## Backup Plan

Nếu InsightFace gặp vấn đề trên Render, có thể fallback về MediaPipe:
1. Comment out InsightFace initialization
2. Uncomment MediaPipe service
3. Update routes để sử dụng MediaPipe

## Cost Considerations

- **Free tier:** CPU only, limited resources
- **Paid tier:** Better CPU, more memory, persistent disk option
- **Recommendation:** Test trên free tier trước, upgrade nếu cần

---

**Tóm tắt:** 
- ✅ **Monkey Patch Solution WORKING**: InsightFace cache được redirect hoàn toàn vào project directory
- ✅ **Tự động detect môi trường**: CPU provider cho Render, CUDA cho local dev
- ✅ **Ready for Render**: Deployment sẽ hoạt động mà không cần persistent disk
- ✅ **Tested & Verified**: Đã test thành công với real InsightFace downloads

**Kết quả cuối cùng:** Backend service có thể deploy lên Render mà không gặp lỗi cache path! 🚀

---

## 🚀 Complete Workflow: Local Build → Render Deploy

### Step 1: Local Development (Windows)
```bash
# 1. Setup development environment
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# 2. Build wheels cho deployment (nếu có Microsoft Build Tools)
python build_wheels.py

# Output: wheels/ directory với pre-built packages
```

### Step 2: Repository Structure
```
smart_school/
├── backend/
│   ├── wheels/                    # 📦 Pre-built wheels (optional)
│   ├── build_wheels.py           # 🔧 Build script
│   ├── install_with_wheels.sh    # 🚀 Deploy script
│   ├── requirements-wheels.txt   # 📋 Wheels-aware requirements
│   ├── main.py                   # 🎯 Main application
│   └── utils/
│       └── insightface_monkey_patch.py  # 🐒 Cache fix
└── frontend/...
```

### Step 3: Render Deployment
```bash
# Render Build Command (choose one):

# Option A: With pre-built wheels (recommended)
cd backend && bash install_with_wheels.sh

# Option B: Without wheels (fallback)
cd backend && pip install -r requirements-wheels.txt

# Start Command:
cd backend && python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Step 4: Environment Variables
```
ENVIRONMENT=production
RENDER=true
DATABASE_URL=your_supabase_url
DATABASE_KEY=your_supabase_key
```

### Step 5: Verification
Check Render logs for success indicators:
```
✅ Installing from pre-built wheels...
🎯 Redirecting ~/.insightface to ./insightface_cache
✅ InsightFace initialized successfully
🚀 Smart School Backend - Ready for production!
```

---

## 💡 Troubleshooting Wheels

### Issue: Build Wheels Fails
**Cause:** Missing Microsoft Build Tools
**Solution:**
1. Install Visual Studio Build Tools 2019+
2. Or download wheels từ PyPI: `pip download --only-binary=:all: package_name`

### Issue: Wheels Too Large for Git
**Cause:** Wheel files > 100MB
**Solutions:**
1. Use Git LFS: `git lfs track "*.whl"`
2. Upload wheels to cloud storage và download trong build script
3. Skip wheels, let Render compile (slower nhưng works)

### Issue: Package Not Found in Wheels
**Cause:** Package không có pre-built wheel
**Solution:** Add package vào SAFE_PACKAGES trong `build_wheels.py`

---
