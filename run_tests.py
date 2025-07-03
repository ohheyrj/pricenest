#!/usr/bin/env python3
"""
Test runner script for Price Tracker application.
"""

import os
import sys
import subprocess
import argparse


def run_tests(test_type="all", coverage=True, verbose=True):
    """Run tests with various options."""
    
    # Ensure we're in the right directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Add current directory to Python path for imports
    import sys
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)
    
    # Build pytest command
    cmd = ["python", "-m", "pytest"]
    
    if verbose:
        cmd.append("-v")
    
    if coverage:
        cmd.extend(["--cov=src", "--cov-report=term-missing", "--cov-report=html:htmlcov"])
    
    # Add test selection based on type
    if test_type == "unit":
        cmd.extend(["-m", "unit"])
    elif test_type == "integration":
        cmd.extend(["-m", "integration"])
    elif test_type == "api":
        cmd.append("tests/test_api.py")
    elif test_type == "book":
        cmd.append("tests/test_book_search.py")
    elif test_type == "database":
        cmd.append("tests/test_database.py")
    elif test_type == "fast":
        cmd.extend(["-m", "not slow"])
    
    # Add test directory
    if test_type == "all":
        cmd.append("tests/")
    
    print(f"Running command: {' '.join(cmd)}")
    print("-" * 50)
    
    # Run the tests
    try:
        result = subprocess.run(cmd, check=False)
        return result.returncode
    except KeyboardInterrupt:
        print("\nTests interrupted by user")
        return 130


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Run Price Tracker tests")
    parser.add_argument(
        "--type", 
        choices=["all", "unit", "integration", "api", "book", "database", "fast"],
        default="all",
        help="Type of tests to run"
    )
    parser.add_argument(
        "--no-coverage", 
        action="store_true",
        help="Disable coverage reporting"
    )
    parser.add_argument(
        "--quiet", 
        action="store_true",
        help="Run tests quietly"
    )
    
    args = parser.parse_args()
    
    # Check if pytest is available
    try:
        subprocess.run(["python", "-m", "pytest", "--version"], 
                      check=True, capture_output=True)
    except subprocess.CalledProcessError:
        print("ERROR: pytest is not installed or not available")
        print("Please install test dependencies:")
        print("  pip install -r requirements.txt")
        return 1
    
    # Run the tests
    exit_code = run_tests(
        test_type=args.type,
        coverage=not args.no_coverage,
        verbose=not args.quiet
    )
    
    if exit_code == 0:
        print("\n✅ All tests passed!")
        if not args.no_coverage:
            print("📊 Coverage report generated in htmlcov/index.html")
    else:
        print(f"\n❌ Tests failed with exit code {exit_code}")
    
    return exit_code


if __name__ == "__main__":
    sys.exit(main())