# Use Case Audit & Test Alignment Plan

---

## PART 1 — Workflow (Fixed Reference)

### Goal
For each use case: compare **use case spec** ↔ **source code** ↔ **test files**, then refine if misaligned. Iterate until all 24 use cases are covered.

### Iteration Steps (per use case)
1. **Read** the use case spec (`.tex` file, look up by UC-ID).
2. **Read** all mapped code files (backend modules + frontend hooks/components/pages).
3. **Read** the test files (pytest backend, vitest unit, Playwright E2E).
4. **Read** the corresponding test scenarios in `appendix-C.tex` for this UC-ID.
5. **Compare** all four: does the code implement what the spec says? Do the appendix-C scenarios accurately reflect the code (correct endpoints, HTTP codes, field names, error messages)? Do the test files cover all scenario flows?
6. **Write result** in `plan/results/UC-{ID}.md` (gap analysis + suggested changes), including any appendix-C inaccuracies found. Link it in the Part 3 status table.
7. **Refine**: update use case spec text, appendix-C scenario text, or test code as needed, then **run** the tests and fix until green.
8. Mark the use case ✅ and move to the next.

> **Why check appendix-C separately:** Scenarios in appendix-C were authored from the use case spec, not the source code. They may reference wrong HTTP status codes, incorrect field names, non-existent endpoints, or error messages that don't match the actual implementation.

### Test Run Commands
```bash
# Backend (pytest) — run from backend/ with venv active
pytest tests/TS-ADM01-01-07.py -v

# Frontend unit (vitest) — run from frontend/
npx vitest run src/tests/__tests__/TS-ADM01-06.test.tsx

# E2E (Playwright) — run from frontend/ (dev server must be running on :3000)
npx playwright test e2e/specs/TS-ADM01-08.spec.js

# Locust (load) — run from backend/ with venv active; set env var for dev environment
PERF_P95_THRESHOLD_MS=5000 locust -f tests/locustfiles/TS-GEN01-07-login-load.py --host http://localhost:8000 --users 50 --spawn-rate 10 --run-time 60s --headless
```

### E2E Scope Rule
> **E2E tests cover the happy path only** — 1 test per UC, or a small number (2-3) only if role-based variants need separate verification (e.g. teacher vs admin redirect).
>
> Rationale: E2E tests are slow (~15-30s each) and fragile against UI changes. Their purpose is to replace manual hand-click verification of the core flow, NOT to duplicate error-case coverage that belongs in the backend (pytest) or frontend unit (vitest) layers.
>
> Error cases, validation, and edge cases → backend pytest or vitest unit tests.
> Performance → Locust.
> E2E → happy path only.

### Naming Convention
| Test ID pattern | Stage | Tool | Location |
|---|---|---|---|
| `TS-XXX-NN-NN.py` (backend) | Integration / Unit | pytest | `backend/tests/` |
| `TS-XXX-NN.test.tsx` | Unit (Frontend) | vitest | `frontend/src/tests/__tests__/` |
| `TS-XXX-NN.spec.js` | E2E | Playwright | `frontend/e2e/specs/` |

### Status Legend
- ⬜ Not started
- 🔄 In progress
- ✅ Done (tests passing, spec aligned)
- ⚠️ Gap found (needs fix)

---

## PART 2 — File Index

### Use Case Spec Files
| File | Use Cases Inside |
|---|---|
| `Capstone-Report/4. Phân tích hệ thống/use-case-spec/general.spec.tex` | UC-GEN-01, UC-GEN-02, UC-GEN-03, UC-GEN-04 |
| `Capstone-Report/4. Phân tích hệ thống/use-case-spec/admin.spec.tex` | UC-ADM-01 … UC-ADM-10, UC-ADM-02-EXT1, UC-ADM-06-EXT |
| `Capstone-Report/4. Phân tích hệ thống/use-case-spec/homeroom.spec.tex` | UC-HOM-01, UC-HOM-02, UC-HOM-03, UC-HOM-04 |
| `Capstone-Report/4. Phân tích hệ thống/use-case-spec/subject.spec.tex` | UC-SUB-01, UC-SUB-02, UC-SUB-02-EXT1, UC-SUB-02-EXT2 |

### Test File Map (per Use Case)
| UC ID | Backend (pytest) | Frontend Unit (vitest) | E2E (Playwright) |
|---|---|---|---|
| UC-GEN-01 | `backend/tests/TS-GEN01-01-07.py` | `src/tests/__tests__/TS-GEN01-05.test.ts` | `e2e/specs/TS-GEN01-01-04.spec.js` + Locust: `backend/tests/locustfiles/TS-GEN01-07-login-load.py` |
| UC-GEN-02 | — | ~~`src/tests/__tests__/TS-GEN02-04.test.tsx`~~ (deleted — was testing login, not logout) | `e2e/specs/TS-GEN02-01-18.spec.js` |
| UC-GEN-03 | `backend/tests/TS-GEN03-01-05.py` | `src/tests/__tests__/TS-GEN03-GEN04-FE.test.tsx` | — |
| UC-GEN-04 | `backend/tests/TS-GEN04-01-05.py` | `src/tests/__tests__/TS-GEN03-GEN04-FE.test.tsx` | — |
| UC-ADM-01 | `backend/tests/TS-ADM01-01-07.py` | `src/tests/__tests__/TS-ADM01-06.test.tsx` | `e2e/specs/TS-ADM01-08.spec.js` |
| UC-ADM-02 | `backend/tests/TS-ADM02-01-11.py` | `src/tests/__tests__/TS-ADM02-06.test.tsx` | `e2e/specs/TS-ADM02-12.spec.js` |
| UC-ADM-02-EXT1 | `backend/tests/TS-ADM02EX-01-09.py` | `src/tests/__tests__/TS-ADM02EX-02-03.test.tsx` | `e2e/specs/TS-ADM02EX-06-09.spec.js` |
| UC-ADM-03 | `backend/tests/TS-ADM03-01-07.py` | `src/tests/__tests__/TS-ADM03-02-03.test.tsx` | `e2e/specs/TS-ADM03-08.spec.js` |
| UC-ADM-04 | `backend/tests/TS-ADM04-01-07.py` | `src/tests/__tests__/TS-ADM04-02-03.test.tsx`, `TS-ADM04-04-05.test.tsx` | `e2e/specs/TS-ADM04-06.spec.js` |
| UC-ADM-05 | `backend/tests/TS-ADM05-01-07.py` | `src/tests/__tests__/TS-ADM05-02-03.test.tsx` | `e2e/specs/TS-ADM05-08.spec.js` |
| UC-ADM-06 | `backend/tests/TS-ADM06-01-08.py` | `src/tests/__tests__/TS-ADM06-02-03.test.tsx`, `TS-ADM06-04-05.test.tsx` | `e2e/specs/TS-ADM06-06.spec.js` |
| UC-ADM-06-EXT | `backend/tests/TS-ADM06EX-T01-T07.py` | `src/tests/__tests__/TS-ADM06EX-T01-T02.test.tsx` | — |
| UC-ADM-07 | `backend/tests/TS-ADM07-01-08.py` | `src/tests/__tests__/TS-ADM07-02-03.test.tsx`, `TS-ADM07-04-05.test.tsx` | `e2e/specs/TS-ADM07-08.spec.js` |
| UC-ADM-08 | `backend/tests/TS-ADM08-01-09.py` | `src/tests/__tests__/TS-ADM08-08.test.tsx` | `e2e/specs/TS-ADM08-01-09.spec.js` |
| UC-ADM-09 | `backend/tests/TS-ADM09-01-09.py` | `src/tests/__tests__/TS-ADM09-09.test.tsx` | `e2e/specs/TS-ADM09-08.spec.js` |
| UC-ADM-10 | `backend/tests/TS-ADM10-01-09.py` | `src/tests/__tests__/TS-ADM10-09.test.tsx` | `e2e/specs/TS-ADM10-08.spec.js` |
| UC-HOM-01 | `backend/tests/TS-HOM01-01-04-06-07-08.py` | `src/tests/__tests__/TS-HOM01-09.test.tsx` | `e2e/specs/TS-HOM01-08.spec.js` |
| UC-HOM-02 | `backend/tests/TS-HOM02-01-04-06.py` | `src/tests/__tests__/TS-HOM02-09.test.tsx` | `e2e/specs/TS-HOM02-08.spec.js` |
| UC-HOM-03 | `backend/tests/TS-HOM03-01-03-04-06-07-08.py` | `src/tests/__tests__/TS-HOM03-10.test.tsx` | `e2e/specs/TS-HOM03-10.spec.js` |
| UC-HOM-04 | `backend/tests/TS-HOM04-01-02-03-04-05-06-07-08.py` | `src/tests/__tests__/TS-HOM04-11.test.tsx` | `e2e/specs/TS-HOM04-11.spec.js` |
| UC-SUB-01 | `backend/tests/TS-SUB01-01-08.py` | `src/tests/__tests__/TS-SUB01-10.test.ts` | `e2e/specs/TS-SUB01-06.spec.js` |
| UC-SUB-02 | `backend/tests/TS-SUB02-01-08.py` | `src/tests/__tests__/TS-SUB02-04.test.ts` | `e2e/specs/TS-SUB02-10.spec.js` |
| UC-SUB-02-EXT1 | `backend/tests/TS-SUB02EXT-01-09.py` | `src/tests/__tests__/TS-SUB02EXT-04.test.ts` | `e2e/specs/TS-SUB02EXT-10.spec.js` |
| UC-SUB-02-EXT2 | `backend/tests/TS-SUB02EXT-2-ocr-backend.py` | `src/tests/__tests__/TS-SUB02EXT-2-ocr-frontend.test.ts` | `e2e/specs/TS-SUB02EXT-2-ocr.spec.js` |

### Code File Map (per Use Case)
| UC ID | Backend Module(s) | Frontend (pages / components / hooks) |
|---|---|---|
| UC-GEN-01 | `backend/auth/` | `pages/auth/Login.tsx`, `components/login/`, `hooks/login/` |
| UC-GEN-02 | `backend/auth/` | `contexts/AuthContext.tsx` |
| UC-GEN-03 | `backend/auth/`, `backend/temp_otp/` | `pages/auth/ForgotPassword.tsx`, `components/forgot-password/`, `hooks/forgot-password/` |
| UC-GEN-04 | `backend/auth/` (change-password), `backend/scores/` (teacher/profile) | `pages/profile/PersonalInfo.tsx`, `components/profile/`, `hooks/profile/` |
| UC-ADM-01 | `backend/admin/` (api.py, validators.py) | `pages/admin/Management.tsx`, `components/admin-management/`, `hooks/admin-management/` |
| UC-ADM-02 | `backend/students/` | `pages/admin/Management.tsx` (students tab), `components/admin-management/`, `hooks/admin-management/` |
| UC-ADM-02-EXT1 | `backend/students/` | `components/admin-management/ImportTeachersModal.tsx`, `hooks/admin-management/useAdminImport.ts` |
| UC-ADM-03 | `backend/homeroom/` | `pages/admin/ClassManagement.tsx`, `components/class-management/`, `hooks/class-management/` |
| UC-ADM-04 | `backend/camera_manager/`, `backend/attendance/` | `pages/admin/ContinuousRecognition.tsx`, `components/continuous-recognition/`, `hooks/continuous-recognition/` |
| UC-ADM-05 | `backend/admin/` | `pages/admin/Dashboard.tsx`, `components/admin-dashboard/`, `hooks/admin-dashboard/` |
| UC-ADM-06 | `backend/school_config/`, `backend/homeroom/` | `components/admin-management/` (subjects tab), `hooks/admin-management/useTeacherSubjectManagement.ts` |
| UC-ADM-06-EXT | `backend/score_settings/` | `components/score-management/ConfigEditorModal.tsx`, `hooks/admin-management/useScoreColumnManagement.ts` |
| UC-ADM-07 | `backend/homeroom/` | `pages/admin/ClassManagement.tsx`, `components/class-management/`, `hooks/class-management/` |
| UC-ADM-08 | `backend/users/`, `backend/homeroom/` | `components/admin-management/` (teacher-subject tab), `hooks/admin-management/useTeacherSubjectManagement.ts` |
| UC-ADM-09 | `backend/users/` | `components/admin-management/` (teacher profile tab) |
| UC-ADM-10 | `backend/school_config/` | `components/admin-management/SystemSettings.tsx` |
| UC-HOM-01 | `backend/homeroom/`, `backend/scores/`, `backend/attendance/` | `pages/homeroom/Dashboard.tsx`, `components/homeroom-dashboard/`, `hooks/homeroom-dashboard/` |
| UC-HOM-02 | `backend/attendance/` | `pages/homeroom/AttendanceView.tsx`, `components/attendance/`, `hooks/attendance/` |
| UC-HOM-03 | `backend/homeroom/`, `backend/students/` | `pages/homeroom/FaceManagement.tsx`, `components/face-management/`, `hooks/face-management/` |
| UC-HOM-04 | `backend/feedback/` | `pages/homeroom/StudentList.tsx`, `components/student-list/modals/EmailReportCardModal.tsx`, `hooks/student-list/useStudentFeedback.ts` |
| UC-SUB-01 | `backend/scores/` | `pages/subject/Dashboard.tsx`, `components/subject-dashboard/`, `hooks/subject-dashboard/` |
| UC-SUB-02 | `backend/scores/` | `pages/subject/ScoreManagement.tsx`, `components/score-management/`, `hooks/score-management/` |
| UC-SUB-02-EXT1 | `backend/scores/` | `components/score-management/ImportPreviewModal.tsx`, `hooks/score-management/useScoreImportForm.ts` |
| UC-SUB-02-EXT2 | `backend/scores/ocr_services/`, `backend/ai_services/` | `components/score-management/OCRScoreSheet.tsx` |

### Appendix-C (Test Scenario Reference)
`Capstone-Report/10. Phụ lục/appendix-C.tex`

> **Note:** Appendix-C checking was added retroactively at UC-GEN-01 (step 4 of the workflow). The UC-GEN-01 appendix-C inaccuracies have already been fixed in that file.

---

## PART 3 — Compare Results

Detailed results for each UC live in `plan/results/UC-{ID}.md`.
Create the file when starting a UC; link it below when done.

### Iteration Order & Status

| # | UC ID | Name (VI) | Status | Result File |
|---|---|---|---|---|
| 1 | UC-GEN-01 | Đăng nhập vào hệ thống | ✅ | [UC-GEN-01.md](results/UC-GEN-01.md) |
| 2 | UC-GEN-02 | Đăng xuất khỏi hệ thống | ✅ | [UC-GEN-02.md](results/UC-GEN-02.md) |
| 3 | UC-GEN-03 | Khôi phục mật khẩu | ✅ | [UC-GEN-03.md](results/UC-GEN-03.md) |
| 4 | UC-GEN-04 | Quản lý hồ sơ cá nhân | ✅ | [UC-GEN-04.md](results/UC-GEN-04.md) |
| 5 | UC-ADM-01 | Quản lý tài khoản người dùng | ✅ | [UC-ADM-01.md](results/UC-ADM-01.md) |
| 6 | UC-ADM-02 | Quản lý hồ sơ học sinh | ✅ | [UC-ADM-02.md](results/UC-ADM-02.md) |
| 7 | UC-ADM-02-EXT1 | Nhập danh sách học sinh từ file | ✅ | [UC-ADM-02-EXT1.md](results/UC-ADM-02-EXT1.md) |
| 8 | UC-ADM-03 | Quản lý sĩ số lớp học | 🔄 E2E deferred | [UC-ADM-03.md](results/UC-ADM-03.md) |
| 9 | UC-ADM-04 | Giám sát và cấu hình điểm danh tự động | 🔄 E2E deferred | [UC-ADM-04.md](results/UC-ADM-04.md) |
| 10 | UC-ADM-05 | Xem dashboard tổng quan toàn trường | 🔄 E2E deferred | [UC-ADM-05.md](results/UC-ADM-05.md) |
| 11 | UC-ADM-06 | Quản lý môn học | 🔄 E2E deferred, 52/52 + 44/44 ✅ | [UC-ADM-06.md](results/UC-ADM-06.md) |
| 12 | UC-ADM-06-EXT | Cấu hình cột điểm mặc định | ✅ (covered in TS-ADM06EX-T01-T07) | [UC-ADM-06.md](results/UC-ADM-06.md) |
| 13 | UC-ADM-07 | Quản lý lớp học | 🔄 E2E deferred, 23/23 + 25/25 ✅ | [UC-ADM-07.md](results/UC-ADM-07.md) |
| 14 | UC-ADM-08 | Quản lý phân công giảng dạy | 🔄 E2E deferred, 19/20 + 13/13 ✅ | [UC-ADM-08.md](results/UC-ADM-08.md) |
| 15 | UC-ADM-09 | Quản lý hồ sơ giáo viên | 🔄 E2E deferred, 20/20 + 13/13 ✅ | [UC-ADM-09.md](results/UC-ADM-09.md) |
| 16 | UC-ADM-10 | Quản lý thời gian học vụ | 🔄 E2E deferred, 23/23 + 14/14 ✅ | [UC-ADM-10.md](results/UC-ADM-10.md) |
| 17 | UC-HOM-01 | Xem dashboard lớp chủ nhiệm | 🔄 E2E deferred, 29/29 + 32/32 ✅ | [UC-HOM-01.md](results/UC-HOM-01.md) |
| 18 | UC-HOM-02 | Thực hiện điểm danh buổi học | 🔄 E2E deferred, 16/16 + 37/37 ✅ | [UC-HOM-02.md](results/UC-HOM-02.md) |
| 19 | UC-HOM-03 | Quản lý thông tin lớp chủ nhiệm | 🔄 E2E deferred, 12/12 + 50/50 ✅ | [UC-HOM-03.md](results/UC-HOM-03.md) |
| 20 | UC-HOM-04 | Tạo và gửi báo cáo học sinh | 🔄 E2E deferred, 19/19 + 46/46 ✅ | [UC-HOM-04.md](results/UC-HOM-04.md) |
| 21 | UC-SUB-01 | Xem dashboard phân tích môn học | 🔄 E2E deferred, 10/10 + 46/46 ✅ | [UC-SUB-01.md](results/UC-SUB-01.md) |
| 22 | UC-SUB-02 | Quản lý điểm số môn học | 🔄 E2E deferred, 16/17 (1 skip) + 25/25 ✅ | [UC-SUB-02.md](results/UC-SUB-02.md) |
| 23 | UC-SUB-02-EXT1 | Nhập điểm từ file | 🔄 E2E deferred, 18/18 + 29/29 ✅ | [UC-SUB-02-EXT1.md](results/UC-SUB-02-EXT1.md) |
| 24 | UC-SUB-02-EXT2 | Nhập điểm bằng OCR | 🔄 E2E deferred, 23/23 + 36/36 ✅ | [UC-SUB-02-EXT2.md](results/UC-SUB-02-EXT2.md) |

> **Notes:**
> - UC-ADM-05 has **no test files** — needs test creation during its iteration.
> - UC-GEN-02 has no backend test — logic handled client-side (token removal); E2E only.
> - `TS-HOM03-10` and `TS-HOM04-11` scenario numbers exceed standard backend range — check if frontend unit tests cover extra scenarios not in the backend suite.

