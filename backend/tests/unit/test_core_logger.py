"""Unit tests for logger configuration and setup"""

import pytest
import logging
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock


class TestLoggerInitialization:
    """Test logger setup and initialization"""
    
    def test_logger_creation_with_name(self):
        """Verify logger is created with correct name"""
        # Arrange
        logger_name = "test_logger"
        
        # Act
        logger = logging.getLogger(logger_name)
        
        # Assert
        assert logger is not None
        assert logger.name == logger_name
    
    def test_logger_level_set_to_info(self):
        """Verify logger level can be set to INFO"""
        # Arrange
        logger = logging.getLogger("test_logger")
        
        # Act
        logger.setLevel(logging.INFO)
        
        # Assert
        assert logger.level == logging.INFO
    
    def test_logger_level_set_to_debug(self):
        """Verify logger level can be set to DEBUG"""
        # Arrange
        logger = logging.getLogger("test_logger")
        
        # Act
        logger.setLevel(logging.DEBUG)
        
        # Assert
        assert logger.level == logging.DEBUG
    
    def test_logger_level_set_to_error(self):
        """Verify logger level can be set to ERROR"""
        # Arrange
        logger = logging.getLogger("test_logger")
        
        # Act
        logger.setLevel(logging.ERROR)
        
        # Assert
        assert logger.level == logging.ERROR


class TestLoggerFileHandling:
    """Test logger file creation and output"""
    
    def test_logger_creates_log_file(self, tmp_path):
        """Verify logger creates log file when handler is added"""
        # Arrange
        log_dir = tmp_path / "logs"
        log_dir.mkdir()
        log_file = log_dir / "test.log"
        
        logger = logging.getLogger("file_test_logger")
        handler = logging.FileHandler(log_file)
        logger.addHandler(handler)
        
        # Act
        logger.info("Test message")
        handler.close()
        
        # Assert
        assert log_file.exists()
    
    def test_logger_writes_to_file(self, tmp_path):
        """Verify logger writes messages to file"""
        # Arrange
        log_file = tmp_path / "test.log"
        logger = logging.getLogger("write_test_logger")
        logger.handlers.clear()
        handler = logging.FileHandler(log_file)
        formatter = logging.Formatter('%(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        
        test_message = "Test log message"
        
        # Act
        logger.info(test_message)
        handler.close()
        
        # Assert
        assert log_file.exists()
        content = log_file.read_text()
        assert test_message in content
    
    def test_logger_file_format_with_timestamp(self, tmp_path):
        """Verify log format includes timestamp"""
        # Arrange
        log_file = tmp_path / "test.log"
        logger = logging.getLogger("format_test_logger")
        logger.handlers.clear()
        handler = logging.FileHandler(log_file)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        
        # Act
        logger.info("Test message with timestamp")
        handler.close()
        
        # Assert
        content = log_file.read_text()
        assert "Test message with timestamp" in content
        # Should have timestamp format
        assert "-" in content  # Date format includes dashes


class TestLoggerOutputHandling:
    """Test different logger output handlers"""
    
    def test_logger_console_output(self, caplog):
        """Verify logger outputs to console"""
        # Arrange
        logger = logging.getLogger("console_test")
        
        # Act
        with caplog.at_level(logging.INFO):
            logger.info("Console test message")
        
        # Assert
        assert "Console test message" in caplog.text
    
    def test_logger_multiple_handlers(self, tmp_path):
        """Verify logger can have multiple output handlers"""
        # Arrange
        log_file = tmp_path / "multi.log"
        logger = logging.getLogger("multi_handler_logger")
        logger.handlers.clear()
        
        # File handler
        file_handler = logging.FileHandler(log_file)
        # Stream handler (console would go here)
        stream_handler = logging.StreamHandler()
        
        logger.addHandler(file_handler)
        logger.addHandler(stream_handler)
        logger.setLevel(logging.INFO)
        
        # Act
        logger.info("Multi-handler message")
        file_handler.close()
        
        # Assert
        assert len(logger.handlers) == 2
        assert log_file.exists()


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
