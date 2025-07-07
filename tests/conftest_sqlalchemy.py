"""
SQLAlchemy test configuration and fixtures for Price Tracker application.
"""

import os
import tempfile

import pytest

from src.app import create_app
from src.models.database import Category, Item, PendingMovieSearch, PriceHistory, db


@pytest.fixture
def sqlalchemy_app():
    """Create and configure a test Flask application with SQLAlchemy."""
    # Create a temporary database file
    db_fd, db_path = tempfile.mkstemp()

    # Override the database path BEFORE creating the app
    import src.config

    original_path = src.config.Config.DATABASE_PATH
    src.config.Config.DATABASE_PATH = db_path

    try:
        # Create a minimal Flask app without calling create_app() to avoid migration
        from flask import Flask
        from flask_cors import CORS

        from src.models.database import db
        from src.routes.books import books_bp
        from src.routes.categories import categories_bp
        from src.routes.items import items_bp
        from src.routes.main import main_bp
        from src.routes.movies import movies_bp

        # Get the path to the templates directory
        import os

        template_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "templates"))
        static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "static"))

        app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
        app.config["TESTING"] = True
        app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
        app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

        # Add CORS
        CORS(app)

        # Initialize SQLAlchemy with the app
        db.init_app(app)

        # Register blueprints
        app.register_blueprint(main_bp)
        app.register_blueprint(categories_bp)
        app.register_blueprint(items_bp)
        app.register_blueprint(books_bp)
        app.register_blueprint(movies_bp)

        with app.app_context():
            # Create all tables
            db.create_all()

            # Add test data
            create_test_data()

        yield app

    finally:
        # Clean up
        src.config.Config.DATABASE_PATH = original_path
        os.close(db_fd)
        os.unlink(db_path)


@pytest.fixture
def sqlalchemy_client(sqlalchemy_app):
    """Create a test client for the SQLAlchemy Flask application."""
    return sqlalchemy_app.test_client()


@pytest.fixture
def db_session(sqlalchemy_app):
    """Create a database session for testing."""
    with sqlalchemy_app.app_context():
        yield db.session


def create_test_data():
    """Create test data for SQLAlchemy tests."""
    # Create test categories
    books_category = Category(
        name="Test Books",
        type="books",
        book_lookup_enabled=True,
        book_lookup_source="auto",
    )

    movies_category = Category(
        name="Test Movies",
        type="movies",
        book_lookup_enabled=False,
        book_lookup_source="auto",
    )

    general_category = Category(
        name="Electronics",
        type="general",
        book_lookup_enabled=False,
        book_lookup_source="auto",
    )

    db.session.add_all([books_category, movies_category, general_category])
    db.session.commit()

    # Create test items
    book_item = Item(
        category_id=books_category.id,
        name="The Great Gatsby by F. Scott Fitzgerald",
        title="The Great Gatsby",
        author="F. Scott Fitzgerald",
        url="https://example.com/gatsby",
        price=12.99,
        bought=False,
    )

    movie_item = Item(
        category_id=movies_category.id,
        name="Inception (2010)",
        title="Inception",
        director="Christopher Nolan",
        year=2010,
        url="https://example.com/inception",
        price=9.99,
        bought=False,
        external_id="12345",
    )

    electronics_item = Item(
        category_id=general_category.id,
        name="iPhone 15",
        url="https://example.com/iphone",
        price=999.99,
        bought=False,
    )

    db.session.add_all([book_item, movie_item, electronics_item])
    db.session.commit()

    # Create test price history
    price_change = PriceHistory(
        item_id=book_item.id,
        old_price=14.99,
        new_price=12.99,
        price_source="google_books",
        search_query="The Great Gatsby F. Scott Fitzgerald",
    )

    db.session.add(price_change)
    db.session.commit()


@pytest.fixture
def sample_category():
    """Sample category for testing."""
    return {
        "name": "Science Fiction",
        "type": "books",
        "bookLookupEnabled": True,
        "bookLookupSource": "google_books",
    }


@pytest.fixture
def sample_item():
    """Sample item for testing."""
    return {
        "name": "Dune by Frank Herbert",
        "title": "Dune",
        "author": "Frank Herbert",
        "url": "https://example.com/dune",
        "price": 16.99,
    }


@pytest.fixture
def sample_movie_item():
    """Sample movie item for testing."""
    return {
        "name": "The Matrix (1999)",
        "title": "The Matrix",
        "director": "The Wachowskis",
        "year": 1999,
        "url": "https://example.com/matrix",
        "price": 12.99,
        "trackId": "67890",
    }
