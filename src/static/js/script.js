// Simple API client for communicating with Python backend
class APIClient {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
    }

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

    // Categories
    async getCategories() {
        return await this.request('/categories');
    }

    async createCategory(name, type = 'general', bookLookupEnabled = false, bookLookupSource = 'auto') {
        return await this.request('/categories', {
            method: 'POST',
            body: { name, type, bookLookupEnabled, bookLookupSource }
        });
    }

    async updateCategory(id, name, type = 'general', bookLookupEnabled = false, bookLookupSource = 'auto') {
        return await this.request(`/categories/${id}`, {
            method: 'PUT',
            body: { name, type, bookLookupEnabled, bookLookupSource }
        });
    }

    async deleteCategory(id) {
        return await this.request(`/categories/${id}`, {
            method: 'DELETE'
        });
    }

    // Items
    async createItem(categoryId, name, url, price, title = null, author = null, director = null, year = null) {
        const body = { name, url, price };
        if (title) body.title = title;
        if (author) body.author = author;
        if (director) body.director = director;
        if (year) body.year = year;
        
        return await this.request(`/categories/${categoryId}/items`, {
            method: 'POST',
            body: body
        });
    }

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

    async toggleItemBought(id) {
        return await this.request(`/items/${id}/bought`, {
            method: 'PATCH'
        });
    }

    async deleteItem(id) {
        return await this.request(`/items/${id}`, {
            method: 'DELETE'
        });
    }

    async refreshItemPrice(id) {
        return await this.request(`/items/${id}/refresh-price`, {
            method: 'PATCH'
        });
    }

    async getPriceHistory(id) {
        return await this.request(`/items/${id}/history`);
    }

    // Books
    async searchBooks(query, source = 'auto') {
        return await this.request(`/books/search?query=${encodeURIComponent(query)}&source=${source}`);
    }

    // Movies
    async searchMovies(query) {
        return await this.request('/movies/search', {
            method: 'POST',
            body: { query }
        });
    }

    async previewMovieCSV(formData) {
        return await this.request('/movies/preview-csv', {
            method: 'POST',
            body: formData
        });
    }

    async importConfirmedMovies(categoryId, confirmedMovies) {
        return await this.request('/movies/import-confirmed', {
            method: 'POST',
            body: { category_id: categoryId, confirmed_movies: confirmedMovies }
        });
    }
    
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

    async processPendingMovies() {
        return await this.request('/movies/process-pending', {
            method: 'POST'
        });
    }

    // Database
    async getDatabaseConfig() {
        return await this.request('/database/config');
    }

    async migrateData(data) {
        return await this.request('/database/migrate', {
            method: 'POST',
            body: { data }
        });
    }
}

class PriceNest {
    constructor() {
        this.categories = [];
        this.currentCategoryIndex = null;
        this.currentItemIndex = null;
        this.editingCategory = false;
        this.editingItem = false;
        this.api = new APIClient();
        this.settings = this.loadSettings();
        
        this.initializeElements();
        this.bindEvents();
        this.initialize();
    }

    async initialize() {
        try {
            await this.loadData();
            await this.checkForMigration();
            this.updateUIForSettings(); // Apply settings on startup
        } catch (error) {
            console.error('Failed to initialize:', error);
            this.showError('Failed to load data from database');
        }
    }

    async loadData() {
        try {
            this.categories = await this.api.getCategories();
            this.render();
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showError('Failed to load data from database');
        }
    }

    async checkForMigration() {
        const localData = this.loadFromStorage();
        if (localData && localData.length > 0 && this.categories.length === 0) {
            if (confirm('Found existing data in browser storage. Would you like to migrate it to the database?')) {
                try {
                    await this.api.migrateData(localData);
                    localStorage.removeItem('priceNestData');
                    await this.loadData();
                    alert('Data migrated successfully!');
                } catch (error) {
                    console.error('Migration failed:', error);
                    alert('Failed to migrate data. You can continue using the app with empty database.');
                }
            }
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-error';
        errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; z-index: 1001;';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
    
    initializeElements() {
        this.categoriesContainer = document.getElementById('categories-container');
        this.addCategoryBtn = document.getElementById('add-category-btn');
        this.categoryModal = document.getElementById('category-modal');
        this.itemModal = document.getElementById('item-modal');
        this.koboModal = document.getElementById('kobo-modal');
        this.categoryForm = document.getElementById('category-form');
        this.itemForm = document.getElementById('item-form');
        this.categoryNameInput = document.getElementById('category-name');
        this.itemNameInput = document.getElementById('item-name');
        this.itemTitleInput = document.getElementById('item-title');
        this.itemAuthorInput = document.getElementById('item-author');
        this.bookFields = document.getElementById('book-fields');
        this.itemTitleMovieInput = document.getElementById('item-title-movie');
        this.itemDirectorInput = document.getElementById('item-director');
        this.itemYearInput = document.getElementById('item-year');
        this.movieFields = document.getElementById('movie-fields');
        this.itemUrlInput = document.getElementById('item-url');
        this.itemPriceInput = document.getElementById('item-price');
        this.categoryModalTitle = document.getElementById('category-modal-title');
        this.itemModalTitle = document.getElementById('item-modal-title');
        this.koboSearchQuery = document.getElementById('kobo-search-query');
        this.koboSearchBtn = document.getElementById('kobo-search-btn');
        this.koboSearchResults = document.getElementById('kobo-search-results');
        this.movieSearchQuery = document.getElementById('movie-search-query');
        this.movieSearchBtn = document.getElementById('movie-search-btn');
        this.movieSearchResults = document.getElementById('movie-search-results');
        this.movieModal = document.getElementById('movie-modal');
        this.csvImportModal = document.getElementById('csv-import-modal');
        this.csvFileInput = document.getElementById('csv-file-input');
        this.csvImportForm = document.getElementById('csv-import-form');
        this.settingsBtn = document.getElementById('settings-btn');
        this.settingsModal = document.getElementById('settings-modal');
        this.settingsForm = document.getElementById('settings-form');
    }
    
    bindEvents() {
        this.addCategoryBtn.addEventListener('click', () => this.openCategoryModal());
        this.categoryForm.addEventListener('submit', (e) => this.handleCategorySubmit(e));
        this.itemForm.addEventListener('submit', (e) => this.handleItemSubmit(e));
        
        document.getElementById('cancel-category').addEventListener('click', () => this.closeCategoryModal());
        document.getElementById('cancel-item').addEventListener('click', () => this.closeItemModal());
        document.getElementById('cancel-kobo').addEventListener('click', () => this.closeKoboModal());
        document.getElementById('cancel-movie').addEventListener('click', () => this.closeMovieModal());
        document.getElementById('cancel-csv-import').addEventListener('click', () => this.closeCsvImportModal());
        document.getElementById('process-pending-btn').addEventListener('click', () => this.processPendingMovies());
        document.getElementById('cancel-settings').addEventListener('click', () => this.closeSettingsModal());
        
        this.settingsBtn.addEventListener('click', () => this.openSettingsModal());
        this.settingsForm.addEventListener('submit', (e) => this.handleSettingsSubmit(e));
        this.koboSearchBtn.addEventListener('click', () => this.searchKobo());
        document.getElementById('kobo-modal-search-btn').addEventListener('click', () => this.searchKoboModal());
        this.movieSearchBtn.addEventListener('click', () => this.searchMovies());
        document.getElementById('movie-modal-search-btn').addEventListener('click', () => this.searchMoviesModal());
        this.csvImportForm.addEventListener('submit', (e) => this.handleCsvImport(e));
        this.csvFileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        
        // Settings form interactions
        document.getElementById('enable-book-lookup').addEventListener('change', (e) => {
            this.toggleBookSourceSetting(e.target.checked);
        });

        // Category form interactions
        document.getElementById('category-book-lookup').addEventListener('change', (e) => {
            this.toggleCategoryBookSourceSetting(e.target.checked);
        });
        
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                if (e.target.closest('#category-modal')) {
                    this.closeCategoryModal();
                } else if (e.target.closest('#item-modal')) {
                    this.closeItemModal();
                } else if (e.target.closest('#kobo-modal')) {
                    this.closeKoboModal();
                } else if (e.target.closest('#movie-modal')) {
                    this.closeMovieModal();
                } else if (e.target.closest('#csv-import-modal')) {
                    this.closeCsvImportModal();
                } else if (e.target.closest('#settings-modal')) {
                    this.closeSettingsModal();
                }
            });
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === this.categoryModal) {
                this.closeCategoryModal();
            } else if (e.target === this.itemModal) {
                this.closeItemModal();
            } else if (e.target === this.koboModal) {
                this.closeKoboModal();
            } else if (e.target === this.movieModal) {
                this.closeMovieModal();
            } else if (e.target === this.csvImportModal) {
                this.closeCsvImportModal();
            } else if (e.target === this.settingsModal) {
                this.closeSettingsModal();
            }
        });
    }
    
    openCategoryModal(categoryIndex = null) {
        this.editingCategory = categoryIndex !== null;
        this.currentCategoryIndex = categoryIndex;
        
        if (this.editingCategory) {
            this.categoryModalTitle.textContent = 'Edit Category';
            const category = this.categories[categoryIndex];
            this.categoryNameInput.value = category.name;
            
            // Load category type and settings
            document.getElementById('category-type').value = category.type || 'general';
            document.getElementById('category-book-lookup').checked = category.bookLookupEnabled || false;
            document.getElementById('category-book-source').value = category.bookLookupSource || 'auto';
            this.toggleCategoryBookSourceSetting(category.bookLookupEnabled || false);
        } else {
            this.categoryModalTitle.textContent = 'Add Category';
            this.categoryNameInput.value = '';
            
            // Default settings for new category
            document.getElementById('category-type').value = 'general';
            document.getElementById('category-book-lookup').checked = false;
            document.getElementById('category-book-source').value = 'auto';
            this.toggleCategoryBookSourceSetting(false);
            
            // Add input listener to auto-suggest book lookup for book-related categories
            this.categoryNameInput.addEventListener('input', this.handleCategoryNameChange.bind(this));
        }
        
        this.categoryModal.style.display = 'block';
        this.categoryNameInput.focus();
    }
    
    handleCategoryNameChange(event) {
        const categoryName = event.target.value.toLowerCase();
        const bookKeywords = ['book', 'novel', 'reading', 'literature', 'ebook', 'audiobook', 'library'];
        
        // Check if category name suggests it's for books
        const suggestsBooks = bookKeywords.some(keyword => categoryName.includes(keyword));
        
        if (suggestsBooks && !this.editingCategory) {
            const bookLookupCheckbox = document.getElementById('category-book-lookup');
            if (!bookLookupCheckbox.checked) {
                bookLookupCheckbox.checked = true;
                this.toggleCategoryBookSourceSetting(true);
                
                // Show a subtle notification
                this.showBookLookupSuggestion();
            }
        }
    }
    
    showBookLookupSuggestion() {
        const existingNotification = document.querySelector('.book-suggestion-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = 'book-suggestion-notification';
        notification.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #e3f2fd;
            color: #1976d2;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            border: 1px solid #bbdefb;
            margin-top: 4px;
            z-index: 1000;
        `;
        notification.innerHTML = '<i class="fas fa-lightbulb"></i> Book lookup enabled automatically for this category';
        
        const categoryNameContainer = this.categoryNameInput.parentElement;
        categoryNameContainer.style.position = 'relative';
        categoryNameContainer.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
    
    closeCategoryModal() {
        this.categoryModal.style.display = 'none';
        this.editingCategory = false;
        this.currentCategoryIndex = null;
        
        // Remove event listener to prevent memory leaks
        this.categoryNameInput.removeEventListener('input', this.handleCategoryNameChange.bind(this));
        
        // Clean up any suggestion notifications
        const notification = document.querySelector('.book-suggestion-notification');
        if (notification) {
            notification.remove();
        }
    }
    
    openItemModal(categoryIndex, itemIndex = null) {
        this.editingItem = itemIndex !== null;
        this.currentCategoryIndex = categoryIndex;
        this.currentItemIndex = itemIndex;
        
        const category = this.categories[categoryIndex];
        const isBookCategory = category.type === 'books';
        const isMovieCategory = category.type === 'movies';
        
        // Show/hide fields based on category type
        if (this.bookFields) {
            this.bookFields.style.display = isBookCategory ? 'block' : 'none';
        }
        if (this.movieFields) {
            this.movieFields.style.display = isMovieCategory ? 'block' : 'none';
        }
        
        // Show/hide search sections based on category type
        const koboSearchSection = document.querySelector('.kobo-search-section');
        const movieSearchSection = document.querySelector('.movie-search-section');
        if (koboSearchSection) {
            koboSearchSection.style.display = isBookCategory && category.bookLookupEnabled ? 'block' : 'none';
        }
        if (movieSearchSection) {
            movieSearchSection.style.display = isMovieCategory ? 'block' : 'none';
        }
        
        if (this.editingItem) {
            this.itemModalTitle.textContent = 'Edit Item';
            const item = this.categories[categoryIndex].items[itemIndex];
            this.itemNameInput.value = item.name;
            this.itemUrlInput.value = item.url;
            this.itemPriceInput.value = item.price;
            
            // Populate book fields if available
            if (isBookCategory) {
                this.itemTitleInput.value = item.title || '';
                this.itemAuthorInput.value = item.author || '';
            }
            
            // Populate movie fields if available
            if (isMovieCategory) {
                this.itemTitleMovieInput.value = item.title || '';
                this.itemDirectorInput.value = item.director || '';
                this.itemYearInput.value = item.year || '';
            }
        } else {
            this.itemModalTitle.textContent = 'Add Item';
            this.itemNameInput.value = '';
            this.itemUrlInput.value = '';
            this.itemPriceInput.value = '';
            
            // Clear book fields
            if (isBookCategory) {
                this.itemTitleInput.value = '';
                this.itemAuthorInput.value = '';
            }
            
            // Clear movie fields
            if (isMovieCategory) {
                this.itemTitleMovieInput.value = '';
                this.itemDirectorInput.value = '';
                this.itemYearInput.value = '';
            }
        }
        
        this.itemModal.style.display = 'block';
        this.itemNameInput.focus();
    }
    
    closeItemModal() {
        this.itemModal.style.display = 'none';
        this.editingItem = false;
        this.currentItemIndex = null;
    }
    
    async handleCategorySubmit(e) {
        e.preventDefault();
        const name = this.categoryNameInput.value.trim();
        const type = document.getElementById('category-type').value;
        const bookLookupEnabled = document.getElementById('category-book-lookup').checked;
        const bookLookupSource = document.getElementById('category-book-source').value;
        
        if (!name) return;
        
        try {
            if (this.editingCategory) {
                const category = this.categories[this.currentCategoryIndex];
                await this.api.updateCategory(category.id, name, type, bookLookupEnabled, bookLookupSource);
                this.categories[this.currentCategoryIndex].name = name;
                this.categories[this.currentCategoryIndex].type = type;
                this.categories[this.currentCategoryIndex].bookLookupEnabled = bookLookupEnabled;
                this.categories[this.currentCategoryIndex].bookLookupSource = bookLookupSource;
            } else {
                const newCategory = await this.api.createCategory(name, type, bookLookupEnabled, bookLookupSource);
                this.categories.push(newCategory);
            }
            
            this.render();
            this.closeCategoryModal();
        } catch (error) {
            console.error('Failed to save category:', error);
            this.showError('Failed to save category');
        }
    }
    
    async handleItemSubmit(e) {
        e.preventDefault();
        const name = this.itemNameInput.value.trim();
        const url = this.itemUrlInput.value.trim();
        const price = parseFloat(this.itemPriceInput.value);
        
        if (!name || !url || isNaN(price)) return;
        
        const category = this.categories[this.currentCategoryIndex];
        const isBookCategory = category.type === 'books';
        const isMovieCategory = category.type === 'movies';
        
        // Get book fields if this is a book category
        let title = null;
        let author = null;
        let director = null;
        let year = null;
        
        if (isBookCategory) {
            title = this.itemTitleInput.value.trim() || null;
            author = this.itemAuthorInput.value.trim() || null;
        } else if (isMovieCategory) {
            title = this.itemTitleMovieInput.value.trim() || null;
            director = this.itemDirectorInput.value.trim() || null;
            const yearValue = parseInt(this.itemYearInput.value);
            year = !isNaN(yearValue) ? yearValue : null;
        }
        
        try {
            if (this.editingItem) {
                const existingItem = this.categories[this.currentCategoryIndex].items[this.currentItemIndex];
                await this.api.updateItem(existingItem.id, name, url, price, title, author, director, year);
                
                this.categories[this.currentCategoryIndex].items[this.currentItemIndex] = {
                    ...existingItem,
                    name,
                    url,
                    price,
                    title,
                    author,
                    director,
                    year
                };
            } else {
                const newItem = await this.api.createItem(category.id, name, url, price, title, author, director, year);
                this.categories[this.currentCategoryIndex].items.push(newItem);
            }
            
            this.render();
            this.closeItemModal();
        } catch (error) {
            console.error('Failed to save item:', error);
            this.showError('Failed to save item');
        }
    }
    
    async deleteCategory(categoryIndex) {
        if (confirm('Are you sure you want to delete this category and all its items?')) {
            try {
                const category = this.categories[categoryIndex];
                await this.api.deleteCategory(category.id);
                this.categories.splice(categoryIndex, 1);
                this.render();
            } catch (error) {
                console.error('Failed to delete category:', error);
                this.showError('Failed to delete category');
            }
        }
    }
    
    async deleteItem(categoryIndex, itemIndex) {
        if (confirm('Are you sure you want to delete this item?')) {
            try {
                const item = this.categories[categoryIndex].items[itemIndex];
                await this.api.deleteItem(item.id);
                this.categories[categoryIndex].items.splice(itemIndex, 1);
                this.render();
            } catch (error) {
                console.error('Failed to delete item:', error);
                this.showError('Failed to delete item');
            }
        }
    }
    
    async toggleItemBought(categoryIndex, itemIndex) {
        try {
            const item = this.categories[categoryIndex].items[itemIndex];
            await this.api.toggleItemBought(item.id);
            this.categories[categoryIndex].items[itemIndex].bought = !item.bought;
            this.render();
        } catch (error) {
            console.error('Failed to update item status:', error);
            this.showError('Failed to update item status');
        }
    }
    
    sortItems(categoryIndex, sortBy) {
        const items = this.categories[categoryIndex].items;
        
        switch (sortBy) {
            case 'name':
                items.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'price-low':
                items.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                items.sort((a, b) => b.price - a.price);
                break;
            case 'bought':
                items.sort((a, b) => a.bought - b.bought);
                break;
        }
        
        this.render();
    }
    
    loadFromStorage() {
        const data = localStorage.getItem('priceNestData');
        return data ? JSON.parse(data) : null;
    }

    getPriceSourceIndicator(priceSource) {
        switch (priceSource) {
            case 'google_books':
                return '<span class="price-source price-source-real" title="Real price from Google Books">📊 Real Price</span>';
            case 'estimated':
                return '<span class="price-source price-source-estimated" title="Estimated price based on book characteristics">📈 Estimated</span>';
            case 'sample':
                return '<span class="price-source price-source-sample" title="Sample data for demonstration">🔧 Sample Data</span>';
            case 'kobo':
                return '<span class="price-source price-source-kobo" title="Live price from Kobo UK">💰 Kobo Price</span>';
            case 'apple_hd_purchase':
                return '<span class="price-source price-source-apple" title="HD purchase price from Apple Store">🍎 Apple Store HD</span>';
            case 'apple_purchase':
                return '<span class="price-source price-source-apple" title="Purchase price from Apple Store">🍎 Apple Store</span>';
            case 'apple_collection':
                return '<span class="price-source price-source-apple" title="Collection price from Apple Store">🍎 Apple Collection</span>';
            case 'apple_rental':
                return '<span class="price-source price-source-apple-rental" title="Rental price from Apple Store">🍎 Apple Rental</span>';
            case 'manual_entry':
                return '<span class="price-source price-source-manual" title="Manually imported, price estimated">📝 Manual Import</span>';
            default:
                return '<span class="price-source price-source-unknown" title="Price source unknown">❓ Unknown</span>';
        }
    }

    formatItemTitle(item) {
        // Use separate title and author fields if available (books)
        if (item.title && item.author) {
            return `
                <div class="item-name">${item.title}</div>
                <div class="item-author">by ${item.author}</div>
            `;
        } 
        // Use separate title and director fields if available (movies)
        else if (item.title && item.director) {
            const yearText = item.year ? ` (${item.year})` : '';
            return `
                <div class="item-name">${item.title}${yearText}</div>
                <div class="item-author">Directed by ${item.director}</div>
            `;
        }
        else if (item.title) {
            return `<div class="item-name">${item.title}</div>`;
        } else {
            // Fallback: extract title and author from "Title by Author" format
            const name = item.name || '';
            const byIndex = name.lastIndexOf(' by ');
            
            if (byIndex > 0) {
                // Book format: "Title by Author"
                const title = name.substring(0, byIndex);
                const author = name.substring(byIndex + 4); // +4 for " by "
                
                return `
                    <div class="item-name">${title}</div>
                    <div class="item-author">by ${author}</div>
                `;
            } else {
                // Regular item format
                return `<div class="item-name">${name}</div>`;
            }
        }
    }

    // Settings Management
    loadSettings() {
        const defaultSettings = {
            bookLookupEnabled: true,
            bookLookupSource: 'auto'
        };

        try {
            const saved = localStorage.getItem('priceNestSettings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            console.error('Failed to load settings:', error);
            return defaultSettings;
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('priceNestSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    openSettingsModal() {
        this.populateSettingsForm();
        this.settingsModal.style.display = 'block';
    }

    closeSettingsModal() {
        this.settingsModal.style.display = 'none';
    }

    async populateSettingsForm() {
        // Populate current settings
        document.getElementById('enable-book-lookup').checked = this.settings.bookLookupEnabled;
        document.getElementById('book-lookup-source').value = this.settings.bookLookupSource;
        
        // Update book source setting visibility
        this.toggleBookSourceSetting(this.settings.bookLookupEnabled);
        
        // Load database info
        try {
            const dbConfig = await this.api.getDatabaseConfig();
            document.getElementById('database-info').textContent = 
                `${dbConfig.type.toUpperCase()} - Available: ${dbConfig.available.join(', ')}`;
        } catch (error) {
            document.getElementById('database-info').textContent = 'Error loading database info';
        }
    }

    toggleBookSourceSetting(enabled) {
        const sourceSetting = document.getElementById('book-source-setting');
        if (enabled) {
            sourceSetting.classList.add('enabled');
        } else {
            sourceSetting.classList.remove('enabled');
        }
    }

    toggleCategoryBookSourceSetting(enabled) {
        const sourceSetting = document.getElementById('category-book-source-setting');
        if (enabled) {
            sourceSetting.classList.add('enabled');
        } else {
            sourceSetting.classList.remove('enabled');
        }
    }

    handleSettingsSubmit(e) {
        e.preventDefault();
        
        // Update settings
        this.settings.bookLookupEnabled = document.getElementById('enable-book-lookup').checked;
        this.settings.bookLookupSource = document.getElementById('book-lookup-source').value;
        
        // Save settings
        this.saveSettings();
        
        // Update UI based on settings
        this.updateUIForSettings();
        
        // Close modal
        this.closeSettingsModal();
        
        // Show success message
        this.showSuccess('Settings saved successfully!');
    }

    updateUIForSettings() {
        // Update button visibility/text based on settings
        const koboButtons = document.querySelectorAll('[onclick*="openKoboModal"]');
        koboButtons.forEach(button => {
            if (this.settings.bookLookupEnabled) {
                button.style.display = '';
                button.innerHTML = '<i class="fas fa-book"></i> Add from Books';
            } else {
                button.style.display = 'none';
            }
        });

        // Update search section in item modal
        const koboSearchSection = document.querySelector('.kobo-search-section');
        if (koboSearchSection) {
            koboSearchSection.style.display = this.settings.bookLookupEnabled ? 'block' : 'none';
        }
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success';
        successDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; z-index: 1001;';
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }
    
    closeKoboModal() {
        this.koboModal.style.display = 'none';
    }
    
    closeMovieModal() {
        this.movieModal.style.display = 'none';
    }
    
    openKoboModal(categoryIndex) {
        this.currentCategoryIndex = categoryIndex;
        this.koboModal.style.display = 'block';
        document.getElementById('kobo-modal-search-query').focus();
    }
    
    openMovieModal(categoryIndex) {
        this.currentCategoryIndex = categoryIndex;
        this.movieModal.style.display = 'block';
        document.getElementById('movie-modal-search-query').focus();
    }
    
    openCsvImportModal(categoryIndex) {
        this.currentCategoryIndex = categoryIndex;
        this.currentCsvCategoryId = this.categories[categoryIndex].id;
        
        // Reset the form and hide previous results
        this.csvImportForm.reset();
        document.getElementById('csv-progress').style.display = 'none';
        document.getElementById('csv-results').style.display = 'none';
        
        this.csvImportModal.style.display = 'block';
        this.csvFileInput.focus();
    }
    
    openDirectManualAddModal(categoryIndex) {
        const category = this.categories[categoryIndex];
        if (!category || category.type !== 'movies') {
            this.showError('Manual movie addition is only available for movie categories');
            return;
        }
        
        // Create fake result data for the modal to work with existing code
        const fakeResult = {
            csv_data: {
                title: '',
                director: '',
                year: ''
            }
        };
        
        // Set up preview data for the manual add
        this.csvPreviewData = {
            category_id: category.id,
            category_name: category.name
        };
        
        this.openManualAddModal(0, true);
    }
    
    closeCsvImportModal() {
        this.csvImportModal.style.display = 'none';
        this.currentCsvCategoryId = null;
        
        // Reset form state
        this.csvImportForm.reset();
        document.getElementById('csv-progress').style.display = 'none';
        document.getElementById('csv-results').style.display = 'none';
    }
    
    handleFileSelection(event) {
        const file = event.target.files[0];
        const label = document.querySelector('.file-upload-label span');
        
        if (file) {
            label.textContent = file.name;
            label.style.color = '#007bff';
        } else {
            label.textContent = 'Choose CSV file or drag and drop';
            label.style.color = '';
        }
    }
    
    async handleCsvImport(event) {
        event.preventDefault();
        
        const file = this.csvFileInput.files[0];
        if (!file) {
            this.showError('Please select a CSV file');
            return;
        }
        
        if (!this.currentCsvCategoryId) {
            this.showError('No category selected');
            return;
        }
        
        // Show progress
        const progressSection = document.getElementById('csv-progress');
        const progressFill = document.getElementById('csv-progress-fill');
        const progressText = document.getElementById('csv-progress-text');
        const resultsSection = document.getElementById('csv-results');
        const importBtn = document.getElementById('csv-import-btn');
        
        progressSection.style.display = 'block';
        resultsSection.style.display = 'none';
        progressFill.style.width = '0%';
        progressText.textContent = 'Parsing CSV file...';
        importBtn.disabled = true;
        
        try {
            // Create form data for file upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category_id', this.currentCsvCategoryId);
            
            // Progressive feedback
            let currentStep = 0;
            const steps = [
                'Parsing CSV file...',
                'Validating movie data...',
                'Searching Apple Store...',
                'Processing results...',
                'Analysis complete!'
            ];
            
            const progressInterval = setInterval(() => {
                const currentWidth = parseInt(progressFill.style.width) || 0;
                if (currentWidth < 90) {
                    progressFill.style.width = (currentWidth + 15) + '%';
                    if (currentWidth >= 20 * currentStep && currentStep < steps.length - 1) {
                        currentStep++;
                        progressText.textContent = steps[currentStep];
                    }
                }
            }, 300);
            
            // Send to preview API first
            const result = await this.api.previewMovieCSV(formData);
            
            clearInterval(progressInterval);
            progressFill.style.width = '100%';
            progressText.textContent = steps[steps.length - 1];
            
            // Store preview data for later import
            this.csvPreviewData = result;
            
            // Log debug info for CSV preview
            console.log('🔍 CSV Preview Debug Info:');
            result.preview_results.forEach((movieResult, index) => {
                if (movieResult.debug) {
                    console.log(`Row ${index + 1} (${movieResult.csv_data.title}):`, movieResult.debug);
                }
            });
            
            // Show preview results
            this.showCsvPreviewResults(result);
            
        } catch (error) {
            console.error('CSV preview error:', error);
            progressText.textContent = 'Analysis failed!';
            progressFill.style.width = '100%';
            progressFill.style.backgroundColor = '#e74c3c';
            
            resultsSection.style.display = 'block';
            resultsSection.innerHTML = `
                <div class="import-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Analysis Failed</h4>
                    <p>${error.message}</p>
                </div>
            `;
            
            this.showError('CSV analysis failed: ' + error.message);
        } finally {
            importBtn.disabled = false;
        }
    }

    showCsvPreviewResults(previewData, preserveState = false) {
        const resultsSection = document.getElementById('csv-results');
        resultsSection.style.display = 'block';
        
        // Preserve current filter and scroll position if requested
        let currentFilter = 'all';
        let scrollPosition = 0;
        
        if (preserveState) {
            const activeFilter = document.querySelector('.filter-btn.active');
            if (activeFilter) {
                currentFilter = activeFilter.getAttribute('data-filter');
            }
            const container = document.getElementById('preview-movies-container');
            if (container) {
                scrollPosition = container.scrollTop;
            }
        }
        
        const { summary, preview_results, category_name } = previewData;
        
        const needsAttention = summary.not_found + summary.errors;
        console.log('🚨 Needs attention count:', needsAttention, {
            not_found: summary.not_found,
            errors: summary.errors,
            pending: summary.pending
        });
        
        resultsSection.innerHTML = `
            <div class="csv-preview-section">
                <div class="preview-header">
                    <h4>Import Preview - ${category_name}</h4>
                    <div class="result-stats">
                        <div class="stat success">
                            <i class="fas fa-check-circle"></i>
                            <span>${summary.found} found</span>
                        </div>
                        <div class="stat warning">
                            <i class="fas fa-clock"></i>
                            <span>${summary.pending || 0} pending search</span>
                        </div>
                        <div class="stat error">
                            <i class="fas fa-exclamation-circle"></i>
                            <span>${needsAttention} need attention</span>
                        </div>
                        <div class="stat total">
                            <i class="fas fa-list"></i>
                            <span>${summary.total} total</span>
                        </div>
                    </div>
                    
                    <div class="filter-controls">
                        <span style="font-weight: 500; color: #6c757d;">Filter by status:</span>
                        <button type="button" class="filter-btn all ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">
                            <i class="fas fa-list"></i> All
                        </button>
                        <button type="button" class="filter-btn found ${currentFilter === 'found' ? 'active' : ''}" data-filter="found">
                            <i class="fas fa-check-circle"></i> Found (${summary.found})
                        </button>
                        <button type="button" class="filter-btn pending ${currentFilter === 'pending' ? 'active' : ''}" data-filter="pending">
                            <i class="fas fa-clock"></i> Pending (${summary.pending || 0})
                        </button>
                        <button type="button" class="filter-btn not-found ${currentFilter === 'not_found' ? 'active' : ''}" data-filter="not_found">
                            <i class="fas fa-search"></i> Not Found (${summary.not_found})
                        </button>
                        <button type="button" class="filter-btn error ${currentFilter === 'error' ? 'active' : ''}" data-filter="error">
                            <i class="fas fa-exclamation-circle"></i> Errors (${summary.errors})
                        </button>
                    </div>
                    
                    <div class="bulk-actions" style="display: none;">
                        <div style="display: flex; align-items: center; gap: 15px; padding: 10px; background: #fff3cd; border-radius: 6px; border: 1px solid #ffeaa7;">
                            <span id="selection-count" style="font-weight: 500; color: #856404;">0 movies selected</span>
                            <button type="button" class="btn btn-danger btn-small" id="bulk-delete-btn">
                                <i class="fas fa-trash"></i> Delete Selected
                            </button>
                            <button type="button" class="btn btn-secondary btn-small" id="clear-selection-btn">
                                <i class="fas fa-times"></i> Clear Selection
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="preview-movies" id="preview-movies-container">
                    ${preview_results.map((result, index) => this.renderPreviewMovieRow(result, index)).join('')}
                </div>
                
                <div class="preview-actions">
                    <button type="button" class="btn btn-secondary" id="csv-cancel-btn">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button type="button" class="btn ${needsAttention > 0 ? 'btn-danger' : 'btn-success'}" 
                            id="csv-confirm-import-btn"
                            ${needsAttention > 0 ? 'disabled title="Resolve issues with movies that need attention before importing"' : ''}>
                        <i class="fas fa-${needsAttention > 0 ? 'exclamation-triangle' : 'download'}"></i> 
                        ${needsAttention > 0 ? `Cannot Import (${needsAttention} need attention)` : `Import Found Movies${summary.pending > 0 ? ` (${summary.pending} pending)` : ''}`}
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners for manual search buttons and filters
        setTimeout(() => {
            const container = document.getElementById('preview-movies-container');
            if (container) {
                container.addEventListener('click', (e) => {
                    if (e.target.closest('.manual-search-btn')) {
                        const button = e.target.closest('.manual-search-btn');
                        const movieIndex = parseInt(button.getAttribute('data-movie-index'));
                        console.log('Manual search clicked for movie index:', movieIndex);
                        this.openManualSearch(movieIndex);
                    } else if (e.target.closest('.add-manually-btn')) {
                        const button = e.target.closest('.add-manually-btn');
                        const movieIndex = parseInt(button.getAttribute('data-movie-index'));
                        console.log('Add manually clicked for movie index:', movieIndex);
                        this.openManualAddModal(movieIndex);
                    } else if (e.target.closest('.delete-movie-btn')) {
                        const button = e.target.closest('.delete-movie-btn');
                        const movieIndex = parseInt(button.getAttribute('data-movie-index'));
                        console.log('Delete movie clicked for index:', movieIndex);
                        this.deleteMovieFromPreview(movieIndex);
                    }
                });
            }
            
            // Add filter functionality
            const filterButtons = document.querySelectorAll('.filter-btn');
            filterButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const filter = e.target.closest('.filter-btn').getAttribute('data-filter');
                    this.filterPreviewMovies(filter);
                    
                    // Update active state
                    filterButtons.forEach(btn => btn.classList.remove('active'));
                    e.target.closest('.filter-btn').classList.add('active');
                });
            });
            
            // Add event listeners for preview action buttons
            const cancelBtn = document.getElementById('csv-cancel-btn');
            const confirmBtn = document.getElementById('csv-confirm-import-btn');
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.closeCsvImportModal();
                });
            }
            
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    this.confirmCsvImport();
                });
            }
            
            // Add event listeners for bulk actions
            const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
            const clearSelectionBtn = document.getElementById('clear-selection-btn');
            
            if (bulkDeleteBtn) {
                bulkDeleteBtn.addEventListener('click', () => {
                    this.bulkDeleteMovies();
                });
            }
            
            if (clearSelectionBtn) {
                clearSelectionBtn.addEventListener('click', () => {
                    this.clearMovieSelection();
                });
            }
            
            // Add event listeners for checkboxes
            const checkboxes = document.querySelectorAll('.movie-selection-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    this.updateSelectionDisplay();
                });
            });
            
            // Restore filter state and scroll position if preserving state
            if (preserveState) {
                setTimeout(() => {
                    this.filterPreviewMovies(currentFilter);
                    const container = document.getElementById('preview-movies-container');
                    if (container) {
                        container.scrollTop = scrollPosition;
                    }
                }, 150);
            }
        }, 100);
    }
    
    updateSelectionDisplay() {
        const checkboxes = document.querySelectorAll('.movie-selection-checkbox:checked');
        const selectedCount = checkboxes.length;
        const bulkActions = document.querySelector('.bulk-actions');
        const selectionCount = document.getElementById('selection-count');
        
        if (selectedCount > 0) {
            bulkActions.style.display = 'block';
            selectionCount.textContent = `${selectedCount} movie${selectedCount > 1 ? 's' : ''} selected`;
        } else {
            bulkActions.style.display = 'none';
        }
    }
    
    clearMovieSelection() {
        const checkboxes = document.querySelectorAll('.movie-selection-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateSelectionDisplay();
    }
    
    bulkDeleteMovies() {
        const checkboxes = document.querySelectorAll('.movie-selection-checkbox:checked');
        const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.getAttribute('data-movie-index')));
        
        if (selectedIndices.length === 0) {
            this.showError('No movies selected for deletion');
            return;
        }
        
        const confirmMessage = `Are you sure you want to remove ${selectedIndices.length} movie${selectedIndices.length > 1 ? 's' : ''} from the import?`;
        
        if (confirm(confirmMessage)) {
            // Mark selected movies as deleted
            selectedIndices.forEach(index => {
                if (this.csvPreviewData.preview_results[index]) {
                    this.csvPreviewData.preview_results[index].status = 'deleted';
                    this.csvPreviewData.preview_results[index].deleted = true;
                }
            });
            
            // Update summary stats
            this.csvPreviewData.summary = this.calculateSummaryStats(this.csvPreviewData.preview_results);
            
            // Re-render while preserving state
            this.showCsvPreviewResults(this.csvPreviewData, true);
            
            this.showSuccess(`Removed ${selectedIndices.length} movie${selectedIndices.length > 1 ? 's' : ''} from import list`);
        }
    }
    
    calculateSummaryStats(results) {
        const stats = {
            total: 0,
            found: 0,
            not_found: 0,
            pending: 0,
            errors: 0
        };
        
        results.forEach(result => {
            if (!result.deleted) {
                stats.total++;
                if (result.status === 'found') stats.found++;
                else if (result.status === 'not_found') stats.not_found++;
                else if (result.status === 'pending') stats.pending++;
                else if (result.status === 'error') stats.errors++;
            }
        });
        
        return stats;
    }
    
    filterPreviewMovies(filter) {
        const movieRows = document.querySelectorAll('.preview-movie-row');
        
        movieRows.forEach(row => {
            const status = row.getAttribute('data-status');
            
            if (filter === 'all' || filter === status) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
        
        // Update selection display after filtering
        this.updateSelectionDisplay();
    }

    renderPreviewMovieRow(result, index) {
        const { csv_data, status, best_match, search_results, error, deleted } = result;
        
        // Don't render deleted movies
        if (deleted || status === 'deleted') {
            return '';
        }
        
        let statusIcon, statusClass, matchDisplay;
        
        switch (status) {
            case 'found':
                statusIcon = '<i class="fas fa-check-circle"></i>';
                statusClass = 'preview-found';
                matchDisplay = `
                    <div class="matched-movie">
                        ${best_match.artwork ? `
                            <div class="movie-artwork">
                                <img src="${best_match.artwork}" alt="${best_match.title}" onerror="this.style.display='none'">
                            </div>
                        ` : ''}
                        <div class="movie-details">
                            <strong>${best_match.title}</strong>
                            ${best_match.director ? `<span class="director">by ${best_match.director}</span>` : ''}
                            ${best_match.year ? `<span class="year">(${best_match.year})</span>` : ''}
                            <span class="price">£${best_match.price.toFixed(2)}</span>
                            ${this.getPriceSourceIndicator(best_match.priceSource)}
                            <div class="match-actions">
                                <button type="button" class="btn btn-small btn-secondary manual-search-btn" 
                                        data-movie-index="${index}">
                                    <i class="fas fa-search"></i> Search Different
                                </button>
                                <button type="button" class="btn btn-small btn-primary add-manually-btn" 
                                        data-movie-index="${index}">
                                    <i class="fas fa-plus"></i> Use Different Movie
                                </button>
                                <button type="button" class="btn btn-small btn-danger delete-movie-btn" 
                                        data-movie-index="${index}">
                                    <i class="fas fa-trash"></i> Remove
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                break;
                
            case 'not_found':
                statusIcon = '<i class="fas fa-search"></i>';
                statusClass = 'preview-not-found';
                
                // Add debug info if available
                let debugText = '';
                if (result.debug && result.debug.api_calls && result.debug.api_calls.length > 0) {
                    const lastCall = result.debug.api_calls[result.debug.api_calls.length - 1];
                    debugText = `<div style="font-size: 0.8rem; color: #868e96; margin-bottom: 8px;">
                        Last tried: ${lastCall.search_term} (Status: ${lastCall.status_code || 'N/A'})
                    </div>`;
                }
                
                matchDisplay = `
                    <div class="no-match">
                        <span class="error-text">${error || 'No results found'}</span>
                        ${debugText}
                        <div class="no-match-actions">
                            <button type="button" class="btn btn-small btn-primary manual-search-btn" 
                                    data-movie-index="${index}">
                                <i class="fas fa-search"></i> Manual Search
                            </button>
                            <button type="button" class="btn btn-small btn-success add-manually-btn" 
                                    data-movie-index="${index}">
                                <i class="fas fa-plus"></i> Add Manually
                            </button>
                            <button type="button" class="btn btn-small btn-danger delete-movie-btn" 
                                    data-movie-index="${index}">
                                <i class="fas fa-trash"></i> Remove
                            </button>
                        </div>
                    </div>
                `;
                break;
                
            case 'pending':
                statusIcon = '<i class="fas fa-clock"></i>';
                statusClass = 'preview-pending';
                matchDisplay = `
                    <div class="pending-search">
                        <span class="pending-text">Rate limited - will search later</span>
                        <div style="font-size: 0.8rem; color: #868e96; margin-top: 4px;">
                            Added to background search queue
                        </div>
                        <div class="no-match-actions">
                            <button type="button" class="btn btn-small btn-danger delete-movie-btn" 
                                    data-movie-index="${index}">
                                <i class="fas fa-trash"></i> Remove
                            </button>
                        </div>
                    </div>
                `;
                break;
                
            case 'error':
                statusIcon = '<i class="fas fa-exclamation-triangle"></i>';
                statusClass = 'preview-error';
                matchDisplay = `
                    <div class="error-movie">
                        <span class="error-text">${error}</span>
                        <div class="no-match-actions">
                            <button type="button" class="btn btn-small btn-success add-manually-btn" 
                                    data-movie-index="${index}">
                                <i class="fas fa-plus"></i> Add Manually
                            </button>
                            <button type="button" class="btn btn-small btn-danger delete-movie-btn" 
                                    data-movie-index="${index}">
                                <i class="fas fa-trash"></i> Remove
                            </button>
                        </div>
                    </div>
                `;
                break;
        }
        
        return `
            <div class="preview-movie-row ${statusClass}" data-index="${index}" data-status="${status}">
                <div class="movie-checkbox">
                    <label class="checkbox-label">
                        <input type="checkbox" class="movie-selection-checkbox" data-movie-index="${index}">
                        <span class="checkmark"></span>
                    </label>
                </div>
                
                <div class="csv-movie-info">
                    <div class="csv-title">${csv_data.title}</div>
                    ${csv_data.director ? `<div class="csv-director">by ${csv_data.director}</div>` : ''}
                    ${csv_data.year ? `<div class="csv-year">(${csv_data.year})</div>` : ''}
                </div>
                
                <div class="match-status">
                    ${statusIcon}
                    <span class="status-text">${status.replace('_', ' ')}</span>
                </div>
                
                <div class="match-result">
                    ${matchDisplay}
                </div>
            </div>
        `;
    }

    async openManualSearch(resultIndex) {
        const result = this.csvPreviewData.preview_results[resultIndex];
        const query = result.csv_data.title;
        
        // Create a better search interface
        const searchModal = document.createElement('div');
        searchModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 1001;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        searchModal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <h3 style="margin-bottom: 15px; color: #2c3e50;">Manual Search</h3>
                <p style="margin-bottom: 15px; color: #6c757d;">
                    Original search for "<strong>${query}</strong>" found no results. Try a different search term:
                </p>
                
                <div style="margin-bottom: 20px;">
                    <input type="text" id="manual-search-input" value="${query}" 
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <button id="search-btn" style="background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-right: 10px;">
                        <i class="fas fa-search"></i> Search
                    </button>
                    <button id="cancel-search-btn" style="background: #95a5a6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                        Cancel
                    </button>
                </div>
                
                <div id="manual-search-results" style="min-height: 100px;"></div>
            </div>
        `;
        
        document.body.appendChild(searchModal);
        
        const searchInput = searchModal.querySelector('#manual-search-input');
        const searchBtn = searchModal.querySelector('#search-btn');
        const cancelBtn = searchModal.querySelector('#cancel-search-btn');
        const resultsDiv = searchModal.querySelector('#manual-search-results');
        
        const performSearch = async () => {
            const newQuery = searchInput.value.trim();
            if (!newQuery) return;
            
            searchBtn.disabled = true;
            searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
            resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #6c757d;"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
            
            try {
                const searchResults = await this.api.searchMovies(newQuery);
                
                // Log debug info to console
                if (searchResults.debug) {
                    console.log(`🔍 DEBUG Manual Search for "${newQuery}":`, searchResults.debug);
                    searchResults.debug.api_calls.forEach((call, index) => {
                        console.log(`  API Call ${index + 1}:`, call);
                    });
                }
                
                if (searchResults.movies && searchResults.movies.length > 0) {
                    // Store search results for selection
                    this.currentSearchResults = searchResults.movies;
                    
                    resultsDiv.innerHTML = `
                        <h4 style="margin-bottom: 15px; color: #2c3e50;">Search Results:</h4>
                        <div style="max-height: 300px; overflow-y: auto;" id="search-results-container">
                            ${searchResults.movies.slice(0, 5).map((movie, movieIndex) => `
                                <div class="manual-search-result" style="border: 1px solid #e9ecef; border-radius: 6px; padding: 15px; margin-bottom: 10px; cursor: pointer; transition: background-color 0.2s;" 
                                     data-result-index="${resultIndex}" data-movie-index="${movieIndex}">
                                    <div style="font-weight: 600; color: #2c3e50; margin-bottom: 5px;">${movie.title}</div>
                                    ${movie.director ? `<div style="color: #6c757d; font-size: 0.9rem; margin-bottom: 5px;">by ${movie.director}</div>` : ''}
                                    ${movie.year ? `<div style="color: #868e96; font-size: 0.85rem; margin-bottom: 5px;">(${movie.year})</div>` : ''}
                                    <div style="color: #28a745; font-weight: 600;">£${movie.price.toFixed(2)} ${this.getPriceSourceIndicator(movie.priceSource)}</div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                    
                    // Add click handler for search results
                    setTimeout(() => {
                        const container = document.getElementById('search-results-container');
                        if (container) {
                            container.addEventListener('click', (e) => {
                                const resultDiv = e.target.closest('.manual-search-result');
                                if (resultDiv) {
                                    const movieIndex = parseInt(resultDiv.getAttribute('data-movie-index'));
                                    const movie = this.currentSearchResults[movieIndex];
                                    console.log('Selected movie:', movie);
                                    this.selectManualSearchResult(resultIndex, movieIndex, movie);
                                }
                            });
                        }
                    }, 100);
                } else {
                    resultsDiv.innerHTML = `
                        <div style="text-align: center; padding: 20px; color: #dc3545;">
                            <i class="fas fa-exclamation-circle"></i> No results found for "${newQuery}"
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Manual search error:', error);
                resultsDiv.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #dc3545;">
                        <i class="fas fa-exclamation-triangle"></i> Search failed: ${error.message}
                    </div>
                `;
            } finally {
                searchBtn.disabled = false;
                searchBtn.innerHTML = '<i class="fas fa-search"></i> Search';
            }
        };
        
        const closeModal = () => {
            document.body.removeChild(searchModal);
        };
        
        // Store reference for selectManualSearchResult method
        this.currentManualSearchModal = searchModal;
        
        searchBtn.addEventListener('click', performSearch);
        cancelBtn.addEventListener('click', closeModal);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
        
        // Auto-search on load
        setTimeout(performSearch, 100);
        searchInput.focus();
    }

    selectManualSearchResult(resultIndex, movieIndex, movieData) {
        const result = this.csvPreviewData.preview_results[resultIndex];
        
        // Update the preview data with the selected movie
        this.csvPreviewData.preview_results[resultIndex] = {
            ...result,
            status: 'found',
            best_match: movieData,
            search_results: [movieData],
            error: null
        };
        
        // Update the summary
        if (result.status !== 'found') {
            this.csvPreviewData.summary.found++;
            if (result.status === 'not_found') {
                this.csvPreviewData.summary.not_found--;
            } else if (result.status === 'error') {
                this.csvPreviewData.summary.errors--;
            }
        }
        
        // Close the manual search modal
        if (this.currentManualSearchModal) {
            document.body.removeChild(this.currentManualSearchModal);
            this.currentManualSearchModal = null;
        }
        
        // Re-render the preview while preserving state
        this.showCsvPreviewResults(this.csvPreviewData, true);
        
        this.showSuccess(`Selected "${movieData.title}" for "${result.csv_data.title}"`);
    }
    
    openManualAddModal(resultIndex, isDirectAdd = false) {
        const result = this.csvPreviewData.preview_results[resultIndex];
        const csvData = result.csv_data;
        
        // Create modal for manual entry
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2><i class="fas fa-plus"></i> Add Movie Manually</h2>
                <p>${isDirectAdd ? 'Add movie directly to category:' : `Add details for "<strong>${csvData.title}</strong>" since no match was found:`}</p>
                
                <form id="manual-add-form">
                    <input type="text" id="manual-title" placeholder="Movie Title" value="${csvData.title}" required>
                    <input type="text" id="manual-director" placeholder="Director (optional)" value="${csvData.director || ''}">
                    <input type="number" id="manual-year" placeholder="Year (optional)" value="${csvData.year || ''}" min="1900" max="2030">
                    <input type="url" id="manual-url" placeholder="Store URL (optional - e.g., Apple TV link)" value="">
                    <input type="number" id="manual-price" placeholder="Price £ (optional)" step="0.01" min="0" value="">
                    
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-success">
                            <i class="fas fa-check"></i> ${isDirectAdd ? 'Add to Category' : 'Add Movie'}
                        </button>
                        <button type="button" class="btn btn-secondary" id="cancel-manual-add">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.currentManualAddModal = modal;
        
        // Add event listeners
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = modal.querySelector('#cancel-manual-add');
        const form = modal.querySelector('#manual-add-form');
        
        const closeModal = () => {
            if (this.currentManualAddModal) {
                document.body.removeChild(this.currentManualAddModal);
                this.currentManualAddModal = null;
            }
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = document.getElementById('manual-title').value.trim();
            const director = document.getElementById('manual-director').value.trim() || null;
            const year = parseInt(document.getElementById('manual-year').value) || null;
            const url = document.getElementById('manual-url').value.trim() || null;
            const price = parseFloat(document.getElementById('manual-price').value) || null;
            
            if (!title) {
                this.showError('Movie title is required');
                return;
            }
            
            if (isDirectAdd) {
                // Add directly to database
                try {
                    const result = await this.api.addManualMovie(this.csvPreviewData.category_id, {
                        title: title,
                        director: director,
                        year: year,
                        url: url,
                        price: price
                    });
                    
                    closeModal();
                    
                    // Refresh the categories to show new movie
                    await this.loadData();
                    this.showSuccess(result.message);
                    
                } catch (error) {
                    console.error('Failed to add manual movie:', error);
                    this.showError(`Failed to add movie: ${error.message}`);
                }
            } else {
                // Create movie data object for preview
                const movieData = {
                    title: title,
                    director: director || 'Unknown Director',
                    year: year,
                    name: year ? `${title} (${year})` : title,
                    url: url || `https://tv.apple.com/search?term=${encodeURIComponent(title)}`,
                    price: price || 0.00,
                    priceSource: 'manual_entry',
                    artwork: null // No artwork for manual entries
                };
                
                // Update the preview data
                this.csvPreviewData.preview_results[resultIndex] = {
                    ...result,
                    status: 'found',
                    best_match: movieData,
                    search_results: [movieData],
                    error: null
                };
                
                // Update summary stats
                if (result.status !== 'found') {
                    this.csvPreviewData.summary.found++;
                    if (result.status === 'not_found') {
                        this.csvPreviewData.summary.not_found--;
                    } else if (result.status === 'error') {
                        this.csvPreviewData.summary.errors--;
                    }
                }
                
                closeModal();
                
                // Re-render while preserving state
                this.showCsvPreviewResults(this.csvPreviewData, true);
                
                this.showSuccess(`Added "${title}" manually for "${csvData.title}"`);
            }
        });
        
        // Focus on first input
        setTimeout(() => {
            document.getElementById('manual-title').focus();
        }, 100);
    }

    deleteMovieFromPreview(movieIndex) {
        if (!this.csvPreviewData || !this.csvPreviewData.preview_results[movieIndex]) {
            this.showError('Movie not found in preview data');
            return;
        }

        const movieToDelete = this.csvPreviewData.preview_results[movieIndex];
        const movieTitle = movieToDelete.csv_data.title;

        if (confirm(`Remove "${movieTitle}" from import list?\n\nThis will exclude it from the final import.`)) {
            // Update the summary counts
            const oldStatus = movieToDelete.status;
            if (oldStatus === 'found') {
                this.csvPreviewData.summary.found--;
            } else if (oldStatus === 'not_found') {
                this.csvPreviewData.summary.not_found--;
            } else if (oldStatus === 'pending') {
                this.csvPreviewData.summary.pending--;
            } else if (oldStatus === 'error') {
                this.csvPreviewData.summary.errors--;
            }
            this.csvPreviewData.summary.total--;

            // Mark as deleted (we'll filter these out during import)
            this.csvPreviewData.preview_results[movieIndex].status = 'deleted';
            this.csvPreviewData.preview_results[movieIndex].deleted = true;

            // Re-render the preview while preserving state
            this.showCsvPreviewResults(this.csvPreviewData, true);

            this.showSuccess(`Removed "${movieTitle}" from import list`);
        }
    }

    async confirmCsvImport() {
        console.log('🚀 confirmCsvImport called');
        
        if (!this.csvPreviewData) {
            console.error('❌ No preview data available');
            this.showError('No preview data available');
            return;
        }
        
        console.log('📊 Preview data:', this.csvPreviewData);
        
        // Check for unresolved issues
        const unresolvedIssues = this.csvPreviewData.preview_results
            .filter(result => (result.status === 'not_found' || result.status === 'error') && !result.deleted);
        
        console.log('⚠️ Unresolved issues:', unresolvedIssues.length);
        
        if (unresolvedIssues.length > 0) {
            console.error('❌ Cannot import due to unresolved issues');
            this.showError(`Cannot import: ${unresolvedIssues.length} movie(s) need attention. Please use manual search to find matches or remove them from the import.`);
            return;
        }
        
        // Extract confirmed movies (only those with status 'found' and not deleted)
        const confirmedMovies = this.csvPreviewData.preview_results
            .filter(result => result.status === 'found' && !result.deleted)
            .map(result => result.best_match);
        
        console.log('✅ Confirmed movies to import:', confirmedMovies.length);
        console.log('📁 Category ID:', this.csvPreviewData.category_id);
        console.log('🎬 Movies:', confirmedMovies);
        
        if (confirmedMovies.length === 0) {
            console.error('❌ No movies to import');
            this.showError('No movies found to import. Please use manual search to find matches.');
            return;
        }
        
        // Show progress
        const progressSection = document.getElementById('csv-progress');
        const progressFill = document.getElementById('csv-progress-fill');
        const progressText = document.getElementById('csv-progress-text');
        const resultsSection = document.getElementById('csv-results');
        
        progressSection.style.display = 'block';
        resultsSection.style.display = 'none';
        progressFill.style.width = '0%';
        progressFill.style.backgroundColor = '#28a745'; // Reset color
        progressText.textContent = 'Importing confirmed movies...';
        
        let progressInterval;
        try {
            // Simulate progress
            progressInterval = setInterval(() => {
                const currentWidth = parseInt(progressFill.style.width) || 0;
                if (currentWidth < 90) {
                    progressFill.style.width = (currentWidth + 15) + '%';
                }
            }, 100);
            
            // Send confirmed movies to API
            console.log('📡 Sending import request...');
            const result = await this.api.importConfirmedMovies(
                this.csvPreviewData.category_id, 
                confirmedMovies
            );
            console.log('📨 Import response:', result);
            
            clearInterval(progressInterval);
            progressFill.style.width = '100%';
            progressText.textContent = 'Import completed!';
            
            // Show final results
            resultsSection.style.display = 'block';
            const { results } = result;
            
            resultsSection.innerHTML = `
                <div class="import-summary">
                    <h4>Import Results</h4>
                    <div class="result-stats">
                        <div class="stat success">
                            <i class="fas fa-check-circle"></i>
                            <span>${results.imported} imported</span>
                        </div>
                        ${results.failed > 0 ? `
                            <div class="stat error">
                                <i class="fas fa-exclamation-circle"></i>
                                <span>${results.failed} failed</span>
                            </div>
                        ` : ''}
                        <div class="stat total">
                            <i class="fas fa-list"></i>
                            <span>${results.total} processed</span>
                        </div>
                    </div>
                </div>
                
                ${results.imported_movies.length > 0 ? `
                    <div class="imported-movies">
                        <h5>Successfully Imported:</h5>
                        <div class="movie-list">
                            ${results.imported_movies.map(movie => `
                                <div class="imported-movie">
                                    <strong>${movie.title}</strong>
                                    ${movie.director ? `<span>by ${movie.director}</span>` : ''}
                                    ${movie.year ? `<span>(${movie.year})</span>` : ''}
                                    <span class="price">£${movie.price.toFixed(2)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${results.errors.length > 0 ? `
                    <div class="import-errors">
                        <h5>Errors:</h5>
                        <ul>
                            ${results.errors.map(error => `<li>${error}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <div class="final-actions">
                    <button type="button" class="btn btn-primary" id="csv-done-btn">
                        <i class="fas fa-check"></i> Done
                    </button>
                </div>
            `;
            
            // Add event listener for done button
            setTimeout(() => {
                const doneBtn = document.getElementById('csv-done-btn');
                if (doneBtn) {
                    doneBtn.addEventListener('click', () => {
                        this.closeCsvImportModal();
                    });
                }
            }, 100);
            
            // Refresh the categories to show new movies
            await this.loadData();
            this.showSuccess(result.message);
            
            // Clear preview data
            this.csvPreviewData = null;
            
        } catch (error) {
            console.error('💥 Import failed:', error);
            clearInterval(progressInterval);
            console.error('Confirmed import error:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                confirmedMovies: confirmedMovies,
                categoryId: this.csvPreviewData.category_id
            });
            
            progressText.textContent = 'Import failed!';
            progressFill.style.width = '100%';
            progressFill.style.backgroundColor = '#e74c3c';
            
            resultsSection.style.display = 'block';
            resultsSection.innerHTML = `
                <div class="import-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Import Failed</h4>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <p><strong>Movies to import:</strong> ${confirmedMovies.length}</p>
                    <p><strong>Category ID:</strong> ${this.csvPreviewData.category_id}</p>
                    <div style="margin-top: 15px;">
                        <button type="button" class="btn btn-primary" id="csv-error-close-btn">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            `;
            
            // Add event listener for error close button
            setTimeout(() => {
                const errorCloseBtn = document.getElementById('csv-error-close-btn');
                if (errorCloseBtn) {
                    errorCloseBtn.addEventListener('click', () => {
                        this.closeCsvImportModal();
                    });
                }
            }, 100);
            
            this.showError('Import failed: ' + error.message);
        }
    }

    async processPendingMovies() {
        const btn = document.getElementById('process-pending-btn');
        const originalText = btn.innerHTML;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            const result = await this.api.processPendingMovies();
            
            if (result.imported > 0) {
                this.showSuccess(`Processed ${result.processed} pending movies, imported ${result.imported}`);
                await this.loadData(); // Refresh to show new movies
            } else {
                this.showSuccess(result.message);
            }
            
        } catch (error) {
            console.error('Process pending error:', error);
            this.showError('Failed to process pending movies: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
    
    async searchKobo() {
        const query = this.koboSearchQuery.value.trim();
        if (!query) return;
        
        const results = await this.performKoboSearch(query);
        this.displaySearchResults(this.koboSearchResults, results, true);
    }
    
    async searchKoboModal() {
        const query = document.getElementById('kobo-modal-search-query').value.trim();
        if (!query) return;
        
        const results = await this.performKoboSearch(query);
        this.displaySearchResults(document.getElementById('kobo-modal-search-results'), results, false);
    }
    
    async searchMovies() {
        const query = this.movieSearchQuery.value.trim();
        if (!query) return;
        
        const results = await this.performMovieSearch(query);
        this.displayMovieSearchResults(this.movieSearchResults, results, true);
    }
    
    async searchMoviesModal() {
        const query = document.getElementById('movie-modal-search-query').value.trim();
        if (!query) return;
        
        const results = await this.performMovieSearch(query);
        this.displayMovieSearchResults(document.getElementById('movie-modal-search-results'), results, false);
    }
    
    async performKoboSearch(query) {
        // Check if book lookup is enabled for current category
        const category = this.categories[this.currentCategoryIndex];
        if (!category || !category.bookLookupEnabled) {
            return { error: 'Book lookup is not enabled for this category.' };
        }

        try {
            // Pass the category's preferred source to the API
            const source = category.bookLookupSource || 'auto';
            return await this.api.searchBooks(query, source);
        } catch (error) {
            console.error('Book search error:', error);
            return { error: 'Failed to search for books. Please try again.' };
        }
    }
    
    async performMovieSearch(query) {
        // Check if this is a movie category
        const category = this.categories[this.currentCategoryIndex];
        if (!category || category.type !== 'movies') {
            return { error: 'Movie search is only available for movie categories.' };
        }

        try {
            return await this.api.searchMovies(query);
        } catch (error) {
            console.error('Movie search error:', error);
            return { error: 'Failed to search for movies. Please try again.' };
        }
    }
    
    displaySearchResults(container, results, isInItemModal) {
        container.innerHTML = '<div class="search-loading"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
        
        setTimeout(() => {
            if (results.error) {
                container.innerHTML = `<div class="search-error">${results.error}</div>`;
                return;
            }
            
            if (!results.books || results.books.length === 0) {
                container.innerHTML = '<div class="search-error">No books found. Try a different search term.</div>';
                return;
            }
            
            const booksHtml = results.books.map(book => {
                const priceSourceIndicator = this.getPriceSourceIndicator(book.priceSource);
                return `
                <div class="search-result-item" onclick="app.selectKoboBook(${JSON.stringify(book).replace(/"/g, '&quot;')}, ${isInItemModal})">
                    <div class="search-result-title">${book.title}</div>
                    <div class="search-result-author">by ${book.author}</div>
                    <div class="search-result-price">
                        £${book.price.toFixed(2)} 
                        ${priceSourceIndicator}
                    </div>
                </div>
                `;
            }).join('');
            
            container.innerHTML = booksHtml;
        }, 1000);
    }
    
    displayMovieSearchResults(container, results, isInItemModal) {
        container.innerHTML = '<div class="search-loading"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
        
        setTimeout(() => {
            if (results.error) {
                container.innerHTML = `<div class="search-error">${results.error}</div>`;
                return;
            }
            
            if (!results.movies || results.movies.length === 0) {
                container.innerHTML = '<div class="search-error">No movies found. Try a different search term.</div>';
                return;
            }
            
            const moviesHtml = results.movies.map(movie => {
                const priceSourceIndicator = this.getPriceSourceIndicator(movie.priceSource);
                return `
                <div class="search-result-item" onclick="app.selectMovie(${JSON.stringify(movie).replace(/"/g, '&quot;')}, ${isInItemModal})">
                    <div class="search-result-title">${movie.title}</div>
                    <div class="search-result-author">Directed by ${movie.director} (${movie.year || 'Unknown Year'})</div>
                    <div class="search-result-price">
                        £${movie.price.toFixed(2)} 
                        ${priceSourceIndicator}
                    </div>
                </div>
                `;
            }).join('');
            
            container.innerHTML = moviesHtml;
        }, 1000);
    }
    
    async selectKoboBook(book, isInItemModal) {
        if (isInItemModal) {
            this.itemNameInput.value = book.name || `${book.title} by ${book.author}`;
            this.itemTitleInput.value = book.title;
            this.itemAuthorInput.value = book.author;
            this.itemUrlInput.value = book.url;
            this.itemPriceInput.value = book.price.toFixed(2);
            this.koboSearchResults.innerHTML = '';
            this.koboSearchQuery.value = '';
        } else {
            try {
                const category = this.categories[this.currentCategoryIndex];
                // For books, send both the display name and separate title/author
                const displayName = book.name || `${book.title} by ${book.author}`;
                const newItem = await this.api.createItem(
                    category.id, 
                    displayName, 
                    book.url, 
                    book.price, 
                    book.title, 
                    book.author
                );
                newItem.priceSource = book.priceSource; // Add price source to the item
                this.categories[this.currentCategoryIndex].items.push(newItem);
                this.render();
                this.closeKoboModal();
            } catch (error) {
                console.error('Failed to add book:', error);
                this.showError('Failed to add book');
            }
        }
    }
    
    async selectMovie(movie, isInItemModal) {
        if (isInItemModal) {
            this.itemNameInput.value = movie.name || `${movie.title} (${movie.year})`;
            this.itemTitleMovieInput.value = movie.title;
            this.itemDirectorInput.value = movie.director;
            this.itemYearInput.value = movie.year || '';
            this.itemUrlInput.value = movie.url;
            this.itemPriceInput.value = movie.price.toFixed(2);
            this.movieSearchResults.innerHTML = '';
            this.movieSearchQuery.value = '';
        } else {
            try {
                const category = this.categories[this.currentCategoryIndex];
                // For movies, send display name and separate movie fields
                const displayName = movie.name || `${movie.title} (${movie.year})`;
                const newItem = await this.api.createItem(
                    category.id, 
                    displayName, 
                    movie.url, 
                    movie.price, 
                    movie.title, 
                    null, // author (not used for movies)
                    movie.director,
                    movie.year
                );
                newItem.priceSource = movie.priceSource; // Add price source to the item
                this.categories[this.currentCategoryIndex].items.push(newItem);
                this.render();
                this.closeMovieModal();
            } catch (error) {
                console.error('Failed to add movie:', error);
                this.showError('Failed to add movie');
            }
        }
    }
    
    async refreshItemPrice(categoryIndex, itemIndex) {
        const item = this.categories[categoryIndex].items[itemIndex];
        if (!item.url.includes('kobo.com')) {
            alert('Price refresh is only supported for Kobo items');
            return;
        }
        
        try {
            const result = await this.api.refreshItemPrice(item.id);
            if (result.price !== item.price) {
                item.price = result.price;
                item.last_updated = new Date().toISOString();
                this.render();
                alert(`Price updated to £${result.price.toFixed(2)}`);
            } else {
                alert('No price change detected');
            }
        } catch (error) {
            console.error('Price refresh error:', error);
            alert('Failed to refresh price. Please try again.');
        }
    }
    
    async refreshAllPrices(categoryIndex) {
        const category = this.categories[categoryIndex];
        const koboItems = category.items.filter(item => item.url.includes('kobo.com'));
        
        if (koboItems.length === 0) {
            alert('No Kobo items to refresh in this category');
            return;
        }
        
        let updatedCount = 0;
        
        for (let i = 0; i < category.items.length; i++) {
            if (category.items[i].url.includes('kobo.com')) {
                try {
                    const item = category.items[i];
                    const result = await this.api.refreshItemPrice(item.id);
                    if (result.price !== item.price) {
                        item.price = result.price;
                        item.last_updated = new Date().toISOString();
                        updatedCount++;
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error('Failed to refresh price for item:', category.items[i].name);
                }
            }
        }
        
        this.render();
        alert(`Price refresh complete. ${updatedCount} items updated.`);
    }
    
    render() {
        this.categoriesContainer.innerHTML = '';
        
        if (this.categories.length === 0) {
            this.categoriesContainer.innerHTML = `
                <div class="welcome-state">
                    <div class="welcome-content">
                        <i class="fas fa-tags"></i>
                        <h2>Welcome to PriceNest! 🏠</h2>
                        <p>Get started by creating your first category to organize and track prices for your favorite items.</p>
                        
                        <div class="quick-start">
                            <h4>Popular category ideas:</h4>
                            <div class="category-suggestions">
                                <button class="btn btn-secondary suggestion-btn" onclick="app.createSuggestedCategory('Books', 'books')">
                                    <i class="fas fa-book"></i> Books
                                </button>
                                <button class="btn btn-secondary suggestion-btn" onclick="app.createSuggestedCategory('Movies', 'movies')">
                                    <i class="fas fa-film"></i> Movies
                                </button>
                                <button class="btn btn-secondary suggestion-btn" onclick="app.createSuggestedCategory('Electronics', 'general')">
                                    <i class="fas fa-laptop"></i> Electronics
                                </button>
                                <button class="btn btn-secondary suggestion-btn" onclick="app.createSuggestedCategory('Games', 'general')">
                                    <i class="fas fa-gamepad"></i> Games
                                </button>
                            </div>
                        </div>
                        
                        <div class="cta-section">
                            <button class="btn btn-primary btn-large" onclick="app.openCategoryModal()">
                                <i class="fas fa-plus"></i> Create Your First Category
                            </button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        this.categories.forEach((category, categoryIndex) => {
            const categoryElement = this.createCategoryElement(category, categoryIndex);
            this.categoriesContainer.appendChild(categoryElement);
        });
    }
    
    async createSuggestedCategory(name, type) {
        try {
            // Set up automatic features for specific types
            const bookLookupEnabled = type === 'books';
            const bookLookupSource = 'auto';
            
            const newCategory = await this.api.createCategory(name, type, bookLookupEnabled, bookLookupSource);
            this.categories.push(newCategory);
            this.render();
            
            // Show success message
            this.showSuccess(`${name} category created! ${bookLookupEnabled ? 'Book search is enabled.' : ''}`);
        } catch (error) {
            console.error('Failed to create suggested category:', error);
            this.showError(`Failed to create ${name} category`);
        }
    }
    
    createCategoryElement(category, categoryIndex) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category collapsed';  // Start collapsed
        categoryDiv.dataset.categoryIndex = categoryIndex;
        
        const boughtCount = category.items.filter(item => item.bought).length;
        const totalCount = category.items.length;
        const totalValue = category.items.reduce((sum, item) => sum + (item.bought ? 0 : item.price), 0);
        
        categoryDiv.innerHTML = `
            <div class="category-header" onclick="app.toggleCategory(${categoryIndex})">
                <div class="category-info">
                    <div class="category-title-row">
                        <h2 class="category-title">${category.name}</h2>
                        <i class="fas fa-chevron-down category-toggle"></i>
                    </div>
                    <div class="category-summary">
                        <span class="item-count">${totalCount} item${totalCount !== 1 ? 's' : ''}</span>
                        <span class="bought-count">${boughtCount} purchased</span>
                        ${totalValue > 0 ? `<span class="total-value">£${totalValue.toFixed(2)} remaining</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="category-content">
                <div class="category-actions">
                    <button class="btn btn-primary btn-small" onclick="event.stopPropagation(); app.openItemModal(${categoryIndex})">
                        <i class="fas fa-plus"></i> Add Item
                    </button>
                    ${category.bookLookupEnabled ? `
                        <button class="btn btn-success btn-small" onclick="event.stopPropagation(); app.openKoboModal(${categoryIndex})">
                            <i class="fas fa-book"></i> Add from Books
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); app.refreshAllPrices(${categoryIndex})">
                            <i class="fas fa-sync"></i> Refresh Prices
                        </button>
                    ` : ''}
                    ${category.type === 'movies' ? `
                        <button class="btn btn-success btn-small" onclick="event.stopPropagation(); app.openMovieModal(${categoryIndex})">
                            <i class="fas fa-film"></i> Add from Movies
                        </button>
                        <button class="btn btn-primary btn-small" onclick="event.stopPropagation(); app.openDirectManualAddModal(${categoryIndex})">
                            <i class="fas fa-plus"></i> Add Manually
                        </button>
                        <button class="btn btn-info btn-small" onclick="event.stopPropagation(); app.openCsvImportModal(${categoryIndex})">
                            <i class="fas fa-file-csv"></i> Import CSV
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); app.openCategoryModal(${categoryIndex})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); app.deleteCategory(${categoryIndex})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
                <div class="category-items">
                    ${this.createItemsSection(category, categoryIndex)}
                </div>
            </div>
        `;
        
        return categoryDiv;
    }
    
    toggleCategory(categoryIndex) {
        const categoryElement = document.querySelector(`[data-category-index="${categoryIndex}"]`);
        if (!categoryElement) return;
        
        const isCollapsed = categoryElement.classList.contains('collapsed');
        const toggleIcon = categoryElement.querySelector('.category-toggle');
        
        if (isCollapsed) {
            // Expand
            categoryElement.classList.remove('collapsed');
            categoryElement.classList.add('expanded');
            toggleIcon.classList.remove('fa-chevron-down');
            toggleIcon.classList.add('fa-chevron-up');
        } else {
            // Collapse
            categoryElement.classList.remove('expanded');
            categoryElement.classList.add('collapsed');
            toggleIcon.classList.remove('fa-chevron-up');
            toggleIcon.classList.add('fa-chevron-down');
        }
    }
    
    createItemsSection(category, categoryIndex) {
        if (category.items.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-shopping-cart"></i>
                    <h4>No items in this category</h4>
                    <p>Add your first item to start tracking!</p>
                </div>
            `;
        }
        
        const itemsHtml = category.items.map((item, itemIndex) => 
            this.createItemElement(item, categoryIndex, itemIndex)
        ).join('');
        
        return `
            <div class="items-header">
                <h3>Items (${category.items.length})</h3>
                <div class="sort-controls">
                    <label>Sort by:</label>
                    <select onchange="app.sortItems(${categoryIndex}, this.value)">
                        <option value="">Default</option>
                        <option value="name">Name</option>
                        <option value="price-low">Price (Low to High)</option>
                        <option value="price-high">Price (High to Low)</option>
                        <option value="bought">Purchased Status</option>
                    </select>
                </div>
            </div>
            <div class="items-grid">
                ${itemsHtml}
            </div>
        `;
    }
    
    createItemElement(item, categoryIndex, itemIndex) {
        const lastUpdated = item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : 'Never';
        const priceHistory = item.priceHistory || [];
        const isKoboItem = item.url.includes('kobo.com');
        
        let priceChangeHtml = '';
        if (priceHistory.length > 1) {
            const previousPrice = priceHistory[priceHistory.length - 2].price;
            const currentPrice = item.price;
            const priceDiff = currentPrice - previousPrice;
            
            if (priceDiff !== 0) {
                const changeClass = priceDiff > 0 ? 'price-increase' : 'price-decrease';
                const changeIcon = priceDiff > 0 ? 'fa-arrow-up' : 'fa-arrow-down';
                priceChangeHtml = `
                    <span class="price-change ${changeClass}">
                        <i class="fas ${changeIcon}"></i> £${Math.abs(priceDiff).toFixed(2)}
                    </span>
                `;
            }
        }
        
        const priceHistoryHtml = priceHistory.length > 1 ? `
            <div class="price-history">
                <strong>Price History:</strong>
                ${priceHistory.slice(-3).map(entry => `
                    £${entry.price.toFixed(2)} (${new Date(entry.date).toLocaleDateString()})
                `).join(', ')}
            </div>
        ` : '';
        
        return `
            <div class="item ${item.bought ? 'bought' : ''}">
                <div class="item-header">
                    <div>
                        ${this.formatItemTitle(item)}
                        <a href="${item.url}" target="_blank" class="item-url" title="${item.url}">
                            <i class="fas fa-external-link-alt"></i> View Item
                        </a>
                        <div class="price-update-info">
                            Last updated: ${lastUpdated}
                            ${isKoboItem ? '<i class="fas fa-book" title="Kobo item"></i>' : ''}
                        </div>
                    </div>
                    <div>
                        <div class="item-price">
                            £${item.price.toFixed(2)} ${priceChangeHtml}
                            ${item.priceSource ? this.getPriceSourceIndicator(item.priceSource) : ''}
                        </div>
                    </div>
                </div>
                ${priceHistoryHtml}
                <div class="item-actions">
                    <button class="btn ${item.bought ? 'btn-secondary' : 'btn-success'} btn-small" 
                            onclick="app.toggleItemBought(${categoryIndex}, ${itemIndex})">
                        <i class="fas ${item.bought ? 'fa-undo' : 'fa-check'}"></i> 
                        ${item.bought ? 'Mark Unbought' : 'Mark Bought'}
                    </button>
                    <button class="btn btn-secondary btn-small" 
                            onclick="app.openItemModal(${categoryIndex}, ${itemIndex})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    ${isKoboItem ? `
                        <button class="btn btn-secondary btn-small refresh-price-btn" 
                                onclick="app.refreshItemPrice(${categoryIndex}, ${itemIndex})">
                            <i class="fas fa-sync"></i> Refresh
                        </button>
                    ` : ''}
                    <button class="btn btn-danger btn-small" 
                            onclick="app.deleteItem(${categoryIndex}, ${itemIndex})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }
}

const app = new PriceNest();
// Make it available globally for any remaining onclick handlers
window.priceNest = app;