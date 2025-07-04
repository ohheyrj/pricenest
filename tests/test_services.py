"""
Tests for service layer (book and movie search services).
"""

import pytest
from unittest.mock import patch, MagicMock
import requests
from src.services.book_search import search_google_books, get_mock_results
from src.services.movie_search import (
    search_apple_movies, get_movie_by_track_id, get_apple_pricing,
    generate_estimated_movie_price, extract_year_from_release_date,
    get_mock_movie_results, search_tmdb_movies
)


class TestBookSearchService:
    """Test book search service functions."""
    
    @patch('requests.get')
    def test_search_google_books_success(self, mock_get):
        """Test successful Google Books search."""
        # Mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'items': [
                {
                    'id': 'book123',
                    'volumeInfo': {
                        'title': 'Test Book',
                        'authors': ['Test Author'],
                        'publisher': 'Test Publisher',
                        'publishedDate': '2023-01-01',
                        'description': 'Test description',
                        'industryIdentifiers': [
                            {'type': 'ISBN_13', 'identifier': '1234567890123'}
                        ],
                        'pageCount': 300,
                        'categories': ['Fiction'],
                        'imageLinks': {
                            'thumbnail': 'https://example.com/thumb.jpg'
                        }
                    },
                    'saleInfo': {
                        'listPrice': {
                            'amount': 19.99,
                            'currencyCode': 'GBP'
                        }
                    }
                }
            ],
            'totalItems': 1
        }
        mock_get.return_value = mock_response
        
        result = search_google_books('test query')
        
        assert result['total'] == 1
        assert len(result['books']) == 1
        assert result['books'][0]['title'] == 'Test Book'
        assert result['books'][0]['price'] == 19.99
        assert result['source'] == 'google_books'
    
    @patch('requests.get')
    def test_search_google_books_api_error(self, mock_get):
        """Test Google Books search with API error."""
        mock_get.side_effect = requests.RequestException("API Error")
        
        result = search_google_books('test')
        
        assert result['books'] == []
        assert result['total'] == 0
        assert result['error'] is not None
    
    def test_get_mock_results(self):
        """Test mock results function."""
        result = get_mock_results('test query')
        
        assert 'books' in result
        assert 'total' in result
        assert result['source'] == 'mock'
        assert len(result['books']) > 0
        
        # Check book structure
        book = result['books'][0]
        assert 'title' in book
        assert 'authors' in book
        assert 'price' in book
    
    @patch('requests.get')
    def test_search_google_books_no_items(self, mock_get):
        """Test Google Books search with no results."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'totalItems': 0
        }
        mock_get.return_value = mock_response
        
        result = search_google_books('nonexistent book')
        
        assert result['total'] == 0
        assert result['books'] == []
        assert result['source'] == 'google_books'


class TestMovieSearchService:
    """Test movie search service functions."""
    
    @patch('requests.get')
    def test_search_apple_movies_success(self, mock_get):
        """Test successful Apple movie search."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'resultCount': 1,
            'results': [
                {
                    'trackId': 123456,
                    'trackName': 'Test Movie',
                    'artistName': 'Test Director',
                    'releaseDate': '2023-01-01T00:00:00Z',
                    'trackPrice': 14.99,
                    'currency': 'GBP',
                    'artworkUrl100': 'https://example.com/movie.jpg',
                    'longDescription': 'Test description',
                    'trackTimeMillis': 7200000,
                    'primaryGenreName': 'Action'
                }
            ]
        }
        mock_get.return_value = mock_response
        
        result = search_apple_movies('test movie')
        
        assert result['total'] == 1
        assert len(result['movies']) == 1
        assert result['movies'][0]['title'] == 'Test Movie'
        assert result['movies'][0]['price'] == 14.99
        assert result['movies'][0]['trackId'] == '123456'
    
    @patch('requests.get')
    def test_get_movie_by_track_id_success(self, mock_get):
        """Test getting movie by track ID."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'resultCount': 1,
            'results': [
                {
                    'trackId': 123456,
                    'trackName': 'Specific Movie',
                    'trackPrice': 9.99
                }
            ]
        }
        mock_get.return_value = mock_response
        
        result = get_movie_by_track_id('123456')
        
        assert 'movie' in result
        assert result['movie']['title'] == 'Specific Movie'
        assert result['movie']['price'] == 9.99
    
    @patch('requests.get')
    def test_get_movie_by_track_id_not_found(self, mock_get):
        """Test getting movie by track ID when not found."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'resultCount': 0,
            'results': []
        }
        mock_get.return_value = mock_response
        
        result = get_movie_by_track_id('999999')
        
        assert 'error' in result
        assert result['error'] == 'Movie not found'
    
    def test_get_apple_pricing(self):
        """Test Apple pricing extraction."""
        item = {
            'trackPrice': 12.99,
            'trackRentalPrice': 3.99,
            'trackHdPrice': 14.99,
            'trackHdRentalPrice': 4.99,
            'collectionPrice': 19.99,
            'collectionHdPrice': 24.99
        }
        
        result = get_apple_pricing(item)
        
        assert result['price'] == 12.99
        assert result['rentalPrice'] == 3.99
        assert result['hdPrice'] == 14.99
        assert result['hdRentalPrice'] == 4.99
        assert result['collectionPrice'] == 19.99
        assert result['collectionHdPrice'] == 24.99
    
    def test_generate_estimated_movie_price(self):
        """Test movie price estimation."""
        # Recent movie
        recent_movie = {
            'releaseDate': '2023-01-01T00:00:00Z',
            'primaryGenreName': 'Action'
        }
        price = generate_estimated_movie_price(recent_movie)
        assert 10 <= price <= 20  # Recent movies should be more expensive
        
        # Older movie
        old_movie = {
            'releaseDate': '2010-01-01T00:00:00Z',
            'primaryGenreName': 'Drama'
        }
        price = generate_estimated_movie_price(old_movie)
        assert 3 <= price <= 15  # Older movies should be cheaper
    
    def test_extract_year_from_release_date(self):
        """Test year extraction from release date."""
        assert extract_year_from_release_date('2023-01-01T00:00:00Z') == 2023
        assert extract_year_from_release_date('2023') == 2023
        assert extract_year_from_release_date('invalid') is None
    
    def test_get_mock_movie_results(self):
        """Test mock movie results."""
        result = get_mock_movie_results('test query')
        
        assert 'movies' in result
        assert 'total' in result
        assert len(result['movies']) > 0
        
        movie = result['movies'][0]
        assert 'title' in movie
        assert 'director' in movie
        assert 'year' in movie
        assert 'price' in movie
    
    @patch('requests.get')
    def test_search_tmdb_movies_success(self, mock_get):
        """Test TMDB movie search."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'results': [
                {
                    'title': 'TMDB Movie',
                    'release_date': '2023-01-01',
                    'id': 12345,
                    'poster_path': '/poster.jpg',
                    'overview': 'A test movie'
                }
            ],
            'total_results': 1
        }
        mock_get.return_value = mock_response
        
        with patch('os.getenv', return_value='test_api_key'):
            result = search_tmdb_movies('test')
            
            assert 'movies' in result
            assert len(result['movies']) > 0