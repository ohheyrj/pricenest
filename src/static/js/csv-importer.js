/**
 * CSV Importer Module
 * Handles complete CSV import workflow for movies including preview, processing, and final import
 * 
 * @module CSVImporter
 */

/**
 * CSVImporter class manages the entire CSV import process
 * Includes file selection, preview, duplicate handling, manual corrections, and final import
 */
class CSVImporter {
    /**
     * Create a new CSVImporter instance
     * @param {APIClient} apiClient - The API client for backend communication
     * @param {Function} showError - Error display function from main app
     * @param {Function} showSuccess - Success display function from main app
     * @param {Function} refreshData - Data refresh function from main app
     */
    constructor(apiClient, showError, showSuccess, refreshData) {
        this.api = apiClient;
        this.showError = showError;
        this.showSuccess = showSuccess;
        this.refreshData = refreshData;
        
        // CSV import state
        this.csvPreviewData = null;
        this.currentCsvCategoryId = null;
        this.currentCategoryIndex = null;
        
        this.initializeElements();
        this.bindEvents();
    }

    /**
     * Initialize DOM elements used by the CSV importer
     */
    initializeElements() {
        this.csvImportModal = document.getElementById('csv-import-modal');
        this.csvFileInput = document.getElementById('csv-file-input');
        this.csvImportForm = document.getElementById('csv-import-form');
    }

    /**
     * Bind event listeners for CSV import functionality
     */
    bindEvents() {
        // Cancel button
        document.getElementById('cancel-csv-import').addEventListener('click', () => this.closeCsvImportModal());
        
        // Form submission
        this.csvImportForm.addEventListener('submit', (e) => this.handleCsvImport(e));
        
        // File selection
        this.csvFileInput.addEventListener('change', (e) => this.handleFileSelection(e));
    }

    /**
     * Open the CSV import modal for a specific category
     * @param {number} categoryIndex - Index of the category to import into
     * @param {Object} category - Category object with id and name
     */
    openCsvImportModal(categoryIndex, category) {
        this.currentCategoryIndex = categoryIndex;
        this.currentCsvCategoryId = category.id;
        
        // Reset form and UI state
        this.csvImportForm.reset();
        document.getElementById('csv-progress').style.display = 'none';
        document.getElementById('csv-results').style.display = 'none';
        
        // Show modal and focus file input
        this.csvImportModal.style.display = 'block';
        this.csvFileInput.focus();
    }

    /**
     * Close the CSV import modal and reset state
     */
    closeCsvImportModal() {
        this.csvImportModal.style.display = 'none';
        this.currentCsvCategoryId = null;
        
        // Reset form and UI
        this.csvImportForm.reset();
        document.getElementById('csv-progress').style.display = 'none';
        document.getElementById('csv-results').style.display = 'none';
    }

    /**
     * Handle file selection change event
     * @param {Event} event - File input change event
     */
    handleFileSelection(event) {
        const file = event.target.files[0];
        const label = document.querySelector('#csv-import-modal label[for="csv-file-input"]');
        
        if (file) {
            label.textContent = `Selected: ${file.name}`;
            label.style.color = '#4CAF50';
        } else {
            label.textContent = 'Choose CSV file or drag and drop';
            label.style.color = '';
        }
    }

    /**
     * Handle CSV import form submission
     * @param {Event} event - Form submit event
     */
    async handleCsvImport(event) {
        event.preventDefault();
        
        const file = this.csvFileInput.files[0];
        if (!file) {
            this.showError('Please select a CSV file.');
            return;
        }
        
        if (!this.currentCsvCategoryId) {
            this.showError('No category selected for import.');
            return;
        }
        
        try {
            // Show progress with loading animation
            const progressDiv = document.getElementById('csv-progress');
            const progressFill = document.getElementById('csv-progress-fill');
            const progressText = document.getElementById('csv-progress-text');
            
            progressDiv.style.display = 'block';
            document.getElementById('csv-results').style.display = 'none';
            
            // Add indeterminate animation
            if (progressFill) {
                progressFill.classList.add('indeterminate');
            }
            
            if (progressText) {
                progressText.textContent = 'Parsing CSV file and searching for movies...';
            }
            
            // Create FormData and call API
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category_id', this.currentCsvCategoryId);
            
            console.log('🚀 Starting CSV preview process...');
            const previewData = await this.api.previewMovieCSV(formData);
            console.log('✅ CSV preview completed');
            
            // Remove indeterminate animation
            if (progressFill) {
                progressFill.classList.remove('indeterminate');
            }
            
            // Debug: Log the response to see what we got
            console.log('CSV Preview Data:', previewData);
            
            // Store preview data with category information
            this.csvPreviewData = {
                category_id: this.currentCsvCategoryId,
                results: previewData.results || []
            };
            
            // Debug: Log what we're about to display
            console.log('Results to display:', this.csvPreviewData.results);
            console.log('Results count:', this.csvPreviewData.results.length);
            
            // Hide progress and show results
            document.getElementById('csv-progress').style.display = 'none';
            this.showCsvPreviewResults(previewData);
            
        } catch (error) {
            console.error('CSV import failed:', error);
            document.getElementById('csv-progress').style.display = 'none';
            this.showError('Failed to process CSV file: ' + error.message);
        }
    }

    /**
     * Display CSV preview results with interactive elements
     * @param {Object} previewData - Preview data from API
     * @param {boolean} preserveState - Whether to preserve current UI state
     */
    showCsvPreviewResults(previewData, preserveState = false) {
        const resultsDiv = document.getElementById('csv-results');
        const results = previewData.results || [];
        
        // Calculate summary statistics
        const stats = this.calculateSummaryStats(results);
        
        // Create results HTML
        resultsDiv.innerHTML = `
            <div class="csv-summary">
                <h3>Import Preview</h3>
                <div class="summary-stats">
                    <span class="stat-item">Found: <strong>${stats.found}</strong></span>
                    <span class="stat-item">Pending: <strong>${stats.pending}</strong></span>
                    <span class="stat-item">Duplicates: <strong>${stats.duplicates}</strong></span>
                    <span class="stat-item">Errors: <strong>${stats.errors}</strong></span>
                </div>
                
                <div class="filter-controls">
                    <button type="button" class="btn btn-small filter-btn active" data-filter="all">All (${stats.total})</button>
                    <button type="button" class="btn btn-small filter-btn" data-filter="found">Found (${stats.found})</button>
                    <button type="button" class="btn btn-small filter-btn" data-filter="not_found">Pending (${stats.pending})</button>
                    <button type="button" class="btn btn-small filter-btn" data-filter="duplicate">Duplicates (${stats.duplicates})</button>
                    <button type="button" class="btn btn-small filter-btn" data-filter="error">Errors (${stats.errors})</button>
                </div>
            </div>
            
            <div class="bulk-actions" id="bulk-actions" style="display: none;">
                <div class="bulk-actions-content">
                    <span id="selection-count">0 movies selected</span>
                    <button type="button" class="btn btn-small btn-secondary" onclick="csvImporter.clearMovieSelection()">Clear Selection</button>
                    <button type="button" class="btn btn-small btn-danger" onclick="csvImporter.bulkDeleteMovies()">Delete Selected</button>
                </div>
            </div>
            
            <div class="preview-movies" id="preview-movies">
                ${results.map((result, index) => this.renderPreviewMovieRow(result, index)).join('')}
            </div>
            
            <div class="csv-actions">
                <button type="button" class="btn btn-secondary" onclick="csvImporter.closeCsvImportModal()">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="csvImporter.confirmCsvImport()">Import Movies</button>
            </div>
        `;
        
        // Show results
        resultsDiv.style.display = 'block';
        
        // Bind filter events
        this.bindFilterEvents();
        
        // Bind checkbox events for bulk actions
        this.bindBulkActionEvents();
    }

    /**
     * Format price with correct currency symbol
     * @param {number} price - Price value
     * @param {string} currency - Currency code (USD, GBP, etc.)
     * @returns {string} Formatted price string
     */
    formatPrice(price, currency) {
        if (price === null || price === undefined) {
            return 'Unknown';
        }
        
        // Currency symbol mapping
        const currencySymbols = {
            'GBP': '£',
            'USD': '$',
            'EUR': '€',
            'CAD': 'C$',
            'AUD': 'A$'
        };
        
        const symbol = currencySymbols[currency] || '$';
        return `${symbol}${price.toFixed(2)}`;
    }

    /**
     * Calculate summary statistics for preview results
     * @param {Array} results - Array of preview results
     * @returns {Object} Statistics object
     */
    calculateSummaryStats(results) {
        const stats = {
            total: 0,
            found: 0,
            pending: 0,
            duplicates: 0,
            errors: 0
        };
        
        results.forEach(result => {
            if (result.deleted) return; // Skip deleted items
            
            stats.total++;
            if (result.status === 'found') stats.found++;
            else if (result.status === 'not_found') stats.pending++;
            else if (result.status === 'duplicate') stats.duplicates++;
            else if (result.status === 'error') stats.errors++;
        });
        
        return stats;
    }

    /**
     * Filter preview movies by status
     * @param {string} filter - Filter type (all, found, not_found, duplicate, error)
     */
    filterPreviewMovies(filter) {
        const movieRows = document.querySelectorAll('.preview-movie-row');
        
        console.log(`🔍 Filtering by: ${filter}, Found ${movieRows.length} rows`);
        
        movieRows.forEach(row => {
            const status = row.dataset.status;
            const isDeleted = row.dataset.deleted === 'true';
            
            console.log(`Row status: ${status}, deleted: ${isDeleted}`);
            
            if (filter === 'all' || status === filter) {
                row.style.display = isDeleted ? 'none' : 'block';
            } else {
                row.style.display = 'none';
            }
        });
        
        this.updateSelectionDisplay();
    }

    /**
     * Render a preview movie row
     * @param {Object} result - Movie result object
     * @param {number} index - Index in results array
     * @returns {string} HTML string for the movie row
     */
    renderPreviewMovieRow(result, index) {
        // Don't render deleted movies
        if (result.deleted) {
            return '';
        }
        
        const statusClass = result.status === 'found' ? 'success' : 
                           result.status === 'duplicate' ? 'warning' : 'error';
        
        let actionsHtml = '';
        let statusText = '';
        
        // Generate actions and status based on result status
        switch (result.status) {
            case 'found':
                statusText = '✅ Ready to import';
                actionsHtml = `
                    <button type="button" class="btn btn-small btn-danger" onclick="csvImporter.deleteMovieFromPreview(${index})">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                `;
                break;
                
            case 'not_found':
                statusText = '🔍 Movie not found';
                actionsHtml = `
                    <button type="button" class="btn btn-small btn-primary" onclick="csvImporter.openManualSearch(${index})">
                        <i class="fas fa-search"></i> Search
                    </button>
                    <button type="button" class="btn btn-small btn-secondary" onclick="csvImporter.openManualAddModal(${index}, false)">
                        <i class="fas fa-plus"></i> Add Manually
                    </button>
                    <button type="button" class="btn btn-small btn-danger" onclick="csvImporter.deleteMovieFromPreview(${index})">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                `;
                break;
                
            case 'duplicate':
                statusText = '⚠️ Already exists';
                actionsHtml = `
                    <button type="button" class="btn btn-small btn-warning" onclick="csvImporter.overrideDuplicateMovie(${index})">
                        <i class="fas fa-check"></i> Import Anyway
                    </button>
                    <button type="button" class="btn btn-small btn-danger" onclick="csvImporter.deleteMovieFromPreview(${index})">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                `;
                break;
                
            case 'error':
                statusText = '❌ Error: ' + (result.error || 'Unknown error');
                actionsHtml = `
                    <button type="button" class="btn btn-small btn-secondary" onclick="csvImporter.openManualAddModal(${index}, false)">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button type="button" class="btn btn-small btn-danger" onclick="csvImporter.deleteMovieFromPreview(${index})">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                `;
                break;
        }
        
        return `
            <div class="preview-movie-row ${statusClass}" data-status="${result.status}" data-index="${index}">
                <div class="movie-checkbox">
                    <input type="checkbox" id="movie-${index}" class="movie-select-checkbox">
                </div>
                <div class="movie-artwork">
                    ${result.artwork ? `<img src="${result.artwork}" alt="Movie poster">` : '<div class="no-artwork">No Image</div>'}
                </div>
                <div class="movie-details">
                    <h4>${result.title || result.name}</h4>
                    <p><strong>Director:</strong> ${result.director || 'Unknown'}</p>
                    <p><strong>Year:</strong> ${result.year || 'Unknown'}</p>
                    <p><strong>Price:</strong> ${this.formatPrice(result.price, result.currency)}</p>
                    <p class="status-text">${statusText}</p>
                </div>
                <div class="movie-actions">
                    ${actionsHtml}
                </div>
            </div>
        `;
    }

    /**
     * Bind filter button events
     */
    bindFilterEvents() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active filter
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Apply filter
                this.filterPreviewMovies(btn.dataset.filter);
            });
        });
    }

    /**
     * Bind bulk action checkbox events
     */
    bindBulkActionEvents() {
        document.querySelectorAll('.movie-select-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateSelectionDisplay());
        });
    }

    /**
     * Update the bulk actions display based on selections
     */
    updateSelectionDisplay() {
        const checkboxes = document.querySelectorAll('.movie-select-checkbox:checked');
        const bulkActions = document.getElementById('bulk-actions');
        const selectionCount = document.getElementById('selection-count');
        
        if (checkboxes.length > 0) {
            bulkActions.style.display = 'block';
            selectionCount.textContent = `${checkboxes.length} movie${checkboxes.length === 1 ? '' : 's'} selected`;
        } else {
            bulkActions.style.display = 'none';
        }
    }

    /**
     * Clear all movie selections
     */
    clearMovieSelection() {
        document.querySelectorAll('.movie-select-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateSelectionDisplay();
    }

    /**
     * Bulk delete selected movies
     */
    bulkDeleteMovies() {
        const checkboxes = document.querySelectorAll('.movie-select-checkbox:checked');
        
        if (checkboxes.length === 0) {
            this.showError('No movies selected for deletion.');
            return;
        }
        
        if (!confirm(`Are you sure you want to remove ${checkboxes.length} movie(s) from the import?`)) {
            return;
        }
        
        // Mark movies as deleted
        checkboxes.forEach(checkbox => {
            const index = parseInt(checkbox.id.replace('movie-', ''));
            if (this.csvPreviewData && this.csvPreviewData.results[index]) {
                this.csvPreviewData.results[index].deleted = true;
            }
        });
        
        // Re-render preview
        this.showCsvPreviewResults(this.csvPreviewData, true);
    }

    /**
     * Override duplicate movie to allow import
     * @param {number} movieIndex - Index of the movie in results
     */
    overrideDuplicateMovie(movieIndex) {
        if (!this.csvPreviewData || !this.csvPreviewData.results[movieIndex]) {
            this.showError('Movie not found in preview data.');
            return;
        }
        
        const movie = this.csvPreviewData.results[movieIndex];
        
        if (!confirm(`Are you sure you want to import "${movie.title}" even though it already exists?`)) {
            return;
        }
        
        // Change status to found to allow import
        movie.status = 'found';
        movie.duplicate_override = true;
        
        // Re-render preview
        this.showCsvPreviewResults(this.csvPreviewData, true);
    }

    /**
     * Delete a movie from the preview
     * @param {number} movieIndex - Index of the movie to delete
     */
    deleteMovieFromPreview(movieIndex) {
        if (!this.csvPreviewData || !this.csvPreviewData.results[movieIndex]) {
            this.showError('Movie not found in preview data.');
            return;
        }
        
        const movie = this.csvPreviewData.results[movieIndex];
        
        if (!confirm(`Are you sure you want to remove "${movie.title || movie.name}" from the import?`)) {
            return;
        }
        
        // Mark as deleted
        movie.deleted = true;
        
        // Re-render preview
        this.showCsvPreviewResults(this.csvPreviewData, true);
    }

    /**
     * Open manual search modal for a movie
     * @param {number} resultIndex - Index of the result to search for
     */
    openManualSearch(resultIndex) {
        const result = this.csvPreviewData.results[resultIndex];
        if (!result) return;
        
        // Create search modal HTML
        const searchModalHtml = `
            <div class="modal" id="manual-search-modal" style="display: block;">
                <div class="modal-content">
                    <span class="close" onclick="csvImporter.closeManualSearchModal()">&times;</span>
                    <h2>Search for: ${result.title || result.name}</h2>
                    <div class="search-form">
                        <input type="text" id="manual-search-input" placeholder="Enter movie title..." value="${result.title || result.name}">
                        <button class="btn btn-primary" onclick="csvImporter.performManualSearch(${resultIndex})">Search</button>
                    </div>
                    <div id="manual-search-results"></div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', searchModalHtml);
        document.getElementById('manual-search-input').focus();
    }

    /**
     * Close manual search modal
     */
    closeManualSearchModal() {
        const modal = document.getElementById('manual-search-modal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Perform manual search for a movie
     * @param {number} resultIndex - Index of the result to search for
     */
    async performManualSearch(resultIndex) {
        const searchInput = document.getElementById('manual-search-input');
        const query = searchInput.value.trim();
        
        if (!query) {
            this.showError('Please enter a search term.');
            return;
        }
        
        try {
            const searchResults = await this.api.searchMovies(query);
            this.displayManualSearchResults(searchResults.movies || [], resultIndex);
        } catch (error) {
            console.error('Manual search failed:', error);
            this.showError('Search failed: ' + error.message);
        }
    }

    /**
     * Display manual search results
     * @param {Array} movies - Array of movie search results
     * @param {number} resultIndex - Index of the original result
     */
    displayManualSearchResults(movies, resultIndex) {
        const resultsDiv = document.getElementById('manual-search-results');
        
        if (movies.length === 0) {
            resultsDiv.innerHTML = '<p>No movies found. Try a different search term.</p>';
            return;
        }
        
        const resultsHtml = movies.map((movie, index) => `
            <div class="search-result-item">
                <div class="movie-artwork">
                    ${movie.artwork ? `<img src="${movie.artwork}" alt="Movie poster">` : '<div class="no-artwork">No Image</div>'}
                </div>
                <div class="movie-details">
                    <h4>${movie.title}</h4>
                    <p><strong>Director:</strong> ${movie.director || 'Unknown'}</p>
                    <p><strong>Year:</strong> ${movie.year || 'Unknown'}</p>
                    <p><strong>Price:</strong> ${this.formatPrice(movie.price, movie.currency)}</p>
                </div>
                <div class="movie-actions">
                    <button class="btn btn-primary" onclick="csvImporter.selectManualSearchResult(${resultIndex}, ${index})">
                        Select This Movie
                    </button>
                </div>
            </div>
        `).join('');
        
        resultsDiv.innerHTML = `
            <h3>Search Results:</h3>
            <div class="search-results-list">
                ${resultsHtml}
            </div>
            <div class="search-actions">
                <button class="btn btn-secondary" onclick="csvImporter.closeManualSearchModal()">Cancel</button>
                <button class="btn btn-secondary" onclick="csvImporter.openManualAddModal(${resultIndex}, false)">Add Manually Instead</button>
            </div>
        `;
        
        // Store search results for selection
        this.currentSearchResults = movies;
    }

    /**
     * Select a movie from manual search results
     * @param {number} resultIndex - Index of the original result
     * @param {number} movieIndex - Index of the selected movie
     */
    selectManualSearchResult(resultIndex, movieIndex) {
        const selectedMovie = this.currentSearchResults[movieIndex];
        const originalResult = this.csvPreviewData.results[resultIndex];
        
        // Update the original result with selected movie data
        Object.assign(originalResult, {
            ...selectedMovie,
            status: 'found',
            manually_selected: true
        });
        
        // Close modal and refresh preview
        this.closeManualSearchModal();
        this.showCsvPreviewResults(this.csvPreviewData, true);
        
        this.showSuccess(`Selected "${selectedMovie.title}" for import.`);
    }

    /**
     * Open manual add modal for direct movie entry
     * @param {number} resultIndex - Index of the result to edit
     * @param {boolean} isDirectAdd - Whether this is a direct add or edit
     */
    openManualAddModal(resultIndex, isDirectAdd = false) {
        const result = this.csvPreviewData.results[resultIndex];
        if (!result) return;
        
        // Create manual add modal HTML
        const modalHtml = `
            <div class="modal" id="manual-add-modal" style="display: block;">
                <div class="modal-content">
                    <span class="close" onclick="csvImporter.closeManualAddModal()">&times;</span>
                    <h2>${isDirectAdd ? 'Add Movie Manually' : 'Edit Movie Details'}</h2>
                    <form id="manual-add-form">
                        <div class="form-group">
                            <label for="manual-title">Title:</label>
                            <input type="text" id="manual-title" value="${result.title || result.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="manual-director">Director:</label>
                            <input type="text" id="manual-director" value="${result.director || ''}">
                        </div>
                        <div class="form-group">
                            <label for="manual-year">Year:</label>
                            <input type="number" id="manual-year" value="${result.year || ''}" min="1900" max="2030">
                        </div>
                        <div class="form-group">
                            <label for="manual-price">Price:</label>
                            <input type="number" id="manual-price" value="${result.price || ''}" min="0" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label for="manual-url">URL:</label>
                            <input type="url" id="manual-url" value="${result.url || ''}" required>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="csvImporter.closeManualAddModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Movie</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Bind form submission
        document.getElementById('manual-add-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveManualMovie(resultIndex, isDirectAdd);
        });
        
        document.getElementById('manual-title').focus();
    }

    /**
     * Close manual add modal
     */
    closeManualAddModal() {
        const modal = document.getElementById('manual-add-modal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Save manually entered movie data
     * @param {number} resultIndex - Index of the result to update
     * @param {boolean} isDirectAdd - Whether this is a direct add
     */
    saveManualMovie(resultIndex, isDirectAdd) {
        const title = document.getElementById('manual-title').value.trim();
        const director = document.getElementById('manual-director').value.trim();
        const year = document.getElementById('manual-year').value;
        const price = document.getElementById('manual-price').value;
        const url = document.getElementById('manual-url').value.trim();
        
        if (!title || !price || !url) {
            this.showError('Please fill in all required fields (Title, Price, URL).');
            return;
        }
        
        // Update the result with manual data
        const result = this.csvPreviewData.results[resultIndex];
        Object.assign(result, {
            title,
            director: director || 'Unknown',
            year: year ? parseInt(year) : null,
            price: parseFloat(price),
            url,
            status: 'found',
            manually_added: true,
            artwork: result.artwork || '' // Preserve existing artwork if any
        });
        
        // Close modal and refresh preview
        this.closeManualAddModal();
        this.showCsvPreviewResults(this.csvPreviewData, true);
        
        this.showSuccess(`Movie "${title}" updated successfully.`);
    }

    /**
     * Confirm and execute the final CSV import
     */
    async confirmCsvImport() {
        if (!this.csvPreviewData || !this.csvPreviewData.results) {
            this.showError('No preview data available for import.');
            return;
        }
        
        // Get movies that are ready for import (status 'found' and not deleted)
        const confirmedMovies = this.csvPreviewData.results.filter(movie => 
            movie.status === 'found' && !movie.deleted
        );
        
        if (confirmedMovies.length === 0) {
            this.showError('No movies are ready for import. Please resolve all issues first.');
            return;
        }
        
        // Check for any unresolved movies
        const unresolvedMovies = this.csvPreviewData.results.filter(movie => 
            movie.status !== 'found' && !movie.deleted
        );
        
        if (unresolvedMovies.length > 0) {
            const proceed = confirm(
                `${unresolvedMovies.length} movie(s) still have issues and will be skipped. ` +
                `Do you want to proceed with importing ${confirmedMovies.length} movie(s)?`
            );
            
            if (!proceed) {
                return;
            }
        }
        
        try {
            // Show progress
            const importProgress = document.createElement('div');
            importProgress.className = 'import-progress';
            importProgress.innerHTML = `
                <h3>Importing Movies...</h3>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <p>Importing ${confirmedMovies.length} movies...</p>
            `;
            
            const csvResults = document.getElementById('csv-results');
            csvResults.innerHTML = '';
            csvResults.appendChild(importProgress);
            
            // Call import API
            const result = await this.api.importConfirmedMovies(this.currentCsvCategoryId, confirmedMovies);
            
            // Show success
            csvResults.innerHTML = `
                <div class="import-success">
                    <h3>✅ Import Complete!</h3>
                    <p>Successfully imported ${result.imported_count || confirmedMovies.length} movies.</p>
                    <button class="btn btn-primary" onclick="csvImporter.closeCsvImportModal()">Close</button>
                </div>
            `;
            
            // Refresh main data
            await this.refreshData();
            
            this.showSuccess(`Successfully imported ${result.imported_count || confirmedMovies.length} movies!`);
            
        } catch (error) {
            console.error('Import failed:', error);
            this.showError('Import failed: ' + error.message);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSVImporter;
}