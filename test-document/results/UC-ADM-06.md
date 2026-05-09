# UC-ADM-06: Quản lý môn học — Audit & Gap Report

## Summary

| Layer | File | Status |
|---|---|---|
| Backend tests (ADM06) | `backend/tests/TS-ADM06-01-08.py` (27 tests) | ✅ 27/27 passed (after bug fix) |
| Backend tests (EXT) | `backend/tests/TS-ADM06EX-T01-T07.py` (25 tests) | ✅ 25/25 passed |
| Vitest (ADM06-02-03) | `frontend/src/tests/__tests__/TS-ADM06-02-03.test.tsx` | ✅ 23/23 passed |
| Vitest (ADM06-04-05) | `frontend/src/tests/__tests__/TS-ADM06-04-05.test.tsx` | ✅ 21/21 passed |
| E2E | `frontend/e2e/specs/TS-ADM06-06.spec.js` | ⚠️ Deferred (servers not running in CI) |
| Appendix-C | `Capstone-Report/10. Phụ lục/appendix-C.tex` (ADM06 section) | ❌ → Fixed (7 gaps) |

**Total: 52/52 backend + 44/44 vitest passed**

---

## Backend Bug Found & Fixed

**Bug**: `'SubjectUpdate' object has no attribute 'score_column_config'`

**Location**: `backend/admin/api.py` line ~942 — the update endpoint referenced `subject_data.score_column_config` but `SubjectUpdate` model (in `backend/admin/models.py`) didn't declare the field.

**Fix**: Added `score_column_config: Optional[dict] = None` to `SubjectUpdate` in `backend/admin/models.py`.

**Tests affected**: 3 tests failing → all passing after fix:
- `test_TS_ADM06_04_update_subject_returns_200`
- `test_TS_ADM06_04_update_multiple_fields`
- `test_TS_ADM06_full_crud_workflow`

---

## Appendix-C Gaps Fixed

| ID | Gap | Fix Applied |
|---|---|---|
| TS-ADM06-01 | Wrong endpoint `/api/subjects` | → `/api/admin/subjects` |
| TS-ADM06-02 | Wrong endpoint `/api/subjects`; wrong field `is_compulsory` | → `/api/admin/subjects`; → `is_mandatory`; stage updated to include Unit (Frontend) |
| TS-ADM06-04 | Wrong endpoint `/api/subjects/{id}` | → `/api/admin/subjects/{id}`; stage updated to include Unit (Frontend) |
| TS-ADM06-05 | Wrong endpoint `/api/subjects/{id}`; vague "soft delete or hard delete" | → `/api/admin/subjects/{id}`; → "soft delete (is_active = false)"; stage updated |
| TS-ADM06-07 | Wrong type/stage/description — said "Extension, UI/Integration, score column navigation" but actual test is admin-only security | → "Security, Integration (Backend), phân quyền QTV only" |
| TS-ADM06EXT-01 | Wrong endpoint `/api/subjects/{id}/score-config` | → `/api/score-settings/{subject_id}` |
| TS-ADM06EXT-02 | Wrong description and wrong table reference (ScoreConfig + ScoreColumn) | → correct endpoint `/api/score-settings`, correct payload format, correct table `score_config` |

---

## Test File Details

### `backend/tests/TS-ADM06-01-08.py` (27 tests)

| Class | Scenarios |
|---|---|
| `TestGetSubjects` | 4 tests: list returns 200, list structure, show_deleted param, id field present |
| `TestCreateSubject` | 4 tests: creates 201/200, with description, mandatory flag, returns data |
| `TestDuplicateSubjectCode` | 3 tests: duplicate rejected 409/400/422, missing subject_code 422, missing name 422 |
| `TestUpdateSubject` | 3 tests: PUT returns 200, 404 for nonexistent, multiple fields |
| `TestDeleteSubject` | 3 tests: DELETE returns 200, 404 for nonexistent, soft delete verified |
| `TestDeleteWithConstraints` | 2 tests: constraints handled 200/400/409, clear error message |
| `TestSubjectSecurity` | 3 tests: teacher cannot GET, teacher cannot POST, unauthenticated 401/403 |
| `TestErrorHandling` | 3 tests: invalid JSON 400/422, graceful server error, type validation |
| `TestSubjectIntegration` | 2 tests: full CRUD workflow, consistency across requests |

### `backend/tests/TS-ADM06EX-T01-T07.py` (25 tests)

| Class | Scenarios |
|---|---|
| `TestGetScoreConfig` | 4 tests: GET /api/score-settings/{id} returns 200/404, has columns, required fields |
| `TestAddScoreConfig` | 3 tests: POST returns 200/201, valid weight, multiple columns |
| `TestBusinessLogicValidation` | 3 tests: must have final exam, reject without it, valid with it |
| `TestWeightValidation` | 4 tests: negative weight, zero weight, string weight, boundary valid |
| `TestDeleteScoreConfig` | 3 tests: cannot delete column with grades, empty column OK, clear error |
| `TestBatchOperations` | 3 tests: batch save, rollback on error, DB error recovery |
| `TestScoreConfigSecurity` | 3 tests: teacher cannot modify, teacher cannot GET, unauthenticated 401/403 |
| `TestScoreConfigIntegration` | 2 tests: full workflow, consistency |

### Frontend Vitest

**`TS-ADM06-02-03.test.tsx`** (23 tests):
- TS-ADM06-02 (12 tests): form renders, labels, submit button, inputs, checkbox, validation errors, submit flow, error display
- TS-ADM06-03 (11 tests): code input renders, detects duplicate, allows unique, check button disabled while checking, error for duplicate, success for available, prevents submission

**`TS-ADM06-04-05.test.tsx`** (21 tests):
- TS-ADM06-04 (12 tests): update form renders, fields populated, button disabled then enabled, field edits, onUpdate called, button disabled while updating, success/error messages, persist after reload
- TS-ADM06-05 (9 tests): delete button, confirmation dialog, subject name in dialog, confirm/cancel buttons, cancel closes, calls onDelete, disabled while deleting, success/error, soft delete (is_active false)

### E2E — `frontend/e2e/specs/TS-ADM06-06.spec.js`

**Status**: Deferred — login route and tab navigation require running dev servers.
Covers: Navigate to Subjects tab, Create subject, Validate duplicate code, Update subject, Delete subject (with confirmation).

---

## Endpoints Verified (Backend)

| Method | Path | Used by |
|---|---|---|
| GET | `/api/admin/subjects` | TS-ADM06-01 |
| GET | `/api/admin/subjects?show_deleted=true` | TS-ADM06-01 |
| POST | `/api/admin/subjects` | TS-ADM06-02, 03 |
| PUT | `/api/admin/subjects/{id}` | TS-ADM06-04 |
| DELETE | `/api/admin/subjects/{id}` | TS-ADM06-05, 06 |
| GET | `/api/score-settings/{subject_id}` | TS-ADM06EXT-01 |
| POST | `/api/score-settings` | TS-ADM06EXT-02 |

---

## Status: ✅ UC-ADM-06 COMPLETE (E2E deferred)
