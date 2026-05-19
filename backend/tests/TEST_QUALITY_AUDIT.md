# Test Quality Audit — False Error Code Acceptance

Audit date: May 16, 2026  
Scope: All `TS-*.py` backend test files  
Rule: A test that accepts an error status code (4xx/5xx) as success is only
acceptable when the **purpose of that test is to verify an error condition**.
Happy-path or feature-validation tests must not mask failures this way.

---

## Legend
| Status | Meaning |
|--------|---------|
| 🔴 BUG | Happy-path or feature test wrongly accepting error code |
| 🟠 WORKAROUND | Silently passes without making any real assertion |
| 🟡 BORDERLINE | Ambiguous — API behaviour is genuinely flexible, but 500 must go |
| ✅ OK | Error codes are correct for the test purpose |

---

## File: TS-ADM03-01-07.py

### 🟠 WORKAROUND — Silent `pass / return` in 7 places (lines ~312, 385, 402, 458, 470, 543, 608)
**Test affected:** `test_TS_ADM03_04_same_year_transfer_success`,
`test_TS_ADM03_04_cannot_transfer_if_already_in_different_class_same_year`,
`test_TS_ADM03_05_new_year_promotion_success`,
`test_TS_ADM03_06_target_class_not_found_404`,
`test_TS_ADM03_06_current_class_equals_target_400`  
**Problem:** When fixture data is unavailable the test exits silently with `pass / return`,
reporting as PASSED even though no API call was made.  
**Fix:** Replace `pass / return` with `pytest.skip("reason")`.  
**Status:** ⬜ Pending

### 🔴 BUG — Happy-path transfer accepts 400 (line 425)
**Test:** `test_TS_ADM03_04_cannot_transfer_if_already_in_different_class_same_year`  
**Current:** `assert response.status_code in [200, 400]`  
**Problem:** This test verifies a *successful* first transfer. 400 = endpoint error.  
**Fix:** `assert response.status_code == 200`  
**Status:** ⬜ Pending

---

## File: TS-ADM05-01-07.py

### 🔴 BUG — Test named "returns_200" but accepts 401/403/422 (line 71)
**Test:** `test_TS_ADM05_01_bootstrap_returns_200`  
**Current:** `assert response.status_code in [200, 401, 403, 422]`  
**Problem:** 401/403 = auth failure, 422 = bad params — these indicate a broken
setup, not a passing test.  The test name and docstring explicitly state the
expected outcome is 200.  
**Fix:** `assert response.status_code == 200`  
**Status:** ⬜ Pending

---

## File: TS-ADM09-01-09.py

### 🔴 BUG — Delete-success test accepts 400/403/409 (line 480)
**Test:** `test_TS_ADM09_06_delete_teacher_success`  
**Current:** `assert response.status_code in [200, 400, 403, 409]`  
**Problem:** Teacher was just created immediately before; delete must succeed with
200. 403 = permission denied, 409 = conflict — both are real bugs here.  
**Fix:** `assert response.status_code == 200`  
**Status:** ⬜ Pending

### 🔴 BUG — Valid-code validation test accepts 422 (line 560)
**Test:** `test_TS_ADM09_09_teacher_code_validation`  
**Current:** `assert response.status_code in [200, 201, 422]`  
**Problem:** Test sends a **properly-formatted** teacher code and asserts it is
accepted. 422 = Pydantic validation error, meaning the code was rejected — that
is the opposite of the test intent.  
**Fix:** `assert response.status_code in [200, 201]`  
**Status:** ⬜ Pending

### 🔴 BUG — Invalid-email validation test accepts 200/201 (line 580)
**Test:** `test_TS_ADM09_09_email_validation`  
**Current:** `assert response.status_code in [200, 201, 400, 422]`  
**Problem:** Test sends `"invalid-email-format"` — the purpose is to verify the
API rejects it. Accepting 200/201 means a bad email silently creates a teacher
record, which is a data quality bug.  
**Fix:** `assert response.status_code in [400, 422]`  
(Remove cleanup block for 200/201 too — it becomes unreachable.)  
**Status:** ⬜ Pending

---

## File: TS-SUB02-01-08.py

### 🟡 BORDERLINE — Happy-path GETs accept 500 (lines 121, 142, 181, 196, 273, 349, 427, 450)
**Tests:** `test_teacher_loads_score_management_page`,
`test_teacher_reads_existing_scores`, `test_teacher_retrieves_students_by_class_subject`,
`test_get_teacher_subject_classes`, `test_student_scores_retrieval`,
`test_teacher_views_class_and_students`, `test_view_existing_scores_multiple_students`  
**Current pattern:** `assert response.status_code in [200, 404, 500]`  
**Problem:** 500 = unhandled server exception — this should always surface as a
test failure, never be masked.  404 for GET data-reads is acceptable
(record might not exist yet).  
**Fix:** Remove 500 from each list: `assert response.status_code in [200, 404]`  
**Status:** ⬜ Pending

---

## Files with ✅ OK patterns (no action needed)

| File | Lines | Reason it is OK |
|------|-------|-----------------|
| TS-ADM01-01-07.py | 255, 284, 322 | Error tests — duplicate/conflict scenarios |
| TS-ADM01-01-07.py | 98 | Auth test — expects 401/403 |
| TS-ADM02EX-01-09.py | 454 | Auth test — expects 401/403 |
| TS-ADM02EX-01-09.py | 597 | Empty-list import: 400 *or* 200+count=0 are both valid API responses |
| TS-ADM02EX-01-09.py | 787 | Null-field test: accepts 200 only if error_count>0 (correctly guarded) |
| TS-ADM02EX-01-09.py | 840 | Large-batch: size-limit behaviour legitimately varies |
| TS-ADM03-01-07.py | 651 | Auth test |
| TS-ADM08-01-09.py | 168 | Create may conflict with existing DB data (409 expected) |
| TS-ADM08-01-09.py | 229 | API may require non-null teacher (400 expected) |
| TS-ADM08-01-09.py | 376, 499, 523 | Validation / permission error tests |
| TS-ADM09-01-09.py | 257, 543 | Constraint / validation error tests |
| TS-ADM09-01-09.py | 506 | Auth test |
| TS-SUB02-01-08.py | 155, 163 | Auth tests |
| TS-SUB02-01-08.py | 229, 254, 395 | Validation / permission error tests |
| TS-SUB02EXT-01-09.py | 491, 553 | Error / auth tests |

---

## Fix Progress

| # | File | Issue | Status |
|---|------|-------|--------|
| 1 | TS-ADM03-01-07.py | Silent pass/return × 7 → pytest.skip() | ✅ |
| 2 | TS-ADM03-01-07.py | Line 425 [200,400] → ==200 | ✅ |
| 3 | TS-ADM05-01-07.py | Line 71 [200,401,403,422] → ==200 + fixed mock fixture | ✅ |
| 4 | TS-ADM09-01-09.py | Line 480 [200,400,403,409] → ==200 | ✅ |
| 5 | TS-ADM09-01-09.py | Line 560 [200,201,422] → [200,201] | ✅ |
| 6 | TS-ADM09-01-09.py | Line 580 [200,201,400,422] → [400,422] | ✅ |
| 7 | TS-SUB02-01-08.py | Remove 500 from happy-path GET assertions | ✅ |

**Final run:** 62 passed, 5 skipped (ADM03 data-unavailable guards) — 0 failures.
