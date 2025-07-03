"""
Integration tests for book search functionality.
"""

import json
import pytest
from unittest.mock import patch, Mock
from src.services.book_search import search_google_books, generate_realistic_price, get_mock_results


class TestBookSearchIntegration:
    """Integration tests for book search functionality."""
    
    @patch('src.services.book_search.requests.get')
    def test_search_google_books_success(self, mock_get):
        """Test successful Google Books API search."""
        # Mock successful API response
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {
            'items': [
                {
                    'volumeInfo': {
                        'title': 'Python Programming',
                        'authors': ['John Doe'],
                        'pageCount': 350
                    },
                    'saleInfo': {
                        'listPrice': {
                            'amount': 25.99,
                            'currencyCode': 'GBP'
                        }
                    }
                },
                {
                    'volumeInfo': {
                        'title': 'Advanced Python',
                        'authors': ['Jane Smith'],
                        'pageCount': 450
                    },
                    'saleInfo': {}
                }
            ]
        }
        mock_get.return_value = mock_response
        
        result = search_google_books('python')
        
        assert 'books' in result
        assert len(result['books']) == 2
        
        # Check first book (real price)
        book1 = result['books'][0]
        assert book1['title'] == 'Python Programming'
        assert book1['author'] == 'John Doe'
        assert book1['price'] == 25.99
        assert book1['priceSource'] == 'google_books'
        
        # Check second book (estimated price)
        book2 = result['books'][1]
        assert book2['title'] == 'Advanced Python'
        assert book2['author'] == 'Jane Smith'
        assert book2['priceSource'] == 'estimated'
        assert isinstance(book2['price'], float)
    
    @patch('src.services.book_search.requests.get')
    def test_search_google_books_api_failure(self, mock_get):
        """Test Google Books API failure fallback to mock results."""
        # Mock API failure
        mock_response = Mock()
        mock_response.ok = False
        mock_get.return_value = mock_response
        
        result = search_google_books('python')
        
        assert 'books' in result
        assert len(result['books']) > 0
        
        # Should fallback to mock results
        book = result['books'][0]
        assert 'python' in book['title'].lower()
        assert book['priceSource'] == 'sample'
    
    @patch('src.services.book_search.requests.get')
    def test_search_google_books_no_items(self, mock_get):
        """Test Google Books API with no items returned."""
        # Mock API response with no items
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {'items': []}
        mock_get.return_value = mock_response
        
        result = search_google_books('nonexistentbook')
        
        assert 'books' in result
        assert len(result['books']) > 0
        
        # Should fallback to mock results
        book = result['books'][0]
        assert 'nonexistentbook' in book['title'].lower()
        assert book['priceSource'] == 'sample'
    
    @patch('src.services.book_search.requests.get')
    def test_search_google_books_exception(self, mock_get):
        """Test Google Books API with exception handling."""
        # Mock exception
        mock_get.side_effect = Exception("Network error")
        
        result = search_google_books('python')
        
        assert 'books' in result
        assert len(result['books']) > 0
        
        # Should fallback to mock results
        book = result['books'][0]
        assert book['priceSource'] == 'sample'
    
    def test_generate_realistic_price_with_real_price(self):
        """Test price generation with real Google Books price."""
        volume_info = {'pageCount': 300}
        sale_info = {
            'listPrice': {
                'amount': 20.99,
                'currencyCode': 'GBP'
            }
        }
        
        price = generate_realistic_price(volume_info, sale_info)
        assert price == 20.99
    
    def test_generate_realistic_price_usd_conversion(self):
        """Test price generation with USD to GBP conversion."""
        volume_info = {'pageCount': 300}
        sale_info = {
            'listPrice': {
                'amount': 25.0,
                'currencyCode': 'USD'
            }
        }
        
        price = generate_realistic_price(volume_info, sale_info)
        expected = round(25.0 * 0.79, 2)
        assert price == expected
    
    def test_generate_realistic_price_estimated(self):
        """Test price generation based on book characteristics."""
        # Test different page counts
        test_cases = [
            ({'pageCount': 100}, 6.99),  # Short book
            ({'pageCount': 250}, 8.99),  # Medium book
            ({'pageCount': 350}, 10.99), # Long book
            ({'pageCount': 500}, 12.99), # Very long book
        ]
        
        for volume_info, expected_base in test_cases:
            sale_info = {}
            price = generate_realistic_price(volume_info, sale_info)
            
            # Price should be around the expected base (with random variation)
            assert 2.99 <= price <= 19.99
            assert isinstance(price, float)
    
    def test_get_mock_results(self):
        """Test mock results generation."""
        query = "test query"
        result = get_mock_results(query)
        
        assert 'books' in result
        assert len(result['books']) > 0
        
        for book in result['books']:
            assert 'title' in book
            assert 'author' in book
            assert 'name' in book
            assert 'price' in book
            assert 'url' in book
            assert 'priceSource' in book
            
            assert query in book['title']
            assert book['priceSource'] == 'sample'
            assert isinstance(book['price'], float)
    
    @patch('src.services.book_search.requests.get')
    def test_book_search_endpoint_integration(self, mock_get, client):
        """Test the complete book search endpoint."""
        # Mock the requests.get to return our controlled response
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {
            'items': [
                {
                    'volumeInfo': {
                        'title': 'Test Book',
                        'authors': ['Test Author'],
                        'pageCount': 300
                    },
                    'saleInfo': {
                        'listPrice': {
                            'amount': 15.99,
                            'currencyCode': 'GBP'
                        }
                    }
                }
            ]
        }
        mock_get.return_value = mock_response
        
        response = client.get('/api/books/search?query=test')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'books' in data
        assert len(data['books']) == 1
        
        book = data['books'][0]
        assert book['title'] == 'Test Book'
        assert book['author'] == 'Test Author'
        assert book['price'] == 15.99
    
    def test_book_search_sorting(self):
        """Test that book search results are properly sorted."""
        # Create sample data with different price sources
        with patch('src.services.book_search.requests.get') as mock_get:
            mock_response = Mock()
            mock_response.ok = True
            mock_response.json.return_value = {
                'items': [
                    {
                        'volumeInfo': {
                            'title': 'Book Without Price',
                            'authors': ['Author A'],
                            'pageCount': 300
                        },
                        'saleInfo': {}
                    },
                    {
                        'volumeInfo': {
                            'title': 'Book With Price',
                            'authors': ['Author B'],
                            'pageCount': 300
                        },
                        'saleInfo': {
                            'listPrice': {
                                'amount': 19.99,
                                'currencyCode': 'GBP'
                            }
                        }
                    }
                ]
            }
            mock_get.return_value = mock_response
            
            result = search_google_books('test')
            books = result['books']
            
            # Real prices should come first
            assert books[0]['priceSource'] == 'google_books'
            assert books[1]['priceSource'] == 'estimated'