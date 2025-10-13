# 🚀 Hướng Dẫn Cài PyTorch với GPU Support

## ⚠️ QUAN TRỌNG

`pip install -r requirements.txt` sẽ **KHÔNG** tự động cài PyTorch CUDA!  
Bạn phải cài **MANUALLY** để enable GPU.

---

## ✅ Bước 1: Uninstall PyTorch CPU (nếu đã cài)

```bash
cd backend
pip uninstall torch torchvision torchaudio -y
```

---

## ✅ Bước 2: Install PyTorch CUDA 12.4

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
```

**Lưu ý:**
- CUDA 12.4 tương thích với CUDA 11.8 - 13.0
- Yêu cầu: NVIDIA GPU + Driver mới nhất
- Download size: ~2-3GB

---

## ✅ Bước 3: Verify GPU hoạt động

```bash
python -c "import torch; print('CUDA Available:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None')"
```

**Kết quả mong đợi:**
```
CUDA Available: True
GPU: NVIDIA GeForce RTX 4060 Laptop GPU
```

**Nếu thấy `False`:**
- Kiểm tra driver: `nvidia-smi`
- Reinstall PyTorch CUDA
- Check PyTorch version: `python -c "import torch; print(torch.__version__)"`  
  Phải thấy `+cu124`, KHÔNG PHẢI `+cpu`

---

## ✅ Bước 4: Config Vintern dùng GPU

File `backend/config/ocr_config.py` đã config sẵn:

```python
VINTERN_DEVICE = "cuda"  # ✅ Đã set mặc định
```

**Nếu muốn force CPU (testing):**
```python
VINTERN_DEVICE = "cpu"
```

---

## 📊 Performance Comparison

### With GPU (RTX 4060):
| num_beams | 3 dòng | 10 dòng | 40 dòng | Accuracy | Ghi chú |
|-----------|--------|---------|---------|----------|---------|
| **1** (greedy) | **3-5s** ⚡ | **8-12s** ⚡ | **25-35s** ⚡ | ~85-90% | ❌ Sai nhiều, không khuyến khích |
| **3** (balanced) | **6-8s** ✅ | **20-25s** ✅ | **50-70s** ✅ | **~93-95%** | ✅ **MẶC ĐỊNH** - Balance tốt nhất |
| **5** (accuracy) | **12-15s** | **35-45s** | **120-150s** | ~95-97% | ⚠️ Chậm, chỉ dùng khi cần accuracy cực cao |

### Without GPU (CPU only):
| num_beams | 3 dòng | 10 dòng | 40 dòng |
|-----------|--------|---------|---------|
| **1** (greedy) | **15-20s** 🐌 | **40-60s** 🐌 | **2-3 phút** 🐌 |
| **3** (balanced) | **40-50s** 🐌 | **2-3 phút** 🐌 | **8-10 phút** 🐌 |
| **5** (accuracy) | **2 phút** 💀 | **7 phút** 💀 | **25 phút** 💀 |

**→ GPU nhanh hơn ~6-8x so với CPU!**

---

## 🎯 Recommendation

### ✅ MẶC ĐỊNH (đã config sẵn):
```python
# backend/services/vintern_ocr_service.py
num_beams=3  # BALANCED: ~6-8s cho 3 dòng, accuracy ~93-95% ✅
```

**→ ĐÂY LÀ CONFIG TỐI ƯU NHẤT!** (Vừa nhanh vừa chính xác)

### Nếu cần ACCURACY cực cao (chấp nhận chậm hơn):
```python
num_beams=5  # ~12-15s cho 3 dòng, accuracy ~95-97%
```

### Hoặc dùng Gemini (Easiest, không cần GPU):
```python
# backend/config/ocr_config.py
DEFAULT_OCR_MODEL = "gemini"  # ~3-5s mọi trường hợp, accuracy ~95%
```

---

## 🔧 Troubleshooting

### "CUDA out of memory"
```python
# Giảm image patches trong vintern_ocr_service.py
pixel_values = load_image_for_vintern(image, max_num=6)  # giảm từ 9
```

### PyTorch vẫn là CPU version
```bash
# Check version
python -c "import torch; print(torch.__version__)"

# Nếu thấy +cpu, cài lại:
pip uninstall torch torchvision torchaudio -y
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
```

### Không có NVIDIA GPU
- Vintern sẽ chạy trên CPU (rất chậm)
- **Recommend:** Dùng Gemini API thay vì Vintern
- Gemini: Fast (3-5s), Accurate, Cloud-based

---

## 💡 Quick Commands

```bash
# Check GPU
nvidia-smi

# Check CUDA in PyTorch
python -c "import torch; print(torch.cuda.is_available())"

# Install CUDA PyTorch
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124

# Test Vintern speed
python -c "from services.vintern_ocr_service import VinternOCRService; import time; s=VinternOCRService(); start=time.time(); s.parse_grade_sheet('path/to/image.jpg'); print(f'Time: {time.time()-start:.2f}s')"
```

