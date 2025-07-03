"""
WSGI entry point for production deployment.
"""

from src.app import create_app
from src.database.connection import init_database

# Initialize database on startup
init_database()

# Create the application
application = create_app()

if __name__ == "__main__":
    application.run()