# Phase 3: Component Extraction & Refactoring - EXECUTION PLAN

**Date Started:** March 22, 2026  
**Status:** STARTING PHASE 3 COMPREHENSIVE REDO  
**Scope:** ALL components, including "already done" ones that may need re-verification

---

## Overview: E2E Spec to Component Mapping

This execution plan maps each E2E test spec to the components it tests. We will:
1. Refactor components spec-by-spec
2. Run each spec individually (not all at once) to avoid slowness
3. Verify each component passes its corresponding E2E spec
4. Apply Phase 3 algorithm to ALL pages without exception

### Test Specs and Their Components

| Spec | Components Tested | Priority | Status |
|------|-------------------|----------|--------|
| **01-auth.spec.js** | auth/Login, auth/DashboardSelector, auth/ForgotPassword | P1 | ❓ TBD |
| **02-dashboard.spec.js** | admin/Dashboard, homeroom/Dashboard, subject/Dashboard | P1 | ❓ TBD |
| **03-face-management.spec.js** | homeroom/FaceManagement | P2 | ❓ TBD |
| **04-attendance.spec.js** | homeroom/AttendanceView | P2 | ❓ TBD |
| **05-continuous-recognition.spec.js** | admin/ContinuousRecognition | P3 | ❓ TBD |
| **visual-snapshot.spec.js** | All components (visual regression) | - | ❓ TBD |

---

## Step 1: Check Current Component States

Before starting refactoring, we should verify the current state of each component:

### **Auth Components** (3 files)
- **auth/Login.jsx** - [CHECK STATE]
- **auth/Login.tsx** - [CHECK STATE]
- **auth/ForgotPassword.jsx** - [CHECK STATE]
- **auth/ForgotPassword.tsx** - [CHECK STATE]
- **auth/DashboardSelector.jsx** - [CHECK STATE]
- **auth/DashboardSelector.tsx** - [CHECK STATE]

### **Admin Components** (7 files)
- **admin/Dashboard.jsx** - [CHECK STATE]
- **admin/Dashboard.tsx** - [CHECK STATE]
- **admin/Management.jsx** - [CHECK STATE]
- **admin/ClassManagement.jsx** - [CHECK STATE]
- **admin/ContinuousRecognition.jsx** - [CHECK STATE]
- **admin/ContinuousRecognition.refactored.tsx** - [CHECK STATE]
- **admin/UIDemo.jsx** - [CHECK STATE]

### **Homeroom Components** (8 files)
- **homeroom/Dashboard.jsx** - [CHECK STATE]
- **homeroom/Dashboard.tsx** - [CHECK STATE]
- **homeroom/AttendanceView.jsx** - [CHECK STATE]
- **homeroom/AttendanceView.tsx** - [CHECK STATE]
- **homeroom/FaceManagement.jsx** - [CHECK STATE]
- **homeroom/FaceManagement.tsx** - [CHECK STATE]
- **homeroom/GradeManagement.jsx** - [CHECK STATE]
- **homeroom/StudentList.jsx** - [CHECK STATE]

### **Subject Components** (3 files)
- **subject/Dashboard.jsx** - [CHECK STATE]
- **subject/Dashboard.tsx** - [CHECK STATE]
- **subject/GradeManagement.jsx** - [CHECK STATE]

---

## Refactoring Process for Each Component

### Phase 3 Algorithm (From TYPESCRIPT_REFACTORING_PLAN.md)

For each component, follow this strict process:

```
PHASE A: Extract Logic to Custom Hook
├─ Create src/hooks/use[ComponentName].ts
├─ Move all useState, useEffect, handlers
├─ Define TypeScript return type
├─ Update component to use hook
└─ Verify: Component renders same, E2E spec passes

PHASE B: Extract UI Sub-Components
├─ Identify 3-5 repeatable UI chunks
├─ Create src/components/[Feature]/[SubComponent].tsx for each
├─ Add TypeScript interfaces for props
├─ Replace JSX chunks with new components
└─ Verify: Component renders same, E2E spec passes

PHASE C: Rename and Polish
├─ If still .jsx: Rename to .tsx
├─ Fix TypeScript errors
├─ Add type annotations
├─ Use TODO type for unclear items
└─ Verify: Build succeeds, dev server runs, E2E spec passes

PHASE D: Cleanup
├─ Delete old .jsx file (if .tsx exists)
├─ Delete old .tsx file if created new one (consolidate)
├─ Commit changes
└─ Document completion
```

---

## Execution Sequence

### BATCH 1: Auth Pages (E2E: 01-auth.spec.js)

**Order:** Login → DashboardSelector → ForgotPassword

#### 01.1: Refactor auth/Login
- **Current State:** Check if Login.jsx and Login.tsx both exist
- **Hook:** Create `useLogin.ts`
- **SubComponents:** LoginForm, LoginHeader, LoginFooter
- **E2E Test:** `npm run test:e2e -- 01-auth.spec.js`
- **Status:** [ ] NOT STARTED

#### 01.2: Refactor auth/DashboardSelector
- **Current State:** Check if DashboardSelector.jsx and DashboardSelector.tsx both exist
- **Hook:** Create `useDashboardSelector.ts`
- **SubComponents:** RoleCard, RoleSelector
- **E2E Test:** `npm run test:e2e -- 01-auth.spec.js`
- **Status:** [ ] NOT STARTED

#### 01.3: Refactor auth/ForgotPassword
- **Current State:** Check if ForgotPassword.jsx and ForgotPassword.tsx both exist
- **Hook:** Create `useForgotPassword.ts`
- **SubComponents:** ResetForm, ResetSuccess
- **E2E Test:** `npm run test:e2e -- 01-auth.spec.js`
- **Status:** [ ] NOT STARTED

---

### BATCH 2: Dashboard Pages (E2E: 02-dashboard.spec.js)

**Order:** admin/Dashboard → homeroom/Dashboard → subject/Dashboard

#### 02.1: Refactor admin/Dashboard
- **Current State:** Check state (has .jsx and .tsx files)
- **Hook:** Create `useAdminDashboard.ts`
- **SubComponents:** StatsCards, DataTable, Charts
- **E2E Test:** `npm run test:e2e -- 02-dashboard.spec.js`
- **Status:** [ ] NOT STARTED

#### 02.2: Refactor homeroom/Dashboard
- **Current State:** Check state (has .jsx and .tsx files)
- **Hook:** Create `useHomeroomDashboard.ts`
- **SubComponents:** ClassSelector, StatsSummary, QuickActions
- **E2E Test:** `npm run test:e2e -- 02-dashboard.spec.js`
- **Status:** [ ] NOT STARTED

#### 02.3: Refactor subject/Dashboard
- **Current State:** Check state (has .jsx and .tsx files)
- **Hook:** Create `useSubjectDashboard.ts`
- **SubComponents:** ClassList, GradeStats, StudentPerformance
- **E2E Test:** `npm run test:e2e -- 02-dashboard.spec.js`
- **Status:** [ ] NOT STARTED

---

### BATCH 3: Feature Pages (E2E: 03, 04, 05)

#### 03: Refactor homeroom/FaceManagement (E2E: 03-face-management.spec.js)
- **Current State:** Check state (has .jsx and .tsx files)
- **Hook:** Create `useFaceManagement.ts`
- **SubComponents:** FaceGrid, StudentFaceCard, FaceUploadModal
- **E2E Test:** `npm run test:e2e -- 03-face-management.spec.js`
- **Status:** [ ] NOT STARTED

#### 04: Refactor homeroom/AttendanceView (E2E: 04-attendance.spec.js)
- **Current State:** Check state (has .jsx and .tsx files)
- **Hook:** Create `useAttendanceData.ts`
- **SubComponents:** AttendanceFilters, AttendanceTable, AttendanceStats
- **E2E Test:** `npm run test:e2e -- 04-attendance.spec.js`
- **Status:** [ ] NOT STARTED

#### 05: Refactor admin/ContinuousRecognition (E2E: 05-continuous-recognition.spec.js)
- **Current State:** Check state (has .jsx, .refactored.tsx)
- **Hook:** Create `useContinuousRecognition.ts`
- **SubComponents:** RecognitionStats, ActiveCameras, RecognitionLog
- **E2E Test:** `npm run test:e2e -- 05-continuous-recognition.spec.js`
- **Status:** [ ] NOT STARTED

---

### BATCH 4: Large/Complex Components (Priority 3)

#### 04A: Refactor homeroom/GradeManagement
- **Current State:** Check state (only .jsx, no .tsx)
- **Hook:** Create `useGradeManagement.ts`
- **SubComponents:** GradeTable, GradeForm, ClassSelector
- **Testing:** Manual inspection (no dedicated spec)
- **Status:** [ ] NOT STARTED

#### 04B: Refactor subject/GradeManagement
- **Current State:** Check state (only .jsx, no .tsx)
- **Hook:** Create `useSubjectGradeManagement.ts`
- **SubComponents:** GradeEntry, GradeStatistics, StudentGrades
- **Testing:** Manual inspection (no dedicated spec)
- **Status:** [ ] NOT STARTED

#### 04C: Refactor admin/ClassManagement
- **Current State:** Check state (only .jsx, no .tsx)
- **Hook:** Create `useClassManagement.ts`
- **SubComponents:** ClassTable, ClassForm, ClassDetails
- **Testing:** Build verification
- **Status:** [ ] NOT STARTED

#### 04D: Refactor admin/Management
- **Current State:** Check state (only .jsx, no .tsx)
- **Hook:** Create `useManagement.ts`
- **SubComponents:** ManagementTabs, DataTables, ActionButtons
- **Testing:** Build verification
- **Status:** [ ] NOT STARTED

#### 04E: Refactor homeroom/StudentList
- **Current State:** Check state (only .jsx, 5011 lines - LARGEST)
- **Hook:** Create `useStudentList.ts`
- **SubComponents:** StudentTable, StudentRow, StudentFilters, StudentModals
- **Testing:** Build verification
- **Status:** [ ] NOT STARTED

---

## Documentation Templates

### For Each Refactored Component: Create File `REFACTORED_[ComponentName].md`

```markdown
# Component: [ComponentName]

**File:** `src/pages/[path]/[ComponentName].tsx`  
**Date Refactored:** [DATE]  
**Lines Before:** [X] → Lines After: [Y] (Reduction: [Z]%)  
**Status:** ✅ COMPLETE

## Refactoring Summary

### Phase A: Logic Extraction
- **Hook Created:** `useHomeroomDashboard.ts`
- **State Management:** [List what moved]
- **Effect Handlers:** [List what moved]
- **Return Type:** [Interface name]

### Phase B: UI Sub-Components
Created sub-components:
1. **StatsCards.tsx** - Displays statistics
2. **QuickActions.tsx** - Action buttons
3. **[Others]**

### Phase C: Rename & Polish
- ✅ Renamed to .tsx
- ✅ TypeScript types added
- ✅ No TODO types needed / [List TODO types used]
- ✅ Imports verified

### Phase D: Verification
- ✅ Build: `npm run build` - SUCCESS
- ✅ Dev: `npm run dev` - SUCCESS  
- ✅ E2E Test: `npm run test:e2e -- [spec]` - PASS  
- ✅ Size Reduction: [X]KB → [Y]KB

## Hook Structure

### useHomeroomDashboard.ts
```typescript
// Return type interface
interface UseHomeroomDashboardReturn {
  dashboard: Dashboard | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  updateFilter: (filter: FilterType) => void;
}

// Implementation
export function useHomeroomDashboard(): UseHomeroomDashboardReturn {
  // ... state, effects, handlers
}
```

## Components

### StatsCards.tsx
```typescript
interface StatsCardsProps {
  stats: Stat[];
  isLoading: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  // Component JSX
}
```

## Files Modified

- `src/pages/homeroom/Dashboard.tsx` (REFACTORED)
- `src/pages/homeroom/Dashboard.jsx` (DELETED)
- `src/hooks/useHomeroomDashboard.ts` (CREATED)
- `src/components/Dashboard/StatsCards.tsx` (CREATED)
- `src/components/Dashboard/QuickActions.tsx` (CREATED)

## E2E Test Results

**Test Spec:** `02-dashboard.spec.js`
- ✅ Dashboard loads without errors
- ✅ Sidebar visible and interactive
- ✅ Dashboard screenshot captured  
- ✅ All interactions working

## Notes

- [Any issues encountered]
- [Decisions made]
- [Future improvements]
```

---

## Success Criteria for Phase 3 Complete

- [ ] All 5 E2E spec files pass: 01-auth, 02-dashboard, 03-face-management, 04-attendance, 05-continuous-recognition
- [ ] Visual snapshots verified and updated
- [ ] All components renamed to `.tsx` (or remain `.jsx` if not touched)
- [ ] All hooks extracted to `src/hooks/`
- [ ] All sub-components created in `src/components/`
- [ ] Old `.jsx` files deleted where `.tsx` equivalents exist
- [ ] `npm run build` completes successfully
- [ ] `npm run dev` runs without errors
- [ ] TypeScript coverage >70%
- [ ] No console errors in browser when running any page
- [ ] All old double files (`.jsx` + `.tsx`) consolidated into single `.tsx` versions

---

## Quick Reference: Component File Locations

```
frontend/src/
├── pages/
│   ├── admin/
│   │   ├── Dashboard.jsx / Dashboard.tsx
│   │   ├── Management.jsx
│   │   ├── ClassManagement.jsx
│   │   ├── ContinuousRecognition.jsx / ContinuousRecognition.refactored.tsx
│   │   └── UIDemo.jsx
│   ├── homeroom/
│   │   ├── Dashboard.jsx / Dashboard.tsx
│   │   ├── AttendanceView.jsx / AttendanceView.tsx
│   │   ├── FaceManagement.jsx / FaceManagement.tsx
│   │   ├── GradeManagement.jsx
│   │   └── StudentList.jsx
│   ├── subject/
│   │   ├── Dashboard.jsx / Dashboard.tsx
│   │   └── GradeManagement.jsx
│   └── auth/
│       ├── Login.jsx / Login.tsx
│       ├── ForgotPassword.jsx / ForgotPassword.tsx
│       └── DashboardSelector.jsx / DashboardSelector.tsx
└── hooks/
    ├── useLogin.ts
    ├── useDashboardSelector.ts
    ├── useForgotPassword.ts
    ├── useAdminDashboard.ts
    ├── useHomeroomDashboard.ts
    ├── useSubjectDashboard.ts
    ├── useFaceManagement.ts
    ├── useAttendanceData.ts
    ├── useContinuousRecognition.ts
    ├── useGradeManagement.ts
    └── [others]
```

---

## Timeline Estimate

| Batch | Components | Est. Hours | Status |
|-------|------------|-----------|--------|
| **Auth** | Login, DashboardSelector, ForgotPassword | 6-8 hrs | ❌ NOT STARTED |
| **Dashboards** | Admin, Homeroom, Subject | 8-10 hrs | ❌ NOT STARTED |
| **Features** | FaceManagement, Attendance, ContinuousRecognition | 10-12 hrs | ❌ NOT STARTED |
| **Large** | GradeManagement, ClassManagement, Management, StudentList | 15-20 hrs | ❌ NOT STARTED |
| **Testing** | Full suite run, fixture updates, snapshots | 3-5 hrs | ❌ NOT STARTED |
| **TOTAL** | **All 15+ components** | **42-55 hours** | ❌ NOT STARTED |

---

## Current Blockers

1. **Need to check:** Current state of each component (which have hooks, which are still monolithic)
2. **Need to verify:** E2E specs reference correct selectors post-merge
3. **Need to confirm:** Which components were already refactored and which were not
4. **Potential issue:** Multiple .jsx and .tsx versions of same component - need conflict resolution

---

## Next Step

> **EXECUTE:** Check current state of all components before starting refactoring.

Run analysis script to list:
- Component sizes
- Existing hooks
- Double file conflicts
- Missing E2E coverage
