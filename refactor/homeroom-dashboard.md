# Homeroom Dashboard Refactoring Evaluation

**Status**: ANALYSIS COMPLETE  
**Priority**: HIGH  
**Complexity**: MEDIUM  

---

## 1. DATA FETCHING LOCATION ANALYSIS

### Current Implementation
- **Data Fetching**: `useHomeroomData` hook is called at `Dashboard.tsx` (page level)
- **Data Scope**: Manages ALL dashboard data (students, stats, top absent/late, academic years, classes)
- **Consumption Pattern**: All data is passed down to 5 sub-components as props

### Detailed Component-by-Component Analysis

#### Header Component
**Currently Receives**: 14 props (academic years, classes, selection states, handlers, loading flag)
```
selectedClass, selectedClassId, selectedAcademicYear, selectedMonth, selectedYear,
academicYears, teacherClasses, onClassChange, onAcademicYearChange, onMonthChange, onYearChange, loading
```

**Data Responsibility**:
- Display options for academic year selection (from API)
- Display options for class selection (from API)
- Manage current selections (local state OK)
- Display title with current class name

**Issue**: Selections (`selectedAcademicYear`, `selectedMonth`, `selectedYear`) are UI-only state that triggers refetch.
- `selectedMonth`, `selectedYear` are NOT API-dependent, purely local filter UI state ✓
- `selectedAcademicYear`, `selectedClass` ARE dependent on API data ✗

**Recommendation**: Keep filter selections in Dashboard, but these are trigger filters, not source data.

---

#### StatsCards Component
**Currently Receives**: 3 props (students[], attendanceStats, loading)

**Data Responsibility**:
- Display calculated statistics (total students, absent count, late count, attendance rate)

**Issue**: Statistics are DERIVED from `students[]` array
- `attendanceStats` is calculated in the hook from `students[]`
- Could this be calculated at component level? YES, but keeping in hook is reasonable for consistency
- NO external data fetching needed - just display

**Recommendation**: ✓ Current approach is acceptable (derived data in hook for DRY principle)

---

#### TopAbsentLateCard Component (2 instances)
**Currently Receives**: 8 props (title, description, data[], badgeVariant, selectedMonth, selectedYear, countKey, loading)

**Data Responsibility**:
- Display top 10 absent/late students
- Data is pre-fetched and sorted in hook

**Issue**: `selectedMonth` and `selectedYear` are passed but ONLY used in the description
- This is UI-only display, doesn't trigger refetch
- Component doesn't need these - they're just display text

**Recommendation**: Remove `selectedMonth`, `selectedYear` from props sent to component
- Let Dashboard pass `description={`Top vắng tháng ${month}/${year}`}` instead
- Simplifies component

---

#### StudentGrid Component
**Currently Receives**: 9 props (homeroomInfo, students, currentPage, studentsPerPage, currentStudents, totalPages, onPageChange, onViewAll, loading)

**Data Responsibility**:
- Display paginated student list
- Handle pagination change
- Trigger "View All" modal

**Issues**:
1. Receives both `students[]` AND `currentStudents[]` - redundant
2. Receives `studentsPerPage` as prop but it's hardcoded to 12
3. Pagination logic is in Dashboard with `usePagination` hook ✓

**Recommendation**: 
- Remove `students` prop (not used in render)
- Remove `studentsPerPage` prop (hardcoded constant)
- Keep pagination in Dashboard (correct layer)

---

#### AllStudentsModal Component
**Currently Receives**: 4 props (open, onOpenChange, homeroomInfo, students)

**Data Responsibility**:
- Display all students in modal
- No data fetching needed

**Assessment**: ✓ Minimal, appropriate props. No issues.

---

### Data Fetching Architecture Assessment

**Current Model: CENTRALIZED at Page Level** ✓
```
Dashboard.tsx (calls useHomeroomData)
  ↓
useHomeroomData hook (all API calls)
  ↓
Returns: loading, students[], stats, topAbsent[], topLate[], academicYears[], classes[]
  ↓
Props distributed to: Header, StatsCards, TopAbsentLateCard×2, StudentGrid, AllStudentsModal
```

**Assessment**:
- ✓ **CORRECT**: Centralized data fetching avoids redundant API calls
- ✓ **CORRECT**: Single source of truth for dashboard state
- ✓ **CORRECT**: useHomeroomData remains at hook level (not in Dashboard component)
- ✗ **ISSUE**: Passing too many props (prop drilling partially present)
- ✗ **ISSUE**: Some props are UI-only, not data-dependent

### RECOMMENDATIONS - Data Fetching Location

1. **KEEP** `useHomeroomData` at Dashboard level ✓
   - Rationale: All sections depend on same class/academic-year filters
   - Would be inefficient to fetch separately

2. **REDUCE** unnecessary prop passing in Header
   - Remove `selectedClassId` from Header (returned by `onClassChange` callback)
   - Keep `selectedClass` for UI display only

3. **REMOVE** time-based props from TopAbsentLateCard
   - Pass formatted description string instead of month/year
   - Simplifies component interface

---

## 2. LOGIC LAYER PRIORITIZATION

### Current Logic Distribution

#### Dashboard.tsx (Page Component)
- **UI Filters**: `selectedDate`, `selectedMonth`, `selectedYear`, `showAllStudents` ✓
- **Trigger Filters**: `selectedAcademicYear`, `selectedClass`, `selectedClassId` ✓
- **Data Management**: Calls `useHomeroomData`, receives all data
- **Pagination**: Uses `usePagination` hook ✓
- **Coordination**: useEffect to trigger refetch when filters change ✓

#### useHomeroomData Hook
- **API Layer**: Calls API endpoints ✓
- **Data Transformation**: Maps API responses to component-friendly formats ✓
- **Calculation**: Calculates `attendanceStats` from `students[]` ✓
- **Sorting**: Sorts `top_absent`, `top_late` by student code ✓
- **State Management**: Manages all dashboard state ✓

#### Sub-Components
- **Header**: Filter UI + Selection handlers
- **StatsCards**: Static display of pre-calculated stats
- **TopAbsentLateCard**: Static list display
- **StudentGrid**: Pagination UI + Grid layout
- **AllStudentsModal**: Static modal display

### Logic Placement Issues Identified

#### Issue #1: AttendanceStats Calculation Location
**Current**: Calculated in useHomeroomData
```javascript
const calculateAttendanceStats = (studentList: StudentData[]): AttendanceStats => ({
  absent_count: studentList.reduce((sum, s) => sum + (s.absent_count || 0), 0),
  late_count: studentList.reduce((sum, s) => sum + (s.late_count || 0), 0),
  attendance_rate: 0,
});
```

**Assessment**: ✓ CORRECT
- It's a DERIVED statistic from loaded data
- Used by StatsCards component exclusively
- Simple reduction operation (belongs in data layer)
- Alternative: Component could calculate (StatsCards), but adds logic to UI layer
- **Decision**: Keep in hook (DRY principle + data consistency)

---

#### Issue #2: Student Sorting Logic Location
**Current**: Sorts top_absent/top_late in hook by student code
```javascript
const sortByCodeAsc = (arr: TopAbsentLateStudent[]): TopAbsentLateStudent[] =>
  (arr || []).slice().sort((a, b) => parseInt(a.student_code) - parseInt(b.student_code));
```

**Assessment**: ✓ CORRECT
- Sorting is data transformation
- Ensures consistent order regardless of API response
- Applied once at fetch time (not re-applied on every render)
- **Decision**: Keep in hook (data layer responsibility)

---

#### Issue #3: Pagination Logic Location
**Current**: Dashboard uses `usePagination` hook to manage pages
```javascript
const {
  currentPage, totalPages, currentItems: currentStudents, handlePageChange
} = usePagination(students, 12);
```

**Assessment**: ✓ CORRECT
- `usePagination` is REUSABLE (not homeroom-specific)
- Dashboard coordinates pagination state
- StudentGrid is purely presentational
- **Decision**: Keep as is (correct separation)

---

#### Issue #4: Filter State Organization
**Current Distribution**:
```
Page Level (Dashboard):
  - selectedDate (UI-only, not used in API call)
  - selectedMonth (triggers refetch)
  - selectedYear (triggers refetch)
  - selectedAcademicYear (triggers refetch)
  - selectedClass (triggers refetch)
  - selectedClassId (triggers refetch)
  - showAllStudents (UI modal toggle)

Hook Level (useHomeroomData):
  - academicYears[] (from API)
  - teacherClasses[] (from API)
  - selectedClass (state setter in hook)
  - selectedClassId (state setter in hook)
  - selectedAcademicYear (state setter in hook)
```

**Assessment**: ⚠ PARTIALLY CORRECT with redundancy
- Month/Year in Dashboard are UI-only filters, not source queries
- But they trigger Dashboard → Hook refetch
- **Concern**: Some state lives in hook, some in Dashboard
  - Hook has `selectedAcademicYear` setter
  - Dashboard has local state versions too

**Issue**: Potential source of truth confusion
- Hook: `setSelectedAcademicYear` (in hook state)
- Dashboard: Calls this setter via handler 
- Hook: Returns `selectedAcademicYear` to Dashboard
- Dashboard: Uses returned value, not its own state

**Recommendation**:
1. **Keep hook setters** for bootstrap selections (academic year, class)
   - These affect API fetch parameters
   - Belong in data layer

2. **Keep component state** for UI-only filters (month, year, date)
   - These are display filters, not API parameters
   - Used locally for calculations/display

3. **Reduce ambiguity**: Document clearly which state affects API vs display

---

#### Issue #5: Modal Logic Location
**Current**: Dashboard manages `showAllStudents` modal state
```javascript
const [showAllStudents, setShowAllStudents] = useState(false);
// ...
<AllStudentsModal open={showAllStudents} onOpenChange={setShowAllStudents} .../>
```

**Assessment**: ✓ CORRECT
- Modal visibility is UI state (not data)
- Should remain in Dashboard or pass to StudentGrid
- Data (students[]) flows down appropriately

---

### Logic Layer Priority Recommendations

| Layer | Current | Status | Action |
|-------|---------|--------|--------|
| API/Data (useHomeroomData) | Stats calc, sorting, transformation | ✓ | KEEP |
| Data → Hook returns | All necessary data for components | ✓ | KEEP |
| Page (Dashboard) | Filter state, pagination, modal | ✓ | KEEP |
| Page → Component props | 14+ props to Header, 9 to StudentGrid | ⚠ | REDUCE |
| Component (Sub-components) | Display only | ✓ | KEEP |

---

## 3. SKELETON LOADING & LAYOUT SHIFT ANALYSIS

### Current Skeleton Implementation

#### Header Component Loading State
```javascript
if (loading) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard chủ nhiệm</h1>
        <p className="mt-1 text-gray-600">
          {selectedClass ? `Lớp ${selectedClass}` : 'Đang tải thông tin lớp...'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="w-40 h-10" /> {/* Academic Year */}
        <Skeleton className="w-48 h-10" /> {/* Class Dropdown */}
        <Skeleton className="w-24 h-10" /> {/* Month */}
        <Skeleton className="w-32 h-10" /> {/* Year */}
      </div>
    </div>
  );
}
```

**Layout Shift Issues**:
- ✓ Title stays visible during loading
- ✗ **ISSUE**: When loading ends, dropdown controls appear
  - Skeleton: `w-40 h-10, w-48 h-10, w-24 h-10, w-32 h-10` (4 controls)
  - Loading state: Shows 4 skeletons in flexbox
  - Loaded state: Shows Select components
  - Potential width mismatch if actual selects are different widths

**Expected Behavior**: Static structure visible immediately, controls load progressively

---

#### StatsCards Loading State
```javascript
if (loading) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, idx) => (
        <Card key={idx}>
          <CardContent className="p-6">
            <Skeleton /> {/* Icon */}
            <Skeleton /> {/* Label */}
            <Skeleton /> {/* Value */}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Assessment**: ✓ CORRECT
- Skeleton grid matches actual grid structure (1→2→4 columns)
- 4 skeleton cards = 4 actual stat cards
- No layout shift expected

**Improvement**: Could show 1-2 initial cards immediately (progressive load) but current approach is acceptable.

---

#### TopAbsentLateCard Loading State
```javascript
if (loading) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description} {selectedMonth}/{selectedYear}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[...Array(5)].map((_, idx) => (
            <div className="flex items-center justify-between p-2 border rounded">
              <Skeleton /> {/* Avatar */}
              <Skeleton /> {/* Name/Code */}
              <Skeleton /> {/* Count */}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Assessment**: ✓ CORRECT
- Card title and description shown immediately (static)
- 5 skeleton rows shown for list items
- Actual data also displays up to 10 items
- **Potential Issue**: If actual data has fewer than 5 items, content gets shorter after load

---

#### StudentGrid Loading State
```javascript
if (loading) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Học sinh lớp {homeroomInfo?.class_name}</CardTitle>
            <CardDescription>Danh sách học sinh – thống kê</CardDescription>
          </div>
          <Button>Xem tất cả</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, idx) => (
            <Skeleton /> {/* 6 skeleton cards for pagination page 1 */}
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Assessment**: ✓ CORRECT
- Header and "View All" button shown immediately
- 6 skeleton cards = 12 students per page / 2 columns initially
- Grid matches actual layout

---

#### AllStudentsModal
```javascript
// Always shows all students without skeleton
// Modal doesn't appear until explicitly triggered (onViewAll)
// No loading state needed for modal
```

**Assessment**: ✓ CORRECT
- Modal only opens when explicitly triggered
- Users won't see incomplete data
- No skeleton needed

---

### Overall Layout Shift Assessment

#### Critical Issues Found

**Issue #1: Header Loading State - Skeleton Width Mismatch**
```
Skeleton widths:  w-40, w-48, w-24, w-32
Actual selects:   min-w-[160px], variable width
```
- **Risk**: If actual Select components render with different widths, header shifts below
- **Severity**: MEDIUM
- **Fix**: Ensure skeleton widths exactly match rendered Select `min-width` values

---

**Issue #2: TopAbsentLateCard - Variable Data Length**
- **Current**: Shows 5 skeleton rows (assumes 5+ students in top list)
- **Real data**: Could be 0, 3, 8, 10 students
- **Risk**: If data has fewer items than skeleton rows, layout shifts up
- **Severity**: LOW (only affects this card section)
- **Fix**: Show skeleton count = actual data count (problem: need data before render)
  - Alternative: Always reserve space for 10 rows (max count)

---

**Issue #3: StudentGrid - Pagination Not Reflected in Skeleton**
- **Current**: Shows 6 skeletons for page 1
- **Problem**: Does NOT show pagination controls skeleton
- **On data load**: Pagination buttons appear below grid
- **Risk**: Layout shift if pagination controls take unexpected space
- **Severity**: MEDIUM
- **Fix**: Include pagination skeleton when showing grid skeleton

---

**Issue #4: Static vs Dynamic Element Timing**
- **Current**: Headers/titles visible during loading ✓
- **Problem**: Dropdowns/buttons HIDDEN during loading
- **Best Practice**: Show static structure immediately, placeholder for dynamic sections
- **Current approach is philosophical choice**: Either show entire skeleton OR show static parts
- **Current choice**: Show entire section skeleton (safer, less jarring)

---

### Skeleton Refactoring Recommendations

#### Recommendation 1: Header Dropdown Skeletons
**Current Issue**: Skeleton widths may not match Select component widths

**Action**:
```jsx
// BEFORE
<Skeleton className="w-40 h-10" />  // Academic year
<Skeleton className="w-48 h-10" />  // Class 
<Skeleton className="w-24 h-10" />  // Month
<Skeleton className="w-32 h-10" />  // Year

// AFTER - Match exact Select widths
<Skeleton className="min-w-[160px] h-10" />  // matches min-w-[160px]
<Skeleton className="min-w-[180px] h-10" />  // matches class dropdown
<Skeleton className="w-28 h-10" />
<Skeleton className="w-36 h-10" />
```

**Priority**: MEDIUM

---

#### Recommendation 2: SmartTopAbsentLateCard - Flexible Skeleton
**Issue**: Skeleton count doesn't match data count

**Solution Options**:
1. **Show fixed-size list (safer)**: Always show 5-10 skeleton rows
   - User expects "loading a list"
   - Works for most cases
   
2. **Show data-responsive (requires logic change)**:
   - Wait for data before rendering to know count
   - Or show max 10 rows, variable fill

**Current implementation is acceptable**, but could improve:
```jsx
// Option: Reserve space for full possible list
{[...Array(10)].map((_, idx) => (
  <SkeletonRow key={idx} />
))}
```

**Priority**: LOW (current approach acceptable)

---

#### Recommendation 3: StudentGrid - Include Pagination Skeleton
**Issue**: Pagination controls appear after data loads

**Fix**:
```jsx
// Before: Grid skeleton only
{loading && (
  <>
    {/* Grid skeleton for 6 cards */}
    {/* Missing: Pagination skeleton */}
  </>
)}

// After: Include pagination skeleton
{loading && (
  <>
    {/* Grid skeleton for 6 cards */}
    <div className="flex items-center justify-center mt-6 space-x-2">
      <Skeleton className="w-20 h-10" /> {/* Prev button */}
      <Skeleton className="w-8 h-10" /> {/* Page 1 */}
      <Skeleton className="w-8 h-10" /> {/* Page numbers */}
      <Skeleton className="w-8 h-10" />
      <Skeleton className="w-20 h-10" /> {/* Next button */}
    </div>
  </>
)}
```

**Priority**: MEDIUM

---

#### Recommendation 4: Date Picker Card
**Issue**: SimpleDatePicker has loading state?
**Status**: NEEDS REVIEW
- Calendar date picker should function even while other data loads
- If disabled during loading: Add disabled skeleton
- If always enabled: No skeleton needed

**Priority**: LOW (depends on SimpleDatePicker behavior)

---

### Summary: Loading State Quality

| Component | Skeleton Match | Layout Shift Risk | Priority |
|-----------|---|---|---|
| Header | ⚠ Widths need verification | MEDIUM | FIX |
| StatsCards | ✓ Perfect match | LOW | OK |
| Date Picker | ? Unknown | LOW | REVIEW |
| TopAbsentLateCard | ⚠ Variable item count | LOW | CONSIDER |
| StudentGrid | ⚠ Missing pagination | MEDIUM | FIX |
| AllStudentsModal | ✓ Not applicable | N/A | OK |

---

## REFACTORING CHECKLIST

### Phase 1: Reduce Prop Drilling (QUICK WINS)

- [ ] **Header Component**
  - Remove `selectedClassId` from props (returned by callback)
  - Remove passing `selectedMonth`, `selectedYear` to TopAbsentLateCard
  - Instead: Pass formatted `description` string prop

- [ ] **StudentGrid Component**
  - Remove `students` prop (not used in component)
  - Remove `studentsPerPage` prop (hardcoded constant)
  - Simplify to: `currentStudents`, `pagination props`

### Phase 2: Fix Layout Shift Issues (MEDIUM EFFORT)

- [ ] **Header Skeletons**
  - Verify/Adjust skeleton widths to match actual Select components
  - Test on different screen sizes

- [ ] **StudentGrid Pagination**
  - Add pagination control skeleton during loading state
  - Ensure pagination layout doesn't shift when data loads

- [ ] **TopAbsentLateCard**
  - Consider: Hide grid shift by reserving space for max items (10)
  - Or: Match skeleton count to API response count

### Phase 3: Documentation & Validation

- [ ] Update component prop documentation
- [ ] Add comments about hook responsibility (data fetching only)
- [ ] Test loading states on slow/medium network speeds
- [ ] Verify no console warnings from prop mismatches

---

## NOTES FOR NEXT PHASE

1. **Sub-component data fetching**: Not recommended here
   - All sections depend on same filters (academic year, class)
   - Would cause redundant API calls
   - Keep centralized in useHomeroomData ✓

2. **Progressive loading alternative**: Could show
   - Static header immediately
   - Stats cards with skeleton
   - Grid with skeleton (lower priority)
   - But current unified loading state is simpler and user-friendly

3. **Pagination at component vs page level**:
   - Currently at page level (Dashboard) ✓ CORRECT
   - usePagination is reusable
   - StudentGrid is presentational only

