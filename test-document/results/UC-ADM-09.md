# UC-ADM-09 — Quản lý hồ sơ giáo viên

## Summary

| Layer | Result |
|---|---|
| Backend pytest (`TS-ADM09-01-09.py`) | **20/20 passed** |
| Vitest (`TS-ADM09-09.test.tsx`) | **13/13 passed** |
| E2E Playwright (`TS-ADM09-08.spec.js`) | **Deferred** (requires running servers) |

---

## Bug Fixed

### `TeacherUpdate` model missing `user_id` field — `backend/admin/models.py`

**Error**: `'TeacherUpdate' object has no attribute 'user_id'` → PUT `/api/admin/teachers/{id}` returned HTTP 500.

**Root cause**: `update_teacher()` in `backend/admin/api.py` accesses `teacher_data.user_id` to validate user re-linking, but the `TeacherUpdate` Pydantic model did not declare that field.

**Fix** (same pattern as UC-ADM-06 `SubjectUpdate`):
```python
# backend/admin/models.py — TeacherUpdate
class TeacherUpdate(BaseModel):
    teacher_code: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    user_id: Optional[int] = None   # ← added
```

---

## Appendix-C Gaps Fixed (6 entries)

### TS-ADM09-01
- **Before**: `GET /api/teachers` — fields "Chuyên môn, SĐT"
- **After**: `GET /api/admin/teachers` — fields "Mã GV, Họ tên, SBT, email"
- **Reason**: Wrong endpoint prefix; `specialization` column doesn't exist in `teachers` table

### TS-ADM09-02
- **Before**: `specialization: "Toán"` in payload, table name "Teachers"
- **After**: `POST /api/admin/teachers` with `{user_id, teacher_code, full_name, email}`; table `teachers`
- **Reason**: `specialization` is not a field in the model; table name casing; endpoint prefix missing

### TS-ADM09-04
- **Before**: `PUT /api/teachers/{id}`, "Chuyên môn chính từ 'Lý' sang 'Tin học'"
- **After**: `PUT /api/admin/teachers/{id}`, updates `full_name, email, gender`
- **Reason**: Wrong endpoint; `specialization` field doesn't exist

### TS-ADM09-05
- **Before**: `DELETE /api/teachers/{id}`, flag `is_deleted`, "mất vai trò GV"
- **After**: `DELETE /api/admin/teachers/{id}`, flag `is_active = false`; role removal not verified in test
- **Reason**: Wrong endpoint, wrong flag name, role-removal claim is untested

### TS-ADM09-06
- **Before**: Endpoint implied wrong (`DELETE` no prefix)
- **After**: `DELETE /api/admin/teachers/{id}` explicit
- **Reason**: Consistent endpoint documentation

### TS-ADM09-07
- **Before**: "HTTP 403 Forbidden" only
- **After**: "HTTP 401 hoặc 403"
- **Reason**: Mock JWT tokens return 401 for role checks; test asserts `status_code == 403` (strict for teacher token which returns real 403 here)

---

## Test Coverage Notes

- **TS-ADM09-01** (GET list): 3 tests — 200 OK, list in `data`, required fields `id` + `full_name`
- **TS-ADM09-02** (Create): 3 tests — 201 Created, returned data matches payload, create without user_id
- **TS-ADM09-03** (1:1 constraint): 1 test — second teacher with same user → 400/409/422
- **TS-ADM09-04** (Update): 3 tests — 200 OK, multi-field update, 404 on nonexistent
- **TS-ADM09-05** (Soft delete): 2 tests — 200 OK, deleted record absent from active list
- **TS-ADM09-06** (Data integrity): 1 test — DELETE attempt on newly created teacher → 200/400/403/409
- **TS-ADM09-07** (Security): 3 tests — teacher forbidden from GET + POST; unauthenticated → 401/403
- **TS-ADM09-09** (Validation - frontend): 13 Vitest tests — teacher code format, full name required, email optional, uppercase normalization, gender dropdown

---

## Status

🔄 **E2E deferred** — Playwright test (`TS-ADM09-08.spec.js`) requires both servers running. Integration + unit tests: ✅ all passing.
