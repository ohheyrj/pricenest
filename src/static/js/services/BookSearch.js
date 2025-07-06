/**
 * Book Search Service
 * Handles Kobo/Google Books search integration and selection logic
 * 
 * @module BookSearch
 */

/**
 * BookSearch class for handling book search operations
 * Provides methods for searching books and handling selection
 */
class BookSearch {
    /**
     * Create a new BookSearch instance
     * @param {APIClient} apiClient - The API client for backend communication
     * @param {Function} errorHandler - Error display function
     * @param {Function} successHandler - Success display function
     */
    constructor(apiClient, errorHandler, successHandler) {
        this.api = apiClient;
        this.showError = errorHandler;
        this.showSuccess = successHandler;
    }

    /**
     * Check if book search is available for the given category
     * @param {Object} category - Category object
     * @returns {boolean} True if book search is available
     */
    isAvailableForCategory(category) {
        return category && category.bookLookupEnabled;
    }

    /**
     * Perform book search via API
     * @param {string} query - Search query
     * @param {Object} category - Category context for validation and source selection
     * @returns {Promise<Object>} Search results
     */
    async search(query, category) {
        // Validate category supports book lookup
        if (!this.isAvailableForCategory(category)) {
            return { error: 'Book lookup is not enabled for this category.' };
        }

        // Validate query
        if (!query || !query.trim()) {
            return { error: 'Search query is required.' };
        }

        try {
            // Use the category's preferred source
            const source = category.bookLookupSource || 'auto';
            return await this.api.searchBooks(query.trim(), source);
        } catch (error) {
            console.error('Book search error:', error);
            return { error: 'Failed to search for books. Please try again.' };
        }
    }

    /**
     * Handle book selection for item modal
     * @param {Object} book - Selected book object
     * @param {Object} formElements - Form elements to populate
     */
    populateItemForm(book, formElements) {
        const {
            itemNameInput,
            itemTitleInput,
            itemAuthorInput,
            itemUrlInput,
            itemPriceInput,
            koboSearchResults,
            koboSearchQuery
        } = formElements;

        if (itemNameInput) {
            itemNameInput.value = book.name || `${book.title} by ${book.author}`;
        }
        if (itemTitleInput) {
            itemTitleInput.value = book.title;
        }
        if (itemAuthorInput) {
            itemAuthorInput.value = book.author;
        }
        if (itemUrlInput) {
            itemUrlInput.value = book.url;
        }
        if (itemPriceInput) {
            itemPriceInput.value = book.price.toFixed(2);
        }
        if (koboSearchResults) {
            koboSearchResults.innerHTML = '';
        }
        if (koboSearchQuery) {
            koboSearchQuery.value = '';
        }
    }

    /**
     * Handle book selection for direct addition to category
     * @param {Object} book - Selected book object
     * @param {Object} category - Target category
     * @param {Function} onSuccess - Success callback
     * @returns {Promise<Object>} Created item or error
     */
    async addToCategory(book, category, onSuccess) {
        try {
            // Create display name for the book
            const displayName = book.name || `${book.title} by ${book.author}`;
            
            // Create the item via API
            const newItem = await this.api.createItem(
                category.id, 
                displayName, 
                book.url, 
                book.price, 
                book.title, 
                book.author
            );
            
            // Add price source to the item for display
            newItem.priceSource = book.priceSource;
            
            // Call success callback if provided
            if (onSuccess) {
                onSuccess(newItem);
            }
            
            return { success: true, item: newItem };
            
        } catch (error) {
            console.error('Failed to add book:', error);
            this.showError('Failed to add book');
            return { success: false, error: error.message };
        }
    }

    /**
     * Format book price with currency symbol
     * @param {number} price - Price value
     * @param {string} currency - Currency code (optional)
     * @returns {string} Formatted price string
     */
    formatPrice(price, currency = 'GBP') {
        const currencySymbols = {
            'GBP': '£',
            'USD': '$',
            'EUR': '€'
        };
        const symbol = currencySymbols[currency] || '£';
        return `${symbol}${price.toFixed(2)}`;
    }

    /**
     * Generate HTML for book search results
     * @param {Array} books - Array of book objects
     * @param {boolean} isInItemModal - Whether this is for item modal
     * @param {Function} priceSourceIndicator - Function to get price source indicator
     * @returns {string} HTML string for results
     */
    generateResultsHTML(books, isInItemModal, priceSourceIndicator) {
        return books.map(book => {
            const priceIndicator = priceSourceIndicator ? priceSourceIndicator(book.priceSource) : '';
            return `
                <div class="search-result-item" onclick="bookSearch.selectBook(${JSON.stringify(book).replace(/"/g, '&quot;')}, ${isInItemModal})">
                    <div class="search-result-title">${book.title}</div>
                    <div class="search-result-author">by ${book.author}</div>
                    <div class="search-result-price">
                        ${this.formatPrice(book.price, book.currency)}
                        ${priceIndicator}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Handle book selection from generated HTML onclick handlers
     * @param {Object} book - Selected book object
     * @param {boolean} isInItemModal - Whether this is for item modal
     */
    selectBook(book, isInItemModal) {
        // Delegate to the main app's selectKoboBook method
        if (window.app && window.app.selectKoboBook) {
            window.app.selectKoboBook(book, isInItemModal);
        }
    }

    /**
     * Get available search sources for books
     * @returns {Array} Array of available sources
     */
    getAvailableSources() {
        return [
            { value: 'auto', label: 'Auto (Try Kobo first, fallback to Google Books)' },
            { value: 'google_books', label: 'Google Books API only' },
            { value: 'kobo', label: 'Kobo UK only' }
        ];
    }

    /**
     * Validate book search configuration
     * @param {Object} category - Category to validate
     * @returns {Object} Validation result
     */
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

// Export for use in other modules
// Using universal export pattern for CommonJS, ES modules, and browser compatibility
(function() {
    'use strict';
    
    // Universal export function
    function universalExport(moduleExport, globalName) {
        const name = globalName || (moduleExport && moduleExport.name) || 'UnnamedModule';
        
        if (typeof module !== 'undefined' && module.exports) {
            // CommonJS (Node.js, current usage)
            module.exports = moduleExport;
        } else if (typeof define === 'function' && define.amd) {
            // AMD (RequireJS)
            define(name, [], function() {
                return moduleExport;
            });
        } else if (typeof exports !== 'undefined') {
            // ES Modules (webpack, modern bundlers)
            exports[name] = moduleExport;
            exports.__esModule = true;
            exports.default = moduleExport;
        } else {
            // Browser globals (direct script tags)
            const root = (function() {
                if (typeof globalThis !== 'undefined') return globalThis;
                if (typeof window !== 'undefined') return window;
                if (typeof global !== 'undefined') return global;
                if (typeof self !== 'undefined') return self;
                throw new Error('Unable to locate global object');
            })();
            
            root[name] = moduleExport;
        }
        
        return moduleExport;
    }
    
    // Export BookSearch
    universalExport(BookSearch);
})();