#!/usr/bin/env python3
"""
Simple test runner for SQLAlchemy models only (to debug database issues).
"""

import pytest
import sys
import os

# Add the project root to the Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)


def run_model_tests():
    """Run only SQLAlchemy model tests."""
    print("🧪 Running SQLAlchemy Model Tests Only")
    print("=" * 50)
    
    # Run just the model tests
    args = [
        '-v',  # Verbose output
        '--tb=short',  # Short traceback format
        '--color=yes',  # Colored output
        'tests/test_sqlalchemy_models.py'
    ]
    
    exit_code = pytest.main(args)
    
    if exit_code == 0:
        print("\n✅ Model tests passed!")
    else:
        print(f"\n❌ Model tests failed (exit code: {exit_code})")
    
    return exit_code


if __name__ == '__main__':
    exit_code = run_model_tests()
    sys.exit(exit_code)