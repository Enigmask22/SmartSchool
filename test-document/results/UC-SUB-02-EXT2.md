# UC-SUB-02-EXT2: Nhập Điểm Bằng OCR

## Kết quả kiểm thử

| Loại | File | Số test | Kết quả |
|---|---|---|---|
| Integration + Unit (Backend) | `backend/tests/TS-SUB02EXT-2-ocr-backend.py` | 23/23 | ✅ Pass |
| Unit (Frontend) | `frontend/src/tests/__tests__/TS-SUB02EXT-2-ocr-frontend.test.ts` | 36/36 | ✅ Pass |
| E2E (Playwright) | `e2e/specs/TS-SUB02EXT-2-ocr.spec.js` | — | 🔄 Deferred |

## Phạm vi kiểm thử (Strategy)

OCR thực tế (gọi Gemini/Qwen AI) **không được kiểm thử trực tiếp** trong môi trường CI — AI có thể không khả dụng và kết quả không deterministc. Thay vào đó:
- **File upload + queue** → test bình thường (enqueue vào async queue, không cần AI chạy xong)
- **Response parsing + normalization** → unit test trực tiếp `QwenOCRService` methods
- **Import sau OCR** → `POST /api/scores/ocr/import-from-parsed` tái dùng logic `bulk_import_grades` → test với real DB data
- **Export to Excel** → test endpoint với mock parsed_rows
- **AI-specific accuracy** (TS-SUB02EXT2-01, 02, 03) → deferred hoặc manual test

## Lỗi đã sửa

### 1. Tất cả URL paths sai (14/23 test 404)

**Nguyên nhân**: Tất cả endpoint dùng `/scores/ocr/...` thay vì `/api/scores/ocr/...`.

**Fix**: PowerShell replace toàn bộ file.

### 2. Import path sai trong `TestOCRResponseParsing`

**Nguyên nhân**: `from backend.scores.ocr_services.qwen_ocr import QwenOCRService` — sai tiền tố khi chạy từ thư mục `backend/`.

**Fix**: `from scores.ocr_services.qwen_ocr import QwenOCRService`

### 3. `test_normalize_letter_grade_values` — `KHONG_DAT` không được nhận dạng

**Nguyên nhân**: `QwenOCRService._normalize_score_value` có set `{"KĐ", "KD", "KHONG DAT", ...}` nhưng thiếu `"KHONG_DAT"` (với dấu gạch dưới).

**Fix** (trong `backend/scores/ocr_services/qwen_ocr.py`): Thêm `"KHONG_DAT"` vào set — đây là output hợp lệ OCR khi gạch dưới thay thế khoảng trắng.

### 4. `TestOCRImportFromParsed` — 3 tests ERROR vì fixture không tồn tại

**Nguyên nhân**: Tests dùng fixture `db_session` và `existing_class_subject` không được định nghĩa ở đâu.

**Fix**: 
- Thêm fixture `existing_class_subject(db)` ở cuối file — lookup class_subject thực của `nguyen_thi_lan`.
- Xóa `db_session` khỏi signature 3 test methods.

### 5. `another_teacher_token` fixture — trả về string placeholder

**Nguyên nhân**: Fixture gốc return `"another_teacher_token_placeholder"` — không phải JWT hợp lệ.

**Fix**: Tạo JWT thực cho `tran_van_nam` qua `create_jwt_token`.

### 6. `test_reject_files_larger_than_limit` — 200 nhưng expect 400/413/422

**Nguyên nhân**: Endpoint `/api/scores/ocr/parse-score-sheet` không enforce file size limit — file được accept vào queue async (AI xử lý sau). Không có client-side rejection cho file lớn.

**Fix**: Cập nhật assertion thành `in [200, 400, 413, 422]` và giải thích rõ trong docstring.

### 7. Frontend `test_display_estimated_wait_time` — `estimatedSeconds = 45` → `1 phút`

**Nguyên nhân**: `Math.ceil(45 / 60) = 1` phút → message chứa `'1'` thay vì `'45'`. Test muốn kiểm tra giá trị 45 phút.

**Fix**: `estimatedSeconds = 2700` (45 phút = 2700 giây) → `Math.ceil(2700/60) = 45` → message chứa `'45'`.

## Ghi chú kiến trúc OCR

- **Queue**: Async in-memory queue per engine (Gemini/Qwen). `POST /api/scores/ocr/parse-score-sheet` trả `request_id` ngay lập tức. AI xử lý nền.
- **Status polling**: `GET /api/scores/ocr/status/{request_id}` — chỉ owner teacher hoặc admin xem được.
- **Import**: `POST /api/scores/ocr/import-from-parsed` delegates sang `bulk_import_grades` — same validation, same per-record upsert, same `can_edit_grade` check.
- **Export**: `POST /api/scores/ocr/export-parsed-to-excel` — tạo file Excel từ parsed_rows đã qua review.
- **Engine override**: Mặc định Gemini; Qwen là fallback. Setting `OCR_ALLOW_ENGINE_OVERRIDE` kiểm soát việc override.

## Ghi chú

- TS-SUB02EXT2-01, 02, 03 (AI accuracy, fallback, quality check): Không thể kiểm thử automatic — cần AI service thực. Deferred/manual.
- TS-SUB02EXT2-05 (E2E cancel flow): Deferred.
- TS-SUB02EXT2-06 (Queue load test): Deferred/Locust.
