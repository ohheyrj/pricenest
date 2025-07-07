"""
SQLAlchemy-based database connection and initialization module.
"""

import os

from flask import Flask

from src.config import Config
from src.models.database import Category, Item, PendingMovieSearch, PriceHistory, db


def init_app(app: Flask):
    """Initialize SQLAlchemy with the Flask app."""
    # Get absolute path for database
    db_path = os.path.abspath(Config.DATABASE_PATH)

    # Configure SQLAlchemy
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Initialize database
    db.init_app(app)

    # Create database directory if it doesn't exist
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    # Create tables
    with app.app_context():
        db.create_all()
        print("✅ SQLAlchemy database initialized")


def get_db():
    """Get the SQLAlchemy database instance."""
    return db


def migrate_existing_data():
    """Migrate data from the old SQLite database to SQLAlchemy models."""
    import sqlite3
    from datetime import datetime

    # Check if old database exists
    old_db_path = Config.DATABASE_PATH
    if not os.path.exists(old_db_path):
        print("No existing database to migrate")
        return

    print("📦 Migrating existing data to SQLAlchemy...")

    try:
        # Connect to old database
        conn = sqlite3.connect(old_db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Check if tables exist in old database
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]

        # Migrate categories
        if "categories" in tables:
            cursor.execute("SELECT * FROM categories")
            for row in cursor.fetchall():
                # Check if category already exists
                existing = Category.query.filter_by(id=row["id"]).first()
                if not existing:
                    category = Category(
                        id=row["id"],
                        name=row["name"],
                        type=row["type"] if "type" in row.keys() else "general",
                        book_lookup_enabled=bool(
                            row["book_lookup_enabled"] if "book_lookup_enabled" in row.keys() else 0
                        ),
                        book_lookup_source=(
                            row["book_lookup_source"] if "book_lookup_source" in row.keys() else "auto"
                        ),
                        created_at=(
                            datetime.fromisoformat(row["created_at"])
                            if "created_at" in row.keys() and row["created_at"]
                            else datetime.utcnow()
                        ),
                    )
                    db.session.add(category)

        # Migrate items
        if "items" in tables:
            cursor.execute("SELECT * FROM items")
            for row in cursor.fetchall():
                # Check if item already exists
                existing = Item.query.filter_by(id=row["id"]).first()
                if not existing:
                    item = Item(
                        id=row["id"],
                        category_id=row["category_id"],
                        name=row["name"],
                        title=row["title"] if "title" in row.keys() else None,
                        author=row["author"] if "author" in row.keys() else None,
                        director=row["director"] if "director" in row.keys() else None,
                        year=row["year"] if "year" in row.keys() else None,
                        url=row["url"],
                        price=row["price"],
                        bought=bool(row["bought"] if "bought" in row.keys() else 0),
                        external_id=(row["external_id"] if "external_id" in row.keys() else None),
                        created_at=(
                            datetime.fromisoformat(row["created_at"])
                            if "created_at" in row.keys() and row["created_at"]
                            else datetime.utcnow()
                        ),
                        last_updated=(
                            datetime.fromisoformat(row["last_updated"])
                            if "last_updated" in row.keys() and row["last_updated"]
                            else None
                        ),
                    )
                    db.session.add(item)

        # Migrate price history
        if "price_history" in tables:
            cursor.execute("SELECT * FROM price_history")
            for row in cursor.fetchall():
                # Check if price history entry already exists
                existing = PriceHistory.query.filter_by(id=row["id"]).first()
                if not existing:
                    price_history = PriceHistory(
                        id=row["id"],
                        item_id=row["item_id"],
                        old_price=row["old_price"],
                        new_price=row["new_price"],
                        price_source=(row["price_source"] if "price_source" in row.keys() else None),
                        search_query=(row["search_query"] if "search_query" in row.keys() else None),
                        created_at=(
                            datetime.fromisoformat(row["created_at"])
                            if "created_at" in row.keys() and row["created_at"]
                            else datetime.utcnow()
                        ),
                    )
                    db.session.add(price_history)

        # Migrate pending movie searches
        if "pending_movie_searches" in tables:
            cursor.execute("SELECT * FROM pending_movie_searches")
            for row in cursor.fetchall():
                # Check if pending search already exists
                existing = PendingMovieSearch.query.filter_by(id=row["id"]).first()
                if not existing:
                    pending_search = PendingMovieSearch(
                        id=row["id"],
                        category_id=row["category_id"],
                        title=row["title"],
                        director=row["director"] if "director" in row.keys() else None,
                        year=row["year"] if "year" in row.keys() else None,
                        csv_row_data=(row["csv_row_data"] if "csv_row_data" in row.keys() else None),
                        status=row["status"] if "status" in row.keys() else "pending",
                        retry_count=(row["retry_count"] if "retry_count" in row.keys() else 0),
                        last_attempted=(
                            datetime.fromisoformat(row["last_attempted"])
                            if "last_attempted" in row.keys() and row["last_attempted"]
                            else None
                        ),
                        created_at=(
                            datetime.fromisoformat(row["created_at"])
                            if "created_at" in row.keys() and row["created_at"]
                            else datetime.utcnow()
                        ),
                    )
                    db.session.add(pending_search)

        # Commit all migrations
        db.session.commit()
        conn.close()
        print("✅ Data migration completed successfully")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.session.rollback()
        raise
