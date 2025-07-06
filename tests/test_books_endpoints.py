"""
Tests for book search endpoints.
"""

import pytest
import json
from unittest.mock import patch, MagicMock


class TestBooksEndpoints:
    """Test book search endpoints."""

    @patch("src.services.book_search.search_google_books")
    def test_search_books_success(self, mock_search, sqlalchemy_app, sqlalchemy_client):
        """Test successful book search."""
        with sqlalchemy_app.app_context():
            # Mock the search response
            mock_search.return_value = {
                "books": [
                    {
                        "title": "Test Book",
                        "authors": ["Test Author"],
                        "price": 9.99,
                        "thumbnail": "https://example.com/thumb.jpg",
                        "isbn": "1234567890",
                        "id": "book123",
                    }
                ],
                "total": 1,
                "source": "google_books",
            }

            response = sqlalchemy_client.get("/api/books/search?q=test")

            assert response.status_code == 200
            data = json.loads(response.data)
            assert "books" in data
            assert len(data["books"]) == 1
            assert data["books"][0]["title"] == "Test Book"
            assert data["total"] == 1
            assert data["source"] == "google_books"

    def test_search_books_missing_query(self, sqlalchemy_app, sqlalchemy_client):
        """Test book search without query parameter."""
        with sqlalchemy_app.app_context():
            response = sqlalchemy_client.get("/api/books/search")

            assert response.status_code == 400
            data = json.loads(response.data)
            assert "error" in data
            assert "Search query is required" in data["error"]

    @patch("src.services.book_search.search_kobo_books")
    def test_search_books_with_kobo_source(
        self, mock_search, sqlalchemy_app, sqlalchemy_client
    ):
        """Test book search with Kobo source."""
        with sqlalchemy_app.app_context():
            mock_search.return_value = {
                "books": [
                    {"title": "Kobo Book", "authors": ["Kobo Author"], "price": 12.99}
                ],
                "total": 1,
                "source": "kobo",
            }

            response = sqlalchemy_client.get("/api/books/search?q=test&source=kobo")

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["books"][0]["title"] == "Kobo Book"
            assert data["source"] == "kobo"

    @patch("src.services.book_search.search_google_books")
    def test_search_books_with_exception(
        self, mock_search, sqlalchemy_app, sqlalchemy_client
    ):
        """Test book search error handling."""
        with sqlalchemy_app.app_context():
            # Mock an exception
            mock_search.side_effect = Exception("API Error")

            response = sqlalchemy_client.get("/api/books/search?q=test")

            assert response.status_code == 500
            data = json.loads(response.data)
            assert "error" in data
            assert "Failed to search books" in data["error"]
