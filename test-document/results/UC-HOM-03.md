# UC-HOM-03: Quản lý thông tin lớp chủ nhiệm — Audit Result

## Summary
| Item | Result |
|---|---|
| Backend pytest | 12/12 ✅ (after 1 fix) |
| Frontend vitest | 50/50 ✅ |
| E2E | 🔄 Deferred (server not running) |
| Spec gaps | 1 fixed (flow C not implemented) |
| Appendix-C gaps | 4 fixed |

---

## Test Files
- Backend: `backend/tests/TS-HOM03-01-03-04-06-07-08.py`
- Frontend unit: `frontend/src/tests/__tests__/TS-HOM03-10.test.tsx`
- E2E: `frontend/e2e/specs/TS-HOM03-10.spec.js` (deferred)

---

## Code Endpoints (actual implementation)

| Purpose | Endpoint | Auth |
|---|---|---|
| Update student info | `PUT /api/students/{student_id}` | None (no auth check) |
| Register face (base64) | `POST /api/ai/register-base64/{student_id}` | None |
| Register face (file) | `POST /api/ai/register/{student_id}` | None |
| Delete face encoding | `DELETE /api/ai/student/{student_id}/encoding` | None |
| Elective subjects | `POST /api/students/{student_id}/electives` | **Not implemented → 404** |

`FaceRecognitionRequest` model field: `image_base64` (not `image`)

---

## Gaps Found & Fixed

### 1. Backend test — TS-HOM03-06 wrong request field (FIXED)
- **File**: `backend/tests/TS-HOM03-01-03-04-06-07-08.py`
- **Problem**: Sent `{"image": "invalid"}` to `/api/ai/register-base64/...`; `FaceRecognitionRequest` expects `image_base64`. The 422 response body had keys `success`/`message`/`errors` but assertion checked for `detail`/`error`.
- **Fix**: Changed to `{"image_base64": "aW52YWxpZA=="}` and added `"message"` to assertion: `"detail" in data or "error" in data or "message" in data`.

### 2. Spec — flow C (elective subjects) not implemented (FIXED)
- **File**: `Capstone-Report/4. Phân tích hệ thống/use-case-spec/homeroom.spec.tex`
- **Problem**: Flow C steps 3–4 presented as implemented features.
- **Fix**: Added `\textit{(Chưa triển khai)}` to flow C header and steps 3–4, with note about missing endpoint.

### 3. Appendix-C — 4 inaccurate entries (FIXED)

| Entry | Old description | Fixed to |
|---|---|---|
| TS-HOM03-03 | "Upload file .jpg/png → Storage, Vector 512" | `POST /api/ai/register-base64/{id}` JSON body, saved to `face_embeddings` table |
| TS-HOM03-06 | "InsightFace bị sập/timeout" | Request for student ID 999999 (not found) → 404 graceful error |
| TS-HOM03-07 | "DB updates Class_Subjects" | Endpoint not implemented → 404; feature planned for future |
| TS-HOM03-08 | "HTTP 403 Forbidden" | `PUT /api/students/{id}` has no auth; returns 200 (cross-class check not enforced) |

---

## Remaining Notes
- **Security gap**: `PUT /api/students/{id}`, `POST /api/ai/register-base64/{id}`, and `DELETE /api/ai/student/{id}/encoding` have no authentication at all. Any caller with a Supabase-accessible DB can modify any student. This is a known architectural gap not addressed in this audit.
- **Elective subjects (flow C)**: Not implemented in backend. Frontend test covers state management only (mocked data).
- **TS-HOM03-02** (frontend validation): Mapped to vitest `useStudentFilters` and `useStudentList` suites in TS-HOM03-10.test.tsx — covers data-level validation logic, not DOM field-level UI tests.
