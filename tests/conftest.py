"""
Test configuration and fixtures for Price Tracker application.
"""

import os
import sqlite3
import tempfile

import pytest

from src.app import create_app

# Import SQLAlchemy fixtures to make them available
from tests.conftest_sqlalchemy import sqlalchemy_app, sqlalchemy_client, db_session


@pytest.fixture
def test_app():
    """Create and configure a test Flask application."""
    # Create a temporary database file
    db_fd, db_path = tempfile.mkstemp()

    # Override the DATABASE_PATH in the database module
    import src.database.connection

    original_path = src.database.connection.DATABASE_PATH
    src.database.connection.DATABASE_PATH = db_path

    # Create the app
    app = create_app()
    app.config["TESTING"] = True

    # Initialize the test database
    with app.app_context():
        init_test_database(db_path)

    yield app

    # Clean up
    src.database.connection.DATABASE_PATH = original_path
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(test_app):
    """Create a test client for the Flask application."""
    return test_app.test_client()


@pytest.fixture
def runner(test_app):
    """Create a test runner for the Flask application."""
    return test_app.test_cli_runner()


def init_test_database(db_path):
    """Initialize a test database with the required schema."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create categories table
    cursor.execute(
        """
        CREATE TABLE categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT DEFAULT 'general',
            book_lookup_enabled INTEGER DEFAULT 0,
            book_lookup_source TEXT DEFAULT 'auto',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    # Create items table
    cursor.execute(
        """
        CREATE TABLE items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            title TEXT,
            author TEXT,
            url TEXT NOT NULL,
            price REAL NOT NULL,
            bought INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
        )
    """
    )

    # Insert test data
    cursor.execute(
        """
        INSERT INTO categories (name, type, book_lookup_enabled, book_lookup_source)
        VALUES (?, ?, ?, ?)
    """,
        ("Test Books", "books", 1, "auto"),
    )

    cursor.execute(
        """
        INSERT INTO categories (name, type, book_lookup_enabled, book_lookup_source)
        VALUES (?, ?, ?, ?)
    """,
        ("Electronics", "general", 0, "auto"),
    )

    # Insert test items
    cursor.execute(
        """
        INSERT INTO items (category_id, name, title, author, url, price, bought)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """,
        (
            1,
            "The Great Gatsby by F. Scott Fitzgerald",
            "The Great Gatsby",
            "F. Scott Fitzgerald",
            "https://example.com/gatsby",
            12.99,
            0,
        ),
    )

    cursor.execute(
        """
        INSERT INTO items (category_id, name, url, price, bought)
        VALUES (?, ?, ?, ?, ?)
    """,
        (2, "iPhone 15", "https://example.com/iphone", 999.99, 0),
    )

    conn.commit()
    conn.close()


@pytest.fixture
def sample_book_data():
    """Sample book data for testing."""
    return {
        "title": "Test Book",
        "author": "Test Author",
        "name": "Test Book by Test Author",
        "price": 15.99,
        "url": "https://example.com/test-book",
        "priceSource": "sample",
    }


@pytest.fixture
def sample_category_data():
    """Sample category data for testing."""
    return {
        "name": "Science Fiction",
        "type": "books",
        "bookLookupEnabled": True,
        "bookLookupSource": "auto",
    }


@pytest.fixture
def sample_item_data():
    """Sample item data for testing."""
    return {
        "name": "Dune by Frank Herbert",
        "title": "Dune",
        "author": "Frank Herbert",
        "url": "https://example.com/dune",
        "price": 14.99,
    }
