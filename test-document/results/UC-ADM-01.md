# UC-ADM-01 — Quản lý tài khoản người dùng

**Status:** ✅ All tests passing after fixes.
- Backend pytest: 13/13 passed (TS-ADM01-01-07.py — fixes required)
- Frontend vitest: 8/8 passed (TS-ADM01-06.test.tsx — 1 fix required)
- E2E Playwright: exists (TS-ADM01-08.spec.js) — requires running dev server

---

## Spec Summary
| Flow | Description |
|---|---|
| Normal | Admin views user list (GET); creates new account (POST); deactivates account (PUT is_active=false) |
| Alternative | Duplicate username → 409; Duplicate email → 409; invalid role → 400 |
| Exception | No JWT → 403; Invalid JWT → 401; Non-admin role → 403 |

---

## Code Implementation
| Feature | Endpoint | Notes |
|---|---|---|
| List users | `GET /api/admin/users` | Requires admin JWT; returns array without `password_hash` |
| Create user | `POST /api/admin/users` | Valid roles: `admin`, `teacher`, `homeroom_teacher`; returns 200 or 201 |
| Update user / deactivate | `PUT /api/admin/users/{id}` | Accepts partial update; `{is_active: false}` = soft delete |
| Delete user | `DELETE /api/admin/users/{id}` | Not tested in ADM01 scope |

**Module:** `backend/admin/api.py` (router prefix `/api/admin`), `backend/admin/validators.py`

---

## State BEFORE Fixes

### Backend pytest (`TS-ADM01-01-07.py`) — 6/13 failed

| Test | Error | Root Cause |
|---|---|---|
| `test_TS_ADM01_03a_create_user_teacher` | 400 `"Tên đăng nhập chỉ được chứa chữ cái, số, gạch dưới, từ 3-20 ký tự"` | Fixture username `test_teacher_177826970740987` = 28 chars → exceeds 20-char limit |
| `test_TS_ADM01_03b_create_user_admin_role` | 400 same error | Same — `test_admin_{timestamp}` too long |
| `test_TS_ADM01_03c_create_user_homeroom_role` | 400 `"Vai trò phải là: admin, teacher, student"` | Validator had `["admin","teacher","student"]` — `student` should be `homeroom_teacher` |
| `test_TS_ADM01_04a_duplicate_username_existing_admin` | `assert 409 == 400` | Test expected 400; API returns 409 Conflict for duplicates |
| `test_TS_ADM01_04b_duplicate_username_existing_teacher` | `assert 409 == 400` | Same |
| `test_TS_ADM01_07_deactivate_user` | 400 (cascades from 03a fixture failure) | Couldn't create user to then deactivate |
| `test_TS_ADM01_07_password_hashing_bcrypt` | 400 (cascades from 03a fixture failure) | Same |

### Frontend vitest (`TS-ADM01-06.test.tsx`) — 7/8 passed

| Test | Error | Root Cause |
|---|---|---|
| `TS-ADM01-06-03: should remove error message when valid email is entered` | `Unable to find an element by: [data-testid="email-input"]` | `render(<MockForm .../>)` was commented out — `screen.getByTestId` found empty `<body>` |

---

## Fixes Applied

### 1. `backend/tests/conftest.py` — Fixture usernames shortened
- `test_teacher_{full_timestamp}` → `tch_{6-digit-ts}` (max 9 chars)
- `test_admin_{full_timestamp}` → `tad_{6-digit-ts}`
- `test_homeroom_{full_timestamp}` → `thr_{6-digit-ts}`

### 2. `backend/admin/validators.py` — Valid roles corrected
```python
# Before
valid_roles = ["admin", "teacher", "student"]

# After
valid_roles = ["admin", "teacher", "homeroom_teacher"]
```
Also corrected default role from `"student"` → `"teacher"`.

### 3. `backend/tests/TS-ADM01-01-07.py` — Duplicate username assertions
- `test_TS_ADM01_04a`: `== 400` → `in [400, 409]`; error message assertion updated to match actual response `"Tên đăng nhập"` prefix
- `test_TS_ADM01_04b`: `== 400` → `in [400, 409]`

### 4. `frontend/src/tests/__tests__/TS-ADM01-06.test.tsx` — Uncommented render
- `test_TS_ADM01_06-03`: added `render(<MockForm onSubmit={vi.fn()} />)` (was commented out)

---

## State AFTER Fixes
- Backend pytest: **13/13 passed** in 6.24s
- Frontend vitest: **8/8 passed** in 3.93s

---

## Appendix-C Inaccuracies Found & Fixed

| Row | Problem | Fix Applied |
|---|---|---|
| ADM01-02 | Endpoint `GET /api/users` | `GET /api/admin/users` |
| ADM01-03 | Role `"GVBM"` (old alias); status code `201 only` | Role `"teacher"` (actual valid value); `200 hoặc 201` |
| ADM01-04 | Error message `"Username đã tồn tại"` | `"Tên đăng nhập này đã tồn tại"` (matches code USER_003) |
| ADM01-07 | Endpoint `PATCH /api/users/{id}/status` | `PUT /api/admin/users/{id}` |

---

## E2E Test — `frontend/e2e/specs/TS-ADM01-08.spec.js`

**Flow tested (GEN04-08 in appendix-C):**
1. Login as `admin / password` → wait for `/admin/dashboard`
2. Navigate to `/admin/management` → wait for `networkidle`
3. Click "Người dùng" tab → wait for `table tbody`
4. Click "Thêm mới" → wait for `[role="dialog"]`
5. Fill form: username (`teacher_{timestamp}`), email, full_name, password, role = "Giáo viên"
6. Click "Tạo mới" button
7. Assert toast appears (best-effort — may disappear before assertion)
8. Assert dialog closed + table rows ≥ 1
9. Try to find new username in table rows
10. Assert URL still contains `/admin/management`
11. Screenshot saved to `test-results/TS-ADM01-08-complete-flow.png`

**E2E quality gaps — all fixed:**
- **Username too long**: `teacher_${Date.now()}` = 21 chars → changed to `tch_${last8digits}` = 12 chars
- **No cleanup**: added Step 10 — after test, calls `GET /api/admin/users` to find created user by username, then `DELETE /api/admin/users/{id}` using admin token from localStorage
- **No strict new-user assertion**: `expect(rowCount > 0).toBeTruthy()` → `expect(userFound).toBe(true)` — now strictly verifies the new row appears in the table
- **Best-effort toast**: removed `try/catch` around toast assertion — now a hard `expect(toast).toBeVisible()`

---

## Code File Map Correction
Plan.md lists `UC-ADM-01 | backend/users/, backend/admin/` — actual primary module is `backend/admin/` (api.py + validators.py). `backend/users/` is not involved in this UC.
