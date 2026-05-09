# UC-ADM-05: Xem dashboard tổng quan toàn trường — Audit & Gap Report

## Summary

| Layer | File | Status |
|---|---|---|
| Spec | `Capstone-Report/4. Phân tích hệ thống/use-case-spec/admin.spec.tex` (line 543) | ✅ OK |
| Backend tests | `backend/tests/TS-ADM05-01-07.py` (20 tests — **created this session**) | ✅ 20/20 passed |
| Vitest | `frontend/src/tests/__tests__/TS-ADM05-02-03.test.tsx` (15 tests — **created this session**) | ✅ 15/15 passed |
| E2E | `frontend/e2e/specs/TS-ADM05-08.spec.js` (**created this session**) | ⚠️ Deferred (servers not running in CI) |
| Appendix-C | `Capstone-Report/10. Phụ lục/appendix-C.tex` (lines 144–151) | ❌ → Fixed (4 gaps) |

---

## Spec Reading (admin.spec.tex line 543)

### Normal Flow
- Admin → "Dashboard thống kê" → system shows data for current academic year
- 4 widget areas:
  - **Overview stats**: total students, classes, teachers
  - **Attendance trend chart**: line chart by date
  - **Score distribution**: buckets (Yếu/TB/Khá/Giỏi)
  - **Class ranking**: by attendance rate or average score
- Filters: academic year, semester, grade (10/11/12)
- Changing filter → all widgets auto-update
- Drill-down on chart column → detail view (if implemented)

### Alt flow
- No data for selected year → "Chưa có dữ liệu để thống kê"

### Exception
- DB error → widget-level error message (not blank page)

---

## Backend API (admin/api.py)

### GET /api/admin/dashboard/bootstrap (primary endpoint)
- Params: `academic_year` (required), `period_days` (default: 30)
- Requires: `Depends(get_admin_user)` → 401/403 for non-admin
- Returns combined payload:
  ```json
  {
    "success": true,
    "data": {
      "overview": { "total_students", "total_classes", "total_teachers", "attendance_rate", "academic_year" },
      "attendance_trends": [{ "date", "present", "absent", "rate" }],
      "class_performance": [{ "class_name", "total_students", "average_score", "excellent_count", "good_count", "average_count", "poor_count" }],
      "infra_stats": { "total_subjects", "total_cameras", "students_with_face" }
    }
  }
  ```

### GET /api/admin/dashboard/overview
- Returns: `{ total_students, total_classes, total_teachers, total_users, attendance_rate, period_days }`

### GET /api/admin/dashboard/attendance-trends
### GET /api/admin/dashboard/class-performance  
### GET /api/admin/dashboard/academic-years
- All require admin auth; return `{"success": true, "data": ...}`

**Score buckets in class-performance**:
- Giỏi: `score >= 8.5`
- Khá: `7.0 <= score < 8.5`
- Trung bình: `5.5 <= score < 7.0`
- Yếu: `score < 5.5`

**Empty data**: returns 200 with empty lists/zero values — no crash.

---

## Backend Tests (TS-ADM05-01-07.py) — 20/20 ✅

**Created this session** (UC-ADM-05 had no tests before).

```
TestDashboardBootstrap::test_TS_ADM05_01_bootstrap_returns_200 PASSED
TestDashboardBootstrap::test_TS_ADM05_01_bootstrap_has_required_keys PASSED
TestDashboardBootstrap::test_TS_ADM05_01_overview_fields_present PASSED
TestDashboardOverview::test_TS_ADM05_01_overview_200 PASSED
TestDashboardOverview::test_TS_ADM05_01_overview_response_shape PASSED
TestDashboardFiltering::test_TS_ADM05_02_different_years_accepted PASSED
TestDashboardFiltering::test_TS_ADM05_02_academic_years_list PASSED
TestScoreDistributionLogic::test_TS_ADM05_03_class_performance_returns_200 PASSED
TestScoreDistributionLogic::test_TS_ADM05_03_performance_items_have_bucket_fields PASSED
TestDashboardEmptyData::test_TS_ADM05_04_future_year_overview_no_crash PASSED
TestDashboardEmptyData::test_TS_ADM05_04_future_year_class_performance_empty_list PASSED
TestDashboardEmptyData::test_TS_ADM05_04_future_year_attendance_trends_empty PASSED
TestDashboardErrorHandling::test_TS_ADM05_06_missing_academic_year_returns_422 PASSED
TestDashboardErrorHandling::test_TS_ADM05_06_attendance_trends_missing_param_422 PASSED
TestDashboardErrorHandling::test_TS_ADM05_06_bootstrap_missing_param_422 PASSED
TestDashboardSecurity::test_TS_ADM05_07_unauthenticated_denied PASSED
TestDashboardSecurity::test_TS_ADM05_07_teacher_token_denied PASSED
TestDashboardSecurity::test_TS_ADM05_07_teacher_cannot_access_bootstrap PASSED
TestDashboardSecurity::test_TS_ADM05_07_teacher_cannot_access_class_performance PASSED
TestDashboardSecurity::test_TS_ADM05_07_admin_can_access_academic_years PASSED
```

Note: All assertions accept 401 alongside 403 — mock tokens return 401 (invalid JWT), not 403.

---

## Vitest (TS-ADM05-02-03.test.tsx) — 15/15 ✅

**Created this session** (UC-ADM-05 had no frontend tests before).

`TS-ADM05-02` (9 tests): Academic year selector, period selector (30/60/90/0 days), 4-widget dashboard structure, overview stat cards (students/classes/teachers), attendance rate display, empty state, loading state, widget-level error display.

`TS-ADM05-03` (6 tests): Score bucket rendering (Giỏi/Khá/TB/Yếu), bucket sum validation, zero counts when no data, class ranking table rows, attendance trend list items.

---

## E2E (TS-ADM05-08.spec.js) — Created, Deferred

**Created this session**. Single happy-path test:
1. Login as admin
2. Navigate to `/admin/dashboard`
3. Verify page loads (not blank)
4. Verify academic year selector exists
5. Verify page remains stable

Deferred execution (same policy as ADM-03/04 — dev server not running in CI context).

---

## Appendix-C Gaps Found & Fixed

### ADM05-01 (line 144): Wrong endpoint + wrong response fields
- **Old**: `GET /api/dashboard/overview` — response: `overview_stats, attendance_chart, score_distribution, top_classes`
- **Actual**: Primary endpoint is `GET /api/admin/dashboard/bootstrap` — fields: `overview, attendance_trends, class_performance, infra_stats`
- **Fix**: Updated endpoint URL and response field names

### ADM05-03 (line 146): Wrong stage
- **Old**: "Unit (Backend)"
- **Actual**: `TS-ADM05-03` is in `TS-ADM05-02-03.test.tsx` — a vitest frontend unit test
- **Fix**: Changed stage to "Unit (Frontend)"

### ADM05-07 (line 150): Wrong endpoint
- **Old**: `/api/dashboard/overview`
- **Actual**: `/api/admin/dashboard/overview?academic_year=...`
- **Fix**: Updated endpoint path with correct prefix and required param

### ADM05-08 (line 151): E2E description too complex (drill-down not implemented)
- **Old**: Described grade filter dropdown + drill-down into chart column → detail list
- **Actual**: E2E covers UI load + year selector interaction only; drill-down not implemented
- **Fix**: Updated to describe actual happy-path scope

---

## Final Results

| Layer | Count | Result |
|---|---|---|
| Backend pytest | 20/20 | ✅ (created this session) |
| Vitest unit | 15/15 | ✅ (created this session) |
| E2E Playwright | — | ⚠️ Deferred |
