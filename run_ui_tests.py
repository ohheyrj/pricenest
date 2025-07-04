#!/usr/bin/env python3
"""
UI Test Runner Script
Starts the Flask app and runs Selenium UI tests
"""

import subprocess
import time
import sys
import os
import signal
from threading import Thread
import requests


def is_server_running(url, timeout=30):
    """Check if the server is running and responsive."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url)
            if response.status_code == 200:
                return True
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(1)
    return False


def run_server():
    """Run the Flask development server."""
    env = os.environ.copy()
    env['FLASK_ENV'] = 'development'
    
    process = subprocess.Popen(
        [sys.executable, '-m', 'src.app'],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    return process


def run_ui_tests(specific_test=None):
    """Run the UI tests using pytest."""
    cmd = [
        sys.executable, '-m', 'pytest',
        'tests/test_ui_navigation.py',
        '-v',
        '--tb=short'
    ]
    
    if specific_test:
        cmd.append(f'-k {specific_test}')
    
    # Add markers to skip tests that require manual setup
    cmd.extend(['-m', 'not skip'])
    
    result = subprocess.run(cmd)
    return result.returncode


def main():
    """Main test runner function."""
    print("🚀 Starting UI Test Runner")
    
    # Check if server is already running
    base_url = 'http://localhost:8000'
    
    if is_server_running(base_url, timeout=5):
        print("✓ Server already running at", base_url)
        server_process = None
    else:
        print("📊 Starting Flask server...")
        server_process = run_server()
        
        # Wait for server to start
        print("⏳ Waiting for server to be ready...")
        if not is_server_running(base_url):
            print("❌ Server failed to start!")
            if server_process:
                server_process.terminate()
            return 1
        
        print("✓ Server is ready!")
    
    # Run the UI tests
    print("\n🧪 Running UI tests...")
    print("=" * 50)
    
    try:
        exit_code = run_ui_tests(specific_test=sys.argv[1] if len(sys.argv) > 1 else None)
        
        if exit_code == 0:
            print("\n✅ All UI tests passed!")
        else:
            print("\n❌ Some UI tests failed!")
            
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        exit_code = 1
        
    finally:
        # Clean up server if we started it
        if server_process:
            print("\n🛑 Stopping Flask server...")
            server_process.terminate()
            server_process.wait()
    
    return exit_code


if __name__ == '__main__':
    sys.exit(main())