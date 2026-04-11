# Backend Testing - Complete Navigation Guide

**Created:** March 17, 2026  
**Purpose:** Help team navigate testing documentation and get started immediately  
**Last Updated:** PHASE 0 Complete

---

## 📚 Document Map

### Core Planning Documents

1. **📋 BACKEND_TESTING_STRATEGY.md**
   - **What:** Complete testing plan for all 14 backend modules
   - **When to use:** Planning which modules to test, understanding priorities
   - **Key sections:**
     - Module Testing Priority Matrix (4 phases)
     - Detailed test plans for Week 1-4 modules
     - Testing best practices
     - Success metrics
   - **Read time:** 45 minutes
   - **Start:** Section "🔴 PHASE 1: WEEK 1-2"

2. **🚀 BACKEND_TEST_IMPLEMENTATION_GUIDE.md**
   - **What:** Concrete code examples for writing tests
   - **When to use:** Actually writing test code
   - **Key sections:**
     - Your First Test File (copy/paste ready)
     - Test Pattern Reference (5 common patterns)
     - Test files to create (in priority order)
     - Common issues & solutions
   - **Read time:** 30 minutes
   - **Start:** Section "Quick Start: Your First Test File"

3. **📊 WEEK_1_PROGRESS_TRACKER.md**
   - **What:** Daily standup checklist and progress tracking
   - **When to use:** Start of each day, end of each day reporting
   - **Key sections:**
     - Test file creation checklist
     - Daily standup templates (Mon-Fri)
     - Test results template
     - Success criteria (minimum/target/stretch)
     - Metrics scorecard
   - **Read time:** 15 minutes (daily reference)
   - **Start:** Print this or bookmark it, use daily

4. **📖 BACKEND_MODULE_ANALYSIS.md** (from Explore agent)
   - **What:** Deep analysis of all 14 modules
   - **When to use:** Understanding module dependencies, complex modules
   - **Key sections:**
     - Module structure breakdown
     - Business logic documentation
     - Known issues per module
     - Dependencies and mocking needs
   - **Read time:** 60 minutes (reference document)
   - **Start:** Search for your specific module

---

## 🎯 Quick Start (Complete This First)

### For Backend Team Leads

**Time: 30 minutes**

1. Read: **BACKEND_TESTING_STRATEGY.md** (PHASE 1 section)
   - Understand Week 1-2 priorities
   - Identify 5 core modules to test first

2. Read: **BACKEND_TEST_IMPLEMENTATION_GUIDE.md** (Steps 1-2)
   - Clone the test example
   - Run the first test file

3. Read: **WEEK_1_PROGRESS_TRACKER.md** (Daily standup template)
   - Plan Monday's tasks
   - Set up daily tracking

### For Developers Writing Tests

**Time: 1 hour before starting**

1. Read: **BACKEND_TEST_IMPLEMENTATION_GUIDE.md** (ALL)
   - Copy test patterns into your muscle memory
   - Bookmark the "Pattern Reference" section
   - Skim "Common Issues & Solutions"

2. Clone: **test_auth_services.py** from implementation guide
   - Copy the full test file
   - Understand each test's structure
   - Notice the Arrange-Act-Assert pattern

3. Run: First test to verify setup works
   ```bash
   cd backend_modular
   pytest tests/unit/test_auth_services.py -v
   ```

4. Start writing: Follow the patterns for your module

---

## 🗓️ Week-by-Week Navigation

### Week 1 (Days 1-5) - FOUNDATION

**Focus:** Core infrastructure (Auth, Core, Users)

**Documents to use:**
1. WEEK_1_PROGRESS_TRACKER.md ← DAILY
2. BACKEND_TEST_IMPLEMENTATION_GUIDE.md ← FOR CODE
3. BACKEND_TESTING_STRATEGY.md ← FOR PLANNING (PHASE 1 section)

**Test files to create:**
- [ ] test_auth_services.py (16 tests)
- [ ] test_core_config.py (8 tests)
- [ ] test_core_database.py (8 tests)
- [ ] test_core_logger.py (4 tests)
- [ ] test_users_services.py (12 tests)

**Success metrics:**
- 48 tests written and passing ✅
- No pytest errors
- Coverage report generated

---

### Week 2 (Days 8-12) - COMPLEX LOGIC

**Focus:** AI Services, Scores, Feedback, Attendance, Students

**Documents to use:**
1. WEEK_1_PROGRESS_TRACKER.md (copy template for Week 2) ← DAILY
2. BACKEND_TESTING_STRATEGY.md (PHASE 2 section) ← FOR PLANNING
3. BACKEND_TEST_IMPLEMENTATION_GUIDE.md ← FOR CODE PATTERNS

**Test modules to tackle:**
- [ ] AI Services (14 tests)
- [ ] Scores (20 tests)
- [ ] Feedback (16 tests)
- [ ] Attendance (14 tests)
- [ ] Students (12 tests)

**Success metrics:**
- 62+ tests added
- Total: 110+ tests passing ✅
- 50%+ coverage

---

### Week 3 (Days 15-19) - SUPPORTING FEATURES

**Focus:** Admin, Homeroom, Camera Manager

**Documents to use:**
1. BACKEND_TESTING_STRATEGY.md (PHASE 3 section) ← FOR PLANNING

**Success metrics:**
- 36+ tests added
- Total: 146+ tests passing ✅
- 60%+ coverage

---

### Week 4 (Days 22-26) - COMPLETION & CI/CD

**Focus:** Score Settings, Integration tests, Coverage reporting

**Documents to use:**
1. BACKEND_TESTING_STRATEGY.md (PHASE 4 section) ← FOR PLANNING

**Success metrics:**
- 28+ tests added
- Total: 174+ tests passing ✅
- 70%+ coverage
- GitHub Actions configured

---

## 📂 File Structure After Week 1

```
backend_modular/
├── tests/
│   ├── __init__.py
│   ├── conftest.py (existing - shared fixtures)
│   │
│   ├── unit/
│   │   ├── __init__.py
│   │   ├── test_auth_services.py          ← START HERE (16 tests)
│   │   ├── test_core_config.py            (8 tests)
│   │   ├── test_core_database.py          (8 tests)
│   │   ├── test_core_logger.py            (4 tests)
│   │   ├── test_users_services.py         (12 tests)
│   │   ├── test_ai_services_embeddings.py (10 tests - optional Week 1)
│   │   └── ...more unit tests
│   │
│   ├── integration/
│   │   ├── __init__.py
│   │   ├── test_auth_flow.py      (optional Week 1)
│   │   └── ...integration tests
│   │
│   ├── mocks/
│   │   ├── __init__.py
│   │   └── external_services.py (existing - mock library)
│   │
│   └── fixtures/
│       └── __init__.py
│
├── pytest.ini (existing)
└── requirements.txt
```

---

## 🎓 Testing Patterns I Need to Know

### Pattern 1: Simple Unit Test (No mocking)

```python
def test_something_expected_behavior():
    # Arrange - set up
    # Act - execute
    # Assert - verify
```

**When to use:** Pure functions, calculations with no I/O

**Example from guide:** `test_hash_password_returns_non_empty_string`

### Pattern 2: Unit Test with Database Mock

```python
def test_something_with_db(mocker):
    mock_db = mocker.patch('module.services.db_call')
    mock_db.return_value = test_data
    # Now test without hitting real DB
```

**When to use:** Testing service logic that reads from DB

**Example from guide:** `test_get_student_by_id_found`

### Pattern 3: Test Error Cases

```python
def test_something_raises_error():
    with pytest.raises(ExpectedError):
        function_that_should_fail()
```

**When to use:** Testing invalid input handling

### Pattern 4: Parametrized Tests

```python
@pytest.mark.parametrize('input,expected', [
    (9.5, 'A'),
    (8.5, 'B'),
])
def test_multiple_cases(input, expected):
    assert convert(input) == expected
```

**When to use:** Testing same logic with multiple inputs

### Pattern 5: Async Tests

```python
@pytest.mark.asyncio
async def test_async_function():
    result = await async_function()
    assert result
```

**When to use:** Testing async functions (uncommon in this backend)

---

## 🛠️ Command Reference

### Run Tests

```bash
# All unit tests
pytest tests/unit/ -v

# Specific file
pytest tests/unit/test_auth_services.py -v

# Specific test
pytest tests/unit/test_auth_services.py::TestPasswordHashing::test_hash_password_returns_non_empty_string -v

# Watch mode (auto-rerun on file changes)
pytest-watch tests/unit/
```

### Generate Coverage

```bash
# Terminal report
pytest tests/unit/ -v --cov=backend_modular --cov-report=term-missing

# HTML report (open htmlcov/index.html)
pytest tests/unit/ -v --cov=backend_modular --cov-report=html
```

### Debug Failing Tests

```bash
# Show full error output
pytest tests/unit/test_name.py -v --tb=long

# Stop at first failure
pytest tests/unit/ -x

# Show print statements
pytest tests/unit/ -v -s
```

---

## 🔍 Module Dependency Map

Understanding dependencies helps with test ordering:

```
Core & Config (foundation)
    ↓
Auth (uses core for DB)
    ↓
Users (uses auth for verification)
    ↓
Students (uses users + core)
    ↓
Scores (uses students, needs OCR mocks)
    ↓
Feedback (uses scores, needs Gemini mock)
    ↓
Attendance (uses students)
    ↓
AI Services (uses embeddings, needs InsightFace mock)
```

**Rule:** Test dependencies before dependents

**Examples:**
- Test Core before Auth ✅
- Test Auth before Users ✅
- Test Students before Scores ✅

---

## ⚠️ Known Gotchas

### Gotcha 1: Mock Path Must Match Usage Location

```python
# ❌ WRONG
mocker.patch('auth.services.bcrypt.hashpw')

# ✅ CORRECT
mocker.patch('backend_modular.auth.services.bcrypt.hashpw')
# If bcrypt is imported in services.py as: from bcrypt import hashpw
```

### Gotcha 2: ConfTest Fixtures Are Global

```python
# fixtures in tests/conftest.py are available to ALL test files
# NO NEED to import them

# In test_auth_services.py:
def test_something(mock_all_external_apis):  # ← this fixture is auto-available
    # Use fixture
```

### Gotcha 3: Database Tests Need Transaction Rollback

```python
# If you're writing integration tests that touch real DB:
@pytest.fixture
def db_with_rollback(client, monkeypatch):
    # Set transaction to rollback after each test
    # Otherwise tests will pollute each other
```

### Gotcha 4: Coverage Won't Show Skipped Tests

```python
# If you skip a test:
@pytest.mark.skip(reason="Not implemented yet")
def test_something():
    pass

# That line won't show in coverage report (it's skipped, not executed)
```

---

## 📞 How to Get Help

### Question Type 1: "How do I test this?"

**Solution:** 
1. Look in BACKEND_TEST_IMPLEMENTATION_GUIDE.md for similar pattern
2. Check BACKEND_TESTING_STRATEGY.md for your module's test plan
3. Copy pattern from conftest.py fixtures

### Question Type 2: "Test is failing, I don't know why"

**Solution:**
1. Read error message carefully (usually very clear)
2. Check "Common Issues & Solutions" in BACKEND_TEST_IMPLEMENTATION_GUIDE.md
3. Run with `-v -s --tb=long` for full output
4. Add `print()` statements to debug

### Question Type 3: "My mock isn't working"

**Solution:**
1. Most common: wrong import path - check "Gotcha 1" above
2. Try: `mocker.patch('`, then module name, then function name
3. Verify function is imported in the service file you're testing

### Question Type 4: "I'm confused about module X"

**Solution:**
1. Open BACKEND_MODULE_ANALYSIS.md
2. Search for your module name
3. Read the Business Logic section
4. Check the Test Plan section for expected tests

---

## 🚀 Success Path

### Day 1: Setup & First Test
- [ ] Read: BACKEND_TEST_IMPLEMENTATION_GUIDE.md (30 min)
- [ ] Copy: test_auth_services.py (15 min)
- [ ] Run: `pytest tests/unit/test_auth_services.py -v` (5 min)
- [ ] Result: 16 tests passing ✅

### Day 2-3: Auth & Core Modules
- [ ] Create: test_core_config.py (1 hr)
- [ ] Create: test_core_database.py (1.5 hr)
- [ ] Result: 32 more tests passing ✅

### Day 4-5: Users & Optional AI
- [ ] Create: test_users_services.py (1.5 hr)
- [ ] Optional: test_ai_services_embeddings.py (2 hr)
- [ ] Result: 48+ tests passing ✅

### End of Week 1:
- [ ] Run: `pytest tests/unit/ --cov=backend_modular --cov-report=html`
- [ ] Check: htmlcov/index.html
- [ ] Report: X% coverage, Y tests passing
- [ ] Commit: `test: complete PHASE 1 - 48+ unit tests for core modules`

---

## 📊 Metrics Dashboard

Track these numbers weekly:

| Metric | Week 1 Target | Week 2 Target | Week 3 Target | Week 4 Target |
|--------|---------------|---------------|---------------|---------------|
| Tests Written | 48 | 62 | 36 | 28 |
| Tests Passing | 48 | 110 | 146 | 174 |
| Coverage | 40% | 50% | 60% | 70% |
| Critical Modules Tested | 5 | 9 | 12 | 14 |
| Bugs Found | varies | varies | varies | varies |

---

## ✅ Checklist: I'm Ready to Start Testing

- [ ] I've read BACKEND_TESTING_STRATEGY.md (PHASE 1 section)
- [ ] I've read BACKEND_TEST_IMPLEMENTATION_GUIDE.md (all of it)
- [ ] I understand the Arrange-Act-Assert pattern
- [ ] I can run `pytest tests/unit/test_auth_services.py -v`
- [ ] I understand what `mocker.patch()` does
- [ ] I know where conftest.py fixtures come from
- [ ] I've bookmarked this navigation guide
- [ ] I've verified: `cd backend_modular && pytest tests/ -v` works

**If all checked:** Start with test_auth_services.py! 🚀

**If any unchecked:** Re-read that section before starting.

---

## 🎯 Focus Areas by Role

### 👨‍💼 Lead Developer / Team Lead
- Use: BACKEND_TESTING_STRATEGY.md (planning)
- Use: WEEK_1_PROGRESS_TRACKER.md (daily oversight)
- Task: Coordinate module assignments, track progress

### 👨‍💻 Backend Developer (Writing Tests)
- Use: BACKEND_TEST_IMPLEMENTATION_GUIDE.md (code reference)
- Use: BACKEND_MODULE_ANALYSIS.md (understand module)
- Task: Write tests for assigned module

### 🧪 QA / Testing Specialist
- Use: All documents (comprehensive view)
- Task: Review test coverage, find gaps, suggest improvements

### 🔧 DevOps / CI Engineer
- Use: BACKEND_TESTAMENT_STRATEGY.md (coverage metrics)
- Task: Set up GitHub Actions, automate test runs

---

## 📞 Questions During Testing?

Before asking:

1. **Question about patterns?** → Check BACKEND_TEST_IMPLEMENTATION_GUIDE.md
2. **Question about a module?** → Check BACKEND_MODULE_ANALYSIS.md
3. **Question about plan?** → Check BACKEND_TESTING_STRATEGY.md
4. **Question about progress?** → Check WEEK_1_PROGRESS_TRACKER.md
5. **Still stuck?** → Ask team lead with specific error message

---

## 🎓 Learning Resources

### Inside This Testing Suite
- Pattern examples: BACKEND_TEST_IMPLEMENTATION_GUIDE.md
- Real module info: BACKEND_MODULE_ANALYSIS.md
- Mocking patterns: tests/mocks/external_services.py
- Shared fixtures: tests/conftest.py

### External References
- pytest docs: https://docs.pytest.org/
- unittest.mock docs: https://docs.python.org/3/library/unittest.mock.html
- Testing patterns: https://testdriven.io/

---

## 🚀 Final Reminder

**You don't need to memorize everything.** Use this guide as your:
- ✅ Quick reference bookmark
- ✅ Mental checklist before morning standup
- ✅ Troubleshooting guide when stuck
- ✅ Progress tracking document

**Each day:**
1. Open WEEK_1_PROGRESS_TRACKER.md
2. Find your scheduled tasks for today
3. Open BACKEND_TEST_IMPLEMENTATION_GUIDE.md for code patterns
4. Reference BACKEND_TESTING_STRATEGY.md if confused about scope
5. Run tests at end of day: `pytest tests/unit/ -v`

**That's it!** You're prepared. Let's go test! 🎯

---

**Questions? Check the document map above. Can't find it? Ask team lead.**

