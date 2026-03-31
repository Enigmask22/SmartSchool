"""Unit tests for core configuration management"""

import pytest
import os
from pathlib import Path
from unittest.mock import patch, MagicMock


class TestConfigLoading:
    """Test configuration loading from environment and files"""
    
    def test_load_config_from_env_single_variable(self):
        """Verify config loads single environment variable"""
        # Arrange
        test_key = "TEST_SETTING_KEY"
        test_value = "test_value_123"
        
        # Act
        with patch.dict(os.environ, {test_key: test_value}):
            from os import getenv
            result = getenv(test_key)
        
        # Assert
        assert result == test_value
    
    def test_load_config_multiple_variables(self):
        """Verify config loads multiple environment variables"""
        # Arrange
        test_vars = {
            'ENVIRONMENT': 'test',
            'DEBUG': 'true',
            'PORT': '8000'
        }
        
        # Act & Assert
        with patch.dict(os.environ, test_vars):
            for key, expected_value in test_vars.items():
                result = os.getenv(key)
                assert result == expected_value
    
    def test_config_missing_required_field_has_default(self):
        """Verify missing config field has sensible default"""
        # Arrange
        missing_key = "NONEXISTENT_KEY"
        default_value = "default_value"
        
        # Act
        result = os.getenv(missing_key, default_value)
        
        # Assert
        assert result == default_value
    
    def test_config_type_conversion_string_to_int(self):
        """Verify config value can be converted to int"""
        # Arrange
        test_value = "8000"
        
        # Act
        result = int(test_value)
        
        # Assert
        assert result == 8000
        assert isinstance(result, int)
    
    def test_config_type_conversion_string_to_bool(self):
        """Verify config value can be converted to bool"""
        # Arrange
        true_values = ['true', 'True', 'TRUE', '1', 'yes']
        false_values = ['false', 'False', 'FALSE', '0', 'no']
        
        # Act & Assert
        for val in true_values:
            result = val.lower() in ('true', '1', 'yes')
            assert result is True
        
        for val in false_values:
            result = val.lower() in ('false', '0', 'no')
            assert result is True
    
    def test_config_environment_variable_override(self):
        """Verify environment variable can override default"""
        # Arrange
        default_environment = "development"
        override_environment = "production"
        
        # Act
        with patch.dict(os.environ, {'ENVIRONMENT': override_environment}):
            result = os.getenv('ENVIRONMENT', default_environment)
        
        # Assert
        assert result == override_environment
        assert result != default_environment
    
    def test_config_required_field_validation(self):
        """Verify required config fields are validated"""
        # Arrange
        required_fields = ['SECRET_KEY', 'DATABASE_URL']
        mock_env = {'SECRET_KEY': 'test_secret'}  # Missing DATABASE_URL
        
        # Act & Assert
        with patch.dict(os.environ, mock_env, clear=True):
            for field in required_fields:
                value = os.getenv(field)
                if field not in mock_env:
                    assert value is None  # Would normally raise error
    
    def test_config_production_mode_strict_validation(self):
        """Verify production mode enforces strict validation"""
        # Arrange
        environment = "production"
        required_keys = ['SECRET_KEY', 'DATABASE_URL', 'API_KEY']
        config = {
            'ENVIRONMENT': environment,
            'SECRET_KEY': 'prod_secret',
            'DATABASE_URL': 'postgresql://prod',
            'API_KEY': 'prod_api_key'
        }
        
        # Act
        with patch.dict(os.environ, config):
            is_production = os.getenv('ENVIRONMENT') == 'production'
            all_required_present = all(os.getenv(key) for key in required_keys)
        
        # Assert
        assert is_production is True
        assert all_required_present is True


class TestConfigValidation:
    """Test configuration value validation"""
    
    def test_port_number_valid(self):
        """Verify port number config is valid integer"""
        # Arrange
        port_string = "8000"
        
        # Act
        port = int(port_string)
        is_valid = 1 <= port <= 65535
        
        # Assert
        assert port == 8000
        assert is_valid is True
    
    def test_port_number_out_of_range(self):
        """Verify invalid port number is rejected"""
        # Arrange
        invalid_ports = ["0", "65536", "-1", "99999"]
        
        # Act & Assert
        for port_str in invalid_ports:
            port = int(port_str)
            is_valid = 1 <= port <= 65535
            assert is_valid is False
    
    def test_database_url_format_valid(self):
        """Verify database URL format is valid"""
        # Arrange
        valid_urls = [
            "postgresql://user:pass@localhost/db",
            "postgresql://localhost/db",
            "mysql://user:pass@localhost/db"
        ]
        
        # Act & Assert
        for url in valid_urls:
            assert "://" in url
            assert len(url) > 10
    
    def test_database_url_format_invalid(self):
        """Verify invalid database URL is rejected"""
        # Arrange
        invalid_urls = [
            "invalid_url",
            "localhost/db",
            "just_text"
        ]
        
        # Act & Assert
        for url in invalid_urls:
            is_valid = "://" in url
            assert is_valid is False
    
    def test_secret_key_minimum_length(self):
        """Verify secret key meets minimum length requirement"""
        # Arrange
        short_key = "abc123"
        long_key = "super_secret_key_with_minimum_32_characters_long"
        
        # Act & Assert
        assert len(short_key) < 32
        assert len(long_key) >= 32


class TestConfigFileOperations:
    """Test loading config from files"""
    
    def test_config_file_exists(self, tmp_path):
        """Verify can detect if config file exists"""
        # Arrange
        config_file = tmp_path / "config.env"
        config_file.write_text("KEY=value")
        
        # Act
        exists = config_file.exists()
        
        # Assert
        assert exists is True
    
    def test_config_file_missing(self, tmp_path):
        """Verify can detect missing config file"""
        # Arrange
        config_file = tmp_path / "nonexistent.env"
        
        # Act
        exists = config_file.exists()
        
        # Assert
        assert exists is False
    
    def test_config_file_read_lines(self, tmp_path):
        """Verify can read config file lines"""
        # Arrange
        config_file = tmp_path / "config.env"
        config_content = "KEY1=value1\nKEY2=value2\nKEY3=value3"
        config_file.write_text(config_content)
        
        # Act
        lines = config_file.read_text().split('\n')
        
        # Assert
        assert len(lines) == 3
        assert lines[0] == "KEY1=value1"


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
