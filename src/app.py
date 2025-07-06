#!/usr/bin/env python3
"""
Price Tracker Flask Application
A clean, organized web application for tracking item prices with book search
functionality.
"""

from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from src.database.sqlalchemy_connection import init_app, migrate_existing_data
from src.routes.main import main_bp
from src.routes.categories import categories_bp
from src.routes.items import items_bp
from src.routes.books import books_bp
from src.routes.movies import movies_bp

# Load environment variables
load_dotenv()


def create_app():
    """Create and configure the Flask application."""
    import os

    # Get the directory where this app.py file is located
    app_dir = os.path.dirname(os.path.abspath(__file__))

    app = Flask(
        __name__,
        template_folder=os.path.join(app_dir, "templates"),
        static_folder=os.path.join(app_dir, "static"),
    )
    CORS(app)

    # Initialize SQLAlchemy
    init_app(app)

    # Migrate existing data if needed
    with app.app_context():
        migrate_existing_data()

    # Register blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(items_bp)
    app.register_blueprint(books_bp)
    app.register_blueprint(movies_bp)

    return app


def main():
    """Main entry point."""
    print("🚀 Starting Price Tracker")
    print("📊 Initializing SQLAlchemy database...")

    app = create_app()

    print("🔗 Access at: http://localhost:8000")
    app.run(host="0.0.0.0", port=8000, debug=True)


if __name__ == "__main__":
    main()
