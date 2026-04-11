# Phase 3 Refactoring - E2E Test Audit Report

**Date:** March 22, 2026  
**Status:** IN PROGRESS  

---

## Batch 1: AUTH Components (E2E: 01-auth.spec.js)

### Test Run Summary
- **Total Tests:** 40
- **Passed:** 39 ✅
- **Failed:** 1 ❌
- **Pass Rate:** 97.5%

### Component-by-Component Results

#### ✅ auth/Login (Tests 01-08)
- **File:** src/pages/auth/Login.tsx (properly refactored)
- **Status:** ALL 8 TESTS PASSING ✅
- **Tests Passing:**
  1. ✅ Login page loads correctly
  2. ✅ Login form accepts input
  3. ✅ Empty form shows validation errors
  4. ✅ Invalid credentials show error
  5. ✅ Valid login redirects to dashboard selector
  6. ✅ Background image loads
  7. ✅ School name/title visible
  8. ✅ Error message clears on input

**Hook:** `useLogin.ts` - VERIFIED ✅
**Sub-components:** LoginHeader, ErrorAlert, UsernameField, PasswordField, SubmitButton, ForgotPasswordLink, DemoAccounts

---

#### ⚠️ auth/DashboardSelector (Tests 09-11)
- **File:** src/pages/auth/DashboardSelector.tsx (has both .jsx and .tsx)
- **Status:** 2/3 TESTS PASSING (1 failed in Firefox only) ⚠️
- **Tests Results:**
  1. ✅ Dashboard selector appears after login (Chromium, WebKit)
  2. ❌ Dashboard selector appears after login (Firefox ONLY)
  3. ✅ Dashboard selector shows role options
  4. ✅ Role selection navigates to correct dashboard

**Failed Test:**
```
Error: expect(received).toBeTruthy()
Received: false

const mainContent = page.locator(SELECTORS.MAIN_CONTENT);
const isVisible = await mainContent.isVisible({ timeout: TEST_TIMEOUTS.NORMAL }).catch(() => false);
expect(isVisible || page.url().includes('dashboard')).toBeTruthy();
```

**Diagnosis:** DashboardSelector not visible or page not navigating after login (Firefox only - browser-specific issue)

**Hook:** `useDashboardSelector.ts` - EXISTS but may need verification

**Action Required:**
- [ ] Check if useDashboardSelector properly handles navigation
- [ ] Verify DashboardSelector.tsx component logic
- [ ] May need browser-specific handling for Firefox
- [ ] Test manual behavior on Firefox

---

#### ✅ auth/ForgotPassword (Tests 12-20)
- **File:** src/pages/auth/ForgotPassword.tsx (has both .jsx and .tsx)
- **Status:** ALL 8 TESTS PASSING ✅
- **Tests Passing:**
  1. ✅ Forgot password page loads
  2. ✅ Form accepts email input
  3. ✅ Validation shows for invalid email
  4. ✅ Submission shows success message
  5. ✅ Icon visible
  6. ✅ Can return to login
  7. ✅ Return to login link available

**Hook:** `useForgotPassword.ts` - VERIFIED ✅
**Sub-components:** Present and working

---

## Next Steps

### For DashboardSelector Issue
1. Run test on different browsers individually to isolate browser-specific issue
2. Check useDashboardSelector hook for race conditions
3. Verify navigation after role selection works correctly
4. Consider adding explicit wait for navigation

### Phase 3 Implementation Plan
Given the current state:

**BATCH 1: Auth Components** (Current Focus)
- [x] auth/Login - ✅ VERIFIED & PASSING
- [ ] auth/DashboardSelector - ⚠️ FIX Firefox issue
- [x] auth/ForgotPassword - ✅ VERIFIED & PASSING

**Recommended Action:**
- Investigate DashboardSelector Firefox issue
- Re-run spec after fix
- Proceed to Batch 2 (Dashboard components)

---

## Component Refactoring Checklist

### Current State
| Component | File Status | Hook | Refactored | Tests | Status |
|-----------|------------|------|-----------|-------|--------|
| Login | .jsx + .tsx | ✅ useLogin | ✅ YES | ✅ 8/8 | GOOD |
| DashboardSelector | .jsx + .tsx | ✅ useDashboardSelector | ??? | ⚠️ 2/3 | NEEDS FIX |
| ForgotPassword | .jsx + .tsx | ✅ useForgotPassword | ✅ YES | ✅ 8/8 | GOOD |

**Next batch to test:** Dashboard components (admin, homeroom, subject)

---

## Findings & Decisions

### Finding 1: Most refactoring already done
- 9/14 major components already have hooks extracted
- 8 components have both .jsx and .tsx versions
- Only 6-7 components need full refactoring from scratch

### Finding 2: Browser compatibility issue
- DashboardSelector test only fails on Firefox
- Chromium and WebKit pass the same test
- Indicates browser-specific race condition or interaction issue

### Recommendation: Consolidate to Single File
After verifying each refactored component works:
1. Delete old .jsx files (keep .tsx only)
2. Reduces confusion and maintenance burden
3. Encouraged by TYPESCRIPT_REFACTORING_PLAN "no double files"

---

## Test Environment Notes
- Tests run in 4 workers in parallel
- HTML report available at `http://localhost:9323`
- Test artifacts stored in `test-results/`
- Screenshots and videos captured for failures
