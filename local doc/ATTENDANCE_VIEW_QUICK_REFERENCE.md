# AttendanceView Quick Reference Guide

## Key Findings Summary

### 🔴 Critical Issues
| Issue | Count | Impact |
|-------|-------|--------|
| God hook (34 items) | 1 | Unmaintainable |
| Responsibilities mixed in hook | 10+ | Poor separation of concerns |
| Loading states (unclear purpose) | 4 | Confusing user experience |
| Prop drilling levels | 3 deep | Hard to refactor, perf risk |

### The Hook: By The Numbers

```
useAttendanceData.ts
├── Lines of code: 750+
├── State variables: 18 useState() calls
├── Returned items: 34
├── Handlers: 18
├── Effects: 3
├── API functions: 3
├── Concerns: 10+ distinct
└── Testability: HARD
```

### Where Everything Is

| Component | Location | Responsibility | Issue |
|-----------|----------|-----------------|-------|
| **useAttendanceData** | Line 28 | All data + filters + edits + modal | God hook, 34 items |
| **AttendanceView** | 150 lines | Page layout, orchestration | 28+ props destructured |
| **AttendanceStats** | 100 lines | Display only | ✓ Clean |
| **AttendanceFilters** | 150+ lines | Filter UI | ✓ Clean |
| **AttendanceTable** | 250+ lines | List + pagination | Dupes pagination logic |
| **AttendanceTableRow** | 200+ lines | Individual row | Many props (12+) |
| **LeaveRequestModal** | 150+ lines | Modal UI | State in wrong hook |

---

## Loading State Chaos

### 4 Loading States - Unclear Purpose

```
State Name              Triggered By                Where Used           Problem
─────────────────────────────────────────────────────────────────────────────────
loading                 loadAttendanceData()         InitialSpinner       Shows on every filter
                                                     TableBodySpinner     change (annoying)
                                                     
bootstrapLoading        attendanceBootstrap()         Effect dependency    Not used in UI,
                                                     only prevents loop    confusing
                                                     
classesLoading          attendanceBootstrap()         SelectDisabled       Only on dropdown,
                                                     no UI feedback       no feedback
                                                     
updating                handleSaveEdit()             DisableButtons       Clear, needs indicator
                                                     "..." text
```

### Current Spinner Implementation

```tsx
// Initial blocking spinner (AttendanceView, lines 70-77)
if (loading && attendanceRecords.length === 0) {
  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
    </div>
  );
}

// Inline spinners:
// - Table empty cell when loading (line 165)
// - Button text "..." when updating (line 150)
```

---

## State Ownership Problem

### Current (Wrong)
```
useAttendanceData Hook
│
├── Data States (correct: API data)
├── Loading States (correct: API loading)
├── API Functions (correct: API calls)
├── Filter States (debatable: necessary for API)
├── Edit States (wrong: should use EditForm hook)
├── Edit Handlers (wrong: mixing edit logic with data)
├── Modal States (WRONG: UI concern, not data)
├── Modal Handlers (WRONG: UI concern, not data)
└── Setters & Helpers (chaotic: 5 different setters)
```

### Proposed (Correct)
```
useAttendanceAPI Hook      useAttendanceFilters    useAttendanceEdit
├── API data                ├── Filter state        ├── Edit state
├── Loading states          ├── Filter handlers     ├── Edit handlers
├── Error states            └── Reset logic         └── Validation
└── API functions

usePagination Hook         AttendanceView
├── Page state             ├── Modal state (local)
├── PageSize state         └── Coordinate hooks
└── Pagination calcs
```

---

## Prop Flow Analysis

### Current Drilling
```
AttendanceView (destructures 28 items from hook)
│
├─ AttendanceStats ← 1 prop
│   └── stats
│
├─ AttendanceFilters ← 18 items
│   ├── Props: 8 selected*, academicYears, classes, classesLoading
│   └── Handlers: 7 (onDateChange, onClassChange, onStatusChange, etc.)
│
├─ AttendanceTable ← 25 items
│   ├── Props: records, loading, pagination*, edit state*, updating
│   ├── Handlers: 8
│   │
│   └─ AttendanceTableRow ← 17 items (NESTED DRILLING!)
│       ├── Props: record, index, isEditing, editStatus, editNotes, updating
│       └── Handlers: 5
│
└─ LeaveRequestModal ← 7 items
    ├── Props: open, studentId, studentName, studentCode, targetDate, imageUrl
    └── Handlers: onClose, onUploadSuccess
```

### After Refactoring
```
AttendanceView (uses 4 hooks, minimal destructuring)
│
├─ useAttendanceAPI ← Direct hook
├─ useAttendanceFilters ← Direct hook
├─ usePagination ← Direct hook
├─ useAttendanceEdit ← Direct hook
│
├─ AttendanceStats ← 1 prop (stats)
├─ AttendanceFilters ← Minimal props, uses hook directly
├─ AttendanceTable ← records, loading, few props
│   └─ AttendanceTableRow ← record, editing status, callbacks only
└─ LeaveRequestModal ← Local state, no hook props
```

---

## Hook Extraction Map

### What Goes Where

```
FROM useAttendanceData INTO:

useAttendanceAPI
├── attendanceRecords
├── stats
├── classes
├── homeroomClasses
├── academicYears
├── loading
├── bootstrapLoading
├── classesLoading
├── updating
├── error
├── successMessage
├── attendanceBootstrap()  [stays from line 155+]
├── loadAttendanceData()   [stays from line 175+]
└── loadStats()            [stays from line 315+]

→ Tests by itself, replicates current behavior

usePagination (REUSABLE everywhere!)
├── page
├── pageSize
├── setPage()
├── setPageSize()
├── + calculations (inline in AttendanceTable currently)

→ Generic <T> type, no domain logic

useAttendanceFilters
├── selectedDate
├── selectedClass
├── selectedStatus
├── selectedAcademicYear
├── showFullList
├── handleDateChange()     [refactored from line 368+]
├── handleClassChange()    [refactored from line 379+]
├── handleStatusChange()   [refactored from line 390+]
├── handleViewModeChange() [refactored from line 401+]
├── resetFilters()         [refactored from line 537+]

→ Filter logic isolated

useAttendanceEdit
├── editingRecord
├── editStatus
├── editNotes
├── handleEditRecord()    [refactored from line 413+]
├── handleCancelEdit()    [refactored from line 422+]
├── handleSaveEdit()      [refactored from line 428+]
├── isEditingRecord()     [stays from line 405+]
├── getRecordKey()        [stays from line 397+]

→ Edit form isolated

STAYS IN AttendanceView (local state)
├── leaveRequestOpen
├── leaveRequestRecord
├── handleOpenLeaveRequest()
├── handleLeaveRequestClose()
├── handleLeaveRequestUploadSuccess()

→ Modal state is UI concern
```

---

## Implementation Checklist

### Phase 1: Create New Hooks
- [ ] `useAttendanceAPI.ts` - 150 lines
  - [ ] Copy API functions from current hook
  - [ ] Keep all loading states
  - [ ] Keep error handling
  - [ ] Export focused interface
  - [ ] Write basic tests

- [ ] `usePagination.ts` - 50 lines
  - [ ] Generic <T> type
  - [ ] Simple calculations
  - [ ] No domain logic
  - [ ] Write tests

- [ ] `useAttendanceFilters.ts` - 100 lines
  - [ ] Move filter state
  - [ ] Move filter handlers
  - [ ] Export interface
  - [ ] Write tests

- [ ] `useAttendanceEdit.ts` - 80 lines
  - [ ] Move edit state
  - [ ] Move edit handlers
  - [ ] Keep helper functions
  - [ ] Write tests

### Phase 2: Update AttendanceView
- [ ] Import 4 new hooks
- [ ] Remove useAttendanceData
- [ ] Create local state for modal
- [ ] Update render logic
- [ ] Remove heavy destructuring
- [ ] Test integration

### Phase 3: Update Child Components
- [ ] AttendanceTable: use usePagination
- [ ] AttendanceTableRow: use useAttendanceEdit
- [ ] Remove unnecessary prop drilling
- [ ] Update interfaces/types
- [ ] Test each component

### Phase 4: Cleanup
- [ ] Delete useAttendanceData.ts
- [ ] Run all tests
- [ ] Update documentation
- [ ] Deploy

---

## Files to Create/Modify

```
NEW FILES:
├── frontend/src/hooks/attendance/useAttendanceAPI.ts
├── frontend/src/hooks/attendance/useAttendanceFilters.ts
├── frontend/src/hooks/attendance/useAttendanceEdit.ts
├── frontend/src/hooks/usePagination.ts (reusable!)
├── frontend/src/hooks/attendance/useAttendanceAPI.test.ts
├── frontend/src/hooks/useAttendanceFilters.test.ts
├── frontend/src/hooks/useAttendanceEdit.test.ts
└── frontend/src/hooks/usePagination.test.ts

MODIFY:
├── frontend/src/pages/homeroom/AttendanceView.tsx (major)
├── frontend/src/components/attendance/AttendanceTable.tsx (moderate)
├── frontend/src/components/attendance/AttendanceTableRow.tsx (minor)
└── frontend/src/components/attendance/AttendanceFilters.tsx (optional)

DEPRECATE:
└── frontend/src/hooks/attendance/useAttendanceData.ts (DELETE after migration)
```

---

## Success Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Hook return items | 34 | 10-11 per hook | ✓ |
| Avg hook responsibility | 10+ | 1-2 | ✓ |
| Lines of code per hook | 750 | 100-150 | ✓ |
| Prop drilling depth | 3 levels | 1-2 levels | ✓ |
| Test coverage (hooks) | Hard to test | Easy to test | ✓ |
| Reusable pagination | No | Yes | ✓ |
| Modal state in hook | Yes | No | ✓ |
| Code duplication | Exists | Eliminated | ✓ |
| Developer understanding | Poor | Clear | ✓ |

---

## Code Examples: Before vs After

### Before: Hard to Use
```tsx
export default function AttendanceView() {
  const {
    // 28 items destructured!
    attendanceRecords, stats, classes, academicYears, homeroomClasses,
    loading, bootstrapLoading, classesLoading, updating,
    error, successMessage,
    selectedDate, selectedClass, selectedStatus, selectedAcademicYear, showFullList, page, pageSize,
    editingRecord, editStatus, editNotes,
    handleDateChange, handleClassChange, handleStatusChange, handleViewModeChange,
    handleEditRecord, handleCancelEdit, handleSaveEdit, resetFilters,
    attendanceBootstrap, loadAttendanceData, loadStats,
    leaveRequestOpen, leaveRequestRecord,
    handleOpenLeaveRequest, handleLeaveRequestClose, handleLeaveRequestUploadSuccess,
    setSelectedAcademicYear, setPage, setPageSize, setEditStatus, setEditNotes,
    isEditingRecord,
  } = useAttendanceData();
  
  // ??? What does each do? Why so many?
}
```

### After: Clear and Focused
```tsx
export default function AttendanceView() {
  // Clear, focused data hook
  const api = useAttendanceAPI();
  
  // Filter controls
  const filters = useAttendanceFilters();
  
  // Pagination (reusable!)
  const pagination = usePagination(api.attendanceRecords, PAGE_SIZE);
  
  // Edit form
  const edit = useAttendanceEdit();
  
  // Modal (local UI state)
  const [leaveRequestOpen, setLeaveRequestOpen] = useState(false);
  const [leaveRequestRecord, setLeaveRequestRecord] = useState(null);
  
  // Use specific items, not everything
  const {
    attendanceRecords,
    stats,
    loading,
    error,
    successMessage
  } = api;
  
  // Clear intent in each render
}
```

---

## Related Refactorings (Similar Pattern)

The homeroom dashboard already follows this pattern! See reference in session memory:

```
/memories/session/homeroom-dashboard-refactoring.md

They split:
├── useHomeroomData (domain logic)
├── usePagination (generic pagination)
└── Dashboard component (coordinates)

Same pattern should apply to AttendanceView!
```

---

## Dependencies to Watch

```
useAttendanceAPI depends on:
├── AuthContext (user role)
├── ApiService (API calls)
└── logger

useAttendanceFilters depends on:
└── (nothing - pure UI state)

useAttendanceEdit depends on:
├── useAttendanceAPI (for save)
└── ApiService

usePagination depends on:
└── (nothing - pure utility)

AttendanceView depends on:
├── useAttendanceAPI
├── useAttendanceFilters
├── useAttendanceEdit
├── usePagination
└── AuthContext
```

---

## Quick Wins Before Full Refactor

If you want incremental improvements while planning full refactor:

1. **Extract usePagination TODAY** - Low risk, high reuse
2. **Extract calculations** - Move `calculateStatsFromData()` to helper
3. **Rename loading states** - Add docs explaining each
4. **Reduce prop drilling** - Use context for filter state
5. **Local modal state** - Move to component immediately

---

## Questions to Ask During Implementation

```
1. Should filters trigger API call immediately or on search click?
   → Currently: Immediate via useEffect
   
2. Should edit save refresh all data or just update record?
   → Currently: Full refresh via loadAttendanceData()
   
3. Should bootstrap be called multiple times or cache results?
   → Currently: Called on mount + year change
   
4. Should leave request image affect attendance status?
   → Currently: No, just stores image URL
   
5. Should pagination reset on filter change?
   → Currently: Yes (line 346)
```

---

## Success Story: Homeroom Dashboard

The project already did similar refactoring successfully!

```
BEFORE:
├── useHomeroomDashboard (11 states + 7 setters + 3 helpers)
└── All mixed in one hook

AFTER:
├── useHomeroomData (domain logic only)
├── usePagination (generic, reusable)
├── Dashboard (UI coordination)
└── Clear separation of concerns

Result:
✅ Easier to understand
✅ Easier to test
✅ Easier to maintain
✅ Easier to extend

YOU CAN REPLICATE THIS SUCCESS FOR ATTENDANCE VIEW!
```

---

## Next Steps

1. ✅ Read this analysis (done!)
2. 📋 Review the detailed analysis document
3. 🎨 Review the architecture diagrams
4. 💭 Decide on timeline/priority
5. 🛠️ Start with Phase 1: Create new hooks
6. 🧪 Write tests for each hook
7. 🔄 Refactor components incrementally
8. 🎉 Deploy and celebrate!

For more details, see:
- `ATTENDANCE_VIEW_ANALYSIS.md` - Comprehensive analysis
- `ATTENDANCE_VIEW_ARCHITECTURE_DIAGRAMS.md` - Visual diagrams
- `/memories/session/homeroom-dashboard-refactoring.md` - Similar pattern example
