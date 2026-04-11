# IMMEDIATE ACTION PLAN - Next 48 Hours

**Goal:** Verify refactoring is still working after merge, confirm we're on track  
**Time Commitment:** 2-4 hours  
**Outcome:** Either "all good, continue refactoring" or "fix X issues, then continue"

---

## Action 1: Verify E2E Tests Work (30 minutes)

### Command to Run:
```bash
cd d:\BT\DACN-DATN\SmartSchool\frontend
npm install                    # If needed
npm run test:e2e              # Run all E2E tests
```

### Expected Result:
```
✅ 5-6 tests should pass
✅ Playwright should run in chromium + firefox
✅ HTML report generated at playwright-report/
```

### If Tests Fail:

**Action 1a: Check error details**
```bash
npm run test:e2e:ui           # Opens browser UI to see failures
```

**Action 1b: Fix broken selectors**

If tests fail on "selector not found", update `e2e/helpers/test-data.js`:
```javascript
// Current selectors might be wrong after merge
SELECTORS.MAIN_CONTENT = 'main'    // ← Might be '[role="main"]' now
SELECTORS.SIDEBAR = 'aside, nav'   // ← Might be 'nav' only now

// Check actual page structure and update selectors
// Re-run test to verify
```

**Action 1c: Re-run until all pass**
```bash
npm run test:e2e  # Should show: "X passed" with ✅
```

---

## Action 2: Verify Correct Files Are Being Used (15 minutes)

### What to Check:

**Check if .tsx versions are being loaded (not old .jsx):**

```bash
# Look at actual import in App.jsx
cat src/App.jsx | grep "homeroom/Dashboard"
# Should show: import HomeroomDashboard from "@/pages/homeroom/Dashboard"

# Verify it loads Dashboard.tsx (not Dashboard.jsx)
# Module resolution picks .tsx over .jsx automatically, but let's confirm
```

**Run the dev server:**
```bash
npm run dev
# Navigate to Homeroom Dashboard
# Right-click → Inspect → Check Network tab → see "Dashboard.jsx" or "Dashboard.tsx"
# Should be Dashboard.tsx or chunks containing Dashboard.tsx
```

---

## Action 3: Run Build to Confirm No Errors (10 minutes)

```bash
# Test production build
npm run build

# Expected: "Build complete" message
# Check: build/ directory has files, no errors
```

If build fails:
```bash
npm run build 2>&1 | head -50  # Show first 50 lines of errors
# Fix any TypeScript errors
# Re-run build
```

---

## Action 4: Delete Old Duplicate Files (30 minutes)

**ONLY if E2E tests pass (Step 1) AND build works (Step 3)**

### Files to Delete:

These are OLD versions - the .tsx versions exist now:
```bash
cd src/pages/homeroom

# Check what exists:
ls -la Dashboard.*
ls -la AttendanceView.*
ls -la FaceManagement.*
```

### Delete Command:

```bash
cd d:\BT\DACN-DATN\SmartSchool\frontend

# Remove old files:
git rm src/pages/homeroom/Dashboard.jsx        # Old version
git rm src/pages/homeroom/AttendanceView.jsx   # Old version  
git rm src/pages/homeroom/FaceManagement.jsx   # Old version

# Verify build still works:
npm run build

# Verify E2E tests still pass:
npm run test:e2e

# If all good, commit:
git commit -m "cleanup: remove obsolete .jsx files (replaced by .tsx versions)"
git log --oneline -1  # Verify commit
```

---

## Action 5: Check Most Critical Component - StudentList (15 minutes)

### What to Look For:

```bash
# Verify StudentList.jsx is STILL the massive file (not refactored yet)
wc -l src/pages/homeroom/StudentList.jsx
# Should show: ~5000-5100 lines

# Check that useStudentList hook does NOT exist yet (refactoring pending)
ls -la src/hooks/ | grep -i student
# Should show: NO useStudentList.ts (not yet created)
```

### Success Criteria:
- [ ] StudentList.jsx still ~5000 lines (not refactored yet - CORRECT)
- [ ] No useStudentList hook exists (waiting for refactoring - CORRECT)
- [ ] This will be next target for refactoring

---

## Checklist: What Should Be True After These Actions

After completing Actions 1-5, verify:

### ✅ E2E Tests
- [ ] `npm run test:e2e` shows 5-6 tests passing
- [ ] No selector errors
- [ ] All pages load without errors
- [ ] Playwright report generated

### ✅ Build
- [ ] `npm run build` completes without errors
- [ ] No TypeScript errors shown
- [ ] build/ directory exists with assets

### ✅ File Structure
- [ ] No Dashboard.jsx in homeroom/ (removed)
- [ ] No AttendanceView.jsx in homeroom/ (removed)
- [ ] No FaceManagement.jsx in homeroom/ (removed)
- [ ] Dashboard.tsx, AttendanceView.tsx, FaceManagement.tsx exist
- [ ] StudentList.jsx still exists (~5000 lines, waiting for refactoring)

### ✅ Imports
- [ ] App.jsx imports from `/pages/homeroom/Dashboard` and gets .tsx version
- [ ] All imports resolve correctly
- [ ] No "module not found" errors

### ✅ Status
- [ ] Plan confirmed: E2E tests work (safety net)
- [ ] Infrastructure confirmed: Build works, TypeScript happy
- [ ] Hooks exist: Ready for component refactoring
- [ ] Next step clear: Refactor StudentList following Dashboard.tsx pattern

---

## If Something Breaks: Recovery Steps

### "E2E tests fail on selector"
**Fix:** Update `e2e/helpers/test-data.js`, verify actual selectors with browser dev tools

### "Build has TypeScript errors"
**Fix:** These are usually in newly added .ts/.tsx files - fix type annotations

### "Module resolution picks wrong file"
**Fix:** Delete old .jsx file - extension resolution prefers .tsx

### "Tests fail after deleting files"
**Don't panic:** Restore files with git, re-run E2E, keep .jsx files if tests need them

```bash
git restore src/pages/homeroom/Dashboard.jsx  # Restore deleted file
npm run test:e2e                              # Verify tests pass again
```

---

## Success Indicator

**You'll know everything is good when:**
```
✅ E2E tests pass (5-6 tests)
✅ Build completes
✅ No old .jsx duplicates
✅ Page loads correctly
✅ Verification: "Yep, refactoring is working, let's continue"
```

**Estimated Time:** 2-4 hours total (mostly waiting for npm/playwright)

---

## What This Proves

✅ **Proves:** Refactoring approach is working correctly after merge  
✅ **Proves:** E2E tests are your safety net (they catch issues)  
✅ **Proves:** TypeScript infrastructure is solid  
✅ **Proves:** Ready to continue with Phase 3 (StudentList extraction)  

---

## Next: Continue Refactoring

Once this checklist passes, you can:

1. Continue extracting StudentList.jsx → useStudentList hook (1-2 days)
2. Refactor Management.jsx (1-2 days)
3. Continue pattern for remaining components (2-4 weeks)
4. Start unit tests (week 3-4, after Phase 3 80% complete)

All following the Dashboard.tsx pattern shown in code.

---

## Rollback Plan (If Major Issues)

If something goes seriously wrong:

```bash
# Restore everything to before this session
git reset --hard HEAD~1

# This will undo:
# - Deleted files (restored)
# - Any small changes

# You can investigate what happened and try again carefully
```

---

## Questions During This Process?

**Refer to these docs if something seems wrong:**

1. `FRONTEND_REFACTORING_STATUS.md` (full analysis)
2. `REFACTORING_TRACK_CHECK.md` (track verification)
3. `local doc/TYPESCRIPT_REFACTORING_PLAN.md` (main strategy)
4. `local doc/COMPONENT_REFACTORING_CHECKLIST.md` (per-component template)

---

## Timeline

**Time Investment:**
- 30 min: E2E test verification + selector fixes
- 15 min: File checks
- 10 min: Build verification
- 30 min: File cleanup
- 15 min: StudentList verification
- **Total: ~2 hours (mostly automated)**

**Result:** Confident that refactoring is on track or identified issues to fix.

Let's go! 🚀
