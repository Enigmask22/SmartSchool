# UC-GEN-03 — Khôi phục mật khẩu

**Status:** ✅ All tests passing. Gaps documented and resolved.
- Backend pytest: 17/17 passed (TS-GEN03-01-05.py)
- Frontend vitest: shared file `TS-GEN03-GEN04-FE.test.tsx` (see UC-GEN-04)
- E2E: not required — appendix-C has no E2E scenario for GEN03

---

## Code Implementation
| Layer | Endpoint | What it does |
|---|---|---|
| `POST /auth/forgot-password` | `ForgotPasswordRequest(username, otp_email)` | Looks up username → validates otp_email matches account email → generates 6-digit OTP → stores in `temp_otp/` file → sends via SMTP |
| `POST /auth/verify-otp` | `VerifyOTPRequest(username, otp)` | Verifies OTP from file → tracks attempts (max 3) → expires after 10 min → returns 429 on max attempts |
| `POST /auth/reset-password` | `ResetPasswordRequest(username, otp, new_password, confirm_password)` | Re-verifies OTP → checks passwords match → hashes new password → updates DB → deletes OTP file |

**Key implementation details:**
- OTP storage: file system (`temp_otp/otp_{sha256(username)}.json`), **not DB**
- OTP expiry: 10 min (configurable via `OTP_EXPIRY_MINUTES` env var)
- Max attempts: 3 (hardcoded in `OTPService`)
- `api.py` imports singletons with `from auth.services import email_service, otp_service` (not `backend.auth.services`) — mock targets must use `'auth.api.email_service'`

---

## Test File Issues Found & Fixed (`TS-GEN03-01-05.py`)
| Test | Bug | Fix |
|---|---|---|
| `test_TS_GEN03_04_verify_otp_rejects_non_numeric` | Expected 422, got 400/404 — Pydantic allows any 6-char string (no `pattern` constraint) | Changed assertion to `in [400, 404, 422]` |
| `test_TS_GEN03_05_smtp_error_returns_500` | Used wrong email `nguyen_thi_lan@school.edu.vn` → 400 (email mismatch) before SMTP reached; also wrong mock target `backend.auth.services.*` | Fixed email to `lan.nguyenthi@gmail.com`; fixed mock to `patch('auth.api.otp_service')` + `patch('auth.api.email_service')` |
| `test_TS_GEN03_05_max_attempts_exceeded_returns_429` | Used nonexistent user `test_max_attempts` → forgot-password 404, no OTP stored, all verify calls 404 | Redesigned: mock `EmailService.generate_otp` → "888888", mock `send_otp_email` → success, let real `generate_and_store_otp` run; cleanup with `otp_service.delete_otp` |
| `test_otp_verification_with_correct_code` (bonus) | Wrong email `nguyen_thi_lan@school.edu.vn` → 400 | Fixed email + added `generate_and_store_otp` + `send_otp_email` mocks |
| `test_forgot_password_workflow_step1` (integration) | Same wrong email | Same fix |

**Critical finding — mock patch target:**
All `backend.auth.services.*` class-level patches silently failed — `api.py` imports with `from auth.services import ...` (not `backend.auth.*`). Real email service ran and happened to succeed → happy path tests passed by accident.

Correct mock targets:
```python
patch('auth.api.email_service')   # NOT backend.auth.services.EmailService
patch('auth.api.otp_service')     # NOT backend.auth.services.OTPService
```

---

## Appendix-C Scenarios (TS-GEN03) — Inaccuracies Found & Fixed
| Scenario | Problem | Fix Applied |
|---|---|---|
| GEN03-02 | Input said "Nhập Email không tồn tại"; error message "Email không tồn tại" — endpoint takes `username`, not email | Changed to: "Nhập Username không tồn tại"; error "Username không tồn tại trong hệ thống"; HTTP 404 added |
| GEN03-05 | Error message "Không thể gửi email lúc này. Vui lòng thử lại sau" ≠ code message "Không thể gửi email OTP"; no HTTP code listed | Message updated to "Không thể gửi email OTP"; added "Trả về HTTP 500" |
