# Phase 3 Refactoring - QUICK FIX #1: DashboardSelector Auto-Redirect

**Issue:** DashboardSelector component returns `null` when user has only one role, instead of navigating.

## Problem Code

**File:** `src/hooks/useDashboardSelector.ts`

Current behavior:
- Hook detects user has only one role (either homeroom OR subject)
- Component returns `null` instead of redirecting
- Test times out because no navigation occurs
- This is browser-specific (Firefox is slower, times out first)

## Solution

The hook should automatically navigate when roles are determined and user has only one role.

```typescript
// ADD THIS TO useDashboardSelector.ts (after the checkUserRoles function)

useEffect(() => {
  if (!loading && (hasHomeroomRole || hasSubjectRole)) {
    // If only one role, auto-navigate
    if (hasHomeroomRole && !hasSubjectRole) {
      navigate('/homeroom/dashboard', { replace: true });
    } else if (hasSubjectRole && !hasHomeroomRole) {
      navigate('/subject/dashboard', { replace: true });
    }
    // If both roles, let the component render the selector
  }
}, [hasHomeroomRole, hasSubjectRole, loading, navigate]);
```

## Component Code Fix

**File:** `src/pages/auth/DashboardSelector.tsx`

Remove these lines:
```typescript
// OLD (WRONG):
if (hasHomeroomRole && !hasSubjectRole) {
  return null;
}

if (hasSubjectRole && !hasHomeroomRole) {
  return null;
}
```

**Reason:** The hook now handles this logic via useEffect, so the component always renders when needed.

---

## Test Command

After applying fix:

```bash
npm run test:e2e -- 01-auth.spec.js
# Expected: 40/40 tests passing ✅
```

---

## Status

- [ ] Ready to apply
- [ ] Needs review
- [ ] Applied
- [ ] Verified

---

## Impact

- ✅ Fixes 1 failing test
- ✅ Proper Firefox browser handling
- ✅ Better UX (auto-redirect instead of blank page)
- ✅ Good pattern for other components
