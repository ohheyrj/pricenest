/**
 * Search Manager Service
 * Orchestrates search UI interactions and coordinates between search services
 * 
 * @module SearchManager
 */

/**
 * SearchManager class handles all search-related UI logic and orchestration
 * Manages search modals, result display, and coordination between different search services
 */
class SearchManager {
    /**
     * Create a new SearchManager instance
     * @param {MovieSearch} movieSearch - Movie search service instance
     * @param {BookSearch} bookSearch - Book search service instance
     * @param {Function} errorHandler - Error display function
     * @param {Function} successHandler - Success display function
     * @param {Function} onItemAdded - Callback when item is added to category
     */
    constructor(movieSearch, bookSearch, errorHandler, successHandler, onItemAdded) {
        this.movieSearch = movieSearch;
        this.bookSearch = bookSearch;
        this.showError = errorHandler;
        this.showSuccess = successHandler;
        this.onItemAdded = onItemAdded;
        
        // Search state
        this.currentCategory = null;
        this.currentSearchType = null;
        this.lastSearchResults = null;
        
        this.initializeElements();
        this.bindEvents();
    }

    /**
     * Initialize DOM elements used by the search manager
     */
    initializeElements() {
        // Search modal elements
        this.searchModal = document.getElementById('search-modal');
        this.searchQuery = document.getElementById('search-query');
        this.searchResults = document.getElementById('search-results');
        this.searchForm = document.getElementById('search-form');
        
        // Item modal search elements
        this.itemModal = document.getElementById('item-modal');
        this.movieSearchQuery = document.getElementById('movie-search-query');
        this.movieSearchResults = document.getElementById('movie-search-results');
        this.koboSearchQuery = document.getElementById('kobo-search-query');
        this.koboSearchResults = document.getElementById('kobo-search-results');
        
        // Form elements for item modal
        this.itemFormElements = {
            itemNameInput: document.getElementById('item-name'),
            itemTitleInput: document.getElementById('item-title'),
            itemTitleMovieInput: document.getElementById('item-title-movie'),
            itemAuthorInput: document.getElementById('item-author'),
            itemDirectorInput: document.getElementById('item-director'),
            itemYearInput: document.getElementById('item-year'),
            itemUrlInput: document.getElementById('item-url'),
            itemPriceInput: document.getElementById('item-price'),
            movieSearchResults: this.movieSearchResults,
            movieSearchQuery: this.movieSearchQuery,
            koboSearchResults: this.koboSearchResults,
            koboSearchQuery: this.koboSearchQuery
        };
    }

    /**
     * Bind event listeners for search functionality
     */
    bindEvents() {
        // Main search modal events
        if (this.searchForm) {
            this.searchForm.addEventListener('submit', (e) => this.handleSearchSubmit(e));
        }

        // Movie search in item modal
        if (this.movieSearchQuery) {
            this.movieSearchQuery.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.performMovieSearch();
                }
            });
        }

        // Book search in item modal
        if (this.koboSearchQuery) {
            this.koboSearchQuery.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.performBookSearch();
                }
            });
        }
    }

    /**
     * Open search modal for a specific category
     * @param {Object} category - Category to search for
     * @param {number} categoryIndex - Index of the category
     */
    openSearchModal(category, categoryIndex) {
        this.currentCategory = { ...category, index: categoryIndex };
        
        // Determine search type based on category
        if (this.movieSearch.isAvailableForCategory(category)) {
            this.currentSearchType = 'movies';
        } else if (this.bookSearch.isAvailableForCategory(category)) {
            this.currentSearchType = 'books';
        } else {
            this.showError('Search is not available for this category type.');
            return;
        }
        
        // Reset modal state
        if (this.searchQuery) {
            this.searchQuery.value = '';
            this.searchQuery.focus();
        }
        if (this.searchResults) {
            this.searchResults.innerHTML = '';
        }
        
        // Show modal
        if (this.searchModal) {
            this.searchModal.style.display = 'block';
        }
    }

    /**
     * Close search modal and reset state
     */
    closeSearchModal() {
        if (this.searchModal) {
            this.searchModal.style.display = 'none';
        }
        this.currentCategory = null;
        this.currentSearchType = null;
        this.lastSearchResults = null;
    }

    /**
     * Handle search form submission
     * @param {Event} event - Form submit event
     */
    async handleSearchSubmit(event) {
        event.preventDefault();
        
        if (!this.searchQuery || !this.currentCategory) {
            return;
        }
        
        const query = this.searchQuery.value.trim();
        if (!query) {
            this.showError('Please enter a search term.');
            return;
        }
        
        await this.performSearch(query);
    }

    /**
     * Perform search based on current search type
     * @param {string} query - Search query
     */
    async performSearch(query) {
        if (!this.currentCategory || !this.currentSearchType) {
            this.showError('No category selected for search.');
            return;
        }
        
        try {
            // Show loading state
            if (this.searchResults) {
                this.searchResults.innerHTML = '<div class="loading">Searching...</div>';
            }
            
            let searchResult;
            if (this.currentSearchType === 'movies') {
                searchResult = await this.movieSearch.search(query, this.currentCategory);
            } else if (this.currentSearchType === 'books') {
                searchResult = await this.bookSearch.search(query, this.currentCategory);
            }
            
            if (searchResult.error) {
                this.showError(searchResult.error);
                if (this.searchResults) {
                    this.searchResults.innerHTML = '';
                }
                return;
            }
            
            // Store results and display them
            this.lastSearchResults = searchResult.movies || searchResult.books || [];
            this.displaySearchResults(this.lastSearchResults);
            
        } catch (error) {
            console.error('Search failed:', error);
            this.showError('Search failed. Please try again.');
            if (this.searchResults) {
                this.searchResults.innerHTML = '';
            }
        }
    }

    /**
     * Display search results in the modal
     * @param {Array} results - Array of search results
     */
    displaySearchResults(results) {
        if (!this.searchResults) {
            return;
        }
        
        if (results.length === 0) {
            this.searchResults.innerHTML = '<div class="no-results">No results found. Try a different search term.</div>';
            return;
        }
        
        let resultsHTML;
        const priceSourceIndicator = window.app ? window.app.getPriceSourceIndicator.bind(window.app) : this.getPriceSourceIndicator.bind(this);
        
        if (this.currentSearchType === 'movies') {
            resultsHTML = this.movieSearch.generateResultsHTML(results, false, priceSourceIndicator);
        } else if (this.currentSearchType === 'books') {
            resultsHTML = this.bookSearch.generateResultsHTML(results, false, priceSourceIndicator);
        }
        
        this.searchResults.innerHTML = `
            <h3>Search Results</h3>
            <div class="search-results-list">
                ${resultsHTML}
            </div>
        `;
    }

    /**
     * Handle movie selection from search results
     * @param {Object} movie - Selected movie object
     * @param {boolean} isInItemModal - Whether this is for item modal
     */
    async selectMovie(movie, isInItemModal = false) {
        if (isInItemModal) {
            // Populate item form
            this.movieSearch.populateItemForm(movie, this.itemFormElements);
        } else {
            // Add directly to category
            const result = await this.movieSearch.addToCategory(
                movie, 
                this.currentCategory, 
                this.onItemAdded
            );
            
            if (result.success) {
                this.showSuccess(`Added "${movie.title}" to ${this.currentCategory.name}`);
                this.closeSearchModal();
            }
        }
    }

    /**
     * Handle book selection from search results
     * @param {Object} book - Selected book object
     * @param {boolean} isInItemModal - Whether this is for item modal
     */
    async selectBook(book, isInItemModal = false) {
        if (isInItemModal) {
            // Populate item form
            this.bookSearch.populateItemForm(book, this.itemFormElements);
        } else {
            // Add directly to category
            const result = await this.bookSearch.addToCategory(
                book, 
                this.currentCategory, 
                this.onItemAdded
            );
            
            if (result.success) {
                this.showSuccess(`Added "${book.title}" to ${this.currentCategory.name}`);
                this.closeSearchModal();
            }
        }
    }

    /**
     * Perform movie search in item modal
     */
    async performMovieSearch() {
        if (!this.movieSearchQuery || !this.currentCategory) {
            return;
        }
        
        const query = this.movieSearchQuery.value.trim();
        if (!query) {
            return;
        }
        
        try {
            if (this.movieSearchResults) {
                this.movieSearchResults.innerHTML = '<div class="loading">Searching...</div>';
            }
            
            const searchResult = await this.movieSearch.search(query, this.currentCategory);
            
            if (searchResult.error) {
                this.showError(searchResult.error);
                if (this.movieSearchResults) {
                    this.movieSearchResults.innerHTML = '';
                }
                return;
            }
            
            const movies = searchResult.movies || [];
            if (movies.length === 0) {
                if (this.movieSearchResults) {
                    this.movieSearchResults.innerHTML = '<div class="no-results">No movies found.</div>';
                }
                return;
            }
            
            const priceSourceIndicator = window.app ? window.app.getPriceSourceIndicator.bind(window.app) : this.getPriceSourceIndicator.bind(this);
            const resultsHTML = this.movieSearch.generateResultsHTML(movies, true, priceSourceIndicator);
            if (this.movieSearchResults) {
                this.movieSearchResults.innerHTML = resultsHTML;
            }
            
        } catch (error) {
            console.error('Movie search failed:', error);
            this.showError('Movie search failed. Please try again.');
        }
    }

    /**
     * Perform book search in item modal
     */
    async performBookSearch() {
        if (!this.koboSearchQuery || !this.currentCategory) {
            return;
        }
        
        const query = this.koboSearchQuery.value.trim();
        if (!query) {
            return;
        }
        
        try {
            if (this.koboSearchResults) {
                this.koboSearchResults.innerHTML = '<div class="loading">Searching...</div>';
            }
            
            const searchResult = await this.bookSearch.search(query, this.currentCategory);
            
            if (searchResult.error) {
                this.showError(searchResult.error);
                if (this.koboSearchResults) {
                    this.koboSearchResults.innerHTML = '';
                }
                return;
            }
            
            const books = searchResult.books || [];
            if (books.length === 0) {
                if (this.koboSearchResults) {
                    this.koboSearchResults.innerHTML = '<div class="no-results">No books found.</div>';
                }
                return;
            }
            
            const priceSourceIndicator = window.app ? window.app.getPriceSourceIndicator.bind(window.app) : this.getPriceSourceIndicator.bind(this);
            const resultsHTML = this.bookSearch.generateResultsHTML(books, true, priceSourceIndicator);
            if (this.koboSearchResults) {
                this.koboSearchResults.innerHTML = resultsHTML;
            }
            
        } catch (error) {
            console.error('Book search failed:', error);
            this.showError('Book search failed. Please try again.');
        }
    }

    /**
     * Get price source indicator for display
     * @param {string} source - Price source (apple, kobo, google_books, etc.)
     * @returns {string} HTML for price source indicator
     */
    getPriceSourceIndicator(source) {
        const indicators = {
            'apple': '<span class="price-source apple">🍎</span>',
            'kobo': '<span class="price-source kobo">📚</span>',
            'google_books': '<span class="price-source google">📖</span>'
        };
        return indicators[source] || '';
    }

    /**
     * Set current category for searches within item modal
     * @param {Object} category - Category object
     */
    setCurrentCategory(category) {
        this.currentCategory = category;
    }

    /**
     * Clear search results and reset state
     */
    clearResults() {
        if (this.searchResults) {
            this.searchResults.innerHTML = '';
        }
        if (this.movieSearchResults) {
            this.movieSearchResults.innerHTML = '';
        }
        if (this.koboSearchResults) {
            this.koboSearchResults.innerHTML = '';
        }
        this.lastSearchResults = null;
    }

    /**
     * Check if search is available for a category
     * @param {Object} category - Category to check
     * @returns {boolean} True if search is available
     */
    isSearchAvailable(category) {
        return this.movieSearch.isAvailableForCategory(category) || 
               this.bookSearch.isAvailableForCategory(category);
    }

    /**
     * Get search type for a category
     * @param {Object} category - Category to check
     * @returns {string|null} Search type ('movies', 'books') or null
     */
    getSearchType(category) {
        if (this.movieSearch.isAvailableForCategory(category)) {
            return 'movies';
        } else if (this.bookSearch.isAvailableForCategory(category)) {
            return 'books';
        }
        return null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchManager;
}