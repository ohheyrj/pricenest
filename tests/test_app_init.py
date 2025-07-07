"""
Tests for app initialization and database setup.
"""

import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest

from src.app import create_app
from src.database.sqlalchemy_connection import get_db, init_app, migrate_existing_data
from src.models.database import db


class TestAppInitialization:
    """Test application initialization."""

    def test_create_app_basic(self):
        """Test basic app creation."""
        with patch("src.database.sqlalchemy_connection.init_app"):
            app = create_app()

            assert app is not None
            assert app.name == "src.app"

            # Check if blueprints are registered
            blueprint_names = [bp.name for bp in app.blueprints.values()]
            assert "main" in blueprint_names
            assert "categories" in blueprint_names
            assert "items" in blueprint_names
            assert "books" in blueprint_names
            assert "movies" in blueprint_names

    def test_create_app_cors_enabled(self):
        """Test CORS is enabled."""
        with patch("src.database.sqlalchemy_connection.init_app"):
            app = create_app()

            # Check if CORS headers would be added
            with app.test_client() as client:
                response = client.options("/api/categories")
                # CORS should allow OPTIONS requests
                assert response.status_code in [200, 204]

    @patch.dict(os.environ, {"PRICE_TRACKER_ENV": "production"})
    def test_create_app_production_mode(self):
        """Test app creation in production mode."""
        with patch("src.database.sqlalchemy_connection.init_app"):
            app = create_app()

            # In production, debug should be False
            assert app.debug is False


class TestDatabaseInitialization:
    """Test database initialization."""

    def test_init_app_creates_database(self):
        """Test that init_app creates database."""
        # Create a temporary database
        db_fd, db_path = tempfile.mkstemp()

        try:
            with patch("src.config.Config.DATABASE_PATH", db_path):
                from flask import Flask

                app = Flask(__name__)

                # Initialize the app
                init_app(app)

                # Check that database file exists
                assert os.path.exists(db_path)

                # Check that tables were created
                with app.app_context():
                    # Should be able to query without errors
                    from src.models.database import Category

                    categories = Category.query.all()
                    assert isinstance(categories, list)

        finally:
            os.close(db_fd)
            os.unlink(db_path)

    def test_init_app_creates_directory(self):
        """Test that init_app creates database directory if needed."""
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = os.path.join(tmpdir, "subdir", "test.db")

            with patch("src.config.Config.DATABASE_PATH", db_path):
                from flask import Flask

                app = Flask(__name__)

                # Initialize the app
                init_app(app)

                # Check that directory was created
                assert os.path.exists(os.path.dirname(db_path))

    def test_get_db(self):
        """Test get_db function."""
        db_instance = get_db()

        # Should return the SQLAlchemy db instance
        assert db_instance is db

    def test_migrate_existing_data_no_database(self):
        """Test migration when no database exists."""
        with patch("os.path.exists", return_value=False):
            # Should not raise an error
            migrate_existing_data()

    @patch("sqlite3.connect")
    @patch("os.path.exists", return_value=True)
    def test_migrate_existing_data_with_database(self, mock_exists, mock_connect):
        """Test migration with existing database."""
        # Mock the database connection
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        # Mock the table check - first call returns table names
        # Subsequent calls return empty data for actual table content
        mock_cursor.fetchall.side_effect = [
            [("categories",), ("items",), ("price_history",)],  # Table names
            [],  # Empty categories data
            [],  # Empty items data  
            [],  # Empty price_history data
        ]

        # Create a test app context
        from flask import Flask

        app = Flask(__name__)
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
        db.init_app(app)

        with app.app_context():
            db.create_all()
            migrate_existing_data()

        # Verify connection was made
        mock_connect.assert_called_once()

        # Verify tables were checked
        mock_cursor.execute.assert_any_call("SELECT name FROM sqlite_master WHERE type='table'")

    @patch("sqlite3.connect")
    @patch("os.path.exists", return_value=True)
    def test_migrate_existing_data_with_error(self, mock_exists, mock_connect):
        """Test migration error handling."""
        # Mock an error during migration
        mock_connect.side_effect = Exception("Database error")

        # Create a test app context
        from flask import Flask

        app = Flask(__name__)
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
        db.init_app(app)

        with app.app_context():
            db.create_all()

            # Should raise the exception
            with pytest.raises(Exception) as exc_info:
                migrate_existing_data()

            assert "Database error" in str(exc_info.value)
