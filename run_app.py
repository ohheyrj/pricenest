#!/usr/bin/env python3
"""
Application runner with proper Python path setup.
"""

import os
import sys

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Now import and run the app
from src.app import main

if __name__ == '__main__':
    main()