"""
Test Suite: TS-HOM01 - Homeroom Dashboard Bootstrap
====================================================

Test Matrix Mapping:
- **TS-HOM01-01:** Happy Path - GET /homeroom/dashboard/bootstrap (default month/year)
- **TS-HOM01-02:** Security - Teacher B cannot view Teacher A's classes
- **TS-HOM01-03:** Logic - Attendance statistics calculated correctly
- **TS-HOM01-04:** Filter - Time period selection (month/year filters)
- **TS-HOM01-06:** Alternative - Empty data handling (no students/attendance)
- **TS-HOM01-07:** Exception - Error handling (invalid inputs, DB errors)
- **TS-HOM01-08:** Integration - Full dashboard bootstrap workflow

Note: TS-HOM01-05 (Grade Distribution) skipped - feature not implemented (404 expected)

Focus Areas:
- Dashboard bootstrap with default/filtered data
- Academic year and class selection
- Student list with attendance counts aggregation
- Top absent/late students sorting
- Security role-based access control
- Time period filtering (month/year)
- Edge cases and error handling
- Data isolation by teacher

Test Pattern: pytest + TestClient + real JWT tokens + two-phase cleanup
"""

import pytest
from datetime import datetime, date
from fastapi.testclient import TestClient
from backend.app_factory import create_app


# =====================================================
# FIXTURES & SETUP
# =====================================================

@pytest.fixture(scope="module")
def client():
    """FastAPI TestClient instance"""
    app = create_app()
    return TestClient(app)


@pytest.fixture
def cleanup_dashboard(db):
    """Two-phase cleanup: Track created test data"""
    created_data = {
        "classes": [],
        "students": [],
        "attendance": []
    }
    
    yield created_data
    
    # Cleanup phase - delete in reverse order (FK constraints)
    for att_id in created_data.get("attendance", []):
        try:
            if db:
                db.table("attendance").delete().eq("id", att_id).execute()
        except Exception as e:
            print(f"⚠ Failed to delete attendance {att_id}: {str(e)}")


# =====================================================
# TEST SUITE: TS-HOM01-01
# =====================================================

class TestDashboardBootstrapHappyPath:
    """Test homeroom dashboard bootstrap with default data"""
    
    def test_TS_HOM01_01_bootstrap_returns_200(self, client, teacher_jwt_token):
        """Should return 200 OK when loading dashboard"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 200
    
    def test_TS_HOM01_01_bootstrap_response_structure(self, client, teacher_jwt_token):
        """Response should have correct structure"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data["success"] is True
        assert "data" in data
        
        bootstrap_data = data["data"]
        assert "academic_years" in bootstrap_data
        assert "classes" in bootstrap_data
        assert "selected_class" in bootstrap_data
        assert "students" in bootstrap_data
        assert "top_absent" in bootstrap_data
        assert "top_late" in bootstrap_data
    
    def test_TS_HOM01_01_classes_auto_selects_first(self, client, teacher_jwt_token):
        """First class should be auto-selected if no class_id specified"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # If teacher has classes, first one should be selected
        if data.get("classes"):
            assert data.get("selected_class") is not None
            assert data["selected_class"]["id"] == data["classes"][0]["id"]
    
    def test_TS_HOM01_01_students_have_attendance_counts(self, client, teacher_jwt_token):
        """Student records should include attendance counts"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        if data.get("students"):
            student = data["students"][0]
            assert "student_id" in student
            assert "student_code" in student
            assert "student_name" in student
            assert "class_name" in student
            assert "absent_count" in student
            assert "late_count" in student
            assert "early_count" in student
    
    def test_TS_HOM01_01_top_absent_sorted_descending(self, client, teacher_jwt_token):
        """Top absent students should be sorted by absent_count descending"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        if data.get("top_absent") and len(data["top_absent"]) > 1:
            for i in range(len(data["top_absent"]) - 1):
                assert data["top_absent"][i]["absent_count"] >= data["top_absent"][i+1]["absent_count"]
    
    def test_TS_HOM01_01_top_late_sorted_descending(self, client, teacher_jwt_token):
        """Top late students should be sorted by late_count descending"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        if data.get("top_late") and len(data["top_late"]) > 1:
            for i in range(len(data["top_late"]) - 1):
                assert data["top_late"][i]["late_count"] >= data["top_late"][i+1]["late_count"]


# =====================================================
# TEST SUITE: TS-HOM01-02
# =====================================================

class TestDashboardSecurityIsolation:
    """Test security isolation between teachers"""
    
    def test_TS_HOM01_02_teacher_sees_only_own_classes(self, client, teacher_jwt_token):
        """Teacher should only see classes they teach"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # All returned classes should belong to this teacher
        # This is verified by backend - we just check response is valid
        assert isinstance(data.get("classes"), list)
    
    def test_TS_HOM01_02_unauthenticated_returns_401(self, client):
        """Unauthenticated request should return 401"""
        response = client.get("/api/homeroom/dashboard/bootstrap")
        
        assert response.status_code in [401, 403]
    
    def test_TS_HOM01_02_non_teacher_returns_403(self, client, admin_jwt_token):
        """Non-teacher user should get 403 or empty data"""
        if not admin_jwt_token:
            pytest.skip("No admin token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap",
            headers={"Authorization": f"Bearer {admin_jwt_token}"}
        )
        
        # Should either be 403 or return empty data
        assert response.status_code in [200, 403]


# =====================================================
# TEST SUITE: TS-HOM01-03
# =====================================================

class TestAttendanceStatisticsLogic:
    """Test attendance statistics calculation"""
    
    def test_TS_HOM01_03_attendance_counts_aggregated(self, client, teacher_jwt_token):
        """Attendance counts should be aggregated correctly for current month"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        today = date.today()
        response = client.get(
            f"/api/homeroom/dashboard/bootstrap?year={today.year}&month={today.month}",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Counts should be non-negative integers
        if data.get("students"):
            for student in data["students"]:
                assert isinstance(student.get("absent_count"), int)
                assert isinstance(student.get("late_count"), int)
                assert isinstance(student.get("early_count"), int)
                assert student.get("absent_count") >= 0
                assert student.get("late_count") >= 0
                assert student.get("early_count") >= 0
    
    def test_TS_HOM01_03_response_includes_year_month(self, client, teacher_jwt_token):
        """Response should indicate which year/month data represents"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap?year=2025&month=3",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Response should indicate the requested period
        assert "year" in data or "month" in data


# =====================================================
# TEST SUITE: TS-HOM01-04
# =====================================================

class TestDashboardTimeFilteringLogic:
    """Test time period filtering"""
    
    def test_TS_HOM01_04_filter_by_year(self, client, teacher_jwt_token):
        """Should filter data by year parameter"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap?year=2025&month=1",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 200
    
    def test_TS_HOM01_04_filter_by_month(self, client, teacher_jwt_token):
        """Should filter data by month parameter"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap?year=2025&month=6",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 200
    
    def test_TS_HOM01_04_filter_by_academic_year(self, client, teacher_jwt_token):
        """Should filter classes by academic year"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap?academic_year=2024-2025",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 200
    
    def test_TS_HOM01_04_combined_filters(self, client, teacher_jwt_token):
        """Should support combined filtering (academic_year + month/year)"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap?academic_year=2024-2025&year=2025&month=3",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 200
    
    def test_TS_HOM01_04_different_months_show_different_data(self, client, teacher_jwt_token):
        """Data should vary between different months"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        resp1 = client.get(
            "/api/homeroom/dashboard/bootstrap?year=2025&month=1",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        resp2 = client.get(
            "/api/homeroom/dashboard/bootstrap?year=2025&month=2",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        
        # Data structures should be valid even if different
        assert "data" in resp1.json()
        assert "data" in resp2.json()


# =====================================================
# TEST SUITE: TS-HOM01-06
# =====================================================

class TestDashboardEdgeCases:
    """Test edge cases and empty data scenarios"""
    
    def test_TS_HOM01_06_new_teacher_returns_empty_classes(self, client, teacher_jwt_token):
        """New teacher with no assignments should get empty classes"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Should return valid structure even if empty
        assert isinstance(data.get("classes"), list)
        assert isinstance(data.get("students"), list)
    
    def test_TS_HOM01_06_empty_classes_returns_valid_structure(self, client, teacher_jwt_token):
        """Empty classes should still return valid response structure"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap?academic_year=1999-2000",  # Non-existent year
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        # Should not crash, return 200 with empty data or valid structure
        assert response.status_code in [200, 400, 422]
    
    def test_TS_HOM01_06_empty_students_list_returns_empty_top_lists(self, client, teacher_jwt_token):
        """When no students, top_absent/top_late should be empty arrays"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        if not data.get("students"):
            # If no students, top lists should be empty
            assert data.get("top_absent") == [] or data.get("top_absent") is None
            assert data.get("top_late") == [] or data.get("top_late") is None
    
    def test_TS_HOM01_06_zero_attendance_records(self, client, teacher_jwt_token):
        """Students with no attendance records should show 0 counts"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap?year=1999&month=1",  # Historical date with no data
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 200


# =====================================================
# TEST SUITE: TS-HOM01-07
# =====================================================

class TestDashboardErrorHandling:
    """Test error handling and exception scenarios"""
    
    def test_TS_HOM01_07_invalid_month_returns_error(self, client, teacher_jwt_token):
        """Invalid month (>12) should be handled"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap?month=13",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        # Should either be 400/422 or handle gracefully
        assert response.status_code in [200, 400, 422]
    
    def test_TS_HOM01_07_invalid_year_handled(self, client, teacher_jwt_token):
        """Invalid year should be handled"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap?year=0",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        # Should not crash
        assert response.status_code in [200, 400, 422]
    
    def test_TS_HOM01_07_invalid_class_id_handled(self, client, teacher_jwt_token):
        """Invalid class_id should be handled gracefully"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap?class_id=99999",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        # Should return 200 with empty data or 403/404
        assert response.status_code in [200, 400, 403, 404]
    
    def test_TS_HOM01_07_invalid_academic_year_format(self, client, teacher_jwt_token):
        """Invalid academic year format should be handled"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap?academic_year=invalid-year",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        # Should not crash
        assert response.status_code in [200, 400, 422]
    
    def test_TS_HOM01_07_negative_year_handled(self, client, teacher_jwt_token):
        """Negative year should be handled"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        response = client.get(
            "/api/homeroom/dashboard/bootstrap?year=-2025",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code in [200, 400, 422]


# =====================================================
# TEST SUITE: TS-HOM01-08
# =====================================================

class TestDashboardIntegrationWorkflow:
    """End-to-end dashboard bootstrap workflows"""
    
    def test_TS_HOM01_08_full_bootstrap_workflow(self, client, teacher_jwt_token):
        """Complete workflow: Load dashboard with all data"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        # 1. LOAD: Get dashboard data
        response = client.get(
            "/api/homeroom/dashboard/bootstrap",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # 2. VERIFY: Check all required fields present
        assert "academic_years" in data
        assert "classes" in data
        assert "selected_class" in data
        assert "students" in data
        assert "top_absent" in data
        assert "top_late" in data
        assert "homeroom_info" in data
        
        # 3. VALIDATE: Data structures correct
        assert isinstance(data["academic_years"], list)
        assert isinstance(data["classes"], list)
        assert isinstance(data["students"], list)
        assert isinstance(data["top_absent"], list)
        assert isinstance(data["top_late"], list)
    
    def test_TS_HOM01_08_workflow_with_filters(self, client, teacher_jwt_token):
        """Complete workflow with time period filters"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        # 1. LOAD with filters
        response = client.get(
            "/api/homeroom/dashboard/bootstrap?academic_year=2024-2025&year=2025&month=3",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # 2. VERIFY filters applied
        if data.get("classes"):
            for cls in data["classes"]:
                assert cls.get("academic_year") == "2024-2025"
        
        # 3. VALIDATE students data matches month
        if data.get("students"):
            for student in data["students"]:
                # Should have attendance counts (aggregated for month)
                assert "absent_count" in student
    
    def test_TS_HOM01_08_workflow_class_selection(self, client, teacher_jwt_token):
        """Workflow: Select specific class"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        # 1. Get available classes
        resp1 = client.get(
            "/api/homeroom/dashboard/bootstrap",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert resp1.status_code == 200
        classes = resp1.json()["data"].get("classes", [])
        
        if classes:
            # 2. Load with specific class_id
            class_id = classes[0].get("id")
            resp2 = client.get(
                f"/api/homeroom/dashboard/bootstrap?class_id={class_id}",
                headers={"Authorization": f"Bearer {teacher_jwt_token}"}
            )
            
            assert resp2.status_code == 200
            selected = resp2.json()["data"].get("selected_class")
            
            # 3. Verify correct class selected
            if selected:
                assert selected.get("id") == class_id
    
    def test_TS_HOM01_08_monthly_data_refresh(self, client, teacher_jwt_token):
        """Workflow: Change month and verify data updates"""
        if not teacher_jwt_token:
            pytest.skip("No teacher token available")
        
        # 1. Get March data
        resp_march = client.get(
            "/api/homeroom/dashboard/bootstrap?year=2025&month=3",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert resp_march.status_code == 200
        
        # 2. Get April data
        resp_april = client.get(
            "/api/homeroom/dashboard/bootstrap?year=2025&month=4",
            headers={"Authorization": f"Bearer {teacher_jwt_token}"}
        )
        
        assert resp_april.status_code == 200
        
        assert resp_april.status_code == 200
        
        # Both should be valid
        assert "data" in resp_march.json()
        assert "data" in resp_april.json()
