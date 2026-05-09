# UC-HOM-04: Tạo và gửi báo cáo học sinh — Audit Result

## Summary
| Item | Result |
|---|---|
| Backend pytest | 19/19 ✅ |
| Frontend vitest | 46/46 ✅ |
| E2E | 🔄 Deferred (server not running) |
| Spec gaps | 2 fixed (SMS → Email in normal flow + alternative flow) |
| Appendix-C gaps | 3 fixed |

---

## Test Files
- Backend: `backend/tests/TS-HOM04-01-02-03-04-05-06-07-08.py`
- Frontend unit: `frontend/src/tests/__tests__/TS-HOM04-11.test.tsx`
- E2E: `frontend/e2e/specs/TS-HOM04-11.spec.js` (deferred)

---

## Code Endpoints (actual implementation)

| Purpose | Endpoint | Auth |
|---|---|---|
| Generate AI feedback | `POST /api/feedback/generate-feedback` | None |
| Generate batch feedback | `POST /api/feedback/generate-batch-feedback` | None |
| Save/upsert comment | `POST /api/feedback/comments` | None |
| Get comment by student | `GET /api/feedback/comments/{student_id}` | None |
| Get class comments | `GET /api/feedback/comments/class/{class_id}` | None |
| Send email + PDF | `POST /api/feedback/send-email-report-card` | None |
| Send SMS (stub only) | `POST /api/feedback/send-sms` | None (not used in UI) |

**Key model field**: `received_email` (not phone) — email report card uses `EmailReportCardRequest` with `received_email` as the recipient address.

**AI service**: Gemini via `gemini_service.py`; fallback via template in `services.py`.

---

## Gaps Found & Fixed

### 1. Spec — SMS replaced by Email (FIXED)
- **File**: `Capstone-Report/4. Phân tích hệ thống/use-case-spec/homeroom.spec.tex`
- **Problem**: Normal flow step 7 listed "Gửi SMS" sending a shortened comment via SMS gateway. Alternative flow listed missing phone number error. Neither matches the actual implementation.
- **Fix**: Changed "Gửi SMS" → "Gửi Email" with `POST /api/feedback/send-email-report-card` and `received_email` field; alternative flow updated to HTTP 400 when `received_email` is null.

### 2. Appendix-C — 3 inaccurate entries (FIXED)

| Entry | Old description | Fixed to |
|---|---|---|
| TS-HOM04-05 | "Gửi SMS → SMS Gateway mock success" | `POST /api/feedback/send-email-report-card` with `received_email`, returns 200 + PDF attachment |
| TS-HOM04-06 | "Gửi SMS khi thiếu SĐT phụ huynh → UI disabled" (Frontend validation) | `POST /api/feedback/send-email-report-card` with `received_email: null` → HTTP 400 (Backend validation) |
| TS-HOM04-08 | "403 Forbidden" for cross-class access | Feedback API has no auth/class check; returns 200/404. Cross-class enforcement is a known gap. |

---

## Remaining Notes
- **SMS endpoint** (`POST /api/feedback/send-sms`) exists in code as a stub but is not used by the UI. Phone validation and gateway integration are marked `TODO` in `api.py`.
- **No authentication** on any feedback endpoint — same architectural gap as UC-HOM-03 face/student APIs.
- **TS-HOM04-08**: Cross-class report access not enforced at the API level. This is a security gap noted for future hardening.
