"""
Tests for SQLAlchemy database models.
"""

import pytest
from datetime import datetime
from src.models.database import db, Category, Item, PriceHistory, PendingMovieSearch
from tests.conftest_sqlalchemy import sqlalchemy_app, db_session


class TestCategoryModel:
    """Test Category model functionality."""

    def test_create_category(self, sqlalchemy_app, db_session):
        """Test creating a new category."""
        with sqlalchemy_app.app_context():
            category = Category(
                name="Test Category",
                type="books",
                book_lookup_enabled=True,
                book_lookup_source="google_books",
            )

            db_session.add(category)
            db_session.commit()

            assert category.id is not None
            assert category.name == "Test Category"
            assert category.type == "books"
            assert category.book_lookup_enabled is True
            assert category.book_lookup_source == "google_books"
            assert category.created_at is not None

    def test_category_to_dict(self, sqlalchemy_app, db_session):
        """Test category to_dict method."""
        with sqlalchemy_app.app_context():
            category = Category(
                name="Test Category",
                type="movies",
                book_lookup_enabled=False,
                book_lookup_source="auto",
            )

            db_session.add(category)
            db_session.commit()

            result = category.to_dict()

            assert result["id"] == category.id
            assert result["name"] == "Test Category"
            assert result["type"] == "movies"
            assert result["bookLookupEnabled"] is False
            assert result["bookLookupSource"] == "auto"
            assert result["items"] == []

    def test_category_relationships(self, sqlalchemy_app, db_session):
        """Test category relationships with items."""
        with sqlalchemy_app.app_context():
            category = Category(name="Test Category", type="general")
            db_session.add(category)
            db_session.commit()

            item = Item(
                category_id=category.id,
                name="Test Item",
                url="https://example.com/test",
                price=10.99,
            )
            db_session.add(item)
            db_session.commit()

            # Test relationship
            assert len(category.items) == 1
            assert category.items[0].name == "Test Item"
            assert item.category.name == "Test Category"

    def test_category_cascade_delete(self, sqlalchemy_app, db_session):
        """Test that deleting a category deletes its items."""
        with sqlalchemy_app.app_context():
            category = Category(name="Test Category", type="general")
            db_session.add(category)
            db_session.commit()

            item = Item(
                category_id=category.id,
                name="Test Item",
                url="https://example.com/test",
                price=10.99,
            )
            db_session.add(item)
            db_session.commit()

            item_id = item.id

            # Delete category
            db_session.delete(category)
            db_session.commit()

            # Item should be deleted too
            deleted_item = Item.query.get(item_id)
            assert deleted_item is None


class TestItemModel:
    """Test Item model functionality."""

    def test_create_item(self, sqlalchemy_app, db_session):
        """Test creating a new item."""
        with sqlalchemy_app.app_context():
            category = Category(name="Test Category", type="books")
            db_session.add(category)
            db_session.commit()

            item = Item(
                category_id=category.id,
                name="Test Book by Test Author",
                title="Test Book",
                author="Test Author",
                url="https://example.com/test",
                price=15.99,
                bought=False,
                external_id="test123",
            )

            db_session.add(item)
            db_session.commit()

            assert item.id is not None
            assert item.name == "Test Book by Test Author"
            assert item.title == "Test Book"
            assert item.author == "Test Author"
            assert item.price == 15.99
            assert item.bought is False
            assert item.external_id == "test123"
            assert item.created_at is not None

    def test_item_to_dict(self, sqlalchemy_app, db_session):
        """Test item to_dict method."""
        with sqlalchemy_app.app_context():
            category = Category(name="Test Category", type="movies")
            db_session.add(category)
            db_session.commit()

            item = Item(
                category_id=category.id,
                name="Test Movie (2023)",
                title="Test Movie",
                director="Test Director",
                year=2023,
                url="https://example.com/movie",
                price=12.99,
                bought=True,
                external_id="movie123",
            )

            db_session.add(item)
            db_session.commit()

            result = item.to_dict()

            assert result["id"] == item.id
            assert result["categoryId"] == category.id
            assert result["name"] == "Test Movie (2023)"
            assert result["title"] == "Test Movie"
            assert result["director"] == "Test Director"
            assert result["year"] == 2023
            assert result["price"] == 12.99
            assert result["bought"] is True
            assert result["externalId"] == "movie123"

    def test_item_relationships(self, sqlalchemy_app, db_session):
        """Test item relationships."""
        with sqlalchemy_app.app_context():
            category = Category(name="Test Category", type="books")
            db_session.add(category)
            db_session.commit()

            item = Item(
                category_id=category.id,
                name="Test Item",
                url="https://example.com/test",
                price=10.99,
            )
            db_session.add(item)
            db_session.commit()

            # Test category relationship
            assert item.category.name == "Test Category"

            # Test price history relationship
            price_change = PriceHistory(
                item_id=item.id,
                old_price=12.99,
                new_price=10.99,
                price_source="test",
                search_query="test query",
            )
            db_session.add(price_change)
            db_session.commit()

            assert len(item.price_history) == 1
            assert item.price_history[0].old_price == 12.99


class TestPriceHistoryModel:
    """Test PriceHistory model functionality."""

    def test_create_price_history(self, sqlalchemy_app, db_session):
        """Test creating price history entry."""
        with sqlalchemy_app.app_context():
            category = Category(name="Test Category", type="books")
            db_session.add(category)
            db_session.commit()

            item = Item(
                category_id=category.id,
                name="Test Item",
                url="https://example.com/test",
                price=10.99,
            )
            db_session.add(item)
            db_session.commit()

            price_history = PriceHistory(
                item_id=item.id,
                old_price=12.99,
                new_price=10.99,
                price_source="google_books",
                search_query="test book search",
            )

            db_session.add(price_history)
            db_session.commit()

            assert price_history.id is not None
            assert price_history.item_id == item.id
            assert price_history.old_price == 12.99
            assert price_history.new_price == 10.99
            assert price_history.price_source == "google_books"
            assert price_history.search_query == "test book search"
            assert price_history.created_at is not None

    def test_price_history_to_dict(self, sqlalchemy_app, db_session):
        """Test price history to_dict method."""
        with sqlalchemy_app.app_context():

            price_history = PriceHistory(
                item_id=1,  # Will reference existing test item
                old_price=15.99,
                new_price=12.99,
                price_source="apple",
                search_query="test movie search",
            )

            db_session.add(price_history)
            db_session.commit()

            result = price_history.to_dict()

            assert result["oldPrice"] == 15.99
            assert result["newPrice"] == 12.99
            assert result["priceSource"] == "apple"
            assert result["searchQuery"] == "test movie search"
            assert result["date"] is not None

    def test_price_history_cascade_delete(self, sqlalchemy_app, db_session):
        """Test that deleting an item deletes its price history."""
        with sqlalchemy_app.app_context():
            category = Category(name="Test Category", type="books")
            db_session.add(category)
            db_session.commit()

            item = Item(
                category_id=category.id,
                name="Test Item",
                url="https://example.com/test",
                price=10.99,
            )
            db_session.add(item)
            db_session.commit()

            price_history = PriceHistory(
                item_id=item.id,
                old_price=12.99,
                new_price=10.99,
                price_source="test",
                search_query="test query",
            )
            db_session.add(price_history)
            db_session.commit()

            history_id = price_history.id

            # Delete item
            db_session.delete(item)
            db_session.commit()

            # Price history should be deleted too
            deleted_history = PriceHistory.query.get(history_id)
            assert deleted_history is None


class TestPendingMovieSearchModel:
    """Test PendingMovieSearch model functionality."""

    def test_create_pending_search(self, sqlalchemy_app, db_session):
        """Test creating a pending movie search."""
        with sqlalchemy_app.app_context():
            category = Category(name="Movies", type="movies")
            db_session.add(category)
            db_session.commit()

            pending_search = PendingMovieSearch(
                category_id=category.id,
                title="Test Movie",
                director="Test Director",
                year=2023,
                csv_row_data="Test Movie,Test Director,2023",
                status="pending",
                retry_count=0,
            )

            db_session.add(pending_search)
            db_session.commit()

            assert pending_search.id is not None
            assert pending_search.title == "Test Movie"
            assert pending_search.director == "Test Director"
            assert pending_search.year == 2023
            assert pending_search.status == "pending"
            assert pending_search.retry_count == 0
            assert pending_search.created_at is not None

    def test_pending_search_to_dict(self, sqlalchemy_app, db_session):
        """Test pending search to_dict method."""
        with sqlalchemy_app.app_context():
            category = Category(name="Movies", type="movies")
            db_session.add(category)
            db_session.commit()

            pending_search = PendingMovieSearch(
                category_id=category.id,
                title="Test Movie",
                director="Test Director",
                year=2023,
                status="completed",
                retry_count=1,
            )

            db_session.add(pending_search)
            db_session.commit()

            result = pending_search.to_dict()

            assert result["id"] == pending_search.id
            assert result["categoryId"] == category.id
            assert result["title"] == "Test Movie"
            assert result["director"] == "Test Director"
            assert result["year"] == 2023
            assert result["status"] == "completed"
            assert result["retryCount"] == 1


class TestModelQueries:
    """Test complex queries and relationships."""

    def test_category_with_items_query(self, sqlalchemy_app, db_session):
        """Test querying categories with their items."""
        with sqlalchemy_app.app_context():
            # Test data should already exist from fixtures
            categories = Category.query.all()
            assert len(categories) >= 3  # From test data

            books_category = Category.query.filter_by(type="books").first()
            assert books_category is not None
            assert len(books_category.items) >= 1

    def test_item_with_price_history_query(self, sqlalchemy_app, db_session):
        """Test querying items with price history."""
        with sqlalchemy_app.app_context():
            # Find item with price history
            item_with_history = Item.query.join(PriceHistory).first()
            assert item_with_history is not None
            assert len(item_with_history.price_history) >= 1

    def test_price_history_ordering(self, sqlalchemy_app, db_session):
        """Test price history ordering by date."""
        with sqlalchemy_app.app_context():
            category = Category(name="Test Category", type="books")
            db_session.add(category)
            db_session.commit()

            item = Item(
                category_id=category.id,
                name="Test Item",
                url="https://example.com/test",
                price=10.99,
            )
            db_session.add(item)
            db_session.commit()

            # Add multiple price history entries
            for i, (old, new) in enumerate(
                [(15.99, 12.99), (12.99, 10.99), (10.99, 8.99)]
            ):
                history = PriceHistory(
                    item_id=item.id,
                    old_price=old,
                    new_price=new,
                    price_source="test",
                    search_query=f"query {i}",
                )
                db_session.add(history)

            db_session.commit()

            # Query price history ordered by date
            history = (
                PriceHistory.query.filter_by(item_id=item.id)
                .order_by(PriceHistory.created_at.asc())
                .all()
            )

            assert len(history) == 3
            assert history[0].old_price == 15.99
            assert history[1].old_price == 12.99
            assert history[2].old_price == 10.99
