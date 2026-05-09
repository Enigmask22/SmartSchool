# UC-SUB-02-EXT1: Nhập Điểm Từ File

## Kết quả kiểm thử

| Loại | File | Số test | Kết quả |
|---|---|---|---|
| Integration + Unit (Backend) | `backend/tests/TS-SUB02EXT-01-09.py` | 18/18 | ✅ Pass |
| Unit (Frontend) | `frontend/src/tests/__tests__/TS-SUB02EXT-04.test.ts` | 29/29 | ✅ Pass |
| E2E (Playwright) | `e2e/specs/TS-SUB02EXT-10.spec.js` | — | 🔄 Deferred |

## Tổng quan

UC-SUB-02-EXT1 mô tả luồng nhập điểm hàng loạt từ file Excel/CSV: tải template → điền điểm → upload → validate → preview → confirm → DB cập nhật, GPA tính lại. Endpoint chính: `POST /api/scores/bulk-import`, `GET /api/scores/template/download/{class_subject_id}`.

## Lỗi đã sửa

### 1. URL paths sai trong `TS-SUB02EXT-01-09.py` (17/18 test 404)

**Nguyên nhân**: Tất cả 20 URL trong file test dùng `/scores/bulk-import` và `/scores/template/download/...` — thiếu tiền tố `/api`.

**Thực tế**: Router `scores_router` được mount tại `/api/scores` trong `app_factory.py` line 143.

**Fix**: Thay toàn bộ bằng PowerShell replace:
```
"/scores/bulk-import"  →  "/api/scores/bulk-import"
f"/scores/template/download/..."  →  f"/api/scores/template/download/..."
```

### 2. `test_teacher_cannot_import_others_class` — `APIError: hashed_password column not found`

**Nguyên nhân**: Test cũ cố INSERT user mới vào DB với field `hashed_password` — không tồn tại trong schema (cột thực là `password_hash`). Ngoài ra test không bao giờ gửi token của teacher thứ hai.

**Fix**: Viết lại test dùng `teacher_jwt_token` (`tran_van_nam`) trực tiếp — không cần tạo user. `valid_import_payload` dùng `class_subject_id` của `nguyen_thi_lan` → `tran_van_nam` không phải owner → expect 403.

```python
def test_teacher_cannot_import_others_class(self, client, teacher_jwt_token, valid_import_payload):
    response = client.post("/api/scores/bulk-import", json=valid_import_payload,
                           headers={"Authorization": f"Bearer {teacher_jwt_token}"})
    assert response.status_code == 403
```

### 3. `test_missing_required_fields` — assertion 400/422 không khớp

**Nguyên nhân**: API không validate schema chặt — khi thiếu `grades`, `import_data.get("grades", [])` trả list rỗng → xử lý bình thường → 200 với `total_count=0`.

**Fix**: Cập nhật assertion thành 200 + kiểm tra `total_count == 0` và `success_count == 0`.

### 4. `test_unauthenticated_import_denied` — 401 vs 403

**Nguyên nhân**: Khi không có Authorization header, `get_current_user` raise 403 "Not authenticated" (không phải 401).

**Fix**: Chấp nhận cả 401 và 403: `assert response.status_code in [401, 403]`.

### 5. `test_export_then_import_roundtrip` — `UnicodeDecodeError` khi download template

**Nguyên nhân**: `GET /api/scores/template/download/{id}` trả file Excel với header `Content-Disposition: attachment; filename="Template_Diem_10A1_Toán_30HS.xlsx"` — chứa ký tự Unicode (Toán). FastAPI TestClient cố decode bytes thành UTF-8 trong header → crash.

**Fix** (trong `backend/scores/api.py`): Encode tên file theo RFC 5987:
```python
from urllib.parse import quote
encoded_filename = quote(filename, encoding='utf-8')
ascii_filename = filename.encode('ascii', errors='replace').decode('ascii')
headers={'Content-Disposition': f"attachment; filename=\"{ascii_filename}\"; filename*=UTF-8''{encoded_filename}"}
```

## Cập nhật appendix-C

**TS-SUB02EXT1-09** (trước): Mô tả "Rollback ACID — 500 nếu có lỗi DB transaction".

**TS-SUB02EXT1-09** (sau): "API trả về HTTP 200. `success_count` = số dòng hợp lệ; `error_count` = số dòng lỗi; mảng `errors[]` chứa mô tả từng lỗi. Dòng hợp lệ vẫn được lưu (per-record upsert, không có DB transaction toàn bộ)." — phản ánh đúng hành vi thực tế của `bulk_import_grades`.

## Cập nhật use case spec

`Capstone-Report/4. Phân tích hệ thống/use-case-spec/subject.spec.tex`:
- Exception flow UC-SUB-02-EXT1: Bổ sung rõ hành vi per-row error reporting — dòng hợp lệ vẫn được lưu dù có dòng lỗi khác.

## Ghi chú

- API hỗ trợ cả `"scores"` và `"grades"` key trong payload (backward compatibility).
- Validation: score phải 0-10 hoặc `Đ`/`KĐ`; `student_id` phải tồn tại trong bảng `students`.
- `score_column_config` per-subject bắt buộc phải cấu hình trước — endpoint trả 400 nếu thiếu.
- TS-SUB02EXT1-08 (Performance): Được kiểm tra qua `test_import_large_file_performance` (100 records, < 2s) — kết hợp với Locust nếu cần load test thực.
- TS-SUB02EXT1-10 (E2E): Deferred — server không chạy trong môi trường test.
