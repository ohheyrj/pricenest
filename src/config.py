"""
Application configuration.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration class."""

    # Database configuration
    DATABASE_PATH = os.getenv("DATABASE_PATH", "data/price_tracker.db")

    # Flask configuration
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"

    # Server configuration
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 8000))

    # Book search configuration
    GOOGLE_BOOKS_API_TIMEOUT = int(os.getenv("GOOGLE_BOOKS_API_TIMEOUT", 10))


class DevelopmentConfig(Config):
    """Development configuration."""

    DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""

    DEBUG = False


class TestingConfig(Config):
    """Testing configuration."""

    TESTING = True
    DATABASE_PATH = ":memory:"  # In-memory database for tests


# Configuration mapping
config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
