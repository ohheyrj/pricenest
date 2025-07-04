#!/usr/bin/env python3
"""
Simple test runner - just run: devenv shell python test.py
"""
import subprocess
import sys

def run_tests():
    """Run all SQLAlchemy tests."""
    print("🧪 Running all SQLAlchemy tests...\n")
    
    # Run the SQLAlchemy test runner
    result = subprocess.run([
        sys.executable, 
        'run_sqlalchemy_tests.py'
    ])
    
    return result.returncode

if __name__ == '__main__':
    exit_code = run_tests()
    sys.exit(exit_code)