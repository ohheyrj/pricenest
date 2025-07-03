"""
Setup script for Price Tracker application.
"""

from setuptools import setup, find_packages

setup(
    name="price-tracker",
    version="1.0.0",
    description="A web application for tracking item prices with book search functionality",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "Flask>=2.3.3",
        "Flask-CORS>=4.0.0",
        "requests>=2.31.0",
        "python-dotenv>=1.0.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.3",
            "pytest-cov>=4.1.0",
            "black>=23.9.1",
            "flake8>=6.1.0",
        ]
    },
    entry_points={
        "console_scripts": [
            "price-tracker=src.app:main",
        ],
    },
)