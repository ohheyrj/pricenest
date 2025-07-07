"""
Tests for main routes and additional category endpoints.
"""

import pytest
import json
from src.models.database import db, Category, Item


class TestMainRoutes:
    """Test main application routes."""

    def test_index_route(self, sqlalchemy_app, sqlalchemy_client):
        """Test the index route."""
        with sqlalchemy_app.app_context():
            response = sqlalchemy_client.get("/")

            assert response.status_code == 200
            # Check if it's returning HTML
            assert b"<!DOCTYPE html>" in response.data or b"<html" in response.data

    def test_database_config_route(self, sqlalchemy_app, sqlalchemy_client):
        """Test the database config route."""
        with sqlalchemy_app.app_context():
            response = sqlalchemy_client.get("/api/database/config")

            assert response.status_code == 200
            data = json.loads(response.data)
            assert "databasePath" in data
            assert data["databasePath"].endswith(".db")


class TestAdditionalCategoryEndpoints:
    """Test additional category endpoints for better coverage."""

    def test_get_categories_with_items(self, sqlalchemy_app, sqlalchemy_client):
        """Test getting categories with their items."""
        with sqlalchemy_app.app_context():
            response = sqlalchemy_client.get("/api/categories")

            assert response.status_code == 200
            data = json.loads(response.data)

            # Find a category with items
            books_category = next(c for c in data if c["name"] == "Test Books")
            assert books_category is not None
            assert len(books_category["items"]) > 0

            # Verify item structure
            item = books_category["items"][0]
            assert "id" in item
            assert "name" in item
            assert "price" in item

    def test_update_category_type_change(self, sqlalchemy_app, sqlalchemy_client):
        """Test updating category type."""
        with sqlalchemy_app.app_context():
            # Create a new category
            new_category = {"name": "Type Change Test", "type": "general"}

            response = sqlalchemy_client.post(
                "/api/categories",
                data=json.dumps(new_category),
                content_type="application/json",
            )
            category_id = json.loads(response.data)["id"]

            # Update the type
            update_data = {
                "name": "Type Change Test",
                "type": "books",
                "bookLookupEnabled": True,
            }

            response = sqlalchemy_client.put(
                f"/api/categories/{category_id}",
                data=json.dumps(update_data),
                content_type="application/json",
            )

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["type"] == "books"
            assert data["bookLookupEnabled"] is True

    def test_update_category_book_lookup_settings(self, sqlalchemy_app, sqlalchemy_client):
        """Test updating book lookup settings."""
        with sqlalchemy_app.app_context():
            # Get a book category
            books_category = Category.query.filter_by(type="books").first()

            # Update book lookup settings
            update_data = {
                "name": books_category.name,
                "type": "books",
                "bookLookupEnabled": False,
                "bookLookupSource": "kobo",
            }

            response = sqlalchemy_client.put(
                f"/api/categories/{books_category.id}",
                data=json.dumps(update_data),
                content_type="application/json",
            )

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["bookLookupEnabled"] is False
            assert data["bookLookupSource"] == "kobo"

    def test_update_category_invalid_data(self, sqlalchemy_app, sqlalchemy_client):
        """Test updating category with invalid data."""
        with sqlalchemy_app.app_context():
            category = Category.query.first()

            # Try to update without name
            update_data = {"type": "books"}

            response = sqlalchemy_client.put(
                f"/api/categories/{category.id}",
                data=json.dumps(update_data),
                content_type="application/json",
            )

            assert response.status_code == 400
            data = json.loads(response.data)
            assert "error" in data

    def test_delete_category_with_items(self, sqlalchemy_app, sqlalchemy_client):
        """Test deleting a category with items."""
        with sqlalchemy_app.app_context():
            # Create a category with items
            category = Category(name="Delete Test", type="general")
            db.session.add(category)
            db.session.commit()

            # Add an item
            item = Item(
                category_id=category.id,
                name="Test Item",
                url="https://example.com/test",
                price=10.00,
            )
            db.session.add(item)
            db.session.commit()

            category_id = category.id
            item_id = item.id

            # Delete the category
            response = sqlalchemy_client.delete(f"/api/categories/{category_id}")

            assert response.status_code == 200

            # Verify category and items are deleted
            assert Category.query.get(category_id) is None
            assert Item.query.get(item_id) is None

    def test_create_category_with_invalid_type(self, sqlalchemy_app, sqlalchemy_client):
        """Test creating category with invalid type."""
        with sqlalchemy_app.app_context():
            new_category = {"name": "Invalid Type", "type": "invalid_type"}

            response = sqlalchemy_client.post(
                "/api/categories",
                data=json.dumps(new_category),
                content_type="application/json",
            )

            # Should still create but default to 'general'
            assert response.status_code == 201
            data = json.loads(response.data)
            assert data["type"] == "general"

    def test_category_item_count(self, sqlalchemy_app, sqlalchemy_client):
        """Test that category item counts are correct."""
        with sqlalchemy_app.app_context():
            # Create a category
            category = Category(name="Count Test", type="general")
            db.session.add(category)
            db.session.commit()

            # Add multiple items
            for i in range(3):
                item = Item(
                    category_id=category.id,
                    name=f"Item {i}",
                    url=f"https://example.com/item{i}",
                    price=10.00 + i,
                )
                db.session.add(item)
            db.session.commit()

            # Get categories
            response = sqlalchemy_client.get("/api/categories")

            assert response.status_code == 200
            data = json.loads(response.data)

            # Find our category
            test_category = next(c for c in data if c["name"] == "Count Test")
            assert len(test_category["items"]) == 3
