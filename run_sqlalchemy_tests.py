#!/usr/bin/env python3
"""
Test runner for SQLAlchemy-based tests.
"""

import pytest
import sys
import os

# Add the project root to the Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)


def run_sqlalchemy_tests():
    """Run SQLAlchemy-specific tests."""
    print("🧪 Running SQLAlchemy Database Tests")
    print("=" * 50)
    
    # Test files to run
    test_files = [
        'tests/test_sqlalchemy_models.py',
        'tests/test_sqlalchemy_api.py',
        'tests/test_migration.py',
        'tests/test_items_endpoints.py',
        'tests/test_books_endpoints.py',
        'tests/test_movies_endpoints.py',
        'tests/test_main_and_categories.py',
        'tests/test_services.py',
        'tests/test_app_init.py'
    ]
    
    # Run tests with verbose output
    args = [
        '-v',  # Verbose output
        '--tb=short',  # Short traceback format
        '--strict-markers',  # Strict marker checking
        '--color=yes',  # Colored output
        *test_files
    ]
    
    exit_code = pytest.main(args)
    
    if exit_code == 0:
        print("\n✅ All SQLAlchemy tests passed!")
    else:
        print(f"\n❌ Some tests failed (exit code: {exit_code})")
    
    return exit_code


def run_specific_test_class(test_class):
    """Run a specific test class."""
    print(f"🧪 Running specific test class: {test_class}")
    print("=" * 50)
    
    args = [
        '-v',
        '--tb=short',
        '--color=yes',
        f'-k={test_class}'
    ]
    
    exit_code = pytest.main(args)
    return exit_code


def run_coverage_report():
    """Run tests with coverage report."""
    print("🧪 Running SQLAlchemy Tests with Coverage")
    print("=" * 50)
    
    args = [
        '--cov=src',
        '--cov-report=html',
        '--cov-report=term-missing',
        '-v',
        'tests/test_sqlalchemy_models.py',
        'tests/test_sqlalchemy_api.py',
        'tests/test_migration.py',
        'tests/test_items_endpoints.py',
        'tests/test_books_endpoints.py',
        'tests/test_movies_endpoints.py',
        'tests/test_main_and_categories.py',
        'tests/test_services.py',
        'tests/test_app_init.py'
    ]
    
    exit_code = pytest.main(args)
    
    if exit_code == 0:
        print("\n📊 Coverage report generated in htmlcov/")
    
    return exit_code


if __name__ == '__main__':
    if len(sys.argv) > 1:
        if sys.argv[1] == '--coverage':
            exit_code = run_coverage_report()
        elif sys.argv[1] == '--class':
            if len(sys.argv) > 2:
                exit_code = run_specific_test_class(sys.argv[2])
            else:
                print("❌ Please specify a test class name")
                exit_code = 1
        else:
            print("Usage:")
            print("  python run_sqlalchemy_tests.py           # Run all SQLAlchemy tests")
            print("  python run_sqlalchemy_tests.py --coverage # Run with coverage report")
            print("  python run_sqlalchemy_tests.py --class TestCategoryModel  # Run specific class")
            exit_code = 1
    else:
        exit_code = run_sqlalchemy_tests()
    
    sys.exit(exit_code)