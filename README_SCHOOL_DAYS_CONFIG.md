# Hướng dẫn sử dụng chức năng Cấu hình số ngày học

## Tổng quan
Chức năng này cho phép bạn tùy chỉnh số ngày học trong tuần cho từng khối (10, 11, 12) với khả năng:
- Thiết lập số ngày học mặc định cho mỗi khối
- Thiết lập số ngày học tạm thời cho những tuần đặc biệt
- Tự động reset về cấu hình mặc định vào 00:00 chủ nhật hàng tuần

## Cài đặt và Thiết lập

### 1. Tạo Database Table
Chạy script SQL trong Supabase SQL Editor:
```bash
# Mở Supabase Dashboard → SQL Editor
# Copy nội dung từ backend/database/school_days_config_table.sql
# Paste và Execute
```

### 2. Cài đặt Dependencies
```bash
cd backend
pip install schedule==1.2.0
```

### 3. Khởi động Backend
```bash
cd backend
python main.py
```
Scheduler sẽ tự động khởi động và đăng ký job reset vào chủ nhật.

### 4. Khởi động Frontend
```bash
cd frontend
npm start
```

## Cách sử dụng

### Truy cập giao diện
1. Mở ứng dụng Smart School
2. Click vào **"⚙️ Cấu hình học tập"** trong menu

### Cấu hình số ngày học

#### Số ngày học mặc định
- Áp dụng cho tất cả các tuần thông thường
- Giá trị: 1-7 ngày
- Sẽ được tự động reset vào 00:00 chủ nhật hàng tuần

#### Số ngày học tạm thời
- Dùng cho những tuần đặc biệt (nghỉ lễ, thi cử...)
- Tùy chọn (có thể để trống)
- Chỉ áp dụng khi click "Áp dụng tạm thời"

### Các thao tác chính

#### 1. Thiết lập cấu hình
```
1. Nhập số ngày học mặc định cho từng khối (1-7)
2. Nhập số ngày học tạm thời nếu cần (tùy chọn)
3. Click "💾 Lưu tất cả cấu hình"
```

#### 2. Áp dụng cấu hình tạm thời
```
1. Đảm bảo đã nhập số ngày học tạm thời
2. Click "Áp dụng tạm thời (X ngày)" cho khối cần thiết
3. Số ngày học sẽ thay đổi ngay lập tức cho tuần hiện tại
```

#### 3. Reset về mặc định
```
1. Click "🔄 Reset về mặc định"
2. Tất cả khối sẽ trở về số ngày học mặc định
```

## API Endpoints

### Lấy cấu hình
```http
GET /api/school-days-config/
GET /api/school-days-config/?grade=10
```

### Tạo/Cập nhật cấu hình
```http
POST /api/school-days-config/
PUT /api/school-days-config/{id}
POST /api/school-days-config/batch-update?grades=10&grades=11&grades=12
```

### Áp dụng cấu hình tạm thời
```http
POST /api/school-days-config/apply-temporary/{grade}
```

### Reset về mặc định
```http
POST /api/school-days-config/reset-to-default
```

### Xem thời gian reset tiếp theo
```http
GET /api/school-days-config/next-sunday-reset
```

## Ví dụ sử dụng

### Trường hợp 1: Cấu hình thông thường
```
Khối 10: 5 ngày/tuần (Thứ 2-6)
Khối 11: 5 ngày/tuần (Thứ 2-6)  
Khối 12: 6 ngày/tuần (Thứ 2-7)
```

### Trường hợp 2: Tuần thi cuối kỳ
```
Khối 12: Mặc định 6 ngày, Tạm thời 3 ngày (chỉ thi)
→ Click "Áp dụng tạm thời (3 ngày)" cho khối 12
→ Chủ nhật tự động reset về 6 ngày
```

### Trường hợp 3: Tuần nghỉ lễ
```
Tất cả khối: Mặc định 5 ngày, Tạm thời 3 ngày
→ Áp dụng tạm thời cho tất cả khối
→ Chủ nhật tự động reset về 5 ngày
```

## Scheduler (Tự động reset)

### Cách hoạt động
- Chạy mỗi phút để kiểm tra lịch trình
- Thực thi reset vào **00:00 chủ nhật hàng tuần**
- Reset `current_week_days` về `default_days_per_week`

### Log và Monitoring
Kiểm tra log trong console:
```
🔄 Bắt đầu reset cấu hình số ngày học - 2024-12-22T00:00:00
✅ Reset khối 10: 3 → 5 ngày
✅ Reset khối 11: 4 → 5 ngày
✅ Reset khối 12: 5 → 6 ngày
🎉 Hoàn thành reset 3 khối về cấu hình mặc định
```

### Test Scheduler
```javascript
// Test reset ngay lập tức (dev only)
const response = await fetch('/api/school-days-config/reset-to-default', {
  method: 'POST'
});
```

## Troubleshooting

### Lỗi thường gặp

#### "Khối X chưa có cấu hình tạm thời"
```
Giải pháp: Nhập số ngày học tạm thời trước khi áp dụng
```

#### "Vui lòng nhập số ngày hợp lệ (1-7)"
```
Giải pháp: Kiểm tra các trường nhập liệu, chỉ nhập số từ 1-7
```

#### "Scheduler không hoạt động"
```
Giải pháp: 
1. Kiểm tra log console backend
2. Restart backend service
3. Kiểm tra thư viện schedule đã cài đặt
```

### Debug API
```bash
# Kiểm tra trạng thái scheduler
curl http://localhost:8000/api/school-days-config/next-sunday-reset

# Kiểm tra cấu hình hiện tại
curl http://localhost:8000/api/school-days-config/
```

## Database Schema

### Bảng school_days_config
```sql
Column                 | Type    | Description
-----------------------|---------|------------------
id                     | BIGINT  | Primary key
grade                  | VARCHAR | Khối học (10,11,12)
default_days_per_week  | INTEGER | Số ngày mặc định (1-7)
temporary_days_per_week| INTEGER | Số ngày tạm thời (1-7, nullable)
current_week_days      | INTEGER | Số ngày hiện tại (1-7)
created_at             | TIMESTAMP| Thời gian tạo
updated_at             | TIMESTAMP| Thời gian cập nhật
```

### Ràng buộc và Index
- UNIQUE constraint trên `grade`
- CHECK constraint: 1 ≤ days ≤ 7
- Index trên `grade` để tăng tốc truy vấn
- Auto-update trigger cho `updated_at`

## Tích hợp với Weekly Attendance Summary

Để sử dụng cấu hình này trong `weekly_attendance_summary`, cập nhật view:

```sql
-- Ví dụ view sử dụng current_week_days
CREATE OR REPLACE VIEW weekly_attendance_summary AS
SELECT 
    w.week_start_date,
    s.grade,
    sdc.current_week_days as total_school_days_per_week,
    COUNT(DISTINCT s.id) as total_students,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as total_present,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as total_absent,
    COUNT(CASE WHEN a.status = 'late' THEN 1 END) as total_late,
    ROUND(
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(DISTINCT s.id) * sdc.current_week_days, 0), 2
    ) as attendance_rate
FROM students s
LEFT JOIN school_days_config sdc ON s.grade = sdc.grade
LEFT JOIN attendance a ON s.id = a.student_id 
    AND a.date >= week_start_monday 
    AND a.date <= week_start_monday + INTERVAL '6 days'
GROUP BY w.week_start_date, s.grade, sdc.current_week_days
ORDER BY w.week_start_date DESC, s.grade;
```

## Tính năng nâng cao

### 1. Backup cấu hình
```sql
-- Tạo bảng backup
CREATE TABLE school_days_config_backup AS 
SELECT *, NOW() as backup_time FROM school_days_config;
```

### 2. Lịch sử thay đổi
```sql
-- Thêm audit log
CREATE TABLE school_days_config_history (
    id BIGSERIAL PRIMARY KEY,
    config_id BIGINT REFERENCES school_days_config(id),
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(255),
    changed_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Notification
```javascript
// Thêm notification khi reset tự động
const sendResetNotification = async () => {
  // Send email/SMS to admins
  // Log to external monitoring system
};
```

---

## Liên hệ hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra log backend console
2. Kiểm tra network requests trong browser DevTools
3. Tạo issue với đầy đủ thông tin lỗi và steps to reproduce 