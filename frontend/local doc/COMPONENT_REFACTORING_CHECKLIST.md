# Component Extraction Checklist Template

Use this checklist for each component you refactor. Copy and adapt for your specific file.

---

## Component: `[ComponentName]` 

**File:** `src/pages/[path]/[ComponentName].jsx`  
**Current Size:** [SIZE] KB / [LINES] lines  
**Estimated Effort:** [2-4] hours  
**Date Started:** ___________  
**Date Completed:** ___________  

---

## ✅ Pre-Refactoring

- [ ] **Read the entire component** - Understand all state, effects, handlers
- [ ] **Map dependencies** - What APIs? What contexts? What props?
- [ ] **Identify UI patterns** - What JSX chunks repeat?
- [ ] **E2E tests passing** - Run `npm run test:e2e` and verify baseline
- [ ] **Backup code** - Commit current state to git
- [ ] **Clear plan** - Sketch on paper: which logic goes to hook? Which UI to sub-components?

---

## Phase A: Extract Logic to Custom Hook ✅

### Create Hook File
- [ ] Create `src/hooks/use[ComponentName].ts` (TypeScript, even though component is JSX)
- [ ] Copy function signature:
  ```typescript
  export function use[ComponentName]() {
    // Move all state, effects, handlers here
    return { /* ... */ };
  }
  ```

### Extract State Management
- [ ] Move all `useState` calls to hook
- [ ] Move all `useEffect` calls to hook
- [ ] Move all `useContext` calls to hook
- [ ] Move all handler functions to hook

### Define Return Type
- [ ] Define interface for hook return:
  ```typescript
  interface Use[ComponentName]Return {
    // Data
    items: Item[];
    loading: boolean;
    error: string | null;
    
    // Methods
    handleAdd: (item: TODO) => void;
    handleEdit: (id: string, updates: TODO) => void;
    handleDelete: (id: string) => void;
    
    // UI State
    selectedId: string | null;
    isModalOpen: boolean;
  }

  export function use[ComponentName](): Use[ComponentName]Return {
    // Implementation...
  }
  ```

### Update Component
- [ ] Add hook call: `const logic = use[ComponentName]();`
- [ ] Replace all state references with `logic.*`
- [ ] Replace all handler calls with `logic.*`
- [ ] JSX should be unchanged (same output)

### Verify
- [ ] Component still renders identically
- [ ] All interactions work (click, form submit, delete, etc.)
- [ ] No console errors
- [ ] Run `npm run test:e2e` - All tests still pass

---

## Phase B: Extract Sub-Components ✅

### Identify Patterns (list 3-5 chunks to extract)
- [ ] Pattern 1: ________________
  - File: `src/components/[Feature]/[PatternName].tsx`
  - Props: `{ ... }`
  
- [ ] Pattern 2: ________________
  - File: `src/components/[Feature]/[PatternName].tsx`
  - Props: `{ ... }`
  
- [ ] Pattern 3: ________________
  - File: `src/components/[Feature]/[PatternName].tsx`
  - Props: `{ ... }`

### For Each Sub-Component (repeat for each)

#### Sub-Component 1: `[PatternName]`
- [ ] Create file: `src/components/[Feature]/[PatternName].tsx`
- [ ] Define interface:
  ```typescript
  interface [PatternName]Props {
    // list all props needed
  }
  ```
- [ ] Copy JSX code into new file
- [ ] Update props to use interface
- [ ] Replace in main component with:
  ```jsx
  <[PatternName]
    prop1={logic.prop1}
    onAction={logic.handleAction}
  />
  ```
- [ ] Verify component still renders correctly
- [ ] Run `npm run test:e2e` - All tests still pass

---

## Phase C: Rename to TypeScript ✅

- [ ] Component now <100 lines of JSX ✓
- [ ] All logic extracted to hook ✓
- [ ] All sub-components extracted ✓
- [ ] Rename: `[ComponentName].jsx` → `[ComponentName].tsx`
- [ ] Fix any red squiggly lines:
  - [ ] Import hook with proper type
  - [ ] Add prop types to components
  - [ ] Use `TODO` for unclear types
- [ ] Verify still renders correctly
- [ ] Run `npm run test:e2e` - All tests still pass
- [ ] Run `npm run build` - No build errors

---

## Final Verification ✅

- [ ] Build passes: `npm run build`
- [ ] Dev server runs: `npm run dev` (no errors in console)
- [ ] E2E tests pass: `npm run test:e2e`
- [ ] Visual regression OK: Compare screenshots with baseline
- [ ] Git diff looks correct: `git diff src/pages/[path]/[ComponentName].*`
- [ ] Commit with message:
  ```
  refactor: extract [ComponentName] logic and sub-components
  
  - Moved state/effects to useComponentName hook
  - Extracted [PatternName1], [PatternName2], [PatternName3] components
  - Renamed to TypeScript
  - All E2E tests passing
  ```

---

## Metrics (For Tracking Progress)

| Metric | Before | After | Goal |
|--------|--------|-------|------|
| File Size | ___KB | ___KB | <50KB |
| Lines in Component | _____ | _____ | <200 |
| Lines in Hook | - | _____ | <100 |
| Sub-Components Created | - | _____ | 3-5 |
| Test Pass Rate | 100% | 100% | 100% |
| Build Time | ____s | ____s | ≤20s |

---

## Notes & Blockers

```
[Add any notes, decisions made, or blockers encountered]

Example:
- API response format is unclear in UserService, used TODO type
- Modal logic is complex, might split into 2 components next time
- Performance issue with table rendering, need to memo() sub-components
```

---

## Sign-Off

- **Refactored By:** _______________
- **Reviewed By:** _______________
- **Date:** _______________
- **Status:** ☐ Complete ☐ In Progress ☐ Blocked

---

**Template Version:** 1.0  
**Last Updated:** November 27, 2025
