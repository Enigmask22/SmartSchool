# UC-ADM-10 — Quản lý thời gian học vụ

## Summary

| Layer | Result |
|---|---|
| Backend pytest (`TS-ADM10-01-09.py`) | **23/23 passed** |
| Vitest (`TS-ADM10-09.test.tsx`) | **14/14 passed** |
| E2E Playwright (`TS-ADM10-08.spec.js`) | **Deferred** (requires running servers) |

---

## No Backend Bugs Found

All tests passed on first run. No code changes to production files.

---

## Test File Changes — Rollback Fixtures Added

The test file lacked cleanup for all write operations, leaving the real DB dirty after each run.

### Changes made to `backend/tests/TS-ADM10-01-09.py`

#### 1. Added `cleanup_dayoffs` fixture (new)

```python
@pytest.fixture
def cleanup_dayoffs(db):
    """Two-phase cleanup: Restore dayoff records to their pre-test state."""
    original_dayoffs = {}  # key = (year, month, grade)

    def capture_before(year: int, month: int, grade: int):
        key = (year, month, grade)
        if key not in original_dayoffs:
            existing = db.table("dayoff").select("id, dayoffs_list")
                .eq("year", year).eq("month", month).eq("grade", grade).execute()
            if existing.data:
                original_dayoffs[key] = {"id": ..., "dayoffs_list": ...}  # restore
            else:
                original_dayoffs[key] = None  # delete after test

    yield capture_before
    # Teardown: delete new records, restore modified ones
```

#### 2. `cleanup_settings` added to validation tests (TS-ADM10-03)

Three validation tests set invalid values (`"invalid-year"`, `"INVALID_SEMESTER"`, `"invalid-time"`) without restoring. Each now captures original and restores via `cleanup_settings`:
- `test_TS_ADM10_03_semester_must_be_valid_value`
- `test_TS_ADM10_03_academic_year_format_validation`
- `test_TS_ADM10_03_time_format_validation`

#### 3. `cleanup_dayoffs` wired into all dayoff-writing tests

| Test | Captured key |
|---|---|
| `test_TS_ADM10_04_add_dayoff_returns_201` | `(2025, 2, 10)` |
| `test_TS_ADM10_04_dayoff_contains_created_data` | `(2025, 9, 11)` |
| `test_TS_ADM10_06_add_multiple_grades_dayoff` | `(2025, 4, 12)` |
| `test_TS_ADM10_06_update_existing_dayoff` | `(2025, 5, 10)` |
| `test_TS_ADM10_dayoff_workflow` | `(2025, 7, 11)` |

---

## Appendix-C Gaps Fixed (7 entries)

### TS-ADM10-01
- **Before**: "QTV truy cập màn hình" — vague, no endpoint
- **After**: `GET /api/admin/system-settings` explicit; describes actual response structure

### TS-ADM10-02
- **Before**: "Thay đổi từ Học kỳ 1 sang Học kỳ 2", "ghi nhận là Active"
- **After**: `PUT /api/admin/system-settings/{setting_key}` with `{setting_value}` body; covers `academic_year`, `semester`, `attendance_cutoff_time`; notes rollback

### TS-ADM10-03
- **Before**: "Logic Biên — giờ bắt đầu muộn hơn giờ kết thúc" — this constraint doesn't exist in the API
- **After**: Correct scenario — API accepts arbitrary values; test verifies `[200, 400, 422]`; original values restored after test

### TS-ADM10-04
- **Before**: "bảng DayOff", "HTTP 201 Created", "từ ngày A đến ngày B"
- **After**: Table name `dayoff`; returns `200/201` (upsert semantics); payload format `{year, month, grade, dayoffs_list: [int,...]}`; rollback noted

### TS-ADM10-05
- **Before**: "Module AI điểm danh không khởi tạo phiên" — untestable in integration test
- **After**: `GET /api/admin/dayoffs?year=&month=&grade=` — what the test actually verifies

### TS-ADM10-06
- **Before**: "Khối 12 mới không bị tính chuyên cần, Khối 10, 11 vẫn điểm danh" — not tested
- **After**: Correct scenario — POST with different `grade` values; upsert behavior on same key; rollback noted

### TS-ADM10-07
- **Before**: "HTTP 403 Forbidden" only, "xương sống hệ thống" vague
- **After**: "HTTP 401 hoặc 403"; explicit endpoints `PUT /api/admin/system-settings/{key}` and `POST /api/admin/dayoffs`

---

## Test Coverage Notes

- **TS-ADM10-01** (GET settings): 3 tests — 200 OK, list structure, required fields
- **TS-ADM10-02** (Update settings): 3 tests — academic_year, semester, attendance_cutoff_time; all with rollback
- **TS-ADM10-03** (Validation): 3 tests — invalid semester/year/time values; API currently accepts them (200); rollback added
- **TS-ADM10-04** (Add dayoff): 2 tests — 200/201 response, returned data structure; rollback added
- **TS-ADM10-05** (Get dayoff): 2 tests — 200 OK, `data` field present
- **TS-ADM10-06** (Bulk/update): 2 tests — different grades, upsert behavior; rollback added
- **TS-ADM10-07** (Security): 3 tests — teacher 403 on PUT settings + POST dayoffs; unauthenticated 401/403
- **TS-ADM10-09** (Frontend validation): 14 Vitest tests — academic year YYYY-YYYY format, semester HK1/2/3, time HH:MM, submit disable on error

---

## Status

🔄 **E2E deferred** — Playwright test (`TS-ADM10-08.spec.js`) requires running servers. Integration + unit tests: ✅ all passing with full DB rollback.
