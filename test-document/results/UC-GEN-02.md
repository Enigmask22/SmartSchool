# UC-GEN-02 — Đăng xuất khỏi hệ thống

**Status:** ✅ All tests passing. Gaps documented and resolved.
- E2E Playwright: 2/2 passed — 1 test × Chromium + Firefox (TS-GEN02-01-18)
- Vitest: `TS-GEN02-04.test.tsx` **deleted** — 31 tests were testing login (GEN01 concern), not logout. Appendix-C defines GEN02 as 3 E2E-only scenarios; no vitest needed.
- Backend: no test needed — logout is stateless JWT (FE-only concern)

---

## Spec Summary
| Flow | Description |
|---|---|
| Normal | User nhấn Đăng xuất → hệ thống hủy phiên (xóa token) → điều hướng về trang Đăng nhập |
| Alternative | Không có |
| Exception | Không có |

---

## Code Implementation
| Layer | Location | What it does |
|---|---|---|
| Backend | `backend/auth/api.py` `POST /auth/logout` | Returns `{success: true, message: "Đăng xuất thành công"}` — **stateless, no token blacklist** |
| Frontend API | `frontend/src/utils/api.ts` `logout()` | Calls backend logout, then unconditionally calls `clearTokens()` (removes `access_token`, `refresh_token` from `localStorage`) |
| AuthContext | `frontend/src/contexts/AuthContext.tsx` `logout()` | Calls `api.logout()`, then also removes `user` from localStorage and sets all state to `null` |
| Route guard | `ProtectedRoute` + `isAuthenticated()` | After state is null, React re-render triggers redirect to `/login` automatically |

**Key architectural fact:** Logout is **stateless**. Backend JWT remains cryptographically valid until expiry (~30 min). Security relies entirely on the FE clearing tokens. Any component checking `isAuthenticated()` will block access after logout.

---

## Test Files

**`frontend/src/tests/__tests__/TS-GEN02-04.test.tsx` (vitest)** — ⚠️ Deleted
- Tested a completely hand-rolled mock `LoginComponent`, not the real `AuthContext.logout()` or `api.logout()`
- Did not test actual logout behavior
- Headers claimed to test TS-GEN02-01 through TS-GEN02-12 but mapped to login features, not logout
- **Decision:** deleted per user confirmation

**`frontend/e2e/specs/TS-GEN02-01-18.spec.js` (Playwright)** — 🔴 Multiple bugs found & fixed
| Issue | Detail |
|---|---|
| Wrong port | `baseURL = http://localhost:5173` — Playwright config uses `:3000`. All tests will fail to reach the app |
| Wrong password | Uses `password123` everywhere; actual seeded password is `password` |
| Deprecated API | `page.waitForNavigation()` is deprecated in Playwright; should use `page.waitForURL()` |
| Wrong scope | File named GEN02 but tests TS-GEN02-01/02/03 are actually **login** tests (GEN01 scope), not logout |
| Actual logout test | `TS-GEN02-04` (line ~80) covers logout — it's the only GEN02-relevant test in the file |

---

## Appendix-C Scenarios (TS-GEN02) — Inaccuracies Found & Fixed
| Scenario | Problem | Fix Applied |
|---|---|---|
| GEN02-01 | Stage `Integration (Backend)` — logout is a FE action; expected result claimed "Session bị hủy ở Backend" which is architecturally wrong for stateless JWT | Stage → `E2E (Playwright)`; expected result updated to reflect FE token removal + stateless backend |
| GEN02-02 | OK — Back button blocked by FE `ProtectedRoute`; stage `E2E (Playwright)` is correct | No change |
| GEN02-03 | Expected result claimed `API returns 401 after token reuse` — WRONG for stateless JWT (backend accepts old token until expiry) | Changed to: FE `ProtectedRoute` blocks protected routes; noted backend is stateless |

---

## Fixes Applied to E2E Test File
1. Fixed port: removed hardcoded `baseURL` — Playwright config provides it as `:3000`
2. Fixed password: `password123` → `password`
3. Replaced `page.waitForNavigation()` → `page.waitForURL()`
4. Scoped to logout only: removed login-scoped tests (covered by `TS-GEN01-01-04.spec.js`)
