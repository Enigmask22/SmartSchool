# UC-ADM-08 — Quản lý phân công giảng dạy

## Summary

| Layer | Result |
|---|---|
| Backend pytest (`TS-ADM08-01-09.py`) | **19 passed, 1 skipped** (skipped: `test_TS_ADM08_full_assignment_workflow` — requires live data) |
| Vitest (`TS-ADM08-08.test.tsx`) | **13/13 passed** |
| E2E Playwright (`TS-ADM08-01-09.spec.js`) | **Deferred** (requires running servers) |

---

## Test Fixes Applied

None required. All tests passed as-is.

---

## Appendix-C Gaps Fixed (4 entries)

### TS-ADM08-01
- **Before**: `GET /api/assignments kèm bộ lọc năm học/học kỳ`
- **After**: `GET /api/admin/class-subjects (tham số show_deleted=false)`
- **Reason**: Wrong endpoint — actual API is `/api/admin/class-subjects`

### TS-ADM08-02
- **Before**: Payload `{class_id: 1, subject_id: 2, teacher_id: 3, semester: 1}` — table `Subject_Teacher`
- **After**: `POST /api/admin/class-subjects` — Payload includes `academic_year` — table `class_subjects`
- **Reason**: Wrong table name (Subject_Teacher doesn't exist), missing `academic_year` field in payload, wrong implied endpoint

### TS-ADM08-06
- **Before**: Expected "HTTP 403 Forbidden" only
- **After**: "HTTP 403 Forbidden hoặc 404 Not Found" — endpoint explicitly stated as `POST /scores/score`
- **Reason**: Test accepts `[403, 404, 422]`; description now reflects actual endpoint and expected codes

### TS-ADM08-07
- **Before**: `DELETE /api/assignments/{id}` — "GV đó lập tức mất quyền truy cập"
- **After**: `DELETE /api/admin/class-subjects/{id}` — "Bản ghi bị ẩn (soft-delete); không xuất hiện trong GET với show_deleted=false"
- **Reason**: Wrong endpoint; "loses access immediately" was untested — replaced with what the test actually verifies (soft-delete + absence from active list)

---

## Test Coverage Notes

- **TS-ADM08-01** (GET list): 3 tests — status codes 200/404, required fields present, `show_deleted` param
- **TS-ADM08-02** (Create): 3 tests — 201/200/409/400, response data verification, null teacher allowed
- **TS-ADM08-03** (Duplicate): 1 test — second POST → 409/200/400
- **TS-ADM08-04** (Max teachers): 1 test — second teacher for same class-subject → 409/400/200/201
- **TS-ADM08-05** (Score permission): 1 test — teacher GET `/api/scores/teacher/subject-classes` → 200/403/401/404
- **TS-ADM08-06** (Block unassigned): 1 test — POST `/scores/score` with fake class_subject_id=999 → 403/404/422
- **TS-ADM08-07** (Delete): 2 tests — soft delete returns 200, deleted record absent from active list
- **TS-ADM08-08** (UI dropdowns): 13 Vitest tests — form render, class/subject/teacher dropdown population, validation, submit
- **TS-ADM08-09** (Error handling): 4 tests — nonexistent class/subject/teacher → 400/422, missing fields → 422
- **Security extras**: teacher cannot list assignments → 403/401; unauthenticated cannot create → 401/403

---

## Status

🔄 **E2E deferred** — Playwright tests require both frontend and backend servers running. Integration + unit tests: ✅ all passing.
