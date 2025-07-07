"""
Tests for movie endpoints.
"""

import json
from unittest.mock import MagicMock, patch

import pytest

from src.models.database import Category, Item, PendingMovieSearch, db


class TestMoviesEndpoints:
    """Test movie endpoints."""

    @patch("src.routes.movies.search_apple_movies")
    def test_search_movies_success(self, mock_search, sqlalchemy_app, sqlalchemy_client):
        """Test successful movie search."""
        with sqlalchemy_app.app_context():
            # Mock the search response
            mock_search.return_value = {
                "movies": [
                    {
                        "title": "Test Movie",
                        "director": "Test Director",
                        "year": 2023,
                        "price": 14.99,
                        "thumbnail": "https://example.com/movie.jpg",
                        "trackId": "123456",
                        "priceSource": "apple",
                    }
                ],
                "total": 1,
            }

            response = sqlalchemy_client.get("/api/movies/search?q=test")

            assert response.status_code == 200
            data = json.loads(response.data)
            assert "movies" in data
            assert len(data["movies"]) == 1
            assert data["movies"][0]["title"] == "Test Movie"
            assert data["total"] == 1

    def test_search_movies_missing_query(self, sqlalchemy_app, sqlalchemy_client):
        """Test movie search without query parameter."""
        with sqlalchemy_app.app_context():
            response = sqlalchemy_client.get("/api/movies/search")

            assert response.status_code == 400
            data = json.loads(response.data)
            assert "error" in data
            assert "Search query is required" in data["error"]

    @patch("src.routes.movies.search_apple_movies")
    def test_search_movies_with_exception(self, mock_search, sqlalchemy_app, sqlalchemy_client):
        """Test movie search error handling."""
        with sqlalchemy_app.app_context():
            # Mock an exception
            mock_search.side_effect = Exception("API Error")

            response = sqlalchemy_client.get("/api/movies/search?q=test")

            assert response.status_code == 500
            data = json.loads(response.data)
            assert "error" in data
            assert "Failed to search movies" in data["error"]

    def test_create_batch_search(self, sqlalchemy_app, sqlalchemy_client):
        """Test creating a batch movie search."""
        with sqlalchemy_app.app_context():
            # Get a movie category
            category = Category.query.filter_by(type="movies").first()

            # Create batch search data
            batch_data = {
                "category_id": category.id,
                "movies": [
                    {"title": "Movie 1", "director": "Director 1", "year": 2021},
                    {"title": "Movie 2", "director": "Director 2", "year": 2022},
                ],
            }

            response = sqlalchemy_client.post(
                "/api/movies/batch-search",
                data=json.dumps(batch_data),
                content_type="application/json",
            )

            assert response.status_code == 200
            data = json.loads(response.data)
            assert "search_id" in data
            assert data["message"] == "Batch search created successfully"
            assert data["movie_count"] == 2

            # Verify pending searches were created
            pending = PendingMovieSearch.query.filter_by(category_id=category.id).all()
            assert len(pending) >= 2

    def test_create_batch_search_missing_data(self, sqlalchemy_app, sqlalchemy_client):
        """Test batch search with missing data."""
        with sqlalchemy_app.app_context():
            response = sqlalchemy_client.post(
                "/api/movies/batch-search",
                data=json.dumps({}),
                content_type="application/json",
            )

            assert response.status_code == 400
            data = json.loads(response.data)
            assert "error" in data

    def test_create_batch_search_invalid_category(self, sqlalchemy_app, sqlalchemy_client):
        """Test batch search with invalid category."""
        with sqlalchemy_app.app_context():
            batch_data = {"category_id": 99999, "movies": [{"title": "Movie 1"}]}

            response = sqlalchemy_client.post(
                "/api/movies/batch-search",
                data=json.dumps(batch_data),
                content_type="application/json",
            )

            assert response.status_code == 404
            data = json.loads(response.data)
            assert "error" in data

    def test_get_batch_search_status(self, sqlalchemy_app, sqlalchemy_client):
        """Test getting batch search status."""
        with sqlalchemy_app.app_context():
            # Create a pending search
            category = Category.query.filter_by(type="movies").first()
            pending = PendingMovieSearch(category_id=category.id, title="Test Movie", status="pending")
            db.session.add(pending)
            db.session.commit()

            response = sqlalchemy_client.get(f"/api/movies/batch-search/{category.id}/status")

            assert response.status_code == 200
            data = json.loads(response.data)
            assert "status" in data
            assert data["status"]["pending"] >= 1
            assert "total" in data["status"]

    @patch("src.routes.movies.search_apple_movies")
    def test_process_batch_search(self, mock_search, sqlalchemy_app, sqlalchemy_client):
        """Test processing batch search."""
        with sqlalchemy_app.app_context():
            # Create pending searches
            category = Category.query.filter_by(type="movies").first()
            pending = PendingMovieSearch(category_id=category.id, title="Test Movie", status="pending")
            db.session.add(pending)
            db.session.commit()

            # Mock search response
            mock_search.return_value = {
                "movies": [
                    {"title": "Test Movie", "price": 9.99, "trackId": "12345", "url": "https://example.com/test-movie"}
                ],
                "total": 1,
            }

            response = sqlalchemy_client.post(f"/api/movies/batch-search/{category.id}/process")

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["processed"] > 0

            # Verify item was created
            item = Item.query.filter_by(title="Test Movie").first()
            assert item is not None
            assert item.price == 9.99

    def test_cancel_batch_search(self, sqlalchemy_app, sqlalchemy_client):
        """Test canceling batch search."""
        with sqlalchemy_app.app_context():
            # Create pending searches
            category = Category.query.filter_by(type="movies").first()
            pending = PendingMovieSearch(category_id=category.id, title="Test Movie", status="pending")
            db.session.add(pending)
            db.session.commit()

            response = sqlalchemy_client.delete(f"/api/movies/batch-search/{category.id}")

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["deleted"] > 0

            # Verify searches were deleted
            remaining = PendingMovieSearch.query.filter_by(category_id=category.id, status="pending").count()
            assert remaining == 0
