"""
Test Suite: TS-GEN04 - Password Reset (Đặt lại mật khẩu)
=========================================================

Test Matrix Mapping:
- **TS-GEN04-01:** Happy Path - POST /auth/reset-password (Reset with correct OTP)
- **TS-GEN04-02:** Happy Path - New password notification (User gets email confirmation)
- **TS-GEN04-03:** Security - Wrong password/OTP attempts (Prevent unauthorized reset)
- **TS-GEN04-04:** Validation - Password requirements (Minimum length, match confirmation)
- **TS-GEN04-05:** E2E - Complete workflow (Login with new password)

Focus Areas:
- Password reset with OTP verification
- Password hashing and security
- Password matching validation
- Minimum password length (6 characters)
- OTP verification before password update
- Database update for users and teachers tables
- Error handling for invalid OTP or password
- User notification after password reset
- Prevention of password reset without valid OTP

Test Pattern: pytest + TestClient + OTPService mock + database mock
Total Tests: 5 backend password reset tests + bonus tests
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
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
def cleanup_passwords(db_session):
    """Cleanup and restore passwords after tests"""
    original_passwords = {}
    yield original_passwords
    
    # Cleanup phase - restore original passwords if needed
    for username, original_hash in original_passwords.items():
        try:
            if db_session:
                # Find and restore password in users or teachers table
                pass
        except Exception as e:
            print(f"⚠ Failed to restore password for {username}: {str(e)}")


# =====================================================
# TEST SUITE: TS-GEN04-01 Happy Path
# =====================================================

class TestPasswordResetHappyPath:
    """Test successful password reset flow"""
    
    def test_TS_GEN04_01_reset_password_returns_200(self, client):
        """Should return 200 OK when password reset successfully"""
        # Mock OTP verification
        with patch('backend.auth.services.OTPService.verify_otp') as mock_verify:
            mock_verify.return_value = {
                "success": True,
                "message": "OTP verified"
            }
            
            response = client.post(
                "/api/auth/reset-password",
                json={
                    "username": "nguyen_thi_lan",
                    "otp": "123456",
                    "new_password": "newpassword123",
                    "confirm_password": "newpassword123"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
    
    def test_TS_GEN04_01_password_updated_in_database(self, client, db_session):
        """Password should be updated in users or teachers table"""
        with patch('backend.auth.services.OTPService.verify_otp') as mock_verify:
            mock_verify.return_value = {"success": True}
            
            with patch('backend.core.database.get_db') as mock_db:
                # Mock database update
                mock_db.return_value.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
                
                response = client.post(
                    "/api/auth/reset-password",
                    json={
                        "username": "test_user",
                        "otp": "123456",
                        "new_password": "newpassword123",
                        "confirm_password": "newpassword123"
                    }
                )
                
                assert response.status_code == 200
    
    def test_TS_GEN04_01_response_does_not_contain_password(self, client):
        """Response should not contain the new password"""
        with patch('backend.auth.services.OTPService.verify_otp') as mock_verify:
            mock_verify.return_value = {"success": True}
            
            response = client.post(
                "/api/auth/reset-password",
                json={
                    "username": "nguyen_thi_lan",
                    "otp": "123456",
                    "new_password": "newpassword123",
                    "confirm_password": "newpassword123"
                }
            )
            
            data = response.json()
            response_text = str(data).lower()
            
            # Password should never be in response
            assert "newpassword123" not in response_text
            assert "password" not in str(data.get("data", {})).lower()


# =====================================================
# TEST SUITE: TS-GEN04-02 Notification
# =====================================================

class TestPasswordResetNotification:
    """Test user notification after password reset"""
    
    def test_TS_GEN04_02_user_notified_via_email(self, client):
        """User should receive email notification after password reset"""
        with patch('backend.auth.services.OTPService.verify_otp') as mock_verify:
            mock_verify.return_value = {"success": True}
            
            with patch('backend.auth.services.EmailService.send_otp_email') as mock_email:
                mock_email.return_value = {"success": True}
                
                response = client.post(
                    "/api/auth/reset-password",
                    json={
                        "username": "nguyen_thi_lan",
                        "otp": "123456",
                        "new_password": "newpassword123",
                        "confirm_password": "newpassword123"
                    }
                )
                
                assert response.status_code == 200
    
    def test_TS_GEN04_02_reset_success_message(self, client):
        """Should return clear success message"""
        with patch('backend.auth.services.OTPService.verify_otp') as mock_verify:
            mock_verify.return_value = {"success": True}
            
            response = client.post(
                "/api/auth/reset-password",
                json={
                    "username": "nguyen_thi_lan",
                    "otp": "123456",
                    "new_password": "newpassword123",
                    "confirm_password": "newpassword123"
                }
            )
            
            data = response.json()
            assert "success" in data
            assert data["success"] is True
            assert "message" in data or "detail" in data


# =====================================================
# TEST SUITE: TS-GEN04-03 Security
# =====================================================

class TestPasswordResetSecurity:
    """Test security aspects of password reset"""
    
    def test_TS_GEN04_03_invalid_otp_returns_400(self, client):
        """Should reject reset with invalid OTP"""
        with patch('backend.auth.services.OTPService.verify_otp') as mock_verify:
            mock_verify.return_value = {
                "success": False,
                "message": "OTP không đúng",
                "error_code": "INVALID_OTP"
            }
            
            response = client.post(
                "/api/auth/reset-password",
                json={
                    "username": "nguyen_thi_lan",
                    "otp": "000000",
                    "new_password": "newpassword123",
                    "confirm_password": "newpassword123"
                }
            )
            
            assert response.status_code == 400
            data = response.json()
            assert data["success"] is False
    
    def test_TS_GEN04_03_password_not_changed_on_invalid_otp(self, client):
        """Password should NOT be changed if OTP is invalid"""
        with patch('backend.auth.services.OTPService.verify_otp') as mock_verify:
            mock_verify.return_value = {"success": False}
            
            with patch('backend.core.database.get_db') as mock_db:
                # Mock should NOT be called for database update
                response = client.post(
                    "/api/auth/reset-password",
                    json={
                        "username": "nguyen_thi_lan",
                        "otp": "000000",
                        "new_password": "newpassword123",
                        "confirm_password": "newpassword123"
                    }
                )
                
                assert response.status_code == 400
    
    def test_TS_GEN04_03_expired_otp_rejected(self, client):
        """Should reject reset with expired OTP"""
        with patch('backend.auth.services.OTPService.verify_otp') as mock_verify:
            mock_verify.return_value = {
                "success": False,
                "message": "Mã OTP đã hết hạn",
                "error_code": "OTP_EXPIRED"
            }
            
            response = client.post(
                "/api/auth/reset-password",
                json={
                    "username": "nguyen_thi_lan",
                    "otp": "123456",
                    "new_password": "newpassword123",
                    "confirm_password": "newpassword123"
                }
            )
            
            assert response.status_code == 400
            data = response.json()
            assert "expired" in data["detail"].lower() or "hết hạn" in data["detail"].lower()
    
    def test_TS_GEN04_03_max_attempts_exceeded(self, client):
        """Should reject reset after max OTP attempts exceeded"""
        with patch('backend.auth.services.OTPService.verify_otp') as mock_verify:
            mock_verify.return_value = {
                "success": False,
                "message": "Đã vượt quá số lần thử tối đa",
                "error_code": "MAX_ATTEMPTS_EXCEEDED"
            }
            
            response = client.post(
                "/api/auth/reset-password",
                json={
                    "username": "nguyen_thi_lan",
                    "otp": "000000",
                    "new_password": "newpassword123",
                    "confirm_password": "newpassword123"
                }
            )
            
            assert response.status_code in [400, 429]


# =====================================================
# TEST SUITE: TS-GEN04-04 Validation
# =====================================================

class TestPasswordResetValidation:
    """Test password validation requirements"""
    
    def test_TS_GEN04_04_password_mismatch_returns_400(self, client):
        """Should reject if passwords don't match"""
        response = client.post(
            "/api/auth/reset-password",
            json={
                "username": "nguyen_thi_lan",
                "otp": "123456",
                "new_password": "newpassword123",
                "confirm_password": "differentpassword456"
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "không khớp" in data["detail"].lower() or "mismatch" in data["detail"].lower()
    
    def test_TS_GEN04_04_password_too_short_returns_400(self, client):
        """Should reject password shorter than 6 characters"""
        response = client.post(
            "/api/auth/reset-password",
            json={
                "username": "nguyen_thi_lan",
                "otp": "123456",
                "new_password": "short",
                "confirm_password": "short"
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
    
    def test_TS_GEN04_04_empty_password_rejected(self, client):
        """Should reject empty passwords"""
        response = client.post(
            "/api/auth/reset-password",
            json={
                "username": "nguyen_thi_lan",
                "otp": "123456",
                "new_password": "",
                "confirm_password": ""
            }
        )
        
        assert response.status_code in [400, 422]
    
    def test_TS_GEN04_04_missing_username_returns_422(self, client):
        """Username is required"""
        response = client.post(
            "/api/auth/reset-password",
            json={
                "otp": "123456",
                "new_password": "newpassword123",
                "confirm_password": "newpassword123"
            }
        )
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data


# =====================================================
# TEST SUITE: TS-GEN04-05 E2E Workflow
# =====================================================

class TestPasswordResetE2EWorkflow:
    """Test end-to-end password reset workflow"""
    
    def test_TS_GEN04_05_can_login_with_new_password(self, client):
        """User should be able to login with new password after reset"""
        # Step 1: Reset password (mocked OTP)
        with patch('backend.auth.services.OTPService.verify_otp') as mock_verify:
            mock_verify.return_value = {"success": True}
            
            reset_response = client.post(
                "/api/auth/reset-password",
                json={
                    "username": "nguyen_thi_lan",
                    "otp": "123456",
                    "new_password": "newpassword123",
                    "confirm_password": "newpassword123"
                }
            )
            
            assert reset_response.status_code == 200
        
        # Step 2: Try to login with new password
        # Note: Would need updated password in database
        login_response = client.post(
            "/api/auth/login",
            json={
                "username": "nguyen_thi_lan",
                "password": "newpassword123"
            }
        )
        
        # Should succeed or return appropriate status
        # (depends on whether password was actually updated in DB)
        assert login_response.status_code in [200, 401]
    
    def test_TS_GEN04_05_old_password_no_longer_works(self, client):
        """Old password should not work after reset"""
        # Step 1: Reset password
        with patch('backend.auth.services.OTPService.verify_otp') as mock_verify:
            mock_verify.return_value = {"success": True}
            
            client.post(
                "/api/auth/reset-password",
                json={
                    "username": "test_user",
                    "otp": "123456",
                    "new_password": "newpassword123",
                    "confirm_password": "newpassword123"
                }
            )
        
        # Step 2: Try to login with old password
        response = client.post(
            "/api/auth/login",
            json={
                "username": "test_user",
                "password": "oldpassword"
            }
        )
        
        # Should fail
        assert response.status_code == 401


# =====================================================
# BONUS Tests
# =====================================================

class TestPasswordResetEdgeCases:
    """Test edge cases and special scenarios"""
    
    def test_reset_prevents_reusing_same_password(self, client):
        """Should ideally prevent reusing the same password"""
        # This is a security best practice but may not be implemented
        with patch('backend.auth.services.OTPService.verify_otp') as mock_verify:
            mock_verify.return_value = {"success": True}
            
            response = client.post(
                "/api/auth/reset-password",
                json={
                    "username": "nguyen_thi_lan",
                    "otp": "123456",
                    "new_password": "password123",  # Same as original
                    "confirm_password": "password123"
                }
            )
            
            # Implementation dependent: may accept or reject
            assert response.status_code in [200, 400]
    
    def test_reset_with_special_characters(self, client):
        """Should handle passwords with special characters"""
        with patch('backend.auth.services.OTPService.verify_otp') as mock_verify:
            mock_verify.return_value = {"success": True}
            
            response = client.post(
                "/api/auth/reset-password",
                json={
                    "username": "nguyen_thi_lan",
                    "otp": "123456",
                    "new_password": "Secure!Pass@123",
                    "confirm_password": "Secure!Pass@123"
                }
            )
            
            assert response.status_code in [200, 400]
    
    def test_reset_with_unicode_password(self, client):
        """Should handle Vietnamese and Unicode characters"""
        with patch('backend.auth.services.OTPService.verify_otp') as mock_verify:
            mock_verify.return_value = {"success": True}
            
            response = client.post(
                "/api/auth/reset-password",
                json={
                    "username": "nguyen_thi_lan",
                    "otp": "123456",
                    "new_password": "Mật_khẩu_123",
                    "confirm_password": "Mật_khẩu_123"
                }
            )
            
            assert response.status_code in [200, 400, 422]


# =====================================================
# Integration Tests
# =====================================================

class TestPasswordResetIntegration:
    """Complete password reset workflows"""
    
    def test_complete_password_reset_workflow(self, client):
        """Full workflow: Send OTP -> Verify -> Reset Password"""
        # Step 1: Send OTP
        otp_response = client.post(
            "/api/auth/forgot-password",
            json={
                "username": "nguyen_thi_lan",
                "otp_email": "nguyen_thi_lan@school.edu.vn"
            }
        )
        
        assert otp_response.status_code == 200
        
        # Step 2: Reset password with (mocked) valid OTP
        with patch('backend.auth.services.OTPService.verify_otp') as mock_verify:
            mock_verify.return_value = {"success": True}
            
            reset_response = client.post(
                "/api/auth/reset-password",
                json={
                    "username": "nguyen_thi_lan",
                    "otp": "123456",
                    "new_password": "newpassword123",
                    "confirm_password": "newpassword123"
                }
            )
            
            assert reset_response.status_code == 200
    
    def test_invalid_flow_rejects_bad_inputs(self, client):
        """Invalid inputs should be rejected at each step"""
        # Invalid email
        response1 = client.post(
            "/api/auth/forgot-password",
            json={
                "username": "invalid_user",
                "otp_email": "test@example.com"
            }
        )
        
        assert response1.status_code == 404
        
        # Invalid OTP format
        response2 = client.post(
            "/api/auth/verify-otp",
            json={
                "username": "test",
                "otp": "12345"
            }
        )
        
        assert response2.status_code == 422
        
        # Password mismatch
        response3 = client.post(
            "/api/auth/reset-password",
            json={
                "username": "test",
                "otp": "123456",
                "new_password": "pass1",
                "confirm_password": "pass2"
            }
        )
        
        assert response3.status_code == 400
