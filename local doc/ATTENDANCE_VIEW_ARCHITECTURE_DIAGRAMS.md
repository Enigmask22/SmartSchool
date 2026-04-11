# AttendanceView Architecture Diagrams

## Current Architecture (Before Refactoring)

### Data Flow

```
User Action
    ↓
AttendanceView Component
    ↓
[useAttendanceData Hook - 34 ITEMS]
    │
    ├── Data States (5)
    │   ├── attendanceRecords
    │   ├── stats
    │   ├── classes
    │   ├── homeroomClasses
    │   └── academicYears
    │
    ├── Loading States (4)
    │   ├── loading
    │   ├── bootstrapLoading
    │   ├── classesLoading
    │   └── updating
    │
    ├── UI States (2)
    │   ├── error
    │   └── successMessage
    │
    ├── Filter States (7)
    │   ├── selectedDate
    │   ├── selectedClass
    │   ├── selectedStatus
    │   ├── selectedAcademicYear
    │   ├── showFullList
    │   ├── page
    │   └── pageSize
    │
    ├── Edit States (3)
    │   ├── editingRecord
    │   ├── editStatus
    │   └── editNotes
    │
    ├── Leave Request States (2)
    │   ├── leaveRequestOpen
    │   └── leaveRequestRecord
    │
    ├── Handlers (18)
    │   ├── Filter handlers (4)
    │   ├── Edit handlers (3)
    │   ├── Leave request handlers (3)
    │   ├── API functions (3)
    │   └── Setters (5)
    │
    └── Effects (3)
        ├── Load on filter change
        ├── Load on user change
        └── Initial bootstrap
    ↓
Heavy Prop Drilling to 4 Child Components
    ├─→ AttendanceStats (1 prop)
    ├─→ AttendanceFilters (12 props + 6 handlers)
    ├─→ AttendanceTable (17 props + 8 handlers)
    │   └─→ AttendanceTableRow (12 props + 5 handlers)
    └─→ LeaveRequestModal (6 props + 1 handler)
```

### Problem Zones

```
GOD HOOK PROBLEM:
┌─────────────────────────────────────────────────────┐
│         useAttendanceData (ALL Mixed In One)         │
│                                                     │
│  ✗ Domain Logic (API calls)                        │
│  ✗ Business Logic (data transformation)            │
│  ✗ Pagination Logic (reusable)                     │
│  ✗ Edit Form State (UI state)                      │
│  ✗ Modal State (UI state)                          │
│  ✗ Filter Management (domain + UI)                 │
│  ✗ 4 Loading states with unclear purpose           │
│  ✗ Error/Success messaging                         │
│                                                     │
│  Result: 34 items destroyed                        │
│          Impossible to test                         │
│          No reusability                            │
│          High maintenance cost                      │
└─────────────────────────────────────────────────────┘
```

---

## Proposed Architecture (After Refactoring)

### New Hook Organization

```
AttendanceView Component
    │
    ├── useAttendanceAPI [10 items]
    │   ├── Data: attendanceRecords, stats, classes, homeroomClasses, academicYears
    │   ├── Loading: loading, bootstrapLoading, classesLoading, updating
    │   ├── Errors: error, successMessage
    │   └── Functions: fetchBootstrap, fetchRecords, fetchStats, updateRecord
    │
    ├── useAttendanceFilters [11 items]
    │   ├── State: selectedDate, selectedClass, selectedStatus, selectedAcademicYear, showFullList
    │   ├── Handlers: handleDateChange, handleClassChange, handleStatusChange, 
    │   │             handleViewModeChange, resetFilters
    │   └── Setters: setSelectedDate, setSelectedClass, etc.
    │
    ├── usePagination [5 items - REUSABLE]
    │   ├── State: page, pageSize
    │   ├── Computed: paginatedItems, totalPages
    │   └── Handlers: setPage, setPageSize
    │
    ├── useAttendanceEdit [7 items]
    │   ├── State: editingRecord, editStatus, editNotes
    │   ├── Helpers: isEditingRecord, getRecordKey
    │   ├── Handlers: startEdit, cancelEdit, saveEdit
    │   └── Setters: setEditStatus, setEditNotes
    │
    └── Local UI State (in component)
        ├── leaveRequestOpen
        └── leaveRequestRecord

Total Items Across Hooks: 33 (from 34)
But NOW: Each hook has single responsibility
```

### Improved Data Flow

```
User Filter Change
    ↓
useAttendanceFilters
    ↓ (setter called)
    ↓
useAttendanceAPI (detects filter deps)
    ↓
API Call (isolated, testable)
    ↓
Update attendanceRecords
    ↓
usePagination (auto-updates with new array)
    ↓
Component Re-render (with correct loading state)
    ↓
Child Components (simpler prop lists)


User Edit Record
    ↓
useAttendanceEdit
    ↓ (startEdit called)
    ↓
Component shows edit form
    ↓
User clicks Save
    ↓
useAttendanceEdit.saveEdit()
    ├─→ useAttendanceAPI.updateRecord() [API call]
    ├─→ useAttendanceAPI.fetchRecords() [Refresh data]
    └─→ Clear edit state
    ↓
Component updates
```

---

## Hook Boundaries

### Before Refactoring: No Clear Boundaries
```
┌────────────────────────────────────────────────────────────────┐
│                    useAttendanceData                           │
│                    EVERYTHING MIXED IN                         │
│                                                                 │
│  API Logic                    ┌─────────────────┐             │
│  ├── bootstrap              │ Edit Form Logic │             │
│  ├── loadAttendanceData      │ ├── editingRec  │             │
│  ├── loadStats              │ ├── editStatus  │             │
│  ├── and data transform      │ ├── editNotes   │             │
│  │                           │ └── handlers    │             │
│  │      ↓                    └─────────────────┘             │
│  Filter Logic    ┌─────────────────────────┐                │
│  ├── dates       │  Leave Request Modal    │                │
│  ├── class/status│  ├── leaveRequestOpen  │                │
│  ├── pagination │  ├── leaveRequestRecord│                │
│  │              │  └── handlers          │                │
│  └── ...         └─────────────────────────┘                │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
        RESULT: Can't test API without modal state
                Can't use pagination elsewhere
                Can't understand data flow
```

### After Refactoring: Clear Boundaries
```
┌──────────────────────┐
│ useAttendanceAPI     │
│                      │
│ • API calls only     │
│ • Data fetching      │
│ • Error handling     │
│ • Transformations    │
│                      │
│ ← Easy to test       │
│ ← Easy to mock API   │
└──────────────────────┘

┌──────────────────────┐
│ usePagination        │
│                      │
│ • Generic pagination │
│ • Any data type <T>  │
│ • No domain logic    │
│                      │
│ ← REUSABLE anywhere  │
│ ← Pure calculations  │
└──────────────────────┘

┌──────────────────────┐
│ useAttendanceFilters │
│                      │
│ • Filter state only  │
│ • No API calls       │
│ • Simple handlers    │
│                      │
│ ← Easy to compose    │
│ ← UI state only      │
└──────────────────────┘

┌──────────────────────┐
│ useAttendanceEdit    │
│                      │
│ • Edit form state    │
│ • Record comparison  │
│ • Validation         │
│                      │
│ ← Isolated concern   │
│ ← Easy to test       │
└──────────────────────┘
```

---

## Loading State Clarity

### Current (Confusing)
```
┌─────────────────────────────────────────────────────┐
│              4 LOADING STATES                       │
│                                                     │
│ loading ─────────────┬─→ Used in initial spinner   │
│                      └─→ spinner in table body      │
│ bootstrapLoading ────→ In effect dependency       │
│ classesLoading ──────→ Disables select dropdown   │
│ updating ────────────→ Disables buttons in row    │
│                                                     │
│ Problem: Unclear semantics                        │
│ Problem: No async UI feedback                     │
│ Problem: Resets confuse users                     │
└─────────────────────────────────────────────────────┘

User sees spinner on EVERY filter change:
1. Select new date
2. UI shows spinner ← Annoying!
3. Data loads
4. Spinner disappears
5. User clicks class filter
6. Spinner shows again ← Annoying!
```

### Proposed (Clear)
```
┌────────────────────────────────────────────────┐
│      CLEAR LOADING STATE SEMANTICS             │
│                                                │
│ apiHook.loading (boolean)                     │
│   └─→ Show spinner only when no data yet      │
│       NOT on every refetch                     │
│                                                │
│ apiHook.bootstrapLoading (boolean)            │
│   └─→ Initial setup loading (hidden)          │
│                                                │
│ apiHook.classesLoading (boolean)              │
│   └─→ Disable class select + show spinner    │
│                                                │
│ editForm.updating (boolean)                   │
│   └─→ Disable save/cancel buttons             │
│   └─→ Show "Saving..." text                   │
│                                                │
│ Result: Predictable user experience           │
│ Result: No confusing spinners                 │
│ Result: Clear feedback on each action         │
└────────────────────────────────────────────────┘

User updates are now smooth:
1. Select new date
   └─→ No spinner (background fetch)
2. Table updates smoothly
3. User clicks class filter
   └─→ No spinner (background fetch)
4. Classes dropdown shows loading state
5. Results update
```

---

## Prop Drilling Comparison

### Current: Heavy Drilling
```
AttendanceView
│
├─→ AttendanceStats (1 prop)
│   └── stats
│
├─→ AttendanceFilters (18 params: 12 props + 6 handlers)
│   ├── Props: selectedDate, selectedClass, selectedStatus, selectedAcademicYear, 
│   │           showFullList, classes, academicYears, classesLoading
│   └── Handlers: onDateChange, onClassChange, onStatusChange, 
│                 onAcademicYearChange, onViewModeChange, onSearchClick, onResetClick
│
├─→ AttendanceTable (25 params: 17 props + 8 handlers)
│   ├── Props: records, loading, selectedDate, selectedClass, showFullList, 
│   │           page, pageSize, editingRecord, editStatus, editNotes, updating
│   └── Handlers: onEditRecord, onCancelEdit, onSaveEdit, onStatusChange, 
│                 onNotesChange, onPageChange, onPageSizeChange, isEditingRecord
│   │
│   └─→ AttendanceTableRow (17 params: 12 props + 5 handlers)  ← DEEP!
│       ├── Props: record, index, isEditing, editStatus, editNotes, updating
│       └── Handlers: onEdit, onCancel, onSave, onStatusChange, onNotesChange
│
└─→ LeaveRequestModal (7 params: 6 props + 1 handler)
    ├── Props: open, studentId, studentName, studentCode, targetDate, existingImageUrl
    └── Handler: onClose, onUploadSuccess
```

### Proposed: Minimal Drilling
```
AttendanceView
│
├─→ AttendanceStats (1 prop)
│   └── stats
│
├─→ AttendanceFilters (simplified setters via hook)
│   └── Direct hook calls (no callbacks needed)
│
├─→ AttendanceTable (simplified, uses usePagination)
│   ├── Props: records, loading, selectedDate, selectedClass, showFullList
│   └─→ Pagination: page, totalPages, onPageChange ← Comes from usePagination hook
│   │
│   └─→ AttendanceTableRow (simplified)
│       └── Props: record, isEditing, updating, onEdit, onSave, onCancel
│           └─→ Edit state comes from useAttendanceEdit hook
│
└─→ LeaveRequestModal (local state - no props needed)
    └── Managed in AttendanceView, not in hook
```

---

## Type Safety Improvements

### Before: Giant Interface Returned
```tsx
// Hard to use, easy to break
interface UseAttendanceDataReturn {
  // All 34 items in one interface
  attendanceRecords: AttendanceRecord[];
  stats: AttendanceStats | null;
  classes: string[];
  // ... 31 more
  handleDateChange: (date: string) => void;
  // ... 17 more handlers
}

// Usage requires destructuring all
const {
  attendanceRecords, stats, classes, // ... 31 more
  loading, bootstrapLoading, classesLoading, updating, // 4 more
  error, successMessage, // ...
  // etc
} = useAttendanceData();
```

### After: Focused Interfaces
```tsx
// Each hook has clear, focused return type

interface UseAttendanceAPIReturn {
  attendanceRecords: AttendanceRecord[];
  stats: AttendanceStats | null;
  classes: string[];
  homeroomClasses: ClassInfo[];
  academicYears: string[];
  loading: boolean;
  bootstrapLoading: boolean;
  classesLoading: boolean;
  updating: boolean;
  error: string | null;
  successMessage: string | null;
  fetchBootstrap: (params: BootstrapParams) => Promise<void>;
  fetchAttendanceRecords: (params: FetchParams) => Promise<void>;
  fetchStats: (date: string) => Promise<void>;
  updateRecord: (id: number, data: UpdateData) => Promise<void>;
}

interface UseAttendanceFiltersReturn {
  selectedDate: string;
  selectedClass: string;
  selectedStatus: string;
  selectedAcademicYear: string;
  showFullList: boolean;
  handleDateChange: (date: string) => void;
  handleClassChange: (className: string) => void;
  handleStatusChange: (status: string) => void;
  handleViewModeChange: (showFull: boolean) => void;
  resetFilters: () => void;
}

interface UsePaginationReturn<T> {
  page: number;
  pageSize: number;
  totalPages: number;
  paginatedItems: T[];
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

// Usage is clear and focused
const api = useAttendanceAPI();
const filters = useAttendanceFilters();
const pagination = usePagination(api.attendanceRecords);
const edit = useAttendanceEdit();
```

---

## Testing Improvements

### Before: Hard to Test
```tsx
// Can't test this without mocking:
// - API calls
// - Modal state
// - Pagination logic
// - Filter logic
// - Edit form logic
// - Loading states

test('should load attendance data', async () => {
  // Setup is complex
  // Mock all 34 items
  // Mock API
  // Mock modal state
  // Mock pagination
  // All mixed together
});
```

### After: Easy to Test Each Hook
```tsx
// Test each hook independently

describe('useAttendanceAPI', () => {
  test('should fetch bootstrap data', async () => {
    const { result } = renderHook(() => useAttendanceAPI());
    await act(async () => {
      await result.current.fetchBootstrap({ date: '2024-01-01' });
    });
    expect(result.current.attendanceRecords).toHaveLength(5);
  });
});

describe('usePagination', () => {
  test('should paginate items correctly', () => {
    const items = Array(100).fill(0).map((_, i) => ({ id: i }));
    const { result } = renderHook(() => usePagination(items, 10));
    expect(result.current.totalPages).toBe(10);
    expect(result.current.paginatedItems).toHaveLength(10);
  });
});

describe('useAttendanceFilters', () => {
  test('should reset filters', () => {
    const { result } = renderHook(() => useAttendanceFilters());
    act(() => result.current.setSelectedClass('10A'));
    expect(result.current.selectedClass).toBe('10A');
    act(() => result.current.resetFilters());
    expect(result.current.selectedClass).toBe('all');
  });
});
```

---

## Migration Path

### Step 1: Create New Hooks (in parallel)
```
Create hooks without modifying existing code:
  ├── useAttendanceAPI.ts (new)
  ├── usePagination.ts (new)
  ├── useAttendanceFilters.ts (new)
  └── useAttendanceEdit.ts (new)
```

### Step 2: Update AttendanceView (gradual)
```
Keep old hook, add new hooks side-by-side:
  ├── OLD: useAttendanceData() [34 items] ← Still used
  └── NEW: Use new hooks + test locally
```

### Step 3: Update Child Components (depends)
```
Update as new hooks are working:
  ├── AttendanceTable ← use usePagination
  ├── AttendanceTableRow ← use useAttendanceEdit
  └── Others ← as dependencies allow
```

### Step 4: Remove Old Hook
```
Once all children updated:
  ├── Delete useAttendanceData.ts
  ├── All tests passing
  └── Deploy refactored version
```

---

## Summary: Why This Refactoring Matters

```
BEFORE REFACTORING:
├── 1 giant hook: 34 items, 750+ lines
├── Hard to understand
├── Hard to test
├── Can't reuse pagination
├── Leave request state misplaced
├── 4 loading states unclear
├── Heavy prop drilling
└── Cognitive load: 🔴🔴🔴 HIGH

AFTER REFACTORING:
├── 4 focused hooks: 10-11 items each
├── Easy to understand
├── Easy to test
├── Reusable pagination hook
├── Leave request state in component
├── 4 clear loading states
├── Minimal prop drilling
└── Cognitive load: 🟢 LOW

VALUE:
✅ Maintainable
✅ Testable
✅ Reusable
✅ Scalable
✅ Developer experience ↑
✅ Debugging time ↓
✅ Bugs ↓
✅ Feature velocity ↑
```
