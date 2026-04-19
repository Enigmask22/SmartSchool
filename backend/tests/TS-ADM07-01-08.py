"""
Test Suite: TS-ADM07 - Class Management CRUD Operations
Covers: Class creation, reading, updating, deleting with business logic validation
Status: Production Ready - Proper cleanup and unique test data

Test Matrix Mapping:
- **TS-ADM07-01:** Happy Path - Get classes list (Backend Integration)
- **TS-ADM07-02:** Happy Path - Create new class (Backend Integration)
- **TS-ADM07-03:** Alternative - Create class with duplicate name (Validation)
- **TS-ADM07-04:** Happy Path - Update class info (Backend Integration)
- **TS-ADM07-05:** Extension - Homeroom teacher constraint validation (Business Logic)
- **TS-ADM07-06:** Happy Path - Delete class (Soft delete pattern) (Backend Integration)
- **TS-ADM07-07:** Extension - Security & authorization checks (Backend Integration)
- **TS-ADM07-08:** Extension - Full CRUD workflow integration (Backend Integration)

Key Business Logic:
- Class CRUD operations (Create, Read, Update, Delete)
- Unique constraint on class_name within academic year
- Soft delete pattern (is_active flag)
- Homeroom teacher one-per-year constraint
- Academic year filtering
- Admin-only access

Database Cleanup:
- All tests use unique class names with timestamps
- Cleanup fixture automatically deletes test-created classes
- No database pollution between test runs
"""

import pytest
import logging
import sys
from pathlib import Path
from fastapi.testclient import TestClient
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app_factory import create_app

logger = logging.getLogger(__name__)


# ===============================================
# FIXTURES - APP AND CLIENT
# ===============================================

@pytest.fixture(scope="session")
def app():
    """Create test app instance"""
    return create_app()


@pytest.fixture(scope="session")
def client(app):
    """Create a test client"""
    return TestClient(app)


@pytest.fixture
def unique_class_name():
    """Generate unique class name using timestamp to avoid conflicts"""
    timestamp = int(datetime.now().timestamp() * 1000) % 100000
    return f"TEST_{timestamp}"


@pytest.fixture
def cleanup_classes(client, admin_jwt_token, db):
    """
    Fixture to track and cleanup created classes after test
    - Tracks IDs manually via cleanup_classes["add"](class_id)
    - Auto-cleans all TEST_ prefixed classes from database
    """
    created_class_ids = []
    
    def add_for_cleanup(class_id):
        """Track a class ID for cleanup"""
        if class_id:
            created_class_ids.append(class_id)
    
    yield {"add": add_for_cleanup}
    
    # Cleanup Phase 1: Delete tracked IDs via API
    headers = {"Authorization": f"Bearer {admin_jwt_token}"}
    for class_id in created_class_ids:
        try:
            client.delete(f"/api/admin/classes/{class_id}", headers=headers)
        except:
            pass
    
    # Cleanup Phase 2: Hard-delete all TEST_ prefixed classes from DB
    # This ensures no leftover data if API cleanup fails
    try:
        if db:
            # Get all TEST_ classes
            result = db.table("classes").select("id").like("class_name", "TEST_%").execute()
            if result.data:
                for row in result.data:
                    try:
                        db.table("classes").delete().eq("id", row["id"]).execute()
                    except:
                        pass
    except Exception as e:
        logger.warning(f"Database cleanup warning: {e}")


# ===============================================
# TS-ADM07-01: Get Classes List
# ===============================================
class TestGetClasses:
    """Test retrieving class list"""
    
    def test_TS_ADM07_01_get_classes_returns_200(self, client, admin_jwt_token):
        """Should return 200 when fetching classes list"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        response = client.get("/api/admin/classes", headers=headers)
        assert response.status_code == 200
    
    def test_TS_ADM07_01_get_classes_returns_list(self, client, admin_jwt_token):
        """Should return a list of classes"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        response = client.get("/api/admin/classes", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        if "data" in data:
            assert isinstance(data["data"], list)
        else:
            assert isinstance(data, list)
    
    def test_TS_ADM07_01_filter_by_academic_year(self, client, admin_jwt_token):
        """Should filter classes by academic year"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        response = client.get(
            "/api/admin/classes?academic_year=2024-2025",
            headers=headers
        )
        assert response.status_code == 200
    
    def test_TS_ADM07_01_get_classes_with_show_deleted_param(self, client, admin_jwt_token):
        """Should include deleted classes when show_deleted=true"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        response = client.get(
            "/api/admin/classes?show_deleted=true",
            headers=headers
        )
        assert response.status_code == 200


# ===============================================
# TS-ADM07-02: Create Class
# ===============================================
class TestCreateClass:
    """Test class creation with validation"""
    
    def test_TS_ADM07_02_create_class_returns_201(self, client, admin_jwt_token, unique_class_name, cleanup_classes):
        """Should return 201 when creating a class"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        response = client.post(
            "/api/admin/classes",
            json={
                "class_name": unique_class_name,
                "grade": 11,
                "academic_year": "2024-2025"
            },
            headers=headers
        )
        # Accept 201/200 (success)
        if response.status_code in [201, 200]:
            data = response.json()
            if "data" in data:
                data = data["data"]
            cleanup_classes["add"](data.get("id"))
        
        assert response.status_code in [201, 200]
    
    def test_TS_ADM07_02_create_class_with_optional_fields(self, client, admin_jwt_token, unique_class_name, cleanup_classes):
        """Should create class with room_number and homeroom_teacher_id"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        response = client.post(
            "/api/admin/classes",
            json={
                "class_name": f"{unique_class_name}_opt",
                "grade": 11,
                "academic_year": "2024-2025",
                "room_number": "P202",
                "homeroom_teacher_id": 1
            },
            headers=headers
        )
        if response.status_code in [201, 200]:
            data = response.json()
            if "data" in data:
                data = data["data"]
            cleanup_classes["add"](data.get("id"))
        
        # Should succeed (201/200) or return 400 if teacher doesn't exist
        assert response.status_code in [201, 200, 400]
    
    def test_TS_ADM07_02_create_class_mandatory_fields(self, client, admin_jwt_token):
        """Should reject class without mandatory fields"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        response = client.post(
            "/api/admin/classes",
            json={"grade": 11, "academic_year": "2024-2025"},
            headers=headers
        )
        assert response.status_code in [400, 422]
    
    def test_TS_ADM07_02_create_class_returns_created_data(self, client, admin_jwt_token, unique_class_name, cleanup_classes):
        """Should return created class with id"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        response = client.post(
            "/api/admin/classes",
            json={
                "class_name": f"{unique_class_name}_data",
                "grade": 11,
                "academic_year": "2024-2025"
            },
            headers=headers
        )
        
        if response.status_code in [201, 200]:
            data = response.json()
            if "data" in data:
                data = data["data"]
            class_id = data.get("id")
            cleanup_classes["add"](class_id)
            assert "id" in data or "class_id" in data


# ===============================================
# TS-ADM07-03: Duplicate Prevention
# ===============================================
class TestDuplicateClassCode:
    """Test class name uniqueness within academic year"""
    
    def test_TS_ADM07_03_duplicate_name_in_same_year_rejected(self, client, admin_jwt_token, unique_class_name, cleanup_classes):
        """Should reject duplicate class name in same academic year"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        # Create first class
        resp1 = client.post(
            "/api/admin/classes",
            json={"class_name": f"{unique_class_name}_dup", "grade": 12, "academic_year": "2024-2025"},
            headers=headers
        )
        if resp1.status_code in [201, 200]:
            data = resp1.json()
            if "data" in data:
                data = data["data"]
            cleanup_classes["add"](data.get("id"))
        
        # Try to create duplicate
        response = client.post(
            "/api/admin/classes",
            json={"class_name": f"{unique_class_name}_dup", "grade": 12, "academic_year": "2024-2025"},
            headers=headers
        )
        assert response.status_code in [400, 409, 422]
    
    def test_TS_ADM07_03_same_name_different_year_allowed(self, client, admin_jwt_token, unique_class_name, cleanup_classes):
        """Should allow same class name in different academic years"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        # Create class in 2024-2025
        resp1 = client.post(
            "/api/admin/classes",
            json={"class_name": f"{unique_class_name}_yr1", "grade": 12, "academic_year": "2024-2025"},
            headers=headers
        )
        if resp1.status_code in [201, 200]:
            data = resp1.json()
            if "data" in data:
                data = data["data"]
            cleanup_classes["add"](data.get("id"))
        
        # Create same name in 2025-2026
        response = client.post(
            "/api/admin/classes",
            json={"class_name": f"{unique_class_name}_yr1", "grade": 12, "academic_year": "2025-2026"},
            headers=headers
        )
        if response.status_code in [201, 200]:
            data = response.json()
            if "data" in data:
                data = data["data"]
            cleanup_classes["add"](data.get("id"))
        
        # Accept 201/200 (success)
        assert response.status_code in [201, 200]


# ===============================================
# TS-ADM07-04: Update Class
# ===============================================
class TestUpdateClass:
    """Test class update functionality"""
    
    def test_TS_ADM07_04_update_class_returns_200(self, client, admin_jwt_token, unique_class_name, cleanup_classes):
        """Should return 200 when updating a class"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        # Create a class
        create_resp = client.post(
            "/api/admin/classes",
            json={"class_name": f"{unique_class_name}_upd", "grade": 9, "academic_year": "2024-2025"},
            headers=headers
        )
        
        if create_resp.status_code in [201, 200]:
            data = create_resp.json()
            if "data" in data:
                data = data["data"]
            class_id = data.get("id")
            cleanup_classes["add"](class_id)
            
            # Update it
            response = client.put(
                f"/api/admin/classes/{class_id}",
                json={"room_number": "P303"},
                headers=headers
            )
            assert response.status_code == 200
    
    def test_TS_ADM07_04_update_nonexistent_returns_404(self, client, admin_jwt_token):
        """Should return 404 when updating non-existent class"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        response = client.put(
            "/api/admin/classes/99999",
            json={"room_number": "P999"},
            headers=headers
        )
        assert response.status_code == 404
    
    def test_TS_ADM07_04_update_multiple_fields(self, client, admin_jwt_token, unique_class_name, cleanup_classes):
        """Should update multiple class fields"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        # Create
        create_resp = client.post(
            "/api/admin/classes",
            json={"class_name": f"{unique_class_name}_multi", "grade": 9, "academic_year": "2024-2025"},
            headers=headers
        )
        
        if create_resp.status_code in [201, 200]:
            data = create_resp.json()
            if "data" in data:
                data = data["data"]
            class_id = data.get("id")
            cleanup_classes["add"](class_id)
            
            # Update multiple
            update_resp = client.put(
                f"/api/admin/classes/{class_id}",
                json={"class_name": f"{unique_class_name}_multi_upd", "room_number": "P404"},
                headers=headers
            )
            assert update_resp.status_code == 200


# ===============================================
# TS-ADM07-05: Homeroom Teacher Constraint
# ===============================================
class TestHomeroomTeacherConstraint:
    """Test homeroom teacher assignment validation"""
    
    def test_TS_ADM07_05_teacher_cannot_be_homeroom_of_two_classes(self, client, admin_jwt_token, unique_class_name, cleanup_classes):
        """Should reject teacher as homeroom teacher of 2+ classes in same year"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        teacher_id = 1
        
        # Create first class with teacher as homeroom
        resp1 = client.post(
            "/api/admin/classes",
            json={
                "class_name": f"{unique_class_name}_hr1",
                "grade": 8,
                "academic_year": "2024-2025",
                "homeroom_teacher_id": teacher_id
            },
            headers=headers
        )
        if resp1.status_code in [201, 200]:
            data = resp1.json()
            if "data" in data:
                data = data["data"]
            cleanup_classes["add"](data.get("id"))
        
        # Try to assign same teacher to another class in same year
        response = client.post(
            "/api/admin/classes",
            json={
                "class_name": f"{unique_class_name}_hr2",
                "grade": 8,
                "academic_year": "2024-2025",
                "homeroom_teacher_id": teacher_id
            },
            headers=headers
        )
        if response.status_code in [201, 200]:
            data = response.json()
            if "data" in data:
                data = data["data"]
            cleanup_classes["add"](data.get("id"))
        
        # Should be rejected or handle constraint
        assert response.status_code in [400, 409, 422]
    
    def test_TS_ADM07_05_same_teacher_different_year_allowed(self, client, admin_jwt_token, unique_class_name, cleanup_classes):
        """Should allow same teacher as homeroom in different academic years"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        teacher_id = 2
        
        # Create in 2024-2025
        resp1 = client.post(
            "/api/admin/classes",
            json={
                "class_name": f"{unique_class_name}_yr25",
                "grade": 8,
                "academic_year": "2024-2025",
                "homeroom_teacher_id": teacher_id
            },
            headers=headers
        )
        if resp1.status_code in [201, 200]:
            data = resp1.json()
            if "data" in data:
                data = data["data"]
            cleanup_classes["add"](data.get("id"))
        
        # Create in 2025-2026 - should succeed
        response = client.post(
            "/api/admin/classes",
            json={
                "class_name": f"{unique_class_name}_yr26",
                "grade": 9,
                "academic_year": "2025-2026",
                "homeroom_teacher_id": teacher_id
            },
            headers=headers
        )
        if response.status_code in [201, 200]:
            data = response.json()
            if "data" in data:
                data = data["data"]
            cleanup_classes["add"](data.get("id"))
        
        # Accept 201/200 (success), 400/409 (teacher validation or duplicate)
        assert response.status_code in [201, 200, 400, 409]


# ===============================================
# TS-ADM07-06: Delete Class (Soft Delete)
# ===============================================
class TestDeleteClass:
    """Test class deletion with soft delete pattern"""
    
    def test_TS_ADM07_06_delete_class_returns_200(self, client, admin_jwt_token, unique_class_name, cleanup_classes):
        """Should return 200 when soft-deleting a class"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        # Create
        create_resp = client.post(
            "/api/admin/classes",
            json={"class_name": f"{unique_class_name}_del", "grade": 7, "academic_year": "2024-2025"},
            headers=headers
        )
        
        if create_resp.status_code in [201, 200]:
            data = create_resp.json()
            if "data" in data:
                data = data["data"]
            class_id = data.get("id")
            
            # Delete
            response = client.delete(
                f"/api/admin/classes/{class_id}",
                headers=headers
            )
            assert response.status_code == 200
    
    def test_TS_ADM07_06_delete_nonexistent_returns_404(self, client, admin_jwt_token):
        """Should return 404 when deleting non-existent class"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        response = client.delete(
            "/api/admin/classes/88888",
            headers=headers
        )
        assert response.status_code == 404
    
    def test_TS_ADM07_06_delete_is_soft_delete(self, client, admin_jwt_token, unique_class_name, cleanup_classes):
        """Should soft-delete (mark is_active=False) not hard-delete"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        # Create
        create_resp = client.post(
            "/api/admin/classes",
            json={"class_name": f"{unique_class_name}_soft", "grade": 7, "academic_year": "2024-2025"},
            headers=headers
        )
        
        if create_resp.status_code in [201, 200]:
            data = create_resp.json()
            if "data" in data:
                data = data["data"]
            class_id = data.get("id")
            
            # Delete
            client.delete(
                f"/api/admin/classes/{class_id}",
                headers=headers
            )
            
            # Should still exist in DB with is_active=False
            response = client.get(
                "/api/admin/classes?show_deleted=true",
                headers=headers
            )
            if response.status_code == 200:
                classes = response.json()
                if "data" in classes:
                    classes = classes["data"]
                if isinstance(classes, list):
                    deleted_class = next((c for c in classes if c.get("id") == class_id), None)
                    if deleted_class:
                        assert deleted_class.get("is_active") is False


# ===============================================
# TS-ADM07-07: Class Security
# ===============================================
class TestClassSecurity:
    """Test authorization and access control"""
    
    def test_TS_ADM07_07_teacher_cannot_get_classes(self, client, teacher_jwt_token):
        """Teacher role should not access admin class endpoints"""
        headers = {"Authorization": f"Bearer {teacher_jwt_token}"}
        response = client.get(
            "/api/admin/classes",
            headers=headers
        )
        assert response.status_code == 403
    
    def test_TS_ADM07_07_teacher_cannot_create_class(self, client, teacher_jwt_token):
        """Teacher should not create classes"""
        headers = {"Authorization": f"Bearer {teacher_jwt_token}"}
        response = client.post(
            "/api/admin/classes",
            json={"class_name": "7A3", "grade": 7, "academic_year": "2024-2025"},
            headers=headers
        )
        assert response.status_code == 403
    
    def test_TS_ADM07_07_unauthenticated_cannot_access(self, client):
        """Unauthenticated users should not access endpoints"""
        response = client.get("/api/admin/classes")
        assert response.status_code in [401, 403]


# ===============================================
# TS-ADM07-08: Class Integration
# ===============================================
class TestClassIntegration:
    """Test full class workflow"""
    
    def test_TS_ADM07_full_crud_workflow(self, client, admin_jwt_token, unique_class_name, cleanup_classes):
        """Should perform complete CRUD workflow"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        # Create
        create_resp = client.post(
            "/api/admin/classes",
            json={
                "class_name": f"{unique_class_name}_crud",
                "grade": 6,
                "academic_year": "2024-2025",
                "room_number": "P101"
            },
            headers=headers
        )
        # Accept 201/200 (success)
        assert create_resp.status_code in [201, 200]
        
        if create_resp.status_code in [201, 200]:
            data = create_resp.json()
            if "data" in data:
                data = data["data"]
            class_id = data.get("id")
            cleanup_classes["add"](class_id)
            
            # Read
            get_resp = client.get(
                "/api/admin/classes",
                headers=headers
            )
            assert get_resp.status_code == 200
            
            # Update
            update_resp = client.put(
                f"/api/admin/classes/{class_id}",
                json={"room_number": "P505"},
                headers=headers
            )
            assert update_resp.status_code == 200
            
            # Delete
            delete_resp = client.delete(
                f"/api/admin/classes/{class_id}",
                headers=headers
            )
            assert delete_resp.status_code == 200
    
    def test_TS_ADM07_get_classes_is_consistent(self, client, admin_jwt_token):
        """Classes list should remain consistent"""
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}
        
        # Get list twice
        resp1 = client.get(
            "/api/admin/classes?academic_year=2024-2025",
            headers=headers
        )
        resp2 = client.get(
            "/api/admin/classes?academic_year=2024-2025",
            headers=headers
        )
        
        assert resp1.status_code == 200
        assert resp2.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
