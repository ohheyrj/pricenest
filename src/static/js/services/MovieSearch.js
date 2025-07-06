/**
 * Movie Search Service
 * Handles Apple Store movie search integration and selection logic
 * 
 * @module MovieSearch
 */

/**
 * MovieSearch class for handling movie search operations
 * Provides methods for searching movies and handling selection
 */
class MovieSearch {
    /**
     * Create a new MovieSearch instance
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
     * Check if movie search is available for the given category
     * @param {Object} category - Category object
     * @returns {boolean} True if movie search is available
     */
    isAvailableForCategory(category) {
        return category && category.type === 'movies';
    }

    /**
     * Perform movie search via API
     * @param {string} query - Search query
     * @param {Object} category - Category context for validation
     * @returns {Promise<Object>} Search results
     */
    async search(query, category) {
        // Validate category type
        if (!this.isAvailableForCategory(category)) {
            return { error: 'Movie search is only available for movie categories.' };
        }

        // Validate query
        if (!query || !query.trim()) {
            return { error: 'Search query is required.' };
        }

        try {
            return await this.api.searchMovies(query.trim());
        } catch (error) {
            console.error('Movie search error:', error);
            return { error: 'Failed to search for movies. Please try again.' };
        }
    }

    /**
     * Handle movie selection for item modal
     * @param {Object} movie - Selected movie object
     * @param {Object} formElements - Form elements to populate
     */
    populateItemForm(movie, formElements) {
        const {
            itemNameInput,
            itemTitleMovieInput,
            itemDirectorInput,
            itemYearInput,
            itemUrlInput,
            itemPriceInput,
            movieSearchResults,
            movieSearchQuery
        } = formElements;

        if (itemNameInput) {
            itemNameInput.value = movie.name || `${movie.title} (${movie.year})`;
        }
        if (itemTitleMovieInput) {
            itemTitleMovieInput.value = movie.title;
        }
        if (itemDirectorInput) {
            itemDirectorInput.value = movie.director;
        }
        if (itemYearInput) {
            itemYearInput.value = movie.year || '';
        }
        if (itemUrlInput) {
            itemUrlInput.value = movie.url;
        }
        if (itemPriceInput) {
            itemPriceInput.value = movie.price.toFixed(2);
        }
        if (movieSearchResults) {
            movieSearchResults.innerHTML = '';
        }
        if (movieSearchQuery) {
            movieSearchQuery.value = '';
        }
    }

    /**
     * Handle movie selection for direct addition to category
     * @param {Object} movie - Selected movie object
     * @param {Object} category - Target category
     * @param {Function} onSuccess - Success callback
     * @returns {Promise<Object>} Created item or error
     */
    async addToCategory(movie, category, onSuccess) {
        try {
            // Create display name for the movie
            const displayName = movie.name || `${movie.title} (${movie.year})`;
            
            // Create the item via API
            const newItem = await this.api.createItem(
                category.id, 
                displayName, 
                movie.url, 
                movie.price, 
                movie.title, 
                null, // author (not used for movies)
                movie.director,
                movie.year,
                movie.trackId  // Include iTunes track ID for accurate price refresh
            );
            
            // Add price source to the item for display
            newItem.priceSource = movie.priceSource;
            
            // Call success callback if provided
            if (onSuccess) {
                onSuccess(newItem);
            }
            
            return { success: true, item: newItem };
            
        } catch (error) {
            console.error('Failed to add movie:', error);
            this.showError('Failed to add movie');
            return { success: false, error: error.message };
        }
    }

    /**
     * Format movie price with currency symbol
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
     * Generate HTML for movie search results
     * @param {Array} movies - Array of movie objects
     * @param {boolean} isInItemModal - Whether this is for item modal
     * @param {Function} priceSourceIndicator - Function to get price source indicator
     * @returns {string} HTML string for results
     */
    generateResultsHTML(movies, isInItemModal, priceSourceIndicator) {
        return movies.map(movie => {
            const priceIndicator = priceSourceIndicator ? priceSourceIndicator(movie.priceSource) : '';
            return `
                <div class="search-result-item" onclick="movieSearch.selectMovie(${JSON.stringify(movie).replace(/"/g, '&quot;')}, ${isInItemModal})">
                    <div class="search-result-title">${movie.title}</div>
                    <div class="search-result-author">Directed by ${movie.director} (${movie.year || 'Unknown Year'})</div>
                    <div class="search-result-price">
                        ${this.formatPrice(movie.price, movie.currency)}
                        ${priceIndicator}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Handle movie selection from generated HTML onclick handlers
     * @param {Object} movie - Selected movie object
     * @param {boolean} isInItemModal - Whether this is for item modal
     */
    selectMovie(movie, isInItemModal) {
        // Delegate to the main app's selectMovie method
        if (window.app && window.app.selectMovie) {
            window.app.selectMovie(movie, isInItemModal);
        }
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
    
    // Export MovieSearch
    universalExport(MovieSearch);
})();