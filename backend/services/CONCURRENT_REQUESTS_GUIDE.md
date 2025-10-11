# 🚦 Xử Lý Concurrent Requests cho Qwen OCR

## ⚠️ Vấn Đề

### **Scenario: 2 giáo viên OCR cùng lúc**

```
Teacher A: Upload 50-row grade sheet → Takes 10 minutes
Teacher B: Upload 30-row grade sheet → Có concurrent issues!
```

---

## 🔍 Phân Tích Vấn Đề

### **1. Model Singleton Pattern (Hiện tại)**

```python
# backend/services/qwen_ocr_service.py
_qwen_ocr_service_instance = None  # Chỉ 1 instance!

def get_qwen_ocr_service():
    global _qwen_ocr_service_instance
    if _qwen_ocr_service_instance is None:
        _qwen_ocr_service_instance = QwenOCRService()
    return _qwen_ocr_service_instance
```

**Vấn đề:**
- ❌ Request B phải **CHỜ** request A complete (~10 phút)
- ❌ Không có queue → Timeout errors
- ❌ No mutex/lock → Race conditions possible
- ❌ No fair scheduling → First come first serve without control

### **2. GPU Memory Analysis**

| GPU | VRAM | Model Size | Inference Memory | Max Concurrent |
|-----|------|------------|------------------|----------------|
| **H200** | 141GB | 6GB | ~4GB | ~14 requests |
| **RTX 4060** | 8GB | 6GB | ~2GB | 1 request ⚠️ |
| **A100** | 80GB | 6GB | ~4GB | ~8 requests |

**RTX 4060:**
```
6GB (model) + 2GB (inference) = 8GB
→ CHỈ XỬ LÝ 1 REQUEST / LẦN!
```

**H200 (Hugging Face Pro):**
```
6GB (model) + 4GB (inference) = 10GB per request
141GB / 10GB = ~14 concurrent requests max
```

### **3. Timeline Comparison**

#### **Without Queue (Current - BAD):**
```
Time  Request A (50 rows) Request B (30 rows) Request C (20 rows)
0:00  ▶ Start             🔒 Blocked          🔒 Blocked
5:00  ⏳ Processing...    🔒 Blocked          🔒 Blocked
10:00 ✅ Done             ▶ Start             🔒 Blocked
16:00 -                   ✅ Done             ▶ Start
21:00 -                   -                   ✅ Done

Total: 21 minutes (sequential)
User B waits: 10 minutes
User C waits: 16 minutes ❌ TERRIBLE UX!
```

#### **With Queue (3 concurrent - GOOD):**
```
Time  Request A  Request B  Request C  GPU VRAM
0:00  ▶ Start    ▶ Start    ▶ Start    30GB (3x10GB)
10:00 ✅ Done    -          -          20GB
16:00 -          ✅ Done    -          10GB
21:00 -          -          ✅ Done    0GB

Total: 21 minutes
User B waits: 0 minutes ✅
User C waits: 0 minutes ✅
Max wait: 10 minutes (if 4th request)
```

---

## ✅ Giải Pháp: Queue Manager

### **Implementation:**

File: `backend/services/qwen_queue_manager.py`

**Features:**
1. ✅ **Request Queue** - FIFO với priority support
2. ✅ **Concurrency Control** - Limit số requests đồng thời
3. ✅ **Timeout Handling** - Auto reject quá lâu
4. ✅ **Status Tracking** - Monitor queue status
5. ✅ **Graceful Overload** - Reject khi queue full

### **Configuration for Different GPUs:**

```python
# RTX 4060 8GB (development)
manager = QwenQueueManager(
    max_concurrent=1,      # Chỉ 1 request / lần
    max_queue_size=10      # Queue tối đa 10 requests
)

# H200 141GB (Hugging Face Pro)
manager = QwenQueueManager(
    max_concurrent=10,     # 10 requests đồng thời
    max_queue_size=50      # Queue tối đa 50 requests
)

# A100 80GB
manager = QwenQueueManager(
    max_concurrent=6,      # 6 requests đồng thời
    max_queue_size=30
)
```

### **Usage Example:**

```python
from services.qwen_queue_manager import get_queue_manager
from services.qwen_ocr_service import get_qwen_ocr_service

# Initialize
queue_manager = get_queue_manager(max_concurrent=10)
ocr_service = get_qwen_ocr_service()

# Add request to queue
request_id = "req_123"
image_path = "grade_sheet.jpg"

success = await queue_manager.add_request(
    request_id=request_id,
    image_path=image_path,
    priority=1,  # Higher priority
    timeout=600  # 10 minutes
)

if success:
    print(f"Request {request_id} added to queue")
    print(f"Position in queue: {queue_manager.queue.qsize()}")
else:
    print(f"Queue full or error, please try again later")

# Get stats
stats = queue_manager.get_stats()
print(f"Queue: {stats['in_queue']}, Processing: {stats['processing']}")
```

---

## 📊 Performance Comparison

### **Test: 10 Concurrent Requests (50 dòng mỗi request)**

#### **Scenario 1: No Queue (Sequential) - RTX 4060**
```
Total time: 10 × 10 min = 100 minutes ❌
Average wait: 50 minutes
Max wait: 90 minutes
User experience: TERRIBLE
```

#### **Scenario 2: With Queue - RTX 4060 (max_concurrent=1)**
```
Total time: 10 × 10 min = 100 minutes (same)
Average wait: 50 minutes (same)
Max wait: 90 minutes
BUT: Clear feedback về queue position ✅
User experience: BETTER (knows status)
```

#### **Scenario 3: With Queue - H200 (max_concurrent=10)**
```
Total time: ~11 minutes ⚡
Average wait: 0.5 minutes ⚡
Max wait: 1 minute
User experience: EXCELLENT! ✅
```

---

## 🎯 Recommended Configuration

### **Development (RTX 4060 8GB):**

```python
# backend/config/ocr_config.py
QWEN_MAX_CONCURRENT = 1     # Chỉ 1 request
QWEN_MAX_QUEUE_SIZE = 10    # Queue nhỏ
```

**Rationale:**
- 8GB VRAM không đủ cho concurrent
- Queue cho visibility và fair scheduling
- Reject early thay vì crash

### **Production (H200 141GB on Hugging Face):**

```python
# backend/config/ocr_config.py
QWEN_MAX_CONCURRENT = 10    # 10 requests đồng thời
QWEN_MAX_QUEUE_SIZE = 50    # Queue lớn
```

**Rationale:**
- 141GB VRAM đủ cho 10-14 requests
- Conservative: 10 để safe
- Queue 50 cho peak traffic

### **Hybrid Strategy:**

```python
# Auto-detect based on GPU
import torch

if torch.cuda.is_available():
    gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
    
    if gpu_memory > 100:  # H200 or similar
        max_concurrent = 10
        max_queue = 50
    elif gpu_memory > 40:  # A100 40GB
        max_concurrent = 3
        max_queue = 20
    elif gpu_memory > 20:  # A40 or similar
        max_concurrent = 2
        max_queue = 15
    else:  # RTX 4060 8GB
        max_concurrent = 1
        max_queue = 10
else:
    # CPU fallback
    max_concurrent = 1
    max_queue = 5
```

---

## 🚀 Integration với FastAPI

### **Update endpoint:**

```python
# backend/routers/grades.py
from services.qwen_queue_manager import get_queue_manager
import uuid

@router.post("/upload-grade-sheet")
async def upload_grade_sheet(
    file: UploadFile,
    subject_id: int,
    class_id: int,
    current_user = Depends(get_current_user)
):
    # Generate unique request ID
    request_id = str(uuid.uuid4())
    
    # Save file
    file_path = save_uploaded_file(file)
    
    # Get queue manager
    queue_manager = get_queue_manager(max_concurrent=10)
    
    # Add to queue
    success = await queue_manager.add_request(
        request_id=request_id,
        image_path=file_path,
        priority=0
    )
    
    if not success:
        raise HTTPException(
            status_code=503,
            detail="Server is busy. Please try again later."
        )
    
    # Get queue info
    stats = queue_manager.get_stats()
    
    return {
        "status": "queued",
        "request_id": request_id,
        "position_in_queue": stats['in_queue'],
        "estimated_wait_time": stats['in_queue'] * 10 * 60,  # seconds
        "message": "Your request is queued. Please check status endpoint."
    }
```

### **Status endpoint:**

```python
@router.get("/ocr-status/{request_id}")
async def get_ocr_status(request_id: str):
    """Check OCR request status"""
    queue_manager = get_queue_manager()
    stats = queue_manager.get_stats()
    
    # Check if processing
    if request_id in queue_manager.processing:
        return {
            "status": "processing",
            "message": "Your request is being processed"
        }
    
    # Check if in queue
    # ... implementation ...
    
    return {
        "status": "completed",
        "result": result
    }
```

---

## 📈 Monitoring & Alerts

### **Key Metrics:**

```python
stats = queue_manager.get_stats()

# Monitor these:
- stats['in_queue']           # Current queue size
- stats['processing']         # Current processing
- stats['queue_utilization']  # % of max queue
- stats['completed']          # Total completed
- stats['failed']             # Total failed
- stats['rejected']           # Rejected (queue full)
```

### **Alerts:**

```python
# Alert if queue > 80%
if stats['in_queue'] / max_queue_size > 0.8:
    logger.warning("⚠️ Queue is 80% full!")
    # Send notification to admin
    
# Alert if many rejections
if stats['rejected'] > 10:
    logger.error("❌ Many requests rejected! Consider scaling up.")
    
# Alert if processing too slow
average_time = stats['completed'] / (time.time() - start_time)
if average_time < 0.1:  # < 0.1 requests/second
    logger.warning("⚠️ Processing too slow!")
```

---

## 🎓 Best Practices

### **1. Set Realistic Timeout:**

```python
# 50 dòng ~ 10 phút
# + queue wait ~ 5 phút
# + buffer ~ 2 phút
# = 17 phút total
await queue_manager.add_request(
    request_id=request_id,
    image_path=image_path,
    timeout=1020  # 17 minutes
)
```

### **2. Priority System:**

```python
# Urgent request (paid user, admin, etc.)
await queue_manager.add_request(
    request_id=request_id,
    image_path=image_path,
    priority=10  # High priority
)

# Normal request
await queue_manager.add_request(
    request_id=request_id,
    image_path=image_path,
    priority=0  # Normal priority
)
```

### **3. Graceful Degradation:**

```python
# If Qwen queue full, fallback to Gemini
success = await qwen_queue.add_request(...)
if not success:
    logger.info("Qwen queue full, using Gemini fallback")
    result = gemini_service.parse_grade_sheet(image_path)
    return result
```

### **4. Auto-scaling (Advanced):**

```python
# Monitor queue và auto switch concurrent level
if stats['queue_utilization'] > 90%:
    # Increase concurrent (if GPU allows)
    queue_manager.max_concurrent += 1
elif stats['queue_utilization'] < 20%:
    # Decrease concurrent (save resources)
    queue_manager.max_concurrent = max(1, queue_manager.max_concurrent - 1)
```

---

## ✅ Summary

### **Without Queue Manager:**
- ❌ Sequential processing only
- ❌ No feedback về wait time
- ❌ Possible crashes on overload
- ❌ Poor user experience

### **With Queue Manager:**
- ✅ Concurrent processing (GPU dependent)
- ✅ Fair scheduling (FIFO + priority)
- ✅ Graceful overload handling
- ✅ Clear feedback về queue position
- ✅ Better resource utilization
- ✅ Excellent user experience

### **Recommendation:**

**For Hugging Face H200 deployment:**
```python
QWEN_MAX_CONCURRENT = 10     # 10 requests đồng thời
QWEN_MAX_QUEUE_SIZE = 50     # Queue tối đa 50
QWEN_TIMEOUT = 1200          # 20 minutes
```

**Result:**
- ✅ 10 teachers có thể OCR cùng lúc
- ✅ 50 requests trong queue
- ✅ Max wait: ~5-10 phút (nếu queue full)
- ✅ Excellent scalability!

---

**Happy concurrent processing! 🚀**

