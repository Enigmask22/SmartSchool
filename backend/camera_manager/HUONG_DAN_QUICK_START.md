# 📱 Hướng Dẫn Nhanh: Setup 2 Điện Thoại Làm Camera

## 🎯 Mục tiêu

Setup 2 điện thoại để backend có thể sử dụng và quản lý cùng lúc cho điểm danh đa luồng.

---

## ⚡ Bước 1: Cài App trên Điện Thoại (Cả 2 máy)

### Android (Khuyến nghị)

1. Mở **Google Play Store**
2. Tìm kiếm: **"IP Webcam"** (tác giả: Pavel Khlebovich)
3. Cài đặt app
4. Lặp lại cho điện thoại thứ 2

### iOS (Thay thế)

- Tải **"AtHome Camera"** hoặc **"Presence"** từ App Store

---

## ⚡ Bước 2: Kết Nối Cùng WiFi

- ✅ Cả 2 điện thoại và máy tính chạy backend phải **cùng mạng WiFi**
- ❌ Không dùng mạng di động (4G/5G)

---

## ⚡ Bước 3: Khởi Động Server trên Điện Thoại

### Điện Thoại 1:

1. Mở app **IP Webcam**
2. Scroll xuống, chọn **"Start server"**
3. Ghi lại địa chỉ IP hiển thị (ví dụ: `http://192.168.1.100:8080`)
   - **Lưu ý:** Chỉ lấy phần IP và port, ví dụ: `192.168.1.100:8080`

### Điện Thoại 2:

1. Làm tương tự
2. Ghi lại IP khác (ví dụ: `192.168.1.101:8080`)

---

## ⚡ Bước 4: Kiểm Tra Kết Nối

Trên máy tính, mở trình duyệt và truy cập:

- Điện thoại 1: `http://192.168.1.100:8080`
- Điện thoại 2: `http://192.168.1.101:8080`

Nếu thấy video stream → ✅ **Thành công!**

---

## ⚡ Bước 5: Thêm Camera vào Backend

### Cách 1: Dùng API (Khuyến nghị)

**Tạo Camera 1:**

```bash
curl -X POST "http://localhost:8000/api/cameras/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Camera Điện Thoại 1",
    "source": "http://192.168.1.100:8080/video",
    "location": "Cổng vào chính",
    "enabled": true,
    "fps": 15
  }'
```

**Tạo Camera 2:**

```bash
curl -X POST "http://localhost:8000/api/cameras/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Camera Điện Thoại 2",
    "source": "http://192.168.1.101:8080/video",
    "location": "Cổng phụ",
    "enabled": true,
    "fps": 15
  }'
```

### Cách 2: Dùng Python Script

Tạo file `setup_cameras.py`:

```python
import requests

BASE_URL = "http://localhost:8000"

# Camera 1
camera1 = {
    "name": "Camera Điện Thoại 1",
    "source": "http://192.168.1.100:8080/video",  # Thay IP thật
    "location": "Cổng vào chính",
    "enabled": True,
    "fps": 15
}

# Camera 2
camera2 = {
    "name": "Camera Điện Thoại 2",
    "source": "http://192.168.1.101:8080/video",  # Thay IP thật
    "location": "Cổng phụ",
    "enabled": True,
    "fps": 15
}

# Tạo cameras
response1 = requests.post(f"{BASE_URL}/api/cameras/", json=camera1)
print("Camera 1:", response1.json())

response2 = requests.post(f"{BASE_URL}/api/cameras/", json=camera2)
print("Camera 2:", response2.json())

# Kiểm tra
response = requests.get(f"{BASE_URL}/api/cameras/")
print("\nDanh sách cameras:")
print(response.json())
```

Chạy: `python setup_cameras.py`

### Cách 3: Dùng Swagger UI

1. Mở browser: `http://localhost:8000/docs`
2. Tìm endpoint `POST /api/cameras/`
3. Click "Try it out"
4. Điền thông tin camera
5. Click "Execute"

---

## ⚡ Bước 6: Kiểm Tra Camera Đang Chạy

```bash
# Xem danh sách cameras
curl http://localhost:8000/api/cameras/

# Xem thông tin camera cụ thể
curl http://localhost:8000/api/cameras/{camera_id}
```

---

## ⚡ Bước 7: Sử Dụng với Face Recognition

### Option 1: Lấy Frame và Gửi qua WebSocket

Frontend có thể:

1. Lấy frame từ `/api/cameras/{camera_id}/frame`
2. Gửi qua WebSocket `/api/ai/recognition/stream`

### Option 2: Tự Động Recognition (Backend)

Xem file `integration_example.py` để setup auto recognition.

---

## 🔧 Troubleshooting

### ❌ Camera không kết nối

- ✅ Kiểm tra app IP Webcam đang chạy
- ✅ Đảm bảo cùng WiFi
- ✅ Thử ping IP: `ping 192.168.1.100`
- ✅ Tắt firewall tạm thời

### ❌ Frame rate thấp

- ✅ Giảm FPS xuống 10-15
- ✅ Giảm resolution trong app IP Webcam
- ✅ Kiểm tra băng thông WiFi

### ❌ Camera tự tắt

- ✅ Tắt chế độ tiết kiệm pin trên điện thoại
- ✅ Cắm sạc
- ✅ Không tắt màn hình điện thoại

### ❌ Lỗi "Cannot open camera"

- ✅ Restart app IP Webcam
- ✅ Thử URL khác: `/mjpegfeed?640x480`

---

## 📝 Lưu Ý Quan Trọng

1. **IP có thể thay đổi:** Mỗi lần kết nối WiFi, IP có thể khác → Cần kiểm tra lại
2. **Giữ app chạy:** Đừng tắt app IP Webcam, để nó chạy foreground
3. **Pin điện thoại:** Cắm sạc để tránh hết pin
4. **Băng thông:** 2 camera cùng lúc cần WiFi ổn định

---

## 🎉 Hoàn Thành!

Bây giờ backend có thể:

- ✅ Quản lý 2 camera cùng lúc
- ✅ Capture frames từ cả 2 camera
- ✅ Gửi frames tới AI service để nhận dạng
- ✅ Điểm danh đa luồng cho học sinh

---

## 📚 Xem Thêm

- Chi tiết: `README.md`
- Ví dụ tích hợp: `integration_example.py`
- API Docs: `http://localhost:8000/docs`
