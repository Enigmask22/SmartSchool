"""
Example test file to verify pytest setup
This demonstrates basic test patterns with pytest

File: tests/test_example.py
Purpose: Verify pytest is working correctly
Expected: All tests should pass
"""

import pytest


class TestBasicArithmetic:
    """Test basic math operations"""
    
    def test_addition(self):
        """Test addition"""
        assert 2 + 2 == 4
        assert 10 + 5 == 15
    
    def test_subtraction(self):
        """Test subtraction"""
        assert 5 - 2 == 3
        assert 10 - 10 == 0
    
    def test_multiplication(self):
        """Test multiplication"""
        assert 3 * 4 == 12
        assert 0 * 100 == 0
    
    def test_division(self):
        """Test division"""
        assert 10 / 2 == 5.0
        assert 15 / 3 == 5.0


class TestStringOperations:
    """Test string operations"""
    
    def test_string_concatenation(self):
        """Test string concat"""
        assert 'Hello' + ' ' + 'World' == 'Hello World'
    
    def test_string_contains(self):
        """Test string contains"""
        text = 'SynapseS Smart School'
        assert 'Smart' in text
        assert 'School' in text


class TestListOperations:
    """Test list operations"""
    
    def test_list_creation(self):
        """Test list creation"""
        arr = [1, 2, 3, 4, 5]
        assert len(arr) == 5
        assert arr[0] == 1
        assert arr[-1] == 5
    
    def test_list_append(self):
        """Test list append"""
        arr = [1, 2, 3]
        arr.append(4)
        assert len(arr) == 4
        assert arr[-1] == 4
    
    def test_list_comprehension(self):
        """Test list comprehension"""
        arr = [x * 2 for x in range(5)]
        assert arr == [0, 2, 4, 6, 8]


class TestParametrization:
    """Test parametrized tests"""
    
    @pytest.mark.parametrize("input,expected", [
        (0, False),
        (1, True),
        (2, True),
        (-1, False),
    ])
    def test_is_positive(self, input, expected):
        """Test with multiple inputs"""
        result = input > 0
        assert result == expected


class TestExceptions:
    """Test exception handling"""
    
    def test_division_by_zero(self):
        """Test that division by zero raises ZeroDivisionError"""
        with pytest.raises(ZeroDivisionError):
            _ = 10 / 0
    
    def test_value_error(self):
        """Test that invalid int conversion raises ValueError"""
        with pytest.raises(ValueError):
            int('not a number')


class TestFixtures:
    """Test using fixtures (defined in conftest.py)"""
    
    def test_student_data_fixture(self, test_student_data):
        """Test with student data fixture"""
        assert test_student_data['student_code'] == 'HS001'
        assert test_student_data['full_name'] == 'Nguyễn Văn A'
    
    def test_score_data_fixture(self, test_score_data):
        """Test with score data fixture"""
        assert test_score_data['score'] == 8.5
        assert test_score_data['term'] == 1


"""
Run these tests with:

# Run all tests
pytest tests -v

# Run specific test file
pytest tests/test_example.py -v

# Run with coverage
pytest tests -v --cov --cov-report=html

# Run specific test class
pytest tests/test_example.py::TestBasicArithmetic -v

# Run specific test
pytest tests/test_example.py::TestBasicArithmetic::test_addition -v

# Run tests matching keyword
pytest tests -v -k "arithmetic"

Expected output:
tests/test_example.py::TestBasicArithmetic::test_addition PASSED
tests/test_example.py::TestBasicArithmetic::test_subtraction PASSED
... (14 tests total)

✅ All tests should PASS
"""
