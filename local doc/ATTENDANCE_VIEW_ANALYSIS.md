# AttendanceView Refactoring Analysis

## Executive Summary

The `useAttendanceData` hook is a **god hook** with **34 returned items** that violates the Rule-of-Refactor principle. It mixes:
- API data fetching logic (domain logic)
- Pagination logic (reusable utility)
- Edit form state (UI state)
- Leave request modal state (modal UI state)
- 4 different loading states with unclear responsibilities

This creates high cognitive load, poor separation of concerns, and makes testing/maintenance difficult.

---

## Current Structure Analysis

### 1. useAttendanceData Hook (Lines 1-750+)

#### What It Does
```
States managed: 18 separate useState() calls
Functions returned: 34 items
Responsibilities: 5+ distinct concerns
```

#### State Breakdown

| Category | Items | Location |
|----------|-------|----------|
| **Data States** | `attendanceRecords`, `stats`, `classes`, `homeroomClasses`, `academicYears` | Lines 72-76 |
| **Loading States** | `loading`, `bootstrapLoading`, `classesLoading`, `updating` | Lines 79-82 |
| **UI States** | `error`, `successMessage` | Lines 85-86 |
| **Filter States** | `selectedDate`, `selectedClass`, `selectedStatus`, `selectedAcademicYear`, `showFullList`, `page`, `pageSize` | Lines 89-95 |
| **Edit States** | `editingRecord`, `editStatus`, `editNotes` | Lines 98-100 |
| **Leave Request States** | `leaveRequestOpen`, `leaveRequestRecord` | Lines 103-104 |

#### Returned Items (34 Total)

**Data (5):**
- `attendanceRecords`, `stats`, `classes`, `homeroomClasses`, `academicYears`

**Loading States (4):**
- `loading`, `bootstrapLoading`, `classesLoading`, `updating`

**UI States (2):**
- `error`, `successMessage`

**Filter States (7):**
- `selectedDate`, `selectedClass`, `selectedStatus`, `selectedAcademicYear`, `showFullList`, `page`, `pageSize`

**Edit States (3):**
- `editingRecord`, `editStatus`, `editNotes`

**Handlers (8):**
- `handleDateChange`, `handleClassChange`, `handleStatusChange`, `handleViewModeChange`, `handleEditRecord`, `handleCancelEdit`, `handleSaveEdit`, `resetFilters`

**Bootstrap Functions (3):**
- `attendanceBootstrap`, `loadAttendanceData`, `loadStats`

**Leave Request Handlers (3):**
- `handleOpenLeaveRequest`, `handleLeaveRequestClose`, `handleLeaveRequestUploadSuccess`

**Setters (5):** 
- `setSelectedAcademicYear`, `setPage`, `setPageSize`, `setEditStatus`, `setEditNotes`

**Helpers (2):**
- `isEditingRecord`, `getRecordKey`, `calculateStatsFromData`

---

## Component Hierarchy & Prop Drilling

```
AttendanceView.tsx
├── useAttendanceData() [34 items destructured]
│   └── Uses: 28 items directly
│       └── Passes to children: 25+ props across 4 components
│
├── AttendanceStats
│   ├── Props: stats
│   └── Logic: Display only (no state)
│
├── AttendanceFilters
│   ├── Props: 12 items (selectedDate, selectedClass, selectedStatus, etc.)
│   ├── Handlers: 6 callbacks (onDateChange, onClassChange, etc.)
│   └── Logic: Filter controls
│
├── AttendanceTable
│   ├── Props: 17 items distributed to child rows
│   ├── State management: 
│   │   ├── pagination (local calc)
│   │   ├── loading display
│   │   └── record editing
│   └── Handlers: 8+ callbacks passed to rows
│
└── LeaveRequestModal
    ├── Props: 6 items (studentId, studentName, targetDate, etc.)
    ├── State: Local file upload state (internal)
    └── Callbacks: onUploadSuccess
```

### Prop Drilling Issues

```
AttendanceView
│
├─→ AttendanceFilters (12 props + 6 handlers = 18 total)
│
├─→ AttendanceTable (17 props + 8 handlers = 25 total)
│   │
│   └─→ AttendanceTableRow (12 props + 5 handlers = 17 total)
│       ├─ Values: record, index, isEditing, editStatus, editNotes, updating
│       ├─ Handlers: onEdit, onCancel, onSave, onStatusChange, onNotesChange, onOpenLeaveRequest
│       └─ Context: isHomeroomTeacher
│
└─→ LeaveRequestModal (6 props + 1 handler)
```

---

## Loading State Issues

### 4 Loading States With Unclear Purposes

| State | Triggered | Cleared | Used Where | Purpose |
|-------|-----------|---------|-----------|---------|
| `loading` | Start of `loadAttendanceData()` | End of `loadAttendanceData()` | AttendanceView spinner, AttendanceTable | Data loading |
| `bootstrapLoading` | Start of `attendanceBootstrap()` | End of `attendanceBootstrap()` | Effect dependencies to prevent reload | Bootstrap phase |
| `classesLoading` | Start of `attendanceBootstrap()` | End of `attendanceBootstrap()` | AttendanceFilters UI disabled state | Classes loading |
| `updating` | Start of `handleSaveEdit()` | End of `handleSaveEdit()` | AttendanceTableRow buttons | Record update |

### Spinner Location

**Initial Loading Spinner:**
```tsx
// AttendanceView.tsx, lines 70-77
if (loading && attendanceRecords.length === 0) {
  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
      </div>
    </div>
  );
}
```

**Inline Spinners:**
- Line 150 (AttendanceTable): "..." text when `updating=true`
- Line 165 (AttendanceTable): Small spinner in empty row when `loading=true`

### Problems
1. **`loading` resets on every filter change** → User sees spinner every time they change date/class/status
2. **`bootstrapLoading` not used properly** → Loaded but not reflected in UI feedback to user
3. **`classesLoading` only disables select** → No visual feedback that classes are loading
4. **Multiple spinners** → No consistent UX pattern

---

## State Management Issues by Category

### 1. Data Fetching Logic (Should be isolated)

**Current:** Mixed in hook with everything else
```tsx
// Lines 175-300+
const loadAttendanceData = async (): Promise<void> => {
  setLoading(true);
  // ... 100+ lines of complex logic:
  // - Conditional API calls based on showFullList
  // - Conditional calls based on user role
  // - Multiple response mapping paths
  // - Stats calculation
  // - Records filtering
}
```

**Problem:** 
- Complex business logic embedded in hook
- Hard to test independently
- Mixed concerns: API calls + data transformation + filtering

### 2. Pagination Logic (Should be reusable)

**Current:** 
- `page`, `pageSize` states in hook
- Pagination calculation in `AttendanceTable` (lines 107-110):
```tsx
const totalRecords = records.length;
const totalPages = Math.ceil(totalRecords / pageSize);
const startIndex = (page - 1) * pageSize;
const paginatedRecords = records.slice(startIndex, pageSize);
```

**Problem:**
- Pagination logic duplicated if needed elsewhere
- Not reusable
- Should be extracted to generic `usePagination` hook (like homeroom dashboard model)

### 3. Edit Form State (UI state - correct location, but poorly organized)

**Current:** 
- `editingRecord`, `editStatus`, `editNotes` in hook
- Handlers: `handleEditRecord`, `handleCancelEdit`, `handleSaveEdit`

**Problem:**
- Edit state should stay in hook (correct)
- BUT handlers do too much:
  - `handleSaveEdit()` makes API call AND reloads all data AND updates records
  - Should separate API logic from state management

### 4. Leave Request Modal State (Misplaced)

**Current:** In hook:
- `leaveRequestOpen`, `leaveRequestRecord`
- `handleOpenLeaveRequest`, `handleLeaveRequestClose`, `handleLeaveRequestUploadSuccess`

**Problem:**
- Modal state doesn't belong in data hook
- Should be UI responsibility of component
- Violates separation of concerns
- Modal handles its own file upload - state should be local to modal

### 5. Filter States (UI logic - mostly correct, but scattered)

**Current:** In hook with handlers
- `selectedDate`, `selectedClass`, `selectedStatus`, `selectedAcademicYear`, `showFullList`
- Handlers manage these AND trigger data reloads

**Problem:**
- When filter changes → clears records + stats + errors + edit state
- Too much cascading in handlers (see lines 340-365)
- Tight coupling between filter UI and data fetching

---

## Hook Responsibilities Violation

```
Single Responsibility Principle VIOLATIONS:

1. API Data Fetching (attendanceBootstrap, loadAttendanceData, loadStats)
2. Pagination Logic (page, pageSize state + calc in component)
3. Edit Form State Management (editingRecord, editStatus, editNotes)
4. Edit Form API Calls (handleSaveEdit API integration)
5. Leave Request Modal State (leaveRequestOpen, leaveRequestRecord, ...handlers)
6. Leave Request Modal API (onUploadSuccess triggers record update)
7. Filter Logic (selectedDate, selectedClass, selectedStatus, showFullList)
8. Filter Handlers (date change, class change, status change - all reset CASCADE)
9. Auth Context Access (used for role checks, should be parameter)
10. Statistics Calculation (calculateStatsFromData - pure function in hook)
```

**Violations Found:** 10 distinct responsibilities

---

## Rule-of-Refactor Violations

### Rule 1: Complex Domain Logic → Move to Custom Hook ✗ VIOLATED

**Current:** `useAttendanceData` contains:
- API call logic (bootstrap, loadAttendanceData, loadStats)
- Response transformation
- Stats calculation
- Complex conditional logic (200+ lines in loadAttendanceData)

**Should be:** Separate domain logic hook

### Rule 2: Repeated Logic → Move to Reusable Hook ✗ VIOLATED

**Current:** Pagination logic:
- Calculation in 4 lines inline in `AttendanceTable`
- Same logic would be needed in any other paginated list

**Should be:** Generic `usePagination` hook (like homeroom dashboard)

### Rule 3: UI State → Keep in Component ✓ MOSTLY CORRECT

**Current:** Filter states in hook (debatable)
- Could be component state if filters only affect local display
- But filters trigger API calls → Justified to stay in hook

**Should be:** Keep in hook since they drive data fetching

### Rule 4: Component Too Long → Break into Child Components ✓ CORRECT

**Current:** Already broken into:
- AttendanceStats (display only)
- AttendanceFilters (controls)
- AttendanceTable (list + pagination)
- AttendanceTableRow (individual record)

**Should improve:** 
- AttendanceTable could delegate more to child components
- AttendanceTableRow could use a sub-component for edit mode

---

## Component Responsibilities Breakdown

### AttendanceView.tsx

**Correct Responsibilities:**
- Page layout
- Error/success message display
- Coordinates between sub-components
- Initial loading spinner

**Problems:**
- Destructures 28+ items from hook
- Heavy cognitive load
- All prop drilling happens here

### AttendanceStats.tsx

**Status:** ✓ Clean
- Pure display component
- Takes stats prop only
- No internal state

### AttendanceFilters.tsx

**Correct Responsibilities:**
- Render filter controls
- Call handler callbacks

**Problems:** ✓ Actually clean
- Takes many props but all are simple (strings, booleans)

### AttendanceTable.tsx

**Problems:**
- Duplicates pagination logic inline (lines 107-110)
- Manages pagination state indirectly via props
- Should use `usePagination` hook

**Correct:**
- Separates concerns: maps records to rows

### AttendanceTableRow.tsx

**Status:** ✓ Clean but could be simpler
- Takes 12 props + 5 handlers
- Displays record or edit form
- Two modes: view and edit
- Could split edit mode to separate component

### LeaveRequestModal.tsx

**Status:** ✓ Good isolation
- Internal file upload state
- Handles its own UI
- Only problem: triggered from hook instead of component

---

## Issues Summary & Refactoring Strategy

### Critical Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| Hook returns 34 items (god hook) | 🔴 Critical | Unmaintainable, hard to test |
| 100+ line `loadAttendanceData()` | 🔴 Critical | Complex, error-prone, untestable |
| 4 loading states (unclear purpose) | 🔴 Critical | Confusing UX, maintenance nightmare |
| Pagination logic duplicated | 🔴 Critical | Not reusable, maintenance risk |
| Leave request state in data hook | 🟠 Major | Violates separation of concerns |
| Heavy prop drilling | 🟠 Major | Hard to refactor, performance risk |
| Cascading resets in handlers | 🟠 Major | Unexpected side effects |

---

## Recommended Refactoring Plan

### Phase 1: Extract Specialized Hooks

**1.1. Create `useAttendanceAPI.ts` (Domain Logic Hook)**

Move from `useAttendanceData`:
- `attendanceBootstrap()`
- `loadAttendanceData()`
- `loadStats()`
- `calculateStatsFromData()`
- Error handling for API calls

Returns:
```tsx
{
  // Data
  attendanceRecords,
  stats,
  classes,
  homeroomClasses,
  academicYears,
  
  // Loading
  loading,
  bootstrapLoading,
  classesLoading,
  updating,
  
  // Errors
  error,
  successMessage,
  
  // API functions
  fetchBootstrap,
  fetchAttendanceRecords,
  fetchStats,
  updateAttendance,
  
  // Setters for new data
  setCurrentRecords,
  setCurrentStats,
  setError,
  clearSuccess
}
```

**1.2. Create `usePagination.ts` (Reusable Utility)**

Generic pagination hook:
```tsx
function usePagination<T>(items: T[], pageSize: number = 20) {
  const [page, setPage] = useState(1);
  
  return {
    page,
    pageSize,
    totalPages: Math.ceil(items.length / pageSize),
    paginatedItems: items.slice((page - 1) * pageSize, page * pageSize),
    setPage,
    setPageSize
  };
}
```

**1.3. Create `useAttendanceFilters.ts` (Filter Logic)**

Move from `useAttendanceData`:
- Filter states: `selectedDate`, `selectedClass`, `selectedStatus`, `selectedAcademicYear`, `showFullList`
- Filter handlers
- Reset logic

Returns:
```tsx
{
  selectedDate,
  selectedClass,
  selectedStatus,
  selectedAcademicYear,
  showFullList,
  
  setSelectedDate,
  setSelectedClass,
  setSelectedStatus,
  setSelectedAcademicYear,
  setShowFullList,
  
  handleDateChange: (date) => {...},
  handleClassChange: (class) => {...},
  handleStatusChange: (status) => {...},
  handleViewModeChange: (showFull) => {...},
  resetFilters: () => {...}
}
```

**1.4. Create `useAttendanceEdit.ts` (Edit Form Logic)**

Move from `useAttendanceData`:
- Edit states: `editingRecord`, `editStatus`, `editNotes`
- Edit handlers: `handleEditRecord`, `handleCancelEdit`, `handleSaveEdit`

Returns:
```tsx
{
  editingRecord,
  editStatus,
  editNotes,
  
  isEditing: (record) => boolean,
  setEditStatus,
  setEditNotes,
  
  startEdit: (record) => void,
  cancelEdit: () => void,
  saveEdit: () => Promise<boolean>,
  getRecordKey: (record) => string | null
}
```

**1.5. Move Leave Request State to Component**

Remove from `useAttendanceData`:
- `leaveRequestOpen`, `leaveRequestRecord`
- Leave request handlers

Move to `AttendanceView` as local state:
```tsx
const [leaveRequestOpen, setLeaveRequestOpen] = useState(false);
const [leaveRequestRecord, setLeaveRequestRecord] = useState(null);
```

### Phase 2: Update AttendanceView.tsx

After extraction, new structure:

```tsx
export default function AttendanceView() {
  const authContext = useContext(AuthContext);
  
  // Data fetching
  const apiHook = useAttendanceAPI(authContext);
  
  // Filtering
  const filters = useAttendanceFilters();
  
  // Pagination
  const pagination = usePagination(apiHook.attendanceRecords, 20);
  
  // Edit form
  const editForm = useAttendanceEdit(apiHook);
  
  // Leave request (local UI state)
  const [leaveRequestOpen, setLeaveRequestOpen] = useState(false);
  const [leaveRequestRecord, setLeaveRequestRecord] = useState(null);
  
  // Only destructure what we use
  const {
    attendanceRecords,
    stats,
    classes,
    loading,
    error,
    successMessage
  } = apiHook;
  
  // ... render with simplified prop passing
}
```

### Phase 3: Simplify Loading States

After hook split, identify correct loading states:

```
- apiHook.loading: Initial data load
- apiHook.bootstrapLoading: Bootstrap data load
- apiHook.classesLoading: Classes dropdown load
- editForm.updating: Edit record save
```

Use these intelligently:
- Show initial spinner only when `loading && !records.length`
- Show disabled state on dropdowns for `classesLoading`
- Show saving indicator in button for `updating`
- Abstract spinner UI to reusable component

### Phase 4: Update Components

**AttendanceTable.tsx:**
- Use `usePagination` hook instead of inline logic
- Simplify prop list

**AttendanceTableRow.tsx:**
- Leave as-is (already clean)
- Or create `AttendanceTableRowEditMode.tsx` sub-component

**AttendanceFilters.tsx:**
- Leave as-is (already clean)

**LeaveRequestModal.tsx:**
- Leave as-is (modal state is internal)

---

## Refactoring Checklist

- [ ] Create `useAttendanceAPI.ts` - extract API functions
- [ ] Create `usePagination.ts` - generic pagination
- [ ] Create `useAttendanceFilters.ts` - filter logic
- [ ] Create `useAttendanceEdit.ts` - edit form logic
- [ ] Update `AttendanceView.tsx` - use new hooks
- [ ] Update `AttendanceTable.tsx` - use `usePagination`
- [ ] Remove Leave Request state from hook
- [ ] Reduce hook return items from 34 to < 15 per hook
- [ ] Add tests for each hook
- [ ] Update TypeScript types
- [ ] Remove unused setters from new hooks
- [ ] Test integration between hooks
- [ ] Verify loading states all work correctly

---

## Expected Benefits After Refactoring

| Benefit | Before | After |
|---------|--------|-------|
| Hook complexity | 34 items returned | 8-10 per hook |
| Testing | Hard (mixed concerns) | Easy (isolated single responsibility) |
| Reusability | `usePagination` duplicated everywhere | Can use in any list |
| Maintainability | Cognitive load: 🔴 High | Cognitive load: 🟢 Low |
| Debugging | Hard (unclear data flow) | Easy (clear data flow) |
| Code clarity | Confused developers | Self-documenting |
| Performance | Potential re-renders on any state change | Isolated re-render scope |
| Testing coverage | Skip complex hook tests | All logic testable |
