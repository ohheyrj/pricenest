"""
Tests for API endpoints using SQLAlchemy models.
"""

import pytest
import json
from src.models.database import db, Category, Item, PriceHistory
from tests.conftest_sqlalchemy import sqlalchemy_app, sqlalchemy_client, db_session


class TestCategoriesAPI:
    """Test Categories API endpoints with SQLAlchemy."""
    
    def test_get_categories(self, sqlalchemy_app, sqlalchemy_client):
        """Test GET /api/categories endpoint."""
        with sqlalchemy_app.app_context():
            response = sqlalchemy_client.get('/api/categories')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert isinstance(data, list)
            assert len(data) >= 3  # From test data
            
            # Check structure of first category
            category = data[0]
            assert 'id' in category
            assert 'name' in category
            assert 'type' in category
            assert 'bookLookupEnabled' in category
            assert 'bookLookupSource' in category
            assert 'items' in category
    
    def test_create_category(self, sqlalchemy_app, sqlalchemy_client):
        """Test POST /api/categories endpoint."""
        with sqlalchemy_app.app_context():
            new_category = {
                'name': 'Science Fiction',
                'type': 'books',
                'bookLookupEnabled': True,
                'bookLookupSource': 'google_books'
            }
            
            response = sqlalchemy_client.post(
                '/api/categories',
                data=json.dumps(new_category),
                content_type='application/json'
            )
            
            assert response.status_code == 201
            data = json.loads(response.data)
            
            assert data['name'] == 'Science Fiction'
            assert data['type'] == 'books'
            assert data['bookLookupEnabled'] is True
            assert data['bookLookupSource'] == 'google_books'
            assert 'id' in data
    
    def test_create_category_auto_enable_book_lookup(self, sqlalchemy_app, sqlalchemy_client):
        """Test that book lookup is auto-enabled for book categories."""
        with sqlalchemy_app.app_context():
            new_category = {
                'name': 'Fiction',
                'type': 'books',
                'bookLookupEnabled': False  # Should be overridden
            }
            
            response = sqlalchemy_client.post(
                '/api/categories',
                data=json.dumps(new_category),
                content_type='application/json'
            )
            
            assert response.status_code == 201
            data = json.loads(response.data)
            
            assert data['bookLookupEnabled'] is True  # Should be auto-enabled
    
    def test_update_category(self, sqlalchemy_app, sqlalchemy_client, db_session):
        """Test PUT /api/categories/{id} endpoint."""
        with sqlalchemy_app.app_context():
            # Create a category to update
            category = Category(name='Original Name', type='general')
            db_session.add(category)
            db_session.commit()
            
            updated_data = {
                'name': 'Updated Name',
                'type': 'movies',
                'bookLookupEnabled': False,
                'bookLookupSource': 'auto'
            }
            
            response = sqlalchemy_client.put(
                f'/api/categories/{category.id}',
                data=json.dumps(updated_data),
                content_type='application/json'
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert data['name'] == 'Updated Name'
            assert data['type'] == 'movies'
    
    def test_delete_category(self, sqlalchemy_app, sqlalchemy_client, db_session):
        """Test DELETE /api/categories/{id} endpoint."""
        with sqlalchemy_app.app_context():
            # Create a category to delete
            category = Category(name='To Delete', type='general')
            db_session.add(category)
            db_session.commit()
            category_id = category.id
            
            response = sqlalchemy_client.delete(f'/api/categories/{category_id}')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] is True
            
            # Verify category is deleted
            deleted_category = Category.query.get(category_id)
            assert deleted_category is None
    
    def test_create_category_missing_name(self, sqlalchemy_app, sqlalchemy_client):
        """Test creating category without required name field."""
        with sqlalchemy_app.app_context():
            invalid_category = {
                'type': 'books'
                # Missing 'name' field
            }
            
            response = sqlalchemy_client.post(
                '/api/categories',
                data=json.dumps(invalid_category),
                content_type='application/json'
            )
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert 'error' in data


class TestItemsAPI:
    """Test Items API endpoints with SQLAlchemy."""
    
    def test_create_item(self, sqlalchemy_app, sqlalchemy_client, db_session):
        """Test POST /api/categories/{id}/items endpoint."""
        with sqlalchemy_app.app_context():
            # Create a category first
            category = Category(name='Test Books', type='books')
            db_session.add(category)
            db_session.commit()
            
            new_item = {
                'name': 'Test Book by Test Author',
                'title': 'Test Book',
                'author': 'Test Author',
                'url': 'https://example.com/test-book',
                'price': 19.99
            }
            
            response = sqlalchemy_client.post(
                f'/api/categories/{category.id}/items',
                data=json.dumps(new_item),
                content_type='application/json'
            )
            
            assert response.status_code == 201
            data = json.loads(response.data)
            
            assert data['name'] == 'Test Book by Test Author'
            assert data['title'] == 'Test Book'
            assert data['author'] == 'Test Author'
            assert data['price'] == 19.99
            assert data['categoryId'] == category.id
            assert data['bought'] is False
            assert 'id' in data
    
    def test_create_item_with_external_id(self, sqlalchemy_app, sqlalchemy_client, db_session):
        """Test creating item with external tracking ID."""
        with sqlalchemy_app.app_context():
            category = Category(name='Test Movies', type='movies')
            db_session.add(category)
            db_session.commit()
            
            new_item = {
                'name': 'Test Movie (2023)',
                'title': 'Test Movie',
                'director': 'Test Director',
                'year': 2023,
                'url': 'https://example.com/test-movie',
                'price': 12.99,
                'trackId': 'itunes123456'  # External ID
            }
            
            response = sqlalchemy_client.post(
                f'/api/categories/{category.id}/items',
                data=json.dumps(new_item),
                content_type='application/json'
            )
            
            assert response.status_code == 201
            data = json.loads(response.data)
            
            assert data['externalId'] == 'itunes123456'
            assert data['director'] == 'Test Director'
            assert data['year'] == 2023
    
    def test_create_item_auto_parse_book_name(self, sqlalchemy_app, sqlalchemy_client, db_session):
        """Test auto-parsing of book title and author from name."""
        with sqlalchemy_app.app_context():
            category = Category(name='Books', type='books')
            db_session.add(category)
            db_session.commit()
            
            new_item = {
                'name': 'Dune by Frank Herbert',  # Should auto-parse
                'url': 'https://example.com/dune',
                'price': 16.99
                # No explicit title/author provided
            }
            
            response = sqlalchemy_client.post(
                f'/api/categories/{category.id}/items',
                data=json.dumps(new_item),
                content_type='application/json'
            )
            
            assert response.status_code == 201
            data = json.loads(response.data)
            
            assert data['title'] == 'Dune'
            assert data['author'] == 'Frank Herbert'
    
    def test_create_item_invalid_category(self, sqlalchemy_app, sqlalchemy_client):
        """Test creating item with non-existent category."""
        with sqlalchemy_app.app_context():
            new_item = {
                'name': 'Test Item',
                'url': 'https://example.com/test',
                'price': 10.99
            }
            
            response = sqlalchemy_client.post(
                '/api/categories/99999/items',  # Non-existent category
                data=json.dumps(new_item),
                content_type='application/json'
            )
            
            assert response.status_code == 404
    
    def test_create_item_missing_required_fields(self, sqlalchemy_app, sqlalchemy_client, db_session):
        """Test creating item without required fields."""
        with sqlalchemy_app.app_context():
            category = Category(name='Test', type='general')
            db_session.add(category)
            db_session.commit()
            
            invalid_item = {
                'name': 'Test Item'
                # Missing 'url' and 'price'
            }
            
            response = sqlalchemy_client.post(
                f'/api/categories/{category.id}/items',
                data=json.dumps(invalid_item),
                content_type='application/json'
            )
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert 'error' in data
    
    def test_create_item_invalid_price(self, sqlalchemy_app, sqlalchemy_client, db_session):
        """Test creating item with invalid price format."""
        with sqlalchemy_app.app_context():
            category = Category(name='Test', type='general')
            db_session.add(category)
            db_session.commit()
            
            invalid_item = {
                'name': 'Test Item',
                'url': 'https://example.com/test',
                'price': 'not-a-number'
            }
            
            response = sqlalchemy_client.post(
                f'/api/categories/{category.id}/items',
                data=json.dumps(invalid_item),
                content_type='application/json'
            )
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert 'Invalid price format' in data['error']


class TestPriceHistoryAPI:
    """Test Price History API endpoints with SQLAlchemy."""
    
    def test_get_price_history_empty(self, sqlalchemy_app, sqlalchemy_client, db_session):
        """Test getting price history for item with no history."""
        with sqlalchemy_app.app_context():
            # Create item without price history
            category = Category(name='Test', type='general')
            db_session.add(category)
            db_session.commit()
            
            item = Item(
                category_id=category.id,
                name='Test Item',
                url='https://example.com/test',
                price=10.99
            )
            db_session.add(item)
            db_session.commit()
            
            response = sqlalchemy_client.get(f'/api/items/{item.id}/price-history')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert data['itemId'] == item.id
            assert data['itemName'] == 'Test Item'
            assert data['priceHistory'] == []
    
    def test_get_price_history_with_data(self, sqlalchemy_app, sqlalchemy_client, db_session):
        """Test getting price history for item with history."""
        with sqlalchemy_app.app_context():
            category = Category(name='Test', type='books')
            db_session.add(category)
            db_session.commit()
            
            item = Item(
                category_id=category.id,
                name='Test Book',
                url='https://example.com/test',
                price=10.99
            )
            db_session.add(item)
            db_session.commit()
            
            # Add price history
            history1 = PriceHistory(
                item_id=item.id,
                old_price=15.99,
                new_price=12.99,
                price_source='google_books',
                search_query='test book'
            )
            history2 = PriceHistory(
                item_id=item.id,
                old_price=12.99,
                new_price=10.99,
                price_source='google_books',
                search_query='test book'
            )
            
            db_session.add_all([history1, history2])
            db_session.commit()
            
            response = sqlalchemy_client.get(f'/api/items/{item.id}/price-history')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert data['itemId'] == item.id
            assert data['itemName'] == 'Test Book'
            assert len(data['priceHistory']) == 2
            
            # Check first history entry
            first_entry = data['priceHistory'][0]
            assert first_entry['oldPrice'] == 15.99
            assert first_entry['newPrice'] == 12.99
            assert first_entry['priceSource'] == 'google_books'
            assert 'date' in first_entry
    
    def test_get_price_history_nonexistent_item(self, sqlalchemy_app, sqlalchemy_client):
        """Test getting price history for non-existent item."""
        with sqlalchemy_app.app_context():
            response = sqlalchemy_client.get('/api/items/99999/price-history')
            
            assert response.status_code == 404


class TestDatabaseIntegration:
    """Test database integration and transactions."""
    
    def test_rollback_on_error(self, sqlalchemy_app, sqlalchemy_client, db_session):
        """Test that database rollback works on errors."""
        with sqlalchemy_app.app_context():
            initial_count = Category.query.count()
            
            # Try to create category with invalid data that causes an error
            # This should trigger a rollback
            invalid_category = {
                'name': '',  # Empty name should cause validation error
                'type': 'books'
            }
            
            response = sqlalchemy_client.post(
                '/api/categories',
                data=json.dumps(invalid_category),
                content_type='application/json'
            )
            
            assert response.status_code == 400
            
            # Count should be unchanged due to rollback
            final_count = Category.query.count()
            assert final_count == initial_count
    
    def test_relationships_maintained(self, sqlalchemy_app, sqlalchemy_client, db_session):
        """Test that relationships are properly maintained."""
        with sqlalchemy_app.app_context():
            # Create category
            category_data = {
                'name': 'Test Relationships',
                'type': 'books'
            }
            
            cat_response = sqlalchemy_client.post(
                '/api/categories',
                data=json.dumps(category_data),
                content_type='application/json'
            )
            
            assert cat_response.status_code == 201
            category_id = json.loads(cat_response.data)['id']
            
            # Create item in category
            item_data = {
                'name': 'Test Item',
                'url': 'https://example.com/test',
                'price': 15.99
            }
            
            item_response = sqlalchemy_client.post(
                f'/api/categories/{category_id}/items',
                data=json.dumps(item_data),
                content_type='application/json'
            )
            
            assert item_response.status_code == 201
            item_id = json.loads(item_response.data)['id']
            
            # Verify relationships
            category = Category.query.get(category_id)
            item = Item.query.get(item_id)
            
            assert len(category.items) == 1
            assert category.items[0].id == item_id
            assert item.category.id == category_id