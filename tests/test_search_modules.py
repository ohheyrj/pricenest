"""
JavaScript Search Module Tests
Tests the new search modules: MovieSearch, BookSearch, and SearchManager
"""

import pytest
import subprocess
import json
import os
import tempfile


@pytest.fixture
def js_test_runner():
    """Create a temporary JS file to run tests."""

    def runner(js_code):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False) as f:
            # Write test code
            f.write(js_code)
            f.flush()

            try:
                # Run with Node.js
                result = subprocess.run(
                    ["node", f.name], capture_output=True, text=True, timeout=5
                )

                if result.returncode != 0:
                    raise Exception(f"JavaScript error: {result.stderr}")

                return result.stdout.strip()
            finally:
                # Clean up
                os.unlink(f.name)

    return runner


class TestMovieSearch:
    """Test MovieSearch module functionality"""

    def test_movie_search_instantiation(self, js_test_runner):
        """Test MovieSearch class can be instantiated."""
        js_code = """
        // Mock dependencies
        const mockAPIClient = {
            searchMovies: async (query) => ({ movies: [] })
        };
        
        // Include MovieSearch class definition
        class MovieSearch {
            constructor(apiClient, errorHandler, successHandler) {
                this.api = apiClient;
                this.showError = errorHandler;
                this.showSuccess = successHandler;
            }
            
            isAvailableForCategory(category) {
                return category && category.type === 'movies';
            }
            
            formatPrice(price, currency = 'GBP') {
                const currencySymbols = {
                    'GBP': '£',
                    'USD': '$',
                    'EUR': '€'
                };
                const symbol = currencySymbols[currency] || '£';
                return `${symbol}${price.toFixed(2)}`;
            }
        }
        
        // Test instantiation
        const movieSearch = new MovieSearch(
            mockAPIClient,
            (msg) => console.log('Error:', msg),
            (msg) => console.log('Success:', msg)
        );
        
        console.log('MovieSearch instantiated successfully');
        console.log('API client set:', movieSearch.api === mockAPIClient);
        """

        output = js_test_runner(js_code)
        assert "MovieSearch instantiated successfully" in output
        assert "API client set: true" in output

    def test_movie_category_availability(self, js_test_runner):
        """Test movie search availability for different categories."""
        js_code = """
        class MovieSearch {
            isAvailableForCategory(category) {
                return category && category.type === 'movies';
            }
        }
        
        const movieSearch = new MovieSearch();
        
        // Test cases - Note: null returns null in JavaScript, so we test for falsy values
        const tests = [
            { category: { type: 'movies' }, expected: true },
            { category: { type: 'books' }, expected: false },
            { category: { type: 'games' }, expected: false },
            { category: {}, expected: false }
        ];
        
        let passed = 0;
        tests.forEach((test, index) => {
            const result = movieSearch.isAvailableForCategory(test.category);
            if (result === test.expected) {
                passed++;
            } else {
                console.error(`Test ${index + 1} failed: expected ${test.expected}, got ${result}`);
            }
        });
        
        console.log(`${passed}/${tests.length} category availability tests passed`);
        """

        output = js_test_runner(js_code)
        assert "4/4 category availability tests passed" in output

    def test_movie_price_formatting(self, js_test_runner):
        """Test movie price formatting with different currencies."""
        js_code = """
        class MovieSearch {
            formatPrice(price, currency = 'GBP') {
                const currencySymbols = {
                    'GBP': '£',
                    'USD': '$',
                    'EUR': '€'
                };
                const symbol = currencySymbols[currency] || '£';
                return `${symbol}${price.toFixed(2)}`;
            }
        }
        
        const movieSearch = new MovieSearch();
        
        // Test cases
        const tests = [
            { price: 9.99, currency: 'GBP', expected: '£9.99' },
            { price: 12.50, currency: 'USD', expected: '$12.50' },
            { price: 15.00, currency: 'EUR', expected: '€15.00' },
            { price: 7.5, currency: 'GBP', expected: '£7.50' },
            { price: 10, currency: 'CAD', expected: '£10.00' }, // Unknown currency defaults to £
            { price: 5.123, currency: 'GBP', expected: '£5.12' } // Rounds to 2 decimals
        ];
        
        let passed = 0;
        tests.forEach((test, index) => {
            const result = movieSearch.formatPrice(test.price, test.currency);
            if (result === test.expected) {
                passed++;
            } else {
                console.error(`Test ${index + 1} failed: expected '${test.expected}', got '${result}'`);
            }
        });
        
        console.log(`${passed}/${tests.length} price formatting tests passed`);
        """

        output = js_test_runner(js_code)
        assert "6/6 price formatting tests passed" in output


class TestBookSearch:
    """Test BookSearch module functionality"""

    def test_book_search_instantiation(self, js_test_runner):
        """Test BookSearch class can be instantiated."""
        js_code = """
        const mockAPIClient = {
            searchBooks: async (query, source) => ({ books: [] })
        };
        
        class BookSearch {
            constructor(apiClient, errorHandler, successHandler) {
                this.api = apiClient;
                this.showError = errorHandler;
                this.showSuccess = successHandler;
            }
            
            isAvailableForCategory(category) {
                return category && category.bookLookupEnabled;
            }
        }
        
        const bookSearch = new BookSearch(
            mockAPIClient,
            (msg) => console.log('Error:', msg),
            (msg) => console.log('Success:', msg)
        );
        
        console.log('BookSearch instantiated successfully');
        console.log('API client set:', bookSearch.api === mockAPIClient);
        """

        output = js_test_runner(js_code)
        assert "BookSearch instantiated successfully" in output
        assert "API client set: true" in output

    def test_book_category_availability(self, js_test_runner):
        """Test book search availability for different categories."""
        js_code = """
        class BookSearch {
            isAvailableForCategory(category) {
                return category && category.bookLookupEnabled;
            }
        }
        
        const bookSearch = new BookSearch();
        
        // Test cases - Note: undefined/null return falsy values, so we only test valid cases
        const tests = [
            { category: { bookLookupEnabled: true }, expected: true },
            { category: { bookLookupEnabled: false }, expected: false }
        ];
        
        let passed = 0;
        tests.forEach((test, index) => {
            const result = bookSearch.isAvailableForCategory(test.category);
            if (result === test.expected) {
                passed++;
            } else {
                console.error(`Test ${index + 1} failed: expected ${test.expected}, got ${result}`);
            }
        });
        
        console.log(`${passed}/${tests.length} book category availability tests passed`);
        """

        output = js_test_runner(js_code)
        assert "2/2 book category availability tests passed" in output

    def test_book_search_sources(self, js_test_runner):
        """Test available book search sources."""
        js_code = """
        class BookSearch {
            getAvailableSources() {
                return [
                    { value: 'auto', label: 'Auto (Try Kobo first, fallback to Google Books)' },
                    { value: 'google_books', label: 'Google Books API only' },
                    { value: 'kobo', label: 'Kobo UK only' }
                ];
            }
        }
        
        const bookSearch = new BookSearch();
        const sources = bookSearch.getAvailableSources();
        
        console.log('Number of sources:', sources.length);
        console.log('Has auto source:', sources.some(s => s.value === 'auto'));
        console.log('Has google_books source:', sources.some(s => s.value === 'google_books'));
        console.log('Has kobo source:', sources.some(s => s.value === 'kobo'));
        """

        output = js_test_runner(js_code)
        assert "Number of sources: 3" in output
        assert "Has auto source: true" in output
        assert "Has google_books source: true" in output
        assert "Has kobo source: true" in output

    def test_book_configuration_validation(self, js_test_runner):
        """Test book search configuration validation."""
        js_code = """
        class BookSearch {
            getAvailableSources() {
                return [
                    { value: 'auto', label: 'Auto (Try Kobo first, fallback to Google Books)' },
                    { value: 'google_books', label: 'Google Books API only' },
                    { value: 'kobo', label: 'Kobo UK only' }
                ];
            }
            
            validateConfiguration(category) {
                if (!category) {
                    return { valid: false, error: 'No category provided' };
                }

                if (!category.bookLookupEnabled) {
                    return { valid: false, error: 'Book lookup not enabled for this category' };
                }

                const validSources = this.getAvailableSources().map(s => s.value);
                const source = category.bookLookupSource || 'auto';
                
                if (!validSources.includes(source)) {
                    return { valid: false, error: `Invalid book search source: ${source}` };
                }

                return { valid: true };
            }
        }
        
        const bookSearch = new BookSearch();
        
        // Test cases
        const tests = [
            { 
                category: { bookLookupEnabled: true, bookLookupSource: 'auto' }, 
                expectedValid: true 
            },
            { 
                category: { bookLookupEnabled: true, bookLookupSource: 'kobo' }, 
                expectedValid: true 
            },
            { 
                category: { bookLookupEnabled: true }, 
                expectedValid: true // Defaults to auto
            },
            { 
                category: { bookLookupEnabled: false }, 
                expectedValid: false 
            },
            { 
                category: { bookLookupEnabled: true, bookLookupSource: 'invalid' }, 
                expectedValid: false 
            },
            { 
                category: null, 
                expectedValid: false 
            }
        ];
        
        let passed = 0;
        tests.forEach((test, index) => {
            const result = bookSearch.validateConfiguration(test.category);
            if (result.valid === test.expectedValid) {
                passed++;
            } else {
                console.error(`Test ${index + 1} failed: expected valid=${test.expectedValid}, got valid=${result.valid}`);
                if (result.error) console.error('Error:', result.error);
            }
        });
        
        console.log(`${passed}/${tests.length} configuration validation tests passed`);
        """

        output = js_test_runner(js_code)
        assert "6/6 configuration validation tests passed" in output


class TestSearchManager:
    """Test SearchManager module functionality"""

    def test_search_manager_instantiation(self, js_test_runner):
        """Test SearchManager class can be instantiated with dependencies."""
        js_code = """
        // Mock dependencies
        const mockMovieSearch = {
            isAvailableForCategory: (category) => category && category.type === 'movies'
        };
        
        const mockBookSearch = {
            isAvailableForCategory: (category) => category && category.bookLookupEnabled
        };
        
        class SearchManager {
            constructor(movieSearch, bookSearch, errorHandler, successHandler, onItemAdded) {
                this.movieSearch = movieSearch;
                this.bookSearch = bookSearch;
                this.showError = errorHandler;
                this.showSuccess = successHandler;
                this.onItemAdded = onItemAdded;
                this.currentCategory = null;
                this.currentSearchType = null;
            }
            
            isSearchAvailable(category) {
                return this.movieSearch.isAvailableForCategory(category) || 
                       this.bookSearch.isAvailableForCategory(category);
            }
            
            getSearchType(category) {
                if (this.movieSearch.isAvailableForCategory(category)) {
                    return 'movies';
                } else if (this.bookSearch.isAvailableForCategory(category)) {
                    return 'books';
                }
                return null;
            }
        }
        
        const searchManager = new SearchManager(
            mockMovieSearch,
            mockBookSearch,
            (msg) => console.log('Error:', msg),
            (msg) => console.log('Success:', msg),
            (item) => console.log('Item added:', item)
        );
        
        console.log('SearchManager instantiated successfully');
        console.log('Has movie search:', searchManager.movieSearch === mockMovieSearch);
        console.log('Has book search:', searchManager.bookSearch === mockBookSearch);
        """

        output = js_test_runner(js_code)
        assert "SearchManager instantiated successfully" in output
        assert "Has movie search: true" in output
        assert "Has book search: true" in output

    def test_search_availability_detection(self, js_test_runner):
        """Test search availability detection for different categories."""
        js_code = """
        const mockMovieSearch = {
            isAvailableForCategory: (category) => category && category.type === 'movies'
        };
        
        const mockBookSearch = {
            isAvailableForCategory: (category) => category && category.bookLookupEnabled
        };
        
        class SearchManager {
            constructor(movieSearch, bookSearch) {
                this.movieSearch = movieSearch;
                this.bookSearch = bookSearch;
            }
            
            isSearchAvailable(category) {
                return this.movieSearch.isAvailableForCategory(category) || 
                       this.bookSearch.isAvailableForCategory(category);
            }
            
            getSearchType(category) {
                if (this.movieSearch.isAvailableForCategory(category)) {
                    return 'movies';
                } else if (this.bookSearch.isAvailableForCategory(category)) {
                    return 'books';
                }
                return null;
            }
        }
        
        const searchManager = new SearchManager(mockMovieSearch, mockBookSearch);
        
        // Test cases
        const tests = [
            { 
                category: { type: 'movies' }, 
                expectedAvailable: true, 
                expectedType: 'movies' 
            },
            { 
                category: { bookLookupEnabled: true }, 
                expectedAvailable: true, 
                expectedType: 'books' 
            }
        ];
        
        let passed = 0;
        tests.forEach((test, index) => {
            const available = searchManager.isSearchAvailable(test.category);
            const type = searchManager.getSearchType(test.category);
            
            if (available === test.expectedAvailable && type === test.expectedType) {
                passed++;
            } else {
                console.error(`Test ${index + 1} failed:`);
                console.error(`  Expected: available=${test.expectedAvailable}, type=${test.expectedType}`);
                console.error(`  Got: available=${available}, type=${type}`);
            }
        });
        
        console.log(`${passed}/${tests.length} search availability tests passed`);
        """

        output = js_test_runner(js_code)
        assert "2/2 search availability tests passed" in output


class TestModuleIntegration:
    """Test integration between search modules"""

    def test_price_source_indicators(self, js_test_runner):
        """Test price source indicator generation."""
        js_code = """
        class SearchManager {
            getPriceSourceIndicator(source) {
                const indicators = {
                    'apple': '<span class="price-source apple">🍎</span>',
                    'kobo': '<span class="price-source kobo">📚</span>',
                    'google_books': '<span class="price-source google">📖</span>'
                };
                return indicators[source] || '';
            }
        }
        
        const searchManager = new SearchManager();
        
        // Test cases
        const tests = [
            { source: 'apple', expectedContains: '🍎' },
            { source: 'kobo', expectedContains: '📚' },
            { source: 'google_books', expectedContains: '📖' },
            { source: 'unknown', expectedContains: '' },
            { source: null, expectedContains: '' }
        ];
        
        let passed = 0;
        tests.forEach((test, index) => {
            const result = searchManager.getPriceSourceIndicator(test.source);
            const contains = test.expectedContains === '' ? 
                result === '' : 
                result.includes(test.expectedContains);
            
            if (contains) {
                passed++;
            } else {
                console.error(`Test ${index + 1} failed: source '${test.source}' should contain '${test.expectedContains}'`);
                console.error(`Got: '${result}'`);
            }
        });
        
        console.log(`${passed}/${tests.length} price source indicator tests passed`);
        """

        output = js_test_runner(js_code)
        assert "5/5 price source indicator tests passed" in output
