# Admin Dashboard Filter Redesign Plan

## Problem Analysis

### What each filter currently claims to affect vs what it actually does

| Data block | `academic_year` used? | `period_days` used? | Issue |
|---|---|---|---|
| `total_students` | ❌ counts ALL active | ❌ | Misleading: changes when year changes |
| `total_teachers` | ❌ counts ALL active | ❌ | Same — purely global |
| `total_classes` | ✅ filtered by year | ❌ | Correct |
| `attendance_rate` | ❌ ignored | ✅ `now - N days` | Bug: past year → rate is for TODAY's N days, not that year |
| `attendance_trends` | ❌ ignored | ✅ `now - N days` | Same bug |
| `class_performance` | ✅ filtered by year | ❌ | Correct |
| `infra_stats` | ❌ global | ❌ | Correct — always system-wide |

### The `Thời kỳ` semantic problem
- "Last 30 days" is only meaningful when viewing the **current academic year**.
- If a user selects the year "2023-2024", the backend still returns attendance for the last 30 calendar days (which is in 2025/26), not for that past year at all.
- A past year should show **Toàn bộ** = the full span of that academic year.

---

## Planned Solution

### Filter grouping

**Header keeps: `Năm học` only** (+ Refresh)  
→ This filter scopes `total_classes` and `class_performance`.  
→ It also controls the date window for attendance: current year = period-selectable, past year = full year.

**`Thời kỳ` moves to: inside the Attendance tab** as an inline filter.  
→ Only attendance data respects it, so it belongs next to that data.  
→ Locked to "Toàn bộ" automatically when a past year is selected.

**`attendance_rate` in OverviewCards** switches to full-year rate  
→ Makes educational sense: "What was the school-wide attendance rate this academic year?"  
→ Sub-label: "Năm học {year}" instead of "{N} ngày gần nhất"

---

## Concrete Changes

### Backend (`backend/admin/api.py`) — bootstrap endpoint

1. **Overview `attendance_rate`**: Use full academic year date range instead of `period_days`.
   - Current year: `{year}-09-01` to today
   - Past year: `{year}-09-01` to `{year+1}-06-30`
   - Remove `period_days` from this calculation; remove `period_days` from overview response.

2. **Attendance trends `period_days`**: Keep, but add `period_days=0` sentinel = "Toàn bộ" (full year span).
   - If `period_days == 0`: use the academic year's full date range
   - Otherwise: use `now - period_days` (current year only)

3. **Separate bootstrap query params**: 
   - `academic_year` (required)
   - `period_days` (optional, default 30, 0 = full year) — used only by attendance trends

### Frontend hook (`useAdminDashboard.ts`)

1. Remove `selectedPeriod` / `handlePeriodChange` (no longer global state).
2. Add computed `isCurrentYear: boolean` = `selectedAcademicYear === settings.academic_year`.
3. Add `attendancePeriod: string` state — default `"30"` if current year, auto-set `"0"` when year is not current.
4. Add `handleAttendancePeriodChange` that only works when `isCurrentYear`.
5. Bootstrap call uses `attendancePeriod` instead of `selectedPeriod`.

### Frontend components

1. **`Header.tsx`**: Remove `selectedPeriod`, `onPeriodChange` props; remove "Thời kỳ" selector and its skeleton.

2. **`AttendanceTrendsTab.tsx`**: 
   - Add inline period selector: `7`, `30`, `90` days + "Toàn bộ"
   - Accept `isCurrentYear` prop — when false, selector is disabled and locked to "Toàn bộ"
   - Update chart title: show "Toàn bộ năm học" vs "{N} ngày gần nhất" based on period.

3. **`OverviewCards.tsx`**: 
   - `attendance_rate` sub-label → "Năm học {year}" (full year rate now)
   - Accept `selectedAcademicYear` prop for this label.

4. **`Dashboard.tsx`**: 
   - Pass `isCurrentYear`, `attendancePeriod`, `handleAttendancePeriodChange` to AttendanceTrendsTab.
   - Pass `selectedAcademicYear` to OverviewCards.

---

## File Change Checklist
- [ ] `backend/admin/api.py` — rework bootstrap attendance_rate + period_days=0 logic
- [ ] `frontend/src/hooks/admin-dashboard/useAdminDashboard.ts` — remove selectedPeriod, add attendancePeriod + isCurrentYear
- [ ] `frontend/src/components/admin-dashboard/Header.tsx` — remove Thời kỳ controls
- [ ] `frontend/src/components/admin-dashboard/AttendanceTrendsTab.tsx` — add inline period selector with lock
- [ ] `frontend/src/components/admin-dashboard/OverviewCards.tsx` — update attendance_rate sub-label
- [ ] `frontend/src/pages/admin/Dashboard.tsx` — update props threading
