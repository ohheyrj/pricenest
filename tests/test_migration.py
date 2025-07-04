"""
Tests for SQLite to SQLAlchemy migration functionality.
"""

import pytest
import os
import tempfile
import sqlite3
from datetime import datetime
from src.models.database import db, Category, Item, PriceHistory
from src.database.sqlalchemy_connection import migrate_existing_data
from src.app import create_app


class TestMigration:
    """Test migration from SQLite to SQLAlchemy."""
    
    def create_old_database(self, db_path):
        """Create an old-style SQLite database with test data."""
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create old schema
        cursor.execute('''
            CREATE TABLE categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT DEFAULT 'general',
                book_lookup_enabled INTEGER DEFAULT 0,
                book_lookup_source TEXT DEFAULT 'auto',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE items (
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
                external_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_updated TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
            )
        ''')
        
        cursor.execute('''
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
        ''')
        
        # Insert test data
        cursor.execute('''
            INSERT INTO categories (id, name, type, book_lookup_enabled, book_lookup_source, created_at)
            VALUES (1, 'Old Books', 'books', 1, 'google_books', '2025-01-01 10:00:00')
        ''')
        
        cursor.execute('''
            INSERT INTO categories (id, name, type, book_lookup_enabled, book_lookup_source, created_at)
            VALUES (2, 'Old Movies', 'movies', 0, 'auto', '2025-01-02 11:00:00')
        ''')
        
        cursor.execute('''
            INSERT INTO items (id, category_id, name, title, author, url, price, bought, external_id, created_at, last_updated)
            VALUES (1, 1, 'Old Book by Old Author', 'Old Book', 'Old Author', 'https://example.com/old-book', 19.99, 0, 'book123', '2025-01-01 12:00:00', '2025-01-02 13:00:00')
        ''')
        
        cursor.execute('''
            INSERT INTO items (id, category_id, name, title, director, year, url, price, bought, external_id, created_at)
            VALUES (2, 2, 'Old Movie (2020)', 'Old Movie', 'Old Director', 2020, 'https://example.com/old-movie', 12.99, 1, 'movie456', '2025-01-02 14:00:00')
        ''')
        
        cursor.execute('''
            INSERT INTO price_history (id, item_id, old_price, new_price, price_source, search_query, created_at)
            VALUES (1, 1, 24.99, 19.99, 'google_books', 'Old Book Old Author', '2025-01-02 15:00:00')
        ''')
        
        cursor.execute('''
            INSERT INTO price_history (id, item_id, old_price, new_price, price_source, search_query, created_at)
            VALUES (2, 2, 15.99, 12.99, 'apple', 'Old Movie Old Director', '2025-01-02 16:00:00')
        ''')
        
        conn.commit()
        conn.close()
    
    def test_migrate_categories(self):
        """Test migration of categories from old database."""
        # Create temporary files
        old_db_fd, old_db_path = tempfile.mkstemp()
        new_db_fd, new_db_path = tempfile.mkstemp()
        
        try:
            # Create old database
            self.create_old_database(old_db_path)
            
            # Override config BEFORE creating app
            import src.config
            original_path = src.config.Config.DATABASE_PATH
            src.config.Config.DATABASE_PATH = old_db_path
            
            # Create minimal Flask app without calling create_app() to avoid migration
            from flask import Flask
            from flask_cors import CORS
            from src.models.database import db
            
            app = Flask(__name__)
            app.config['TESTING'] = True
            app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{new_db_path}'
            app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
            
            # Add CORS
            CORS(app)
            
            # Initialize SQLAlchemy with the app
            db.init_app(app)
            
            with app.app_context():
                db.create_all()
                migrate_existing_data()
                
                # Check migrated categories
                categories = Category.query.all()
                assert len(categories) == 2
                
                books_cat = Category.query.filter_by(name='Old Books').first()
                assert books_cat is not None
                assert books_cat.type == 'books'
                assert books_cat.book_lookup_enabled is True
                assert books_cat.book_lookup_source == 'google_books'
                
                movies_cat = Category.query.filter_by(name='Old Movies').first()
                assert movies_cat is not None
                assert movies_cat.type == 'movies'
                assert movies_cat.book_lookup_enabled is False
            
            # Restore config
            src.config.Config.DATABASE_PATH = original_path
            
        finally:
            # Clean up
            os.close(old_db_fd)
            os.close(new_db_fd)
            os.unlink(old_db_path)
            os.unlink(new_db_path)
    
    def test_migrate_items(self):
        """Test migration of items from old database."""
        old_db_fd, old_db_path = tempfile.mkstemp()
        new_db_fd, new_db_path = tempfile.mkstemp()
        
        try:
            self.create_old_database(old_db_path)
            
            # Override config BEFORE creating app
            import src.config
            original_path = src.config.Config.DATABASE_PATH
            src.config.Config.DATABASE_PATH = old_db_path
            
            # Create minimal Flask app
            from flask import Flask
            from flask_cors import CORS
            from src.models.database import db
            
            app = Flask(__name__)
            app.config['TESTING'] = True
            app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{new_db_path}'
            app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
            
            CORS(app)
            db.init_app(app)
            
            with app.app_context():
                db.create_all()
                migrate_existing_data()
                
                # Check migrated items
                items = Item.query.all()
                assert len(items) == 2
                
                book_item = Item.query.filter_by(name='Old Book by Old Author').first()
                assert book_item is not None
                assert book_item.title == 'Old Book'
                assert book_item.author == 'Old Author'
                assert book_item.price == 19.99
                assert book_item.bought is False
                assert book_item.external_id == 'book123'
                
                movie_item = Item.query.filter_by(name='Old Movie (2020)').first()
                assert movie_item is not None
                assert movie_item.title == 'Old Movie'
                assert movie_item.director == 'Old Director'
                assert movie_item.year == 2020
                assert movie_item.price == 12.99
                assert movie_item.bought is True
                assert movie_item.external_id == 'movie456'
            
            src.config.Config.DATABASE_PATH = original_path
            
        finally:
            os.close(old_db_fd)
            os.close(new_db_fd)
            os.unlink(old_db_path)
            os.unlink(new_db_path)
    
    def test_migrate_price_history(self):
        """Test migration of price history from old database."""
        old_db_fd, old_db_path = tempfile.mkstemp()
        new_db_fd, new_db_path = tempfile.mkstemp()
        
        try:
            self.create_old_database(old_db_path)
            
            # Override config BEFORE creating app
            import src.config
            original_path = src.config.Config.DATABASE_PATH
            src.config.Config.DATABASE_PATH = old_db_path
            
            # Create minimal Flask app
            from flask import Flask
            from flask_cors import CORS
            from src.models.database import db
            
            app = Flask(__name__)
            app.config['TESTING'] = True
            app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{new_db_path}'
            app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
            
            CORS(app)
            db.init_app(app)
            
            with app.app_context():
                db.create_all()
                migrate_existing_data()
                
                # Check migrated price history
                history = PriceHistory.query.all()
                assert len(history) == 2
                
                book_history = PriceHistory.query.filter_by(item_id=1).first()
                assert book_history is not None
                assert book_history.old_price == 24.99
                assert book_history.new_price == 19.99
                assert book_history.price_source == 'google_books'
                assert book_history.search_query == 'Old Book Old Author'
                
                movie_history = PriceHistory.query.filter_by(item_id=2).first()
                assert movie_history is not None
                assert movie_history.old_price == 15.99
                assert movie_history.new_price == 12.99
                assert movie_history.price_source == 'apple'
            
            src.config.Config.DATABASE_PATH = original_path
            
        finally:
            os.close(old_db_fd)
            os.close(new_db_fd)
            os.unlink(old_db_path)
            os.unlink(new_db_path)
    
    def test_migrate_relationships(self):
        """Test that relationships are maintained after migration."""
        old_db_fd, old_db_path = tempfile.mkstemp()
        new_db_fd, new_db_path = tempfile.mkstemp()
        
        try:
            self.create_old_database(old_db_path)
            
            # Override config BEFORE creating app
            import src.config
            original_path = src.config.Config.DATABASE_PATH
            src.config.Config.DATABASE_PATH = old_db_path
            
            # Create minimal Flask app
            from flask import Flask
            from flask_cors import CORS
            from src.models.database import db
            
            app = Flask(__name__)
            app.config['TESTING'] = True
            app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{new_db_path}'
            app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
            
            CORS(app)
            db.init_app(app)
            
            with app.app_context():
                db.create_all()
                migrate_existing_data()
                
                # Test category -> items relationship
                books_category = Category.query.filter_by(name='Old Books').first()
                assert len(books_category.items) == 1
                assert books_category.items[0].name == 'Old Book by Old Author'
                
                movies_category = Category.query.filter_by(name='Old Movies').first()
                assert len(movies_category.items) == 1
                assert movies_category.items[0].name == 'Old Movie (2020)'
                
                # Test item -> price_history relationship
                book_item = Item.query.filter_by(name='Old Book by Old Author').first()
                assert len(book_item.price_history) == 1
                assert book_item.price_history[0].old_price == 24.99
                
                movie_item = Item.query.filter_by(name='Old Movie (2020)').first()
                assert len(movie_item.price_history) == 1
                assert movie_item.price_history[0].price_source == 'apple'
            
            src.config.Config.DATABASE_PATH = original_path
            
        finally:
            os.close(old_db_fd)
            os.close(new_db_fd)
            os.unlink(old_db_path)
            os.unlink(new_db_path)
    
    def test_migrate_no_existing_database(self):
        """Test migration behavior when no existing database exists."""
        # Override config BEFORE creating app
        import src.config
        original_path = src.config.Config.DATABASE_PATH
        src.config.Config.DATABASE_PATH = '/nonexistent/path/database.db'
        
        # Create minimal Flask app
        from flask import Flask
        from flask_cors import CORS
        from src.models.database import db
        
        app = Flask(__name__)
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        
        CORS(app)
        db.init_app(app)
        
        try:
            with app.app_context():
                db.create_all()
                # Should not raise an exception
                migrate_existing_data()
                
                # Should have empty database
                assert Category.query.count() == 0
                assert Item.query.count() == 0
                assert PriceHistory.query.count() == 0
        
        finally:
            src.config.Config.DATABASE_PATH = original_path
    
    def test_migrate_duplicate_prevention(self):
        """Test that migration prevents duplicate entries."""
        old_db_fd, old_db_path = tempfile.mkstemp()
        new_db_fd, new_db_path = tempfile.mkstemp()
        
        try:
            self.create_old_database(old_db_path)
            
            # Override config BEFORE creating app
            import src.config
            original_path = src.config.Config.DATABASE_PATH
            src.config.Config.DATABASE_PATH = old_db_path
            
            # Create minimal Flask app
            from flask import Flask
            from flask_cors import CORS
            from src.models.database import db
            
            app = Flask(__name__)
            app.config['TESTING'] = True
            app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{new_db_path}'
            app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
            
            CORS(app)
            db.init_app(app)
            
            with app.app_context():
                db.create_all()
                
                # First migration
                migrate_existing_data()
                first_count = Category.query.count()
                
                # Second migration (should not create duplicates)
                migrate_existing_data()
                second_count = Category.query.count()
                
                assert first_count == second_count
                assert first_count == 2  # Should still be 2 categories
            
            src.config.Config.DATABASE_PATH = original_path
            
        finally:
            os.close(old_db_fd)
            os.close(new_db_fd)
            os.unlink(old_db_path)
            os.unlink(new_db_path)