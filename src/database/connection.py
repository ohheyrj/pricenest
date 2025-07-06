"""
Database connection and initialization module.
"""

import os
import sqlite3
from src.config import Config


# Configuration
DATABASE_PATH = Config.DATABASE_PATH


def get_db_connection():
    """Get SQLite database connection."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Initialize database with proper schema."""
    db_dir = os.path.dirname(DATABASE_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create categories table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS categories (
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
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            title TEXT,
            author TEXT,
            director TEXT,
            year INTEGER,
            url TEXT NOT NULL,
            price REAL NOT NULL,
            bought INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
        )
    """
    )

    # Create pending movie searches table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS pending_movie_searches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            director TEXT,
            year INTEGER,
            csv_row_data TEXT,
            status TEXT DEFAULT 'pending',
            retry_count INTEGER DEFAULT 0,
            last_attempted TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
        )
    """
    )

    # Create price history table (drop and recreate if structure is wrong)
    cursor.execute("DROP TABLE IF EXISTS price_history")
    cursor.execute(
        """
        CREATE TABLE price_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            old_price REAL NOT NULL,
            new_price REAL NOT NULL,
            price_source TEXT,
            search_query TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE
        )
    """
    )

    # Add new columns if they don't exist (for existing databases)
    cursor.execute("PRAGMA table_info(items)")
    columns = [column[1] for column in cursor.fetchall()]

    if "director" not in columns:
        print("📽️ Adding 'director' column to items table...")
        cursor.execute("ALTER TABLE items ADD COLUMN director TEXT")

    if "year" not in columns:
        print("📅 Adding 'year' column to items table...")
        cursor.execute("ALTER TABLE items ADD COLUMN year INTEGER")

    if "external_id" not in columns:
        print("🔗 Adding 'external_id' column to items table...")
        cursor.execute("ALTER TABLE items ADD COLUMN external_id TEXT")

    if "last_updated" not in columns:
        print("🕐 Adding 'last_updated' column to items table...")
        cursor.execute("ALTER TABLE items ADD COLUMN last_updated TIMESTAMP")

    conn.commit()
    conn.close()
    print("✅ Database initialized")


def format_category(row):
    """Format category row for frontend."""
    try:
        category_type = row["type"] if "type" in row.keys() else "general"
    except (KeyError, TypeError):
        category_type = "general"

    return {
        "id": row["id"],
        "name": row["name"],
        "type": category_type,
        "bookLookupEnabled": bool(row["book_lookup_enabled"]),
        "bookLookupSource": row["book_lookup_source"],
        "items": [],
    }
