"""
Tests for database operations and data integrity.
"""

import os
import tempfile
import sqlite3
import pytest
from src.database.connection import get_db_connection, init_database, format_category


class TestDatabaseOperations:
    """Test database operations and data integrity."""
    
    def test_database_initialization(self):
        """Test that the database is properly initialized."""
        # Create a temporary database
        db_fd, db_path = tempfile.mkstemp()
        
        try:
            # Override the DATABASE_PATH
            import src.database.connection
            original_path = src.database.connection.DATABASE_PATH
            src.database.connection.DATABASE_PATH = db_path
            
            # Initialize the database
            init_database()
            
            # Check that tables were created
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Check categories table
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'")
            assert cursor.fetchone() is not None
            
            # Check items table
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='items'")
            assert cursor.fetchone() is not None
            
            # Check categories table schema
            cursor.execute("PRAGMA table_info(categories)")
            columns = [column[1] for column in cursor.fetchall()]
            expected_columns = ['id', 'name', 'type', 'book_lookup_enabled', 'book_lookup_source', 'created_at']
            for col in expected_columns:
                assert col in columns
            
            # Check items table schema
            cursor.execute("PRAGMA table_info(items)")
            columns = [column[1] for column in cursor.fetchall()]
            expected_columns = ['id', 'category_id', 'name', 'title', 'author', 'url', 'price', 'bought', 'created_at']
            for col in expected_columns:
                assert col in columns
            
            conn.close()
            
        finally:
            # Restore original path
            src.database.connection.DATABASE_PATH = original_path
            os.close(db_fd)
            os.unlink(db_path)
    
    def test_format_category_with_type(self):
        """Test formatting category with type field."""
        # Mock SQLite Row with type
        class MockRow:
            def __init__(self, data):
                self.data = data
            
            def __getitem__(self, key):
                return self.data[key]
            
            def keys(self):
                return self.data.keys()
        
        row_data = {
            'id': 1,
            'name': 'Test Books',
            'type': 'books',
            'book_lookup_enabled': 1,
            'book_lookup_source': 'auto'
        }
        
        row = MockRow(row_data)
        category = format_category(row)
        
        assert category['id'] == 1
        assert category['name'] == 'Test Books'
        assert category['type'] == 'books'
        assert category['bookLookupEnabled'] == True
        assert category['bookLookupSource'] == 'auto'
        assert category['items'] == []
    
    def test_format_category_without_type(self):
        """Test formatting category without type field (backward compatibility)."""
        class MockRow:
            def __init__(self, data):
                self.data = data
            
            def __getitem__(self, key):
                if key not in self.data:
                    raise KeyError(key)
                return self.data[key]
            
            def keys(self):
                return self.data.keys()
        
        # Old format without type field
        row_data = {
            'id': 1,
            'name': 'Electronics',
            'book_lookup_enabled': 0,
            'book_lookup_source': 'auto'
        }
        
        row = MockRow(row_data)
        category = format_category(row)
        
        assert category['id'] == 1
        assert category['name'] == 'Electronics'
        assert category['type'] == 'general'  # Default type
        assert category['bookLookupEnabled'] == False
        assert category['bookLookupSource'] == 'auto'
    
    def test_database_foreign_key_constraint(self):
        """Test that foreign key constraints work properly."""
        # Create a temporary database
        db_fd, db_path = tempfile.mkstemp()
        
        try:
            # Override the DATABASE_PATH
            import src.database.connection
            original_path = src.database.connection.DATABASE_PATH
            src.database.connection.DATABASE_PATH = db_path
            
            init_database()
            
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Enable foreign key constraints
            cursor.execute("PRAGMA foreign_keys = ON")
            
            # Insert a category
            cursor.execute('''
                INSERT INTO categories (name, type, book_lookup_enabled, book_lookup_source)
                VALUES (?, ?, ?, ?)
            ''', ('Test Category', 'general', 0, 'auto'))
            
            category_id = cursor.lastrowid
            
            # Insert an item
            cursor.execute('''
                INSERT INTO items (category_id, name, url, price, bought)
                VALUES (?, ?, ?, ?, ?)
            ''', (category_id, 'Test Item', 'https://example.com', 10.99, 0))
            
            # Verify item was inserted
            cursor.execute('SELECT COUNT(*) FROM items WHERE category_id = ?', (category_id,))
            assert cursor.fetchone()[0] == 1
            
            # Delete the category (should cascade delete the item)
            cursor.execute('DELETE FROM categories WHERE id = ?', (category_id,))
            
            # Verify item was deleted due to foreign key constraint
            cursor.execute('SELECT COUNT(*) FROM items WHERE category_id = ?', (category_id,))
            assert cursor.fetchone()[0] == 0
            
            conn.commit()
            conn.close()
            
        finally:
            src.app.DATABASE_PATH = original_path
            os.close(db_fd)
            os.unlink(db_path)
    
    def test_database_connection(self):
        """Test database connection functionality."""
        # Create a temporary database
        db_fd, db_path = tempfile.mkstemp()
        
        try:
            # Override the DATABASE_PATH
            import src.database.connection
            original_path = src.database.connection.DATABASE_PATH
            src.database.connection.DATABASE_PATH = db_path
            
            # Test connection
            conn = get_db_connection()
            assert conn is not None
            
            # Test row factory
            assert conn.row_factory == sqlite3.Row
            
            # Test basic query
            cursor = conn.cursor()
            cursor.execute("SELECT 1 as test")
            row = cursor.fetchone()
            assert row['test'] == 1
            
            conn.close()
            
        finally:
            src.app.DATABASE_PATH = original_path
            os.close(db_fd)
            os.unlink(db_path)
    
    def test_data_types_and_constraints(self):
        """Test that data types and constraints are properly enforced."""
        # Create a temporary database
        db_fd, db_path = tempfile.mkstemp()
        
        try:
            # Override the DATABASE_PATH
            import src.database.connection
            original_path = src.database.connection.DATABASE_PATH
            src.database.connection.DATABASE_PATH = db_path
            
            init_database()
            
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Test category constraints
            # Name is required (NOT NULL)
            with pytest.raises(sqlite3.IntegrityError):
                cursor.execute('''
                    INSERT INTO categories (type, book_lookup_enabled, book_lookup_source)
                    VALUES (?, ?, ?)
                ''', ('general', 0, 'auto'))
            
            # Test item constraints
            # First insert a valid category
            cursor.execute('''
                INSERT INTO categories (name, type, book_lookup_enabled, book_lookup_source)
                VALUES (?, ?, ?, ?)
            ''', ('Test Category', 'general', 0, 'auto'))
            
            category_id = cursor.lastrowid
            
            # Test that required fields are enforced
            with pytest.raises(sqlite3.IntegrityError):
                cursor.execute('''
                    INSERT INTO items (category_id, url, price, bought)
                    VALUES (?, ?, ?, ?)
                ''', (category_id, 'https://example.com', 10.99, 0))
                # Missing name field
            
            # Test valid item insertion
            cursor.execute('''
                INSERT INTO items (category_id, name, url, price, bought)
                VALUES (?, ?, ?, ?, ?)
            ''', (category_id, 'Valid Item', 'https://example.com', 10.99, 0))
            
            # Verify insertion
            cursor.execute('SELECT COUNT(*) FROM items')
            assert cursor.fetchone()[0] == 1
            
            conn.close()
            
        finally:
            src.app.DATABASE_PATH = original_path
            os.close(db_fd)
            os.unlink(db_path)
    
    def test_book_category_data_handling(self):
        """Test handling of book-specific data (title, author)."""
        # Create a temporary database
        db_fd, db_path = tempfile.mkstemp()
        
        try:
            # Override the DATABASE_PATH
            import src.database.connection
            original_path = src.database.connection.DATABASE_PATH
            src.database.connection.DATABASE_PATH = db_path
            
            init_database()
            
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Insert a book category
            cursor.execute('''
                INSERT INTO categories (name, type, book_lookup_enabled, book_lookup_source)
                VALUES (?, ?, ?, ?)
            ''', ('Books', 'books', 1, 'auto'))
            
            category_id = cursor.lastrowid
            
            # Insert a book item with title and author
            cursor.execute('''
                INSERT INTO items (category_id, name, title, author, url, price, bought)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (category_id, 'Dune by Frank Herbert', 'Dune', 'Frank Herbert', 'https://example.com/dune', 14.99, 0))
            
            # Retrieve and verify the data
            cursor.execute('''
                SELECT name, title, author FROM items WHERE category_id = ?
            ''', (category_id,))
            
            row = cursor.fetchone()
            assert row[0] == 'Dune by Frank Herbert'  # name
            assert row[1] == 'Dune'  # title
            assert row[2] == 'Frank Herbert'  # author
            
            # Test item without title/author (general item in book category)
            cursor.execute('''
                INSERT INTO items (category_id, name, url, price, bought)
                VALUES (?, ?, ?, ?, ?)
            ''', (category_id, 'Book Light', 'https://example.com/light', 9.99, 0))
            
            # Verify it was inserted correctly
            cursor.execute('''
                SELECT name, title, author FROM items WHERE name = ?
            ''', ('Book Light',))
            
            row = cursor.fetchone()
            assert row[0] == 'Book Light'
            assert row[1] is None  # title should be NULL
            assert row[2] is None  # author should be NULL
            
            conn.close()
            
        finally:
            src.app.DATABASE_PATH = original_path
            os.close(db_fd)
            os.unlink(db_path)