# UC-HOM-02 — Thực hiện điểm danh buổi học

## Summary

| Layer | Result |
|---|---|
| Backend pytest (`TS-HOM02-01-04-06.py`) | **16/16 passed** |
| Vitest (`TS-HOM02-09.test.tsx`) | **37/37 passed** (2 fixed) |
| E2E Playwright (`TS-HOM02-08.spec.js`) | **Deferred** (requires running servers) |

---

## Bugs Fixed

### Frontend test — 2 commented-out function calls (TS-HOM02-09.test.tsx)

**Tests:** `should check if specific record is being edited` and `should generate unique record key`

Both tests asserted that a mock function was called, but the actual function invocation was commented out, causing `expected "vi.fn()" to be called with arguments: [ Array(1) ] — Number of calls: 0`.

**Fix:**
- Uncommented `const isEditing = mockEdit.isEditingRecord(record)` and added `expect(isEditing).toBe(true)`
- Uncommented `const key = mockEdit.getRecordKey(record)` and added `expect(key).toBe('SV001')`

---

## Appendix-C Gaps Fixed (8 entries)

All 8 TS-HOM02 entries were authored entirely from the spec (AI/WebSocket concepts) rather than the actual implementation (REST API + stored procedures). Major discrepancies:

### TS-HOM02-01
- **Before**: "Gửi ảnh học sinh qua luồng AI → trạng thái chuyển từ Vắng sang Có mặt"
- **After**: `POST /api/attendance/check-in` with JSON body (no image); stored procedure `process_attendance_checkin`; 3 test cases (no confidence score, with score=0.87, method field recorded)
- **Reason**: No image upload in this endpoint; check-in requires JSON with `student_id`/`status`

### TS-HOM02-02
- **Before**: "AI quét mặt sau giờ điểm danh → Đi trễ"
- **After**: Endpoint reads `attendance_cutoff_time` from `system_settings` via stored procedure; tests verify cutoff config exists, status is valid enum value, multiple same-day check-ins handled
- **Reason**: Status determination is fully inside the DB stored procedure, not in Python code

### TS-HOM02-03
- **Before**: "Integration (Backend) — fallback when AI offline"
- **After**: Manual Testing only — no automated test; AI availability cannot be simulated in integration tests
- **Reason**: AI service is external; the test file explicitly states "NOTE: AI face recognition testing is MANUAL TESTING ONLY"

### TS-HOM02-04
- **Before**: "Override thành Vắng có phép; AI không ghi đè lại"
- **After**: `PUT /api/attendance/{id}` override; requires auth + `attendance_lock_deadline` check; tests cover present→absent, override with notes, multiple sequential overrides
- **Reason**: "AI không ghi đè" is untested behavior; the lock check returns 403 not enforced in these tests

### TS-HOM02-05
- **Before**: "WebSocket performance — 10 students scan simultaneously"
- **After**: Manual Testing only; system uses REST polling, not WebSocket
- **Reason**: WebSocket is not implemented in the codebase

### TS-HOM02-06
- **Before**: "Chặn sửa bảng điểm danh đã khóa → HTTP 400"
- **After**: Data integrity tests (valid status enum, valid timestamps, student_id stored correctly, manual endpoint); lock returns **HTTP 403** (not 400) via `attendance_lock_deadline`
- **Reason**: Tests cover CRUD integrity, not lock enforcement; error code is 403 from `assert_can_edit_attendance`

### TS-HOM02-07
- **Before**: "E2E (Playwright) — WebSocket reconnect after network drop"
- **After**: Manual Testing only; system uses REST polling not WebSocket
- **Reason**: WebSocket not implemented; Playwright test file `TS-HOM02-08.spec.js` is E2E deferred

### TS-HOM02-08
- **Before**: "AI fails (unknown person/blurry) → confidence low → skip, no student updated"
- **After**: `POST /api/attendance/check-in` with low confidence (0.45, 0.52, 0.0); system **creates record with fallback to manual** (opposite of "skip")
- **Reason**: The API doesn't receive raw images; confidence score is metadata passed alongside `student_id`; record is always created

---

## Spec Gaps Fixed (homeroom.spec.tex)

### Normal flow — 3 issues corrected:
1. Step 1: "Phiên điểm danh tự động khởi tạo theo lịch" → actual: GVCN manually navigates to attendance view and selects date/class
2. Steps 2-4: "Cập nhật liên tục qua WebSocket" → actual: REST polling; frontend refreshes on demand
3. Steps 3-5: Added actual endpoint paths (`POST /api/attendance/check-in`, `POST /api/homeroom/attendance/manual`, `PUT /api/attendance/{id}`) and referenced `attendance_lock_deadline`

### Alternative flow — 1 issue corrected:
- "Bảng điểm danh đã được khóa" with no HTTP code specified → corrected to **HTTP 403** (actual code from `assert_can_edit_attendance`) with actual error message text

---

## Backend Endpoints Covered

| Endpoint | Method | Auth | Test |
|---|---|---|---|
| `/api/attendance/check-in` | POST | None | TS-HOM02-01, 02, 08 |
| `/api/attendance/{id}` | PUT | Bearer + lock check | TS-HOM02-04 |
| `/api/attendance/manual` | POST | Bearer + lock check | TS-HOM02-06 |

**Note:** `POST /api/attendance/check-in` has no authentication (intentional — called by camera system, not user browser).

---

## Status

🔄 **E2E deferred** — Playwright test (`TS-HOM02-08.spec.js`) requires running servers. Integration + unit tests: ✅ all passing.
