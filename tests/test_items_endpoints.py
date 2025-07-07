"""
Comprehensive tests for items endpoints to improve coverage.
"""

import json
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from src.models.database import Category, Item, PriceHistory, db


class TestItemsEndpoints:
    """Test all items endpoints comprehensively."""

    def test_update_item(self, sqlalchemy_app, sqlalchemy_client):
        """Test updating an item."""
        with sqlalchemy_app.app_context():
            # Get existing item
            item = Item.query.filter_by(name="The Great Gatsby by F. Scott Fitzgerald").first()
            item_id = item.id

            # Update the item
            update_data = {
                "name": "The Great Gatsby - Updated",
                "url": "https://example.com/gatsby-updated",
                "price": 15.99,
                "title": "The Great Gatsby",
                "author": "F. Scott Fitzgerald",
                "trackId": "book123-updated",
            }

            response = sqlalchemy_client.put(
                f"/api/items/{item_id}",
                data=json.dumps(update_data),
                content_type="application/json",
            )

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["name"] == "The Great Gatsby - Updated"
            assert data["price"] == 15.99
            assert data["externalId"] == "book123-updated"
            assert data["lastUpdated"] is not None

    def test_update_item_not_found(self, sqlalchemy_app, sqlalchemy_client):
        """Test updating a non-existent item."""
        with sqlalchemy_app.app_context():
            update_data = {
                "name": "Non-existent",
                "url": "https://example.com/none",
                "price": 10.00,
            }

            response = sqlalchemy_client.put(
                "/api/items/99999",
                data=json.dumps(update_data),
                content_type="application/json",
            )

            assert response.status_code == 404
            data = json.loads(response.data)
            assert "error" in data

    def test_update_item_invalid_price(self, sqlalchemy_app, sqlalchemy_client):
        """Test updating an item with invalid price."""
        with sqlalchemy_app.app_context():
            item = Item.query.first()

            update_data = {
                "name": "Test",
                "url": "https://example.com/test",
                "price": "invalid",
            }

            response = sqlalchemy_client.put(
                f"/api/items/{item.id}",
                data=json.dumps(update_data),
                content_type="application/json",
            )

            assert response.status_code == 400
            data = json.loads(response.data)
            assert "Invalid price format" in data["error"]

    def test_update_item_missing_fields(self, sqlalchemy_app, sqlalchemy_client):
        """Test updating an item with missing required fields."""
        with sqlalchemy_app.app_context():
            item = Item.query.first()

            update_data = {
                "name": "Test"
                # Missing url and price
            }

            response = sqlalchemy_client.put(
                f"/api/items/{item.id}",
                data=json.dumps(update_data),
                content_type="application/json",
            )

            assert response.status_code == 400
            data = json.loads(response.data)
            assert "Name, URL, and price are required" in data["error"]

    def test_delete_item(self, sqlalchemy_app, sqlalchemy_client):
        """Test deleting an item."""
        with sqlalchemy_app.app_context():
            # Create a new item to delete
            category = Category.query.first()
            item = Item(
                category_id=category.id,
                name="Item to Delete",
                url="https://example.com/delete",
                price=10.00,
            )
            db.session.add(item)
            db.session.commit()
            item_id = item.id

            # Delete the item
            response = sqlalchemy_client.delete(f"/api/items/{item_id}")

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["success"] is True

            # Verify item is deleted
            deleted_item = Item.query.get(item_id)
            assert deleted_item is None

    def test_delete_item_not_found(self, sqlalchemy_app, sqlalchemy_client):
        """Test deleting a non-existent item."""
        with sqlalchemy_app.app_context():
            response = sqlalchemy_client.delete("/api/items/99999")

            assert response.status_code == 404
            data = json.loads(response.data)
            assert "error" in data

    def test_toggle_item_bought(self, sqlalchemy_app, sqlalchemy_client):
        """Test toggling item bought status."""
        with sqlalchemy_app.app_context():
            # Get an unbought item
            item = Item.query.filter_by(bought=False).first()
            item_id = item.id

            # Toggle to bought
            response = sqlalchemy_client.patch(f"/api/items/{item_id}/bought")

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["bought"] is True

            # Toggle back to unbought
            response = sqlalchemy_client.patch(f"/api/items/{item_id}/bought")

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["bought"] is False

    def test_toggle_item_bought_not_found(self, sqlalchemy_app, sqlalchemy_client):
        """Test toggling bought status for non-existent item."""
        with sqlalchemy_app.app_context():
            response = sqlalchemy_client.patch("/api/items/99999/bought")

            assert response.status_code == 404
            data = json.loads(response.data)
            assert "error" in data

    @patch("src.services.movie_search.get_movie_by_track_id")
    def test_refresh_item_price_with_track_id(self, mock_get_movie, sqlalchemy_app, sqlalchemy_client):
        """Test refreshing movie price with track ID."""
        with sqlalchemy_app.app_context():
            # Get the movie item
            movie_item = Item.query.filter_by(name="Inception (2010)").first()
            old_price = movie_item.price

            # Mock the movie search response
            mock_get_movie.return_value = {
                "movie": {
                    "title": "Inception",
                    "price": 14.99,
                    "priceSource": "apple",
                    "trackId": "12345",
                }
            }

            # Refresh the price
            response = sqlalchemy_client.patch(f"/api/items/{movie_item.id}/refresh-price")

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["price"] == 14.99
            assert data["priceRefresh"]["oldPrice"] == old_price
            assert data["priceRefresh"]["newPrice"] == 14.99
            assert data["priceRefresh"]["updated"] is True
            assert data["priceRefresh"]["source"] == "apple"

            # Verify price history was saved
            history = (
                PriceHistory.query.filter_by(item_id=movie_item.id).order_by(PriceHistory.created_at.desc()).first()
            )
            assert history is not None
            assert history.old_price == old_price
            assert history.new_price == 14.99

    @patch("src.services.movie_search.search_apple_movies")
    def test_refresh_item_price_without_track_id(self, mock_search, sqlalchemy_app, sqlalchemy_client):
        """Test refreshing movie price without track ID."""
        with sqlalchemy_app.app_context():
            # Create a movie item without external_id
            movie_category = Category.query.filter_by(type="movies").first()
            movie_item = Item(
                category_id=movie_category.id,
                name="Test Movie",
                title="Test Movie",
                url="https://example.com/movie",
                price=9.99,
                external_id=None,
            )
            db.session.add(movie_item)
            db.session.commit()

            # Mock the search response
            mock_search.return_value = {
                "movies": [
                    {
                        "title": "Test Movie",
                        "price": 12.99,
                        "priceSource": "apple",
                        "trackId": "67890",
                    }
                ]
            }

            # Refresh the price
            response = sqlalchemy_client.patch(f"/api/items/{movie_item.id}/refresh-price")

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["price"] == 12.99
            assert data["priceRefresh"]["updated"] is True

    @patch("src.services.book_search.search_google_books")
    def test_refresh_book_price(self, mock_search, sqlalchemy_app, sqlalchemy_client):
        """Test refreshing book price."""
        with sqlalchemy_app.app_context():
            # Get the book item
            book_item = Item.query.filter_by(name="The Great Gatsby by F. Scott Fitzgerald").first()

            # Mock the book search response
            mock_search.return_value = {
                "books": [
                    {
                        "title": "The Great Gatsby",
                        "authors": ["F. Scott Fitzgerald"],
                        "price": 11.99,
                    }
                ]
            }

            # Refresh the price
            response = sqlalchemy_client.patch(f"/api/items/{book_item.id}/refresh-price")

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["price"] == 11.99
            assert data["priceRefresh"]["source"] == "google_books"

    def test_refresh_general_item_price(self, sqlalchemy_app, sqlalchemy_client):
        """Test refreshing general item price (no update)."""
        with sqlalchemy_app.app_context():
            # Get the electronics item
            electronics_item = Item.query.filter_by(name="iPhone 15").first()
            old_price = electronics_item.price

            # Refresh the price (should not change for general items)
            response = sqlalchemy_client.patch(f"/api/items/{electronics_item.id}/refresh-price")

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["price"] == old_price
            assert data["priceRefresh"]["updated"] is False
            assert data["priceRefresh"]["source"] == "no_update"

    def test_refresh_item_price_not_found(self, sqlalchemy_app, sqlalchemy_client):
        """Test refreshing price for non-existent item."""
        with sqlalchemy_app.app_context():
            response = sqlalchemy_client.patch("/api/items/99999/refresh-price")

            assert response.status_code == 404
            data = json.loads(response.data)
            assert "error" in data

    @patch("src.services.movie_search.get_movie_by_track_id")
    def test_refresh_price_with_exception(self, mock_get_movie, sqlalchemy_app, sqlalchemy_client):
        """Test refresh price error handling."""
        with sqlalchemy_app.app_context():
            movie_item = Item.query.filter_by(name="Inception (2010)").first()

            # Mock an exception
            mock_get_movie.side_effect = Exception("API Error")

            response = sqlalchemy_client.patch(f"/api/items/{movie_item.id}/refresh-price")

            assert response.status_code == 500
            data = json.loads(response.data)
            assert "Failed to refresh item price" in data["error"]

    def test_get_price_history_with_multiple_entries(self, sqlalchemy_app, sqlalchemy_client):
        """Test getting price history with multiple entries."""
        with sqlalchemy_app.app_context():
            # Create an item with multiple price history entries
            category = Category.query.first()
            item = Item(
                category_id=category.id,
                name="Price History Test",
                url="https://example.com/history",
                price=20.00,
            )
            db.session.add(item)
            db.session.commit()

            # Add multiple price history entries
            for i in range(3):
                history = PriceHistory(
                    item_id=item.id,
                    old_price=20.00 + i,
                    new_price=21.00 + i,
                    price_source="test",
                    search_query=f"test query {i}",
                )
                db.session.add(history)
            db.session.commit()

            # Get price history
            response = sqlalchemy_client.get(f"/api/items/{item.id}/price-history")

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["itemId"] == item.id
            assert data["itemName"] == "Price History Test"
            assert len(data["priceHistory"]) == 3

            # Verify history is in ascending order
            for i in range(3):
                assert data["priceHistory"][i]["oldPrice"] == 20.00 + i
                assert data["priceHistory"][i]["newPrice"] == 21.00 + i
