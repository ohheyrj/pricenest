"""
Test suite for API endpoints.
"""

import json
import pytest


class TestCategoriesAPI:
    """Test category-related API endpoints."""

    def test_get_categories(self, client):
        """Test getting all categories."""
        response = client.get("/api/categories")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert isinstance(data, list)
        assert len(data) >= 2  # We have test data

        # Check category structure
        category = data[0]
        assert "id" in category
        assert "name" in category
        assert "type" in category
        assert "bookLookupEnabled" in category
        assert "items" in category

    def test_create_category(self, client, sample_category_data):
        """Test creating a new category."""
        response = client.post(
            "/api/categories",
            json=sample_category_data,
            content_type="application/json",
        )
        assert response.status_code == 201

        data = json.loads(response.data)
        assert data["name"] == sample_category_data["name"]
        assert data["type"] == sample_category_data["type"]
        assert data["bookLookupEnabled"] == sample_category_data["bookLookupEnabled"]

    def test_create_category_missing_name(self, client):
        """Test creating a category without a name."""
        response = client.post(
            "/api/categories", json={}, content_type="application/json"
        )
        assert response.status_code == 400

        data = json.loads(response.data)
        assert "error" in data

    def test_update_category(self, client):
        """Test updating an existing category."""
        # First create a category
        create_data = {
            "name": "Test Category",
            "type": "general",
            "bookLookupEnabled": False,
            "bookLookupSource": "auto",
        }

        create_response = client.post(
            "/api/categories", json=create_data, content_type="application/json"
        )
        assert create_response.status_code == 201

        created_category = json.loads(create_response.data)
        category_id = created_category["id"]

        # Now update it
        update_data = {
            "name": "Updated Category",
            "type": "books",
            "bookLookupEnabled": True,
            "bookLookupSource": "google_books",
        }

        update_response = client.put(
            f"/api/categories/{category_id}",
            json=update_data,
            content_type="application/json",
        )
        assert update_response.status_code == 200

        updated_category = json.loads(update_response.data)
        assert updated_category["name"] == update_data["name"]
        assert updated_category["type"] == update_data["type"]
        assert updated_category["bookLookupEnabled"] == update_data["bookLookupEnabled"]

    def test_update_nonexistent_category(self, client):
        """Test updating a category that doesn't exist."""
        update_data = {
            "name": "Nonexistent Category",
            "type": "general",
            "bookLookupEnabled": False,
            "bookLookupSource": "auto",
        }

        response = client.put(
            "/api/categories/999", json=update_data, content_type="application/json"
        )
        assert response.status_code == 404

    def test_delete_category(self, client):
        """Test deleting a category."""
        # First create a category
        create_data = {
            "name": "Category to Delete",
            "type": "general",
            "bookLookupEnabled": False,
            "bookLookupSource": "auto",
        }

        create_response = client.post(
            "/api/categories", json=create_data, content_type="application/json"
        )
        assert create_response.status_code == 201

        created_category = json.loads(create_response.data)
        category_id = created_category["id"]

        # Now delete it
        delete_response = client.delete(f"/api/categories/{category_id}")
        assert delete_response.status_code == 200

        # Verify it's deleted
        get_response = client.get("/api/categories")
        categories = json.loads(get_response.data)
        category_ids = [cat["id"] for cat in categories]
        assert category_id not in category_ids

    def test_delete_nonexistent_category(self, client):
        """Test deleting a category that doesn't exist."""
        response = client.delete("/api/categories/999")
        assert response.status_code == 404


class TestItemsAPI:
    """Test item-related API endpoints."""

    def test_create_item(self, client, sample_item_data):
        """Test creating a new item."""
        # Use the first category from test data (Test Books)
        response = client.post(
            "/api/categories/1/items",
            json=sample_item_data,
            content_type="application/json",
        )
        assert response.status_code == 201

        data = json.loads(response.data)
        assert data["name"] == sample_item_data["name"]
        assert data["title"] == sample_item_data["title"]
        assert data["author"] == sample_item_data["author"]
        assert data["price"] == sample_item_data["price"]
        assert data["categoryId"] == 1

    def test_create_item_missing_fields(self, client):
        """Test creating an item with missing required fields."""
        incomplete_data = {
            "name": "Test Item"
            # Missing url and price
        }

        response = client.post(
            "/api/categories/1/items",
            json=incomplete_data,
            content_type="application/json",
        )
        assert response.status_code == 400

        data = json.loads(response.data)
        assert "error" in data

    def test_create_item_nonexistent_category(self, client, sample_item_data):
        """Test creating an item in a category that doesn't exist."""
        response = client.post(
            "/api/categories/999/items",
            json=sample_item_data,
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_update_item(self, client):
        """Test updating an existing item."""
        # Create an item first
        create_data = {
            "name": "Original Item",
            "url": "https://example.com/original",
            "price": 10.99,
        }

        create_response = client.post(
            "/api/categories/1/items", json=create_data, content_type="application/json"
        )
        assert create_response.status_code == 201

        created_item = json.loads(create_response.data)
        item_id = created_item["id"]

        # Update the item
        update_data = {
            "name": "Updated Item",
            "title": "Updated Title",
            "author": "Updated Author",
            "url": "https://example.com/updated",
            "price": 15.99,
        }

        update_response = client.put(
            f"/api/items/{item_id}", json=update_data, content_type="application/json"
        )
        assert update_response.status_code == 200

        updated_item = json.loads(update_response.data)
        assert updated_item["name"] == update_data["name"]
        assert updated_item["title"] == update_data["title"]
        assert updated_item["author"] == update_data["author"]
        assert updated_item["price"] == update_data["price"]

    def test_update_nonexistent_item(self, client):
        """Test updating an item that doesn't exist."""
        update_data = {
            "name": "Nonexistent Item",
            "url": "https://example.com/nonexistent",
            "price": 99.99,
        }

        response = client.put(
            "/api/items/999", json=update_data, content_type="application/json"
        )
        assert response.status_code == 404

    def test_toggle_item_bought(self, client):
        """Test toggling an item's bought status."""
        # Use existing test item (id=1)
        response = client.patch("/api/items/1/bought")
        assert response.status_code == 200

        data = json.loads(response.data)
        # Item should now be bought (was False initially)
        assert data["bought"]

        # Toggle again
        response = client.patch("/api/items/1/bought")
        assert response.status_code == 200

        data = json.loads(response.data)
        # Item should now be unbought
        assert data["bought"] is False

    def test_toggle_nonexistent_item_bought(self, client):
        """Test toggling bought status for an item that doesn't exist."""
        response = client.patch("/api/items/999/bought")
        assert response.status_code == 404

    def test_delete_item(self, client):
        """Test deleting an item."""
        # Create an item first
        create_data = {
            "name": "Item to Delete",
            "url": "https://example.com/delete",
            "price": 5.99,
        }

        create_response = client.post(
            "/api/categories/1/items", json=create_data, content_type="application/json"
        )
        assert create_response.status_code == 201

        created_item = json.loads(create_response.data)
        item_id = created_item["id"]

        # Delete the item
        delete_response = client.delete(f"/api/items/{item_id}")
        assert delete_response.status_code == 200

        # Verify it's deleted by checking categories
        get_response = client.get("/api/categories")
        categories = json.loads(get_response.data)

        # Find the category and check its items
        test_category = next(cat for cat in categories if cat["id"] == 1)
        item_ids = [item["id"] for item in test_category["items"]]
        assert item_id not in item_ids

    def test_delete_nonexistent_item(self, client):
        """Test deleting an item that doesn't exist."""
        response = client.delete("/api/items/999")
        assert response.status_code == 404


class TestBookSearchAPI:
    """Test book search API endpoints."""

    def test_search_books_success(self, client):
        """Test successful book search."""
        response = client.get("/api/books/search?query=python")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert "books" in data
        assert isinstance(data["books"], list)

        if len(data["books"]) > 0:
            book = data["books"][0]
            assert "title" in book
            assert "author" in book
            assert "price" in book
            assert "url" in book
            assert "priceSource" in book

    def test_search_books_missing_query(self, client):
        """Test book search without query parameter."""
        response = client.get("/api/books/search")
        assert response.status_code == 400

        data = json.loads(response.data)
        assert "error" in data

    def test_search_books_with_source(self, client):
        """Test book search with specific source."""
        response = client.get("/api/books/search?query=python&source=google_books")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert "books" in data


class TestDatabaseConfigAPI:
    """Test database configuration API."""

    def test_get_database_config(self, client):
        """Test getting database configuration."""
        response = client.get("/api/database/config")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert "type" in data
        assert "available" in data
        assert data["type"] == "sqlite"
        assert isinstance(data["available"], list)


class TestMainRoutes:
    """Test main application routes."""

    def test_index_route(self, client):
        """Test the main index route."""
        response = client.get("/")
        assert response.status_code == 200
        assert b"Price Tracker" in response.data
        assert b"<html" in response.data
