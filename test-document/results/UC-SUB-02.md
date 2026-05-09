# UC-SUB-02: Quản Lý Điểm Số Môn Học

## Kết quả kiểm thử

| Loại | File | Số test | Kết quả |
|---|---|---|---|
| Integration + Unit (Backend) | `backend/tests/TS-SUB02-01-08.py` | 16/17 (1 skip) | ✅ Pass |
| Unit (Frontend) | `frontend/src/tests/__tests__/TS-SUB02-04.test.ts` | 25/25 | ✅ Pass |
| E2E (Playwright) | `e2e/specs/TS-SUB02-10.spec.js` | — | 🔄 Deferred |

> **1 skip**: `test_grade_lock_blocks_write_for_teacher_without_override` — tự động skip khi `grade_lock_deadline` chưa được cấu hình hoặc chưa qua hạn trong môi trường test. Đây là hành vi đúng.

## Tổng quan

UC-SUB-02 bao gồm các luồng: tải bảng điểm, nhập/sửa điểm thủ công, tính GPA tự động, kiểm tra deadline chỉnh sửa điểm. Endpoint chính: `POST /api/scores/score`, `PUT /api/scores/{id}`, `GET /api/scores/class/{class_subject_id}`.

## Tính năng mới bổ sung: Grade Lock Rule

Trong quá trình audit, phát hiện spec không đề cập đầy đủ cơ chế khoá điểm. Đã bổ sung vào spec và thêm 2 test case mới.

**Logic** (`core/edit_permissions.py`):
- `is_grade_edit_locked_for_user(user)`: Admin → luôn False; `user.can_edit_grade=True` → False; else kiểm tra `grade_lock_deadline` trong system settings, trả True nếu hôm nay > deadline.
- `assert_can_edit_grade(user)`: raise HTTP 403 với message `"Đã quá hạn chỉnh sửa điểm theo cấu hình hệ thống hoặc bạn không có quyền."` nếu bị khoá.
- Gọi tại tất cả endpoint ghi điểm: `POST /api/scores/`, `PUT /api/scores/{id}`, `POST /api/scores/score`, `POST /api/scores/bulk-import`.

**Override**: `nguyen_thi_lan` có `can_edit_grade=True` trong DB → không bao giờ bị khoá dù deadline đã qua.

## Tests mới thêm vào `TestScoreManagementDataIntegrity`

```python
def test_can_edit_grade_flag_bypasses_deadline_lock(self, db):
    """nguyen_thi_lan có can_edit_grade=True → is_grade_edit_locked_for_user trả False"""

def test_grade_lock_blocks_write_for_teacher_without_override(self, client, teacher_jwt_token, ...):
    """tran_van_nam không có can_edit_grade → bị 403 nếu deadline đã qua
    Skip nếu deadline chưa được cấu hình hoặc chưa qua."""
```

## Cập nhật appendix-C

**TS-SUB02-06** (trước): `"[Hủy thao tác] cột điểm bị khóa → 403"` — mô tả mơ hồ.

**TS-SUB02-06** (sau): `"[Data Integrity] Sửa điểm khi đã quá hạn chỉnh sửa. Deadline chỉnh sửa điểm (grade_lock_deadline) đã qua. GV không có quyền đặc biệt (can_edit_grade = false) cố gửi request → 403. GV có can_edit_grade = true (do QTV cấp) vẫn cập nhật được bình thường."` — mô tả chính xác cơ chế thực tế.

## Cập nhật use case spec

`Capstone-Report/4. Phân tích hệ thống/use-case-spec/subject.spec.tex`:
- Luồng thay thế UC-SUB-02: Bổ sung mô tả `grade_lock_deadline` + `can_edit_grade` bypass thay thế mô tả cũ "cột điểm bị khóa".

## Ghi chú

- TS-SUB02-09 (Locust): Deferred — performance test chạy riêng.
- TS-SUB02-10 (E2E): Deferred — server không chạy trong môi trường test.
- GPA tính theo công thức `(TX*hệ_số + GK*hệ_số + CK*hệ_số) / tổng_hệ_số`, cấu hình per-subject qua `score_column_config` JSON.
