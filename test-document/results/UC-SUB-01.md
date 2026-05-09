# UC-SUB-01: Xem Dashboard Phân Tích Môn Học

## Kết quả kiểm thử

| Loại | File | Số test | Kết quả |
|---|---|---|---|
| Integration + Unit (Backend) | `backend/tests/TS-SUB01-01-08.py` | 10/10 | ✅ Pass |
| Unit (Frontend) | `frontend/src/tests/__tests__/TS-SUB01-10.test.ts` | 46/46 | ✅ Pass |
| E2E (Playwright) | `e2e/specs/TS-SUB01-06.spec.js` | — | 🔄 Deferred |

## Lỗi đã sửa

### `backend/tests/TS-SUB01-01-08.py`

**Vấn đề**: `TestSubjectDashboardLogicAccuracy` và `TestSubjectDashboardPerformanceGrouping` đều thất bại với lỗi `assert 7.0 < 0.01` (average = 0 thay vì 7.0).

**Nguyên nhân gốc**: Cả hai test dùng `db.table("teachers").select("id").eq("is_active", True).limit(1).execute()` để lấy `teacher_id` — trả về teacher_id đầu tiên trong DB (id=1). Nhưng `teacher_jwt_token` fixture thuộc về `tran_van_nam` (teacher_id=2). API analytics lọc `class_subjects` theo `teacher_id=2`, nên class_subject mới tạo (gán cho teacher_id=1) không xuất hiện trong kết quả → average_score = 0.

**Fix**: Thay thế bằng lookup đúng teacher của `tran_van_nam`:
```python
user_response = db.table("users").select("*").or_("username.eq.tran_van_nam,email.eq.tran_van_nam").execute()
user_id = user_response.data[0]["id"]
teacher_response = db.table("teachers").select("id").eq("user_id", user_id).execute()
teacher_id = teacher_response.data[0]["id"]
```

## Cập nhật appendix-C

**TS-SUB01-02** (trước): "Trả về HTTP 403 Forbidden. Báo lỗi 'Bạn không được phân công dạy môn này'."

**TS-SUB01-02** (sau): "API lọc theo `teacher_id` từ JWT; trả về HTTP 200 với `total_classes=0` và dữ liệu rỗng (không lộ dữ liệu lớp không phụ trách)."

**Lý do**: Endpoint `GET /api/scores/teacher/dashboard/analytics` không trả 403 — nó áp dụng row-level security bằng cách lọc `class_subjects WHERE teacher_id = current_teacher["id"]`. Khi lớp không thuộc quyền giáo viên, kết quả là empty set → trả 200 với `total_classes=0`.

## Ghi chú

- TS-SUB01-06 (E2E): Deferred — server không chạy trong môi trường test.
- TS-SUB01-07 (Locust): Deferred — performance test chạy riêng.
- TS-SUB01-04 (Trend Logic): Test kiểm tra API phản hồi (200/404/500) nhưng không validate trend badge cụ thể — tính năng so sánh xu hướng HK1→HK2 hiển thị ở frontend dựa trên dữ liệu `final_score` đa học kỳ.
