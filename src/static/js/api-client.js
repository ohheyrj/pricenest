/**
 * API Client Module
 * Handles all communication with the Python backend API
 * 
 * @module APIClient
 */

/**
 * APIClient class for making requests to the backend API
 * Provides methods for all API endpoints including categories, items, books, movies, and database operations
 */
class APIClient {
    /**
     * Create a new APIClient instance
     * @param {string} baseURL - The base URL for API requests (default: '/api')
     */
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
    }

    /**
     * Make a request to the API
     * @param {string} endpoint - The API endpoint to call
     * @param {Object} options - Fetch options (method, body, headers, etc.)
     * @returns {Promise<Object>} The JSON response from the API
     * @throws {Error} If the request fails or returns a non-OK status
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                ...(!(options.body instanceof FormData) && { 'Content-Type': 'application/json' }),
                ...options.headers,
            },
            ...options,
        };

        if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(error.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // ===== CATEGORIES =====

    /**
     * Get all categories with their items
     * @returns {Promise<Array>} Array of category objects
     */
    async getCategories() {
        return await this.request('/categories');
    }

    /**
     * Create a new category
     * @param {string} name - Category name
     * @param {string} type - Category type (general, books, movies)
     * @param {boolean} bookLookupEnabled - Enable book lookup for this category
     * @param {string} bookLookupSource - Book lookup source (auto, google, kobo)
     * @returns {Promise<Object>} The created category
     */
    async createCategory(name, type = 'general', bookLookupEnabled = false, bookLookupSource = 'auto') {
        return await this.request('/categories', {
            method: 'POST',
            body: { name, type, bookLookupEnabled, bookLookupSource }
        });
    }

    /**
     * Update an existing category
     * @param {number} id - Category ID
     * @param {string} name - Category name
     * @param {string} type - Category type
     * @param {boolean} bookLookupEnabled - Enable book lookup
     * @param {string} bookLookupSource - Book lookup source
     * @returns {Promise<Object>} The updated category
     */
    async updateCategory(id, name, type = 'general', bookLookupEnabled = false, bookLookupSource = 'auto') {
        return await this.request(`/categories/${id}`, {
            method: 'PUT',
            body: { name, type, bookLookupEnabled, bookLookupSource }
        });
    }

    /**
     * Delete a category
     * @param {number} id - Category ID to delete
     * @returns {Promise<Object>} Success response
     */
    async deleteCategory(id) {
        return await this.request(`/categories/${id}`, {
            method: 'DELETE'
        });
    }

    // ===== ITEMS =====

    /**
     * Create a new item in a category
     * @param {number} categoryId - Category ID
     * @param {string} name - Item name
     * @param {string} url - Item URL
     * @param {number} price - Item price
     * @param {string} title - Optional title (for books/movies)
     * @param {string} author - Optional author (for books)
     * @param {string} director - Optional director (for movies)
     * @param {number} year - Optional year (for movies)
     * @param {string} trackId - Optional track ID (for movies)
     * @returns {Promise<Object>} The created item
     */
    async createItem(categoryId, name, url, price, title = null, author = null, director = null, year = null, trackId = null) {
        const body = { name, url, price };
        if (title) body.title = title;
        if (author) body.author = author;
        if (director) body.director = director;
        if (year) body.year = year;
        if (trackId) body.trackId = trackId;
        
        return await this.request(`/categories/${categoryId}/items`, {
            method: 'POST',
            body: body
        });
    }

    /**
     * Update an existing item
     * @param {number} id - Item ID
     * @param {string} name - Item name
     * @param {string} url - Item URL
     * @param {number} price - Item price
     * @param {string} title - Optional title
     * @param {string} author - Optional author
     * @param {string} director - Optional director
     * @param {number} year - Optional year
     * @returns {Promise<Object>} The updated item
     */
    async updateItem(id, name, url, price, title = null, author = null, director = null, year = null) {
        const body = { name, url, price };
        if (title) body.title = title;
        if (author) body.author = author;
        if (director) body.director = director;
        if (year) body.year = year;
        
        return await this.request(`/items/${id}`, {
            method: 'PUT',
            body: body
        });
    }

    /**
     * Toggle the bought status of an item
     * @param {number} id - Item ID
     * @returns {Promise<Object>} The updated item
     */
    async toggleItemBought(id) {
        return await this.request(`/items/${id}/bought`, {
            method: 'PATCH'
        });
    }

    /**
     * Delete an item
     * @param {number} id - Item ID to delete
     * @returns {Promise<Object>} Success response
     */
    async deleteItem(id) {
        return await this.request(`/items/${id}`, {
            method: 'DELETE'
        });
    }

    /**
     * Refresh the price of an item
     * @param {number} id - Item ID
     * @returns {Promise<Object>} The updated item with new price
     */
    async refreshItemPrice(id) {
        return await this.request(`/items/${id}/refresh-price`, {
            method: 'PATCH'
        });
    }

    /**
     * Get price history for an item
     * @param {number} id - Item ID
     * @returns {Promise<Array>} Array of price history entries
     */
    async getItemPriceHistory(id) {
        return await this.request(`/items/${id}/price-history`);
    }

    // ===== BOOKS =====

    /**
     * Search for books
     * @param {string} query - Search query
     * @param {string} source - Search source (auto, google, kobo)
     * @returns {Promise<Object>} Search results with books array
     */
    async searchBooks(query, source = 'auto') {
        return await this.request(`/books/search?query=${encodeURIComponent(query)}&source=${source}`);
    }

    // ===== MOVIES =====

    /**
     * Search for movies
     * @param {string} query - Search query
     * @returns {Promise<Object>} Search results with movies array
     */
    async searchMovies(query) {
        return await this.request('/movies/search', {
            method: 'POST',
            body: { query }
        });
    }

    /**
     * Preview CSV file for movie import
     * @param {FormData} formData - Form data containing the CSV file
     * @returns {Promise<Object>} Preview results with parsed movies
     */
    async previewMovieCSV(formData) {
        return await this.request('/movies/preview-csv', {
            method: 'POST',
            body: formData
        });
    }

    /**
     * Import confirmed movies from CSV preview
     * @param {number} categoryId - Category ID to import into
     * @param {Array} confirmedMovies - Array of confirmed movie objects
     * @returns {Promise<Object>} Import results
     */
    async importConfirmedMovies(categoryId, confirmedMovies) {
        return await this.request('/movies/import-confirmed', {
            method: 'POST',
            body: { category_id: categoryId, confirmed_movies: confirmedMovies }
        });
    }
    
    /**
     * Add a movie manually without search
     * @param {number} categoryId - Category ID
     * @param {Object} movieData - Movie data object
     * @returns {Promise<Object>} The created movie item
     */
    async addManualMovie(categoryId, movieData) {
        return await this.request('/movies/add-manual-movie', {
            method: 'POST',
            body: { 
                category_id: categoryId,
                title: movieData.title,
                director: movieData.director,
                year: movieData.year,
                url: movieData.url,
                price: movieData.price
            }
        });
    }

    /**
     * Process pending movie searches
     * @returns {Promise<Object>} Processing results
     */
    async processPendingMovies() {
        return await this.request('/movies/process-pending', {
            method: 'POST'
        });
    }

    // ===== DATABASE =====

    /**
     * Get database configuration
     * @returns {Promise<Object>} Database config information
     */
    async getDatabaseConfig() {
        return await this.request('/database/config');
    }

    /**
     * Migrate data from local storage to database
     * @param {Array} data - Data to migrate
     * @returns {Promise<Object>} Migration results
     */
    async migrateData(data) {
        return await this.request('/database/migrate', {
            method: 'POST',
            body: { data }
        });
    }
}

// Export for use in other modules
// Using both CommonJS and ES6 module syntax for compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIClient;
}