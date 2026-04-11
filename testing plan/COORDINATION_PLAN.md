# Testing & Refactoring Integration Strategy
## Master Coordination Plan for SynapseS Project

**Date:** March 17, 2026  
**Purpose:** Clarify how Testing Phase runs CONCURRENTLY with Code Refactoring Phase  
**Expected Outcome:** Modular, typed, and thoroughly tested codebase in 6-8 weeks  

---

## The Big Picture: Two Tracks Running in Parallel

```
TIMELINE: March 17 - May 15, 2026 (8 weeks)

┌─────────────────────────────────────────────────────────────────────────┐
│ TRACK A: CODE REFACTORING (Frontend)                                   │
│ ├─ Week 1: PHASE 1 Cleanup (Dual files, UI cleanup)                    │
│ ├─ Weeks 2-4: PHASE 2 Large component refactoring                      │
│ ├─ Week 5: PHASE 3 Unit test additions                                 │
│ └─ Week 6: PHASE 4 Services migration (api.jsx, contexts)              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ TRACK B: TESTING INFRASTRUCTURE (Frontend + Backend)                   │
│ ├─ Days 1-2: PHASE 0 Setup (Vitest, pytest, config)                    │
│ ├─ Days 3-5: PHASE 1 Advanced config & templates                       │
│ ├─ Weeks 2-3: PHASE 2 Test development (60+ tests)                    │
│ └─ Week 4+: PHASE 3 CI/CD integration & quality gates                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ SYNERGY POINTS: Where tracks interact                                   │
│ ├─ Week 1: Run E2E tests after cleanup to verify nothing broke          │
│ ├─ Week 2: Write tests for refactored components immediately            │
│ ├─ Week 3: Run refactored components through test suite                 │
│ ├─ Week 4: All refactored code must pass new unit tests                 │
│ └─ Week 5+: Full regression suite ensures quality                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Timeline: Week-by-Week Coordination

### WEEK 1: Setup Phase + Cleanup Phase

**TRACK A: Frontend Code (Cleanup)**
```
Daily Effort: 5-6 hours

Day 1-2: Audit routing, identify which pages' .tsx versions are live
├─ Create mapping: Router imports → .tsx versions (which are real)
├─ Identify old .jsx files to delete
└─ Run existing E2E tests as baseline

Day 3: Delete old .jsx files, cleanup UI backup files
├─ Remove duplicate .jsx files (Dashboard, AttendanceView, FaceManagement)
├─ Delete .bak files from src/components/ui/
├─ Run E2E tests after each deletion to verify nothing broke
└─ Commit: "refactor: remove duplicate .jsx versions after .tsx migration"

Day 4: Finalize ContinuousRecognition refactoring
├─ Verify .refactored.tsx passes E2E tests
├─ Replace original ContinuousRecognition.jsx
├─ Confirm hook and header components exported correctly
└─ Commit: "refactor: complete ContinuousRecognition.tsx migration"

Day 5: Final verification
├─ Run full E2E test suite
├─ Verify bundle size decreased
└─ Update CURRENT_STATE.md: "PHASE 1 cleanup complete"
```

**TRACK B: Testing Infrastructure (Setup)**
```
Daily Effort: 4-5 hours (parallel to Track A)

Day 1: Frontend Vitest setup
├─ npm install Vitest + dependencies
├─ Create vitest.config.ts
├─ Create setup.ts file
├─ Update package.json scripts
└─ Verify Vitest runs (will have 0 tests)

Day 2: Backend pytest setup
├─ pip install pytest + dependencies
├─ Create pytest.ini
├─ Create tests/ directory structure
├─ Create conftest.py with fixtures
└─ Verify pytest runs (will have 0 tests)

Day 3: Frontend example tests
├─ Create useLogin.test.ts (template example)
├─ Create hook-test-template.ts
├─ Verify tests pass
└─ Verify coverage reporting works

Day 4: Backend example tests
├─ Create test_login_api.py (template example)
├─ Create mocks/external_services.py
├─ Create fixtures/test_db.py
└─ Verify tests pass

Day 5: Documentation + verification
├─ Create TESTING_GUIDE.md
├─ Commit: "test: setup Vitest and pytest infrastructure"
├─ Document both stacks are ready
└─ Update CURRENT_STATE.md: "Testing PHASE 0 complete"
```

**WEEK 1 DELIVERABLES:**
- ✅ Frontend codebase cleaned (no duplicate .jsx files)
- ✅ Testing infrastructure installed (Vitest + pytest)
- ✅ Example tests working on both stacks
- ✅ E2E tests still passing
- 📊 CURRENT_STATE.md updated with progress
- 📊 TESTING_GUIDE.md created

---

### WEEKS 2-4: Core Refactoring + Test Development

**TRACK A: Frontend Code (Batch 1 - Refactoring)**  
*Effort: 40 hours over 3 weeks*

```
Week 2:
├─ DAY 1-2: Refactor Sidebar.jsx
│   ├─ Extract logic → useSidebar.ts
│   ├─ Add TypeScript types
│   └─ No tests yet (will be added in sync with Track B)
├─ DAY 3-5: Refactor auth/* components
│   ├─ LoginForm, DashboardSelector
│   ├─ Add TS types
│   └─ Run E2E tests daily to verify logins still work

Week 3-4:
├─ Refactor StudentList.jsx sections (in small chunks)
│   ├─ Extract 1 sub-component per day
│   ├─ Keep E2E tests running
│   └─ Each component update → verify tests pass

CRITICAL: After each refactoring, run E2E tests!
└─ Prevents breaking changes from sneaking through
```

**TRACK B: Testing (Batch 1 - Test Development)**  
*Effort: 40 hours over 3 weeks*

```
Week 2:
├─ Write auth tests (8 hours)
│   ├─ test_auth/test_login_api.py (5 tests)
│   ├─ test_auth/test_jwt_validation.py (5 tests)
│   └─ useLogin.test.ts (5 tests)
├─ Write score tests (8 hours)
│   ├─ test_scores/test_score_validation.py (8 tests - boundary values)
│   └─ test_scores/test_gpa_calculation.py (5 tests)
├─ Write feedback tests (6 hours)
│   ├─ test_feedback/test_gemini_fallback.py (5 tests - mocking)
│   └─ Ensure fallback logic tested heavily
├─ Write attendance tests (4 hours)
│   └─ Basic CRUD operations

Week 3-4:
├─ Write critical hook tests (16 hours)
│   ├─ useAdminDashboard.test.ts (15-20 tests)
│   ├─ useHomeroomDashboard.test.ts (15-20 tests)
│   ├─ useAttendanceData.test.ts (10-15 tests)
│   └─ useContinuousRecognition.test.ts (15-20 tests)
├─ Write component tests (8 hours)
│   ├─ Attendance module (4 components)
│   └─ ContinuousRecognition components
└─ Extend E2E with new scenarios (4 hours)
```

**SYNC POINT - Week 3:**
As Track A refactors components with Extract Hook pattern:
```
OLD: function StudentList() { const [items, setItems] = useState(...); }
                               ↓ (Refactor to TS + Hook)
NEW: function StudentList() { const logic = useStudentList(); return <UI/> }

IMMEDIATELY:
Track B creates: useStudentList.test.ts
├─ Tests the extracted hook
├─ Ensures logic still works
└─ Provides confidence Hook is correct

If E2E tests break → Hook has a bug
If component tests fail → Hook extraction missed something
```

**WEEKS 2-4 DELIVERABLES:**
- ✅ 60+ tests written (30 backend, 30+ frontend)
- ✅ 50% code coverage achieved
- ✅ Sidebar refactored to TS
- ✅ Auth system fully tested
- ✅ Scores module fully tested
- ✅ Feedback system with fallback tested
- ✅ All E2E tests still passing
- 📊 Coverage reports show 50%+ coverage

---

### WEEK 5: Testing + Refactoring Intensification

**TRACK A: Frontend Code (Batch 2 - Large Files)**  
*Effort: 20 hours*

```
Days 1-3: Refactor Management.jsx (~3000 lines)
├─ Extract state to useManagement.ts (3 hours)
├─ Split into 5 sub-components (4 hours)
├─ Add TypeScript types (2 hours)
└─ Run E2E tests continuously

Days 4-5: Refactor ClassManagement.jsx (~2500 lines)
└─ Similar approach (5 hours)

NIGHTLY: After each significant change
├─ Run full E2E suite
├─ Check for performance regressions
└─ Update CURRENT_STATE.md with progress
```

**TRACK B: Testing (Batch 2 - Expand Coverage)**  
*Effort: 20 hours*

```
Days 1-2: Complete missing hook tests (8 hours)
├─ useFaceManagement.test.ts
├─ useDashboardSelector.test.ts
├─ useForgotPassword.test.ts
└─ Aim: 70%+ coverage on hooks

Days 3-4: Context testing (6 hours)
├─ AuthContext integration tests
├─ SystemSettingsContext integration tests
└─ Test context + hooks together

Days 5: Setup GitHub Actions (6 hours)
├─ Create .github/workflows/test-frontend.yml
├─ Create .github/workflows/test-backend.yml
├─ Configure codecov integration
└─ Test CI pipeline on a dummy PR
```

**SYNC POINT - During Week 5:**
```
As Track A extracts useManagement.ts:
Track B immediately writes useManagement.test.ts (10-15 tests)
├─ Test all CRUD operations
├─ Test filtering logic
├─ Test error scenarios
└─ Verify extracted hook works correctly

Result: Management.jsx refactoring has instant validation
```

**WEEK 5 DELIVERABLES:**
- ✅ Management.jsx refactored to TS + hooks
- ✅ ClassManagement.jsx refactored
- ✅ 80+ tests written total
- ✅ 70% coverage achieved
- ✅ GitHub Actions CI/CD configured
- ✅ Coverage badges in README
- 📊 Quality gates enabled

---

### WEEKS 6-8: Grade Management + Finalization

**TRACK A: Frontend Code (Batch 3 - Grade Management)**  
*Effort: 20 hours*

```
Week 6:
├─ Refactor homeroom/GradeManagement.jsx (8 hours)
│   └─ Extract hook + sub-components
├─ Refactor subject/GradeManagement.jsx (8 hours)
│   └─ Extract hook + sub-components
└─ Run E2E tests after each

Week 7:
├─ Refactor remaining components (8 hours)
├─ Migrate contexts to hooks (4 hours)
└─ Migrate services to TS (4 hours)

Week 8:
├─ Final cleanup (2 hours)
├─ Update documentation (2 hours)
└─ Final E2E test run (2 hours)
```

**TRACK B: Testing (Batch 3 - Complete Coverage)**  
*Effort: 20+ hours*

```
Week 6:
├─ Write GradeManagement tests (8 hours)
├─ Write service layer tests (4 hours)
└─ Performance baselines (2 hours)

Week 7:
├─ Add edge case tests (8 hours)
├─ Error scenario coverage (4 hours)
└─ Stress test critical paths (4 hours)

Week 8:
├─ Final coverage review (4 hours)
├─ Performance optimization (4 hours)
└─ Documentation finalization (2 hours)
```

**WEEKS 6-8 DELIVERABLES:**
- ✅ All components migrated to TypeScript
- ✅ 100+ tests written and passing
- ✅ 85%+ code coverage achieved
- ✅ All E2E tests passing
- ✅ CI/CD fully operational
- ✅ Performance baselines established
- 📊 FINAL CURRENT_STATE.md: "100% migration complete"

---

## Daily Standup Template (Use During Weeks 2-8)

```
📋 DAILY STATUS (Track A + B Coordination)

DONE (Yesterday):
├─ [Track A] Refactored: ________
├─ [Track B] Tests written: ______
├─ [Both] E2E tests: PASS/FAIL
└─ Coverage: __% → __% (trend)

DOING (Today):
├─ [Track A] Will refactor: ________
├─ [Track B] Will test: ________
└─ [Sync] Needed: __________

BLOCKERS:
├─ Test failing: ________?
├─ Refactor issue: ________?
└─ Dependency: ________?

METRICS:
├─ TS Coverage: __% (target: +5% per week)
├─ Test Coverage: __% (target: +10% per week)
├─ E2E Pass Rate: __% (target: 100%)
└─ Build Time: __ seconds (watch for regression)
```

---

## Quality Gates Throughout

### Daily Checks
```
Before committing code:
☐ All E2E tests pass locally
☐ No TypeScript errors (npm run build)
☐ No console warnings in browser tests
☐ Code coverage didn't decrease
```

### Weekly Checks
```
Every Friday:
☐ Coverage report > previous week
☐ No flaky tests in CI
☐ Bundle size stable ± 5%
☐ Performance metrics tracked
☐ CURRENT_STATE.md updated
```

### Before Deployment
```
Final release checklist:
☐ All tests passing on main branch
☐ Coverage ≥ 85% (front), ≥ 85% (back)
☐ E2E tests pass on all browsers
☐ Visual regression tests baseline updated
☐ Performance tests show no regressions
☐ Security audit clean
☐ Documentation updated
```

---

## Resource Requirements

### Team Requirements
- **1 Developer:** Track A (Refactoring) - Primary
- **1 Developer:** Track B (Testing) - Primary  
**OR**  
- **1 Developer:** Both tracks (same person)
  - Week 1: Setup (both)
  - Weeks 2-8: Alternate focus (2-3 days each)

### Time Estimate (1 Developer, both tracks)
- PHASE 0: 2 days (setup only)
- PHASE 1-2: 3 weeks (6-6.5 hours/day)
- PHASE 3: 2 weeks (5-6 hours/day)
- PHASE 4: 1 week (4-5 hours/day)
- **Total: ~6-8 weeks for full completion**

### Computing Resources
- Frontend dev server: 1 port (3000)
- Backend dev server: 1 port (8000)
- Test runners: Lightweight (Vitest ~100MB, pytest minimal)
- E2E test browsers: Chromium + Firefox (~800MB)

---

## Handling Merge Conflicts & Cross-Track Issues

### Scenario 1: Track A refactors component that Track B is testing
```
Problem:
├─ Track A: Extracts useStudentList hook
└─ Track B: Writing tests for StudentList component

Solution:
1. Track A commits extraction first
2. Track B rebases tests onto new hook version
3. Communicate: "StudentList.jsx moving to .tsx"
4. Sync tests to match new hook structure
```

### Scenario 2: Track B finds bug in Track A code
```
Problem:
├─ Test: useAdminDashboard fails on data refresh
└─ Likely cause: Race condition in useEffect

Solution:
1. Track B creates failing test (TDD style)
2. Track A fixes hook to pass test
3. Commit: "fix: add dependency array to useAdminDashboard useEffect"
4. Test now passes, no regression
```

### Scenario 3: E2E tests break after refactoring
```
Problem:
├─ Refactored: StudentList.jsx → StudentList.tsx
└─ E2E: Tests can't find "Find Student" button

Solution:
1. Track A: Check if selector changed in refactoring
2. Track B: Update selector in E2E test
3. Both verify button still works with new selector
4. Commit: "test: update selectors for StudentList.tsx migration"
```

---

## Success Metrics (Track Completion)

### TRACK A: Refactoring Success
```
✅ Target: 100% TypeScript coverage
├─ Milestone Week 1: 50% TS (after cleanup)
├─ Milestone Week 3: 70% TS (after batch 1)
├─ Milestone Week 5: 85% TS (after batch 2)
└─ Milestone Week 8: 100% TS (complete)

✅ Target: All E2E tests pass
├─ Critical: 100% pass rate (no failures)
├─ Desirable: < 5s average test duration
└─ Visual regression: No unexpected changes
```

### TRACK B: Testing Success
```
✅ Target: 85%+ code coverage
├─ Milestone Week 2: 30% coverage
├─ Milestone Week 4: 50% coverage
├─ Milestone Week 6: 70% coverage
└─ Milestone Week 8: 85%+ coverage

✅ Target: 100+ test cases written
├─ Milestone Week 2: 30 tests
├─ Milestone Week 4: 60 tests
├─ Milestone Week 6: 85 tests
└─ Milestone Week 8: 100+ tests

✅ Target: CI/CD fully automated
├─ Tests run on every commit
├─ Coverage reports auto-updated
├─ Quality gates enforce standards
└─ No manual test run needed
```

### COMBINED Success
```
🎯 Final State (Week 8):
├─ Frontend: 100% TS, 85% coverage, 0 E2E failures
├─ Backend: 85% coverage, 100+ tests, CI/CD automated
├─ Integration: Full regression suite passing
├─ Documentation: Complete and up-to-date
└─ Code Quality: Production-ready
```

---

## Communication & Documentation

### Update Points During Project

**CURRENT_STATE.md** - Update weekly
```markdown
## Week N Summary
- Track A: [What was refactored]
- Track B: [Tests added, coverage increase]
- E2E: [Tests passing Y/Z]
- Issues: [Any blockers or challenges]
- Next: [What's coming next week]
```

**TESTING_PROGRESS.md** - Update weekly
```markdown
| Module | Tests | Coverage | E2E | Status |
|--------|-------|----------|-----|--------|
| Auth | 10 | 95% | ✅ | Complete |
| Scores | 12 | 90% | ✅ | Complete |
| ...
```

**Git Commit Messages** - Clear tracking
```
Format: [TRACK-A|TRACK-B] scope: description

Examples:
[TRACK-A] refactor(sidebar): extract useSidebar hook
[TRACK-B] test(usSidebar): add 15 unit tests
[SYNC] test: update selectors after refactor
[CI] fix: add flaky test retry logic
```

---

## Risk Mitigation

### High Risk Scenarios

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| E2E tests break during refactoring | HIGH | CRITICAL | Run E2E after every refactoring; revert if fails |
| Test environment different from dev | MEDIUM | HIGH | Use same DB, API versions in tests |
| Mocking external APIs incorrectly | MEDIUM | HIGH | Create mock library; verify mocks match real API |
| Tests become flaky in CI | MEDIUM | MEDIUM | Implement retries, increase timeouts, debug in CI |
| Scope creep (refactoring too much) | HIGH | MEDIUM | Stick to week plan; don't refactor beyond scope |
| Coverage metrics become burden | LOW | LOW | Use pragmatic targets, don't force 100% coverage |

---

## Final Checklist

### Before Starting (March 17)
- [ ] Both developers read CURRENT_STATE.md
- [ ] Both developers read TEST_SETUP_PLAN.md
- [ ] Both developers read this coordination plan
- [ ] Agree on daily standup time (e.g., 9 AM)
- [ ] Setup shared progress tracker (GitHub Issues/Projects)
- [ ] Identify which developer does Track A vs B (or same person alternates)

### Day 1 (March 17)
- [ ] Track A: Start by auditing routing imports
- [ ] Track B: Start Vitest installation
- [ ] Both: Commit initial setup
- [ ] Both: Verify example tests work by EOD

### Weekly (Every Friday)
- [ ] Both: Update CURRENT_STATE.md
- [ ] Both: Review coverage metrics
- [ ] Both: Plan next week scope
- [ ] Both: Discuss blockers and sync issues
- [ ] Both: Commit all week's progress

### Project Complete (Target: May 15)
- [ ] Coverage: 85%+ on all modules
- [ ] Refactoring: 100% TypeScript
- [ ] Testing: 100+ tests, 100% E2E pass
- [ ] CI/CD: Fully automated
- [ ] Documentation: Complete
- [ ] Code: Production-ready ✅

---

**Status:** ✅ READY TO START  
**Next Action:** Communicate this plan to team, agree on responsibilities, start PHASE 0 on March 17  
**Accountability:** Weekly check-in on both tracks to ensure coordination

