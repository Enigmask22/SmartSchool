"""Unit tests for authentication services - password hashing and OTP management"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch, mock_open
import sys
import json
from pathlib import Path
import tempfile

# Add backend_modular to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Import actual functions from auth services
from auth.services import (
    get_password_hash,
    verify_password,
    OTPService,
)


# ============================================================================
# TEST CLASS 1: Password Hashing
# ============================================================================

class TestPasswordHashing:
    """Test password hashing using bcrypt"""
    
    def test_get_password_hash_returns_valid_hash(self):
        """Verify get_password_hash returns a valid bcrypt hash"""
        # Arrange
        password = "SecurePassword123!"
        
        # Act
        hashed = get_password_hash(password)
        
        # Assert
        assert hashed is not None
        assert isinstance(hashed, str)
        assert len(hashed) > 20  # bcrypt hashes are ~60 chars
    
    def test_get_password_hash_produces_different_hashes_each_call(self):
        """Verify each hash call produces different hash (due to salt)"""
        # Arrange
        password = "SamePassword123"
        
        # Act
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        # Assert
        assert hash1 != hash2  # Different due to salt
    
    def test_get_password_hash_long_password_handled(self):
        """Verify very long passwords are handled (bcrypt has 72 byte limit)"""
        # Arrange
        long_password = "A" * 100  # Password longer than bcrypt limit
        
        # Act
        hashed = get_password_hash(long_password)
        
        # Assert
        assert hashed is not None
        assert len(hashed) > 20
    
    def test_get_password_hash_empty_password(self):
        """Verify empty password can be hashed"""
        # Arrange
        password = ""
        
        # Act
        hashed = get_password_hash(password)
        
        # Assert
        assert hashed is not None
        assert len(hashed) > 20
    
    def test_get_password_hash_unicode_password(self):
        """Verify unicode passwords are handled"""
        # Arrange
        password = "Mật khẩu123!@#"
        
        # Act
        hashed = get_password_hash(password)
        
        # Assert
        assert hashed is not None


class TestPasswordVerification:
    """Test password verification against hashes"""
    
    def test_verify_password_correct_password_returns_true(self):
        """Verify correct password passes verification"""
        # Arrange
        password = "CorrectPassword123"
        hashed = get_password_hash(password)
        
        # Act
        result = verify_password(password, hashed)
        
        # Assert
        assert result is True
    
    def test_verify_password_incorrect_password_returns_false(self):
        """Verify incorrect password fails verification"""
        # Arrange
        hashed = get_password_hash("CorrectPassword123")
        
        # Act
        result = verify_password("WrongPassword123", hashed)
        
        # Assert
        assert result is False
    
    def test_verify_password_empty_password_fails(self):
        """Verify empty password fails verification"""
        # Arrange
        hashed = get_password_hash("HashedPassword123")
        
        # Act
        result = verify_password("", hashed)
        
        # Assert
        assert result is False
    
    def test_verify_password_case_sensitive(self):
        """Verify password verification is case-sensitive"""
        # Arrange
        password = "MyPassword123"
        hashed = get_password_hash(password)
        
        # Act
        result = verify_password("mypassword123", hashed)
        
        # Assert
        assert result is False


# ============================================================================
# TEST CLASS 3: OTP Service
# ============================================================================

class TestOTPService:
    """Test OTP generation, storage, and verification"""
    
    def test_otp_service_initialization(self):
        """Verify OTPService initializes with temp storage directory"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            # Act
            service = OTPService(storage_dir=tmpdir)
            
            # Assert
            assert service.storage_dir.exists()
            assert service.otp_expiry_minutes > 0
    
    def test_generate_and_store_otp_success(self):
        """Verify OTP can be generated and stored"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            service = OTPService(storage_dir=tmpdir)
            email = "user@school.com"
            otp = "123456"
            
            # Act
            result = service.generate_and_store_otp(email, email, otp)
            
            # Assert
            assert result is True
    
    def test_get_otp_data_returns_stored_otp(self):
        """Verify stored OTP can be retrieved"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            service = OTPService(storage_dir=tmpdir)
            email = "user@school.com"
            otp = "123456"
            service.generate_and_store_otp(email, email, otp)
            
            # Act
            otp_data = service.get_otp_data(email)
            
            # Assert
            assert otp_data is not None
            assert otp_data["email"] == email
            assert otp_data["otp"] == otp
    
    def test_get_otp_data_nonexistent_returns_none(self):
        """Verify nonexistent OTP returns None"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            service = OTPService(storage_dir=tmpdir)
            
            # Act
            otp_data = service.get_otp_data("nonexistent@school.com")
            
            # Assert
            assert otp_data is None
    
    def test_otp_expiry_returns_none_when_expired(self):
        """Verify expired OTP returns None"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            service = OTPService(storage_dir=tmpdir)
            email = "user@school.com"
            otp = "123456"
            service.generate_and_store_otp(email, email, otp)
            
            # Get the OTP file and set it as expired
            otp_file = service._get_otp_file_path(email)
            with open(otp_file, 'r') as f:
                otp_data = json.load(f)
            
            # Set expiration to past
            otp_data['expires_at'] = (datetime.now() - timedelta(minutes=1)).isoformat()
            
            with open(otp_file, 'w') as f:
                json.dump(otp_data, f)
            
            # Act
            result = service.get_otp_data(email)
            
            # Assert
            assert result is None
    
    def test_otp_data_includes_required_fields(self):
        """Verify stored OTP has all required fields"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            service = OTPService(storage_dir=tmpdir)
            email = "user@school.com"
            otp = "123456"
            service.generate_and_store_otp(email, email, otp)
            
            # Act
            otp_data = service.get_otp_data(email)
            
            # Assert
            required_fields = ["email", "otp", "created_at", "expires_at", "attempts", "max_attempts", "is_verified"]
            for field in required_fields:
                assert field in otp_data


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
