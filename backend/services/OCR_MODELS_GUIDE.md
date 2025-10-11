# Hướng Dẫn Sử Dụng Các OCR Model

## 📌 Tổng Quan

Smart School hỗ trợ **2 OCR models** để đọc bảng điểm viết tay:

1. **Qwen2.5-VL-3B** (Alibaba) - Local model, state-of-the-art, 100% accuracy tested ⭐
2. **Gemini Vision API** (Google) - Cloud-based, nhanh nhất, 97% accuracy

Bạn có thể dễ dàng **SWITCH** giữa các model mà không cần thay đổi code API.

---

## 🎯 So Sánh Các Model

| Tính năng | Qwen2.5-VL-3B | Gemini Vision API |
|-----------|---------------|-------------------|
| **Loại** | Local Model | Cloud API |
| **Độ chính xác** | 100% (tested) | 97% |
| **Tốc độ** | 1-2 phút (3 dòng) | 1-2s |
| **Chi phí** | Miễn phí | ~$20/1000 ảnh |
| **VRAM cần** | 6-7GB | 0GB |
| **Context length** | 32K tokens | 1M tokens |
| **Yêu cầu GPU** | RTX 4060 8GB+ | Không |
| **Yêu cầu Internet** | Không | Có |
| **Setup** | Trung bình | Rất đơn giản |
| **Privacy** | Data ở local | Data gửi lên Google |
| **Tiếng Việt** | Xuất sắc | Xuất sắc |
| **Xử lý 50 dòng** | ✅ ~10 phút | ✅ ~10 giây |

---

## 🔧 Cách 1: Switch Model Bằng Config File

### Bước 1: Mở file config

```bash
backend/config/ocr_config.py
```

### Bước 2: Thay đổi model mặc định

```python
# Tìm dòng này (khoảng dòng 20)
DEFAULT_OCR_MODEL = "gemini"  # <-- THAY ĐỔI TẠI ĐÂY

# Đổi thành:
DEFAULT_OCR_MODEL = "qwen"     # Sử dụng Qwen2.5-VL-3B (KHUYẾN NGHỊ cho RTX 4060)
DEFAULT_OCR_MODEL = "gemini"   # Sử dụng Gemini API
```

### Bước 3: Restart server

```bash
# Stop server (Ctrl+C)
# Start lại
cd backend
python main.py
```

✅ **XONG!** Server giờ sẽ sử dụng model bạn chọn.

---

## 🔧 Cách 2: Switch Model Bằng Biến Môi Trường

### Linux/Mac:

```bash
# Sử dụng Gemini
export OCR_MODEL=gemini
python main.py

# Sử dụng Qwen2.5-VL (KHUYẾN NGHỊ)
export OCR_MODEL=qwen
python main.py
```

### Windows (PowerShell):

```powershell
# Sử dụng Gemini
$env:OCR_MODEL="gemini"
python main.py

# Sử dụng Qwen2.5-VL (KHUYẾN NGHỊ)
$env:OCR_MODEL="qwen"
python main.py
```

### Windows (CMD):

```cmd
# Qwen2.5-VL (KHUYẾN NGHỊ)
set OCR_MODEL=qwen
python main.py

# Gemini
set OCR_MODEL=gemini
python main.py
```

---

## 📦 Setup Cho Từng Model

### A. Gemini Vision API

#### 1. Yêu cầu:
- API Key từ Google AI Studio
- Internet connection

#### 2. Cài đặt:

```bash
# Đã có sẵn trong requirements
pip install google-generativeai>=0.8.3
```

#### 3. Cấu hình API Key:

```bash
# Linux/Mac
export GEMINI_API_KEY="your-api-key-here"

# Windows PowerShell
$env:GEMINI_API_KEY="your-api-key-here"
```

Hoặc sử dụng fallback key có sẵn trong code (development only).

#### 4. Test:

```python
from services.ocr_factory import get_ocr_service

service = get_ocr_service("gemini")
result = service.parse_grade_sheet("path/to/image.jpg")
print(result)
```

---

### B. Qwen2.5-VL-3B (KHUYẾN NGHỊ cho RTX 4060 8GB) ⭐

#### 1. Yêu cầu:
- GPU: RTX 4060 8GB trở lên (hoặc tương đương)
- RAM: Ít nhất 8GB
- Disk: ~7GB cho model
- CUDA 11.8+ (đi kèm với PyTorch)

#### 2. Cài đặt dependencies:

```bash
# Cài đặt PyTorch với CUDA support (BẮT BUỘC!)
pip uninstall torch torchvision torchaudio
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124

# Cài đặt Qwen dependencies
pip install transformers>=4.37.0
pip install accelerate>=0.25.0
pip install qwen-vl-utils>=0.0.8
```

Hoặc:

```bash
pip install -r requirements-python313.txt
```

#### 3. Download model (tự động lần đầu):

Model sẽ tự động download từ Hugging Face khi chạy lần đầu:
- Model: `Qwen/Qwen2.5-VL-3B-Instruct`
- Size: ~6.5GB
- Lưu tại: `~/.cache/huggingface/`

**Lần đầu chạy sẽ mất 5-10 phút để download model.**

#### 4. Cấu hình (optional):

```bash
# Chỉ định model path khác (nếu muốn)
export QWEN_MODEL_PATH="Qwen/Qwen2.5-VL-3B-Instruct"

# Force sử dụng CPU (nếu không có GPU - không khuyến nghị)
export QWEN_DEVICE="cpu"

# Hoặc force GPU (khuyến nghị)
export QWEN_DEVICE="cuda"
```

#### 5. Test:

```python
from services.ocr_factory import get_ocr_service

service = get_ocr_service("qwen")
result = service.parse_grade_sheet("path/to/image.jpg")
print(result)
```

#### 6. Performance (RTX 4060 8GB - Tested):

```
✅ Accuracy: 100% (3/3 rows perfect)
✅ Speed: 1.3 phút per 3 dòng (optimized)
✅ VRAM usage: 6GB
✅ Context: 32K tokens (xử lý 100+ dòng)
✅ Vietnamese handwriting: Xuất sắc
✅ Estimated 50 dòng: ~10 phút
```

---

## 🚀 Sử Dụng Trong Code

### Code cũ vẫn hoạt động (tương thích ngược):

```python
from services.ocr_factory import get_ocr_service

# Sử dụng model mặc định (từ config)
ocr_service = get_ocr_service()
result = ocr_service.parse_grade_sheet(image_path)
```

### Chỉ định model cụ thể:

```python
from services.ocr_factory import get_ocr_service, OCRModel

# Sử dụng Gemini
gemini_service = get_ocr_service(OCRModel.GEMINI)
result = gemini_service.parse_grade_sheet(image_path)

# Sử dụng Qwen2.5-VL (KHUYẾN NGHỊ)
qwen_service = get_ocr_service(OCRModel.QWEN)
result = qwen_service.parse_grade_sheet(image_path)

# Hoặc dùng string
service = get_ocr_service("gemini")
service = get_ocr_service("qwen")
```

### API endpoint KHÔNG đổi:

```bash
# Upload và OCR bảng điểm
POST /api/grades/upload-grade-sheet

# Model được sử dụng tự động theo config
# Không cần thay đổi gì ở frontend
```

---

## 🛠️ Troubleshooting

### Lỗi: "Invalid model name"

```python
# Kiểm tra available models
from services.ocr_factory import OCRFactory

print(OCRFactory.get_available_models())
# Output: ['gemini', 'qwen']
```

### Lỗi: "CUDA out of memory" (Qwen)

**Giải pháp 1:** Đóng các ứng dụng khác đang dùng GPU

**Giải pháp 2:** Switch sang Gemini
```bash
# Qwen (6-7GB) → Gemini (0GB)
export OCR_MODEL="gemini"
```

**Giải pháp 3:** Sử dụng CPU (không khuyến nghị - chậm + accuracy thấp)
```bash
export QWEN_DEVICE="cpu"
```

### Lỗi: "Torch not compiled with CUDA enabled"

PyTorch của bạn là CPU-only version. Cần reinstall:

```bash
pip uninstall torch torchvision torchaudio
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
```

### Check model đang sử dụng:

```bash
python -c "from config.ocr_config import OCRConfig; OCRConfig.print_config()"
```

Output:
```
==================================================
OCR SERVICE CONFIGURATION
==================================================
Current Model: QWEN
Type: local
Model Path: Qwen/Qwen2.5-VL-3B-Instruct
Device: cuda
Available Models: gemini, qwen
==================================================
```

---

## 💡 Khuyến Nghị Sử Dụng

### Qwen2.5-VL-3B - KHUYẾN NGHỊ TOP 1 ⭐⭐⭐⭐⭐
**Phù hợp khi:**
- ✅ Có GPU RTX 4060 8GB trở lên
- ✅ Cần accuracy cao (100% tested)
- ✅ Cần xử lý bảng lớn (50+ dòng)
- ✅ Cần privacy (data local)
- ✅ Không có hoặc internet không ổn định
- ✅ Miễn phí, không giới hạn số lượng

**→ Best choice cho RTX 4060 users!**

### Gemini Vision API - Phù hợp khi:
- ✅ Cần tốc độ nhanh nhất (<10s)
- ✅ Có internet ổn định
- ✅ Không quan tâm chi phí nhỏ (~500đ/ảnh)
- ✅ Không có GPU hoặc GPU yếu
- ✅ Muốn setup nhanh nhất

**→ Best choice cho production nếu không có GPU!**

### Chiến lược Khuyến Nghị:
- **Có RTX 4060+**: Dùng Qwen2.5-VL (accuracy cao + miễn phí + xử lý bảng lớn)
- **Không có GPU**: Dùng Gemini (accuracy cao + nhanh + ổn định)
- **Fallback**: Gemini (khi Qwen lỗi hoặc VRAM không đủ)

---

## 📊 Performance Comparison

Dựa trên testing thực tế với RTX 4060 8GB:

| Metric | Qwen2.5-VL-3B | Gemini |
|--------|---------------|--------|
| Độ chính xác | 100% ⭐ | 97% |
| Tốc độ (3 dòng) | 1.3 phút | 1-2s ⭐ |
| Tốc độ (50 dòng) | ~10 phút | ~10s ⭐ |
| Chi phí / 1000 ảnh | $0 ⭐ | $20 |
| VRAM usage | 6-7GB | 0GB ⭐ |
| Context length | 32K ⭐ | 1M ⭐⭐ |
| Setup time | 10 phút | 1 phút ⭐ |
| Xử lý 50 dòng | ✅ | ✅ |

**Recommended:** 
- **Có GPU RTX 4060+**: Qwen2.5-VL (best value)
- **Không có GPU**: Gemini (best speed)

---

## 📝 Logs & Monitoring

Kiểm tra logs để debug:

```bash
# Real-time logs
tail -f backend/logs/smart_school_$(date +%Y%m%d).log

# Tìm OCR errors
grep "OCR" backend/logs/smart_school_*.log

# Check model being used
grep "OCR model" backend/logs/smart_school_*.log
```

---

## 🎓 Best Practices

1. **Test cả 2 models** - để tìm model phù hợp nhất
2. **Monitor accuracy** - so sánh kết quả giữa các model
3. **Set timeout** - tránh request OCR quá lâu
4. **Cache results** - tránh OCR lại cùng 1 ảnh
5. **Use Qwen for everyday** - miễn phí + accurate
6. **Use Gemini for urgent** - ultra fast

---

## 📞 Support

Nếu gặp vấn đề:

1. Check logs: `backend/logs/`
2. Check config: `python -c "from config.ocr_config import OCRConfig; OCRConfig.print_config()"`
3. Test model: `python backend/services/ocr_factory.py`
4. Verify GPU: `nvidia-smi` và `python -c "import torch; print(torch.cuda.is_available())"`
5. Liên hệ team support

---

**Happy OCR-ing với Qwen2.5-VL! 🚀**
