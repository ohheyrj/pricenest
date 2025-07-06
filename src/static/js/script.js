// APIClient is now loaded from api-client.js

class PriceNest {
    constructor() {
        this.categories = [];
        this.currentCategoryIndex = null;
        this.currentItemIndex = null;
        this.editingCategory = false;
        this.editingItem = false;
        this.currentViewMode = 'grid'; // Track current view mode (grid/list)
        this.api = new APIClient();
        this.settings = this.loadSettings();
        
        // Initialize CSV importer
        this.csvImporter = new CSVImporter(
            this.api,
            (message) => this.showError(message),
            (message) => this.showSuccess(message),
            () => this.loadData()
        );
        
        // Initialize search services
        this.bookSearch = new BookSearch(
            this.api,
            (message) => this.showError(message),
            (message) => this.showSuccess(message)
        );
        
        this.movieSearch = new MovieSearch(
            this.api,
            (message) => this.showError(message),
            (message) => this.showSuccess(message)
        );
        
        this.searchManager = new SearchManager(
            this.movieSearch,
            this.bookSearch,
            (message) => this.showError(message),
            (message) => this.showSuccess(message),
            (newItem) => {
                // Add the new item to the current category and refresh the view
                if (this.currentCategoryIndex !== null) {
                    this.categories[this.currentCategoryIndex].items.push(newItem);
                    this.render();
                }
            }
        );
        
        this.initializeElements();
        this.bindEvents();
        this.initializeRouting();
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
            this.handleRoute(); // Handle initial route after data loads
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showError('Failed to load data from database');
        }
    }

    initializeRouting() {
        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
    }

    handleRoute() {
        const hash = window.location.hash;
        
        if (!hash || hash === '#') {
            // No hash or empty hash - show main categories view
            this.currentCategoryIndex = null;
            this.currentViewMode = 'grid'; // Reset view mode when going to main view
            this.renderMainView();
            return;
        }

        // Parse hash routes
        if (hash.startsWith('#/category/')) {
            const categoryName = decodeURIComponent(hash.replace('#/category/', ''));
            const categoryIndex = this.categories.findIndex(cat => cat.name === categoryName);
            
            if (categoryIndex !== -1) {
                this.openCategoryView(categoryIndex, false); // false = don't update URL
            } else {
                // Category not found, go back to main view
                this.navigateTo('');
            }
        } else {
            // Unknown route, go to main view
            this.navigateTo('');
        }
    }

    navigateTo(route) {
        if (route === '' || route === '/') {
            window.location.hash = '';
        } else {
            window.location.hash = '#' + route;
        }
    }

    async checkForMigration() {
        const localData = this.loadFromStorage();
        if (localData && localData.length > 0 && this.categories.length === 0) {
            const confirmed = await UIComponents.Confirmation.show({
                title: 'Data Migration',
                message: 'Found existing data in browser storage. Would you like to migrate it to the database?',
                confirmText: 'Migrate',
                cancelText: 'Skip',
                type: 'info'
            });
            
            if (confirmed) {
                try {
                    await this.api.migrateData(localData);
                    localStorage.removeItem('priceNestData');
                    await this.loadData();
                    this.showSuccess('Data migrated successfully!');
                } catch (error) {
                    console.error('Migration failed:', error);
                    this.showError('Failed to migrate data. You can continue using the app with empty database.');
                }
            }
        }
    }

    showError(message) {
        UIComponents.Notification.showError(message);
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
        document.getElementById('process-pending-btn').addEventListener('click', () => this.processPendingMovies());
        document.getElementById('cancel-settings').addEventListener('click', () => this.closeSettingsModal());
        
        this.settingsBtn.addEventListener('click', () => this.openSettingsModal());
        this.settingsForm.addEventListener('submit', (e) => this.handleSettingsSubmit(e));
        this.koboSearchBtn.addEventListener('click', () => this.searchKobo());
        document.getElementById('kobo-modal-search-btn').addEventListener('click', () => this.searchKoboModal());
        this.movieSearchBtn.addEventListener('click', () => this.searchMovies());
        document.getElementById('movie-modal-search-btn').addEventListener('click', () => this.searchMoviesModal());
        
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
                } else if (e.target.closest('#settings-modal')) {
                    this.closeSettingsModal();
                } else if (e.target.closest('#csv-import-modal')) {
                    this.csvImporter.closeCsvImportModal();
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
            } else if (e.target === this.settingsModal) {
                this.closeSettingsModal();
            } else if (e.target === this.csvImporter.csvImportModal) {
                this.csvImporter.closeCsvImportModal();
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
        UIComponents.Notification.showInfo('Book lookup enabled automatically for this category', 3000);
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
        
        // Set the current category in the search manager
        this.searchManager.setCurrentCategory(category);
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
        const category = this.categories[categoryIndex];
        const confirmed = await UIComponents.Confirmation.showDestructive(
            'Are you sure you want to delete this category and all its items?',
            category.name
        );
        
        if (confirmed) {
            try {
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
        const item = this.categories[categoryIndex].items[itemIndex];
        const confirmed = await UIComponents.Confirmation.showDestructive(
            'Are you sure you want to delete this item?',
            item.name
        );
        
        if (confirmed) {
            try {
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
        UIComponents.Notification.showSuccess(message);
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
    
    openDirectManualAddModal(categoryIndex) {
        const category = this.categories[categoryIndex];
        if (!category || category.type !== 'movies') {
            this.showError('Manual movie addition is only available for movie categories');
            return;
        }
        
        // Use csvImporter's manual add functionality for direct category addition
        // Create a temporary result object for the csvImporter to work with
        const tempResult = {
            title: '',
            director: '',
            year: null,
            price: null,
            url: '',
            status: 'manual_add'
        };
        
        // Set up the csvImporter with the category info
        this.csvImporter.currentCsvCategoryId = category.id;
        this.csvImporter.csvPreviewData = {
            results: [tempResult],
            category_id: category.id,
            category_name: category.name
        };
        
        // Open the manual add modal in direct add mode
        this.csvImporter.openManualAddModal(0, true);
    }
    

    async processPendingMovies() {
        const btn = document.getElementById('process-pending-btn');
        
        try {
            UIComponents.Loading.setButtonLoading(btn, 'Processing...');
            
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
            UIComponents.Loading.clearButtonLoading(btn);
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
        // Delegate to the book search service
        const category = this.categories[this.currentCategoryIndex];
        return await this.bookSearch.search(query, category);
    }
    
    async performMovieSearch(query) {
        // Delegate to the movie search service
        const category = this.categories[this.currentCategoryIndex];
        return await this.movieSearch.search(query, category);
    }
    
    displaySearchResults(container, results, isInItemModal) {
        UIComponents.Loading.showInlineSpinner(container, 'Searching...');
        
        setTimeout(() => {
            if (results.error) {
                container.innerHTML = `<div class="search-error">${results.error}</div>`;
                return;
            }
            
            if (!results.books || results.books.length === 0) {
                const emptyState = UIComponents.EmptyState.createNoResultsState('books');
                container.innerHTML = emptyState.outerHTML;
                return;
            }
            
            const booksHtml = this.bookSearch.generateResultsHTML(results.books, isInItemModal, this.getPriceSourceIndicator.bind(this));
            container.innerHTML = booksHtml;
        }, 1000);
    }
    
    displayMovieSearchResults(container, results, isInItemModal) {
        UIComponents.Loading.showInlineSpinner(container, 'Searching...');
        
        setTimeout(() => {
            if (results.error) {
                container.innerHTML = `<div class="search-error">${results.error}</div>`;
                return;
            }
            
            if (!results.movies || results.movies.length === 0) {
                const emptyState = UIComponents.EmptyState.createNoResultsState('movies');
                container.innerHTML = emptyState.outerHTML;
                return;
            }
            
            const moviesHtml = this.movieSearch.generateResultsHTML(results.movies, isInItemModal, this.getPriceSourceIndicator.bind(this));
            container.innerHTML = moviesHtml;
        }, 1000);
    }
    
    async selectKoboBook(book, isInItemModal) {
        if (isInItemModal) {
            // Use the book search service to populate the form
            this.bookSearch.populateItemForm(book, {
                itemNameInput: this.itemNameInput,
                itemTitleInput: this.itemTitleInput,
                itemAuthorInput: this.itemAuthorInput,
                itemUrlInput: this.itemUrlInput,
                itemPriceInput: this.itemPriceInput,
                koboSearchResults: this.koboSearchResults,
                koboSearchQuery: this.koboSearchQuery
            });
        } else {
            // Use the book search service to add to category
            const category = this.categories[this.currentCategoryIndex];
            const result = await this.bookSearch.addToCategory(book, category, (newItem) => {
                this.categories[this.currentCategoryIndex].items.push(newItem);
                this.render();
            });
            
            if (result.success) {
                this.closeKoboModal();
            }
        }
    }
    
    async selectMovie(movie, isInItemModal) {
        if (isInItemModal) {
            // Use the movie search service to populate the form
            this.movieSearch.populateItemForm(movie, {
                itemNameInput: this.itemNameInput,
                itemTitleMovieInput: this.itemTitleMovieInput,
                itemDirectorInput: this.itemDirectorInput,
                itemYearInput: this.itemYearInput,
                itemUrlInput: this.itemUrlInput,
                itemPriceInput: this.itemPriceInput,
                movieSearchResults: this.movieSearchResults,
                movieSearchQuery: this.movieSearchQuery
            });
        } else {
            // Use the movie search service to add to category
            const category = this.categories[this.currentCategoryIndex];
            const result = await this.movieSearch.addToCategory(movie, category, (newItem) => {
                this.categories[this.currentCategoryIndex].items.push(newItem);
                this.render();
            });
            
            if (result.success) {
                this.closeMovieModal();
            }
        }
    }
    
    async refreshItemPrice(categoryIndex, itemIndex) {
        const item = this.categories[categoryIndex].items[itemIndex];
        const category = this.categories[categoryIndex];
        
        // Check if price refresh is supported for this category type
        const isKoboItem = item.url.includes('kobo.com');
        const canRefreshPrice = isKoboItem || category.type === 'movies' || category.type === 'books';
        
        if (!canRefreshPrice) {
            alert('Price refresh is only supported for book and movie items');
            return;
        }
        
        try {
            const result = await this.api.refreshItemPrice(item.id);
            
            // Update the item with new data
            this.categories[categoryIndex].items[itemIndex] = result;
            
            // Check if price was updated
            if (result.priceRefresh && result.priceRefresh.updated) {
                const oldPrice = result.priceRefresh.oldPrice;
                const newPrice = result.priceRefresh.newPrice;
                const source = result.priceRefresh.source;
                this.render();
                alert(`Price updated from £${oldPrice.toFixed(2)} to £${newPrice.toFixed(2)} (Source: ${source})`);
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
        
        // Check if category supports price refresh
        const refreshableItems = category.items.filter(item => {
            const isKoboItem = item.url.includes('kobo.com');
            return isKoboItem || category.type === 'movies' || category.type === 'books';
        });
        
        if (refreshableItems.length === 0) {
            alert('No items that support price refresh in this category');
            return;
        }
        
        const confirmed = await UIComponents.Confirmation.show({
            title: 'Refresh Prices',
            message: `Refresh prices for ${refreshableItems.length} items? This may take a few minutes.`,
            confirmText: 'Refresh',
            cancelText: 'Cancel',
            type: 'info'
        });
        
        if (!confirmed) {
            return;
        }
        
        let updatedCount = 0;
        let processedCount = 0;
        
        for (let i = 0; i < category.items.length; i++) {
            const item = category.items[i];
            const isKoboItem = item.url.includes('kobo.com');
            const canRefresh = isKoboItem || category.type === 'movies' || category.type === 'books';
            
            if (canRefresh) {
                try {
                    processedCount++;
                    console.log(`Refreshing ${processedCount}/${refreshableItems.length}: ${item.name}`);
                    
                    const result = await this.api.refreshItemPrice(item.id);
                    
                    // Update the item with new data
                    this.categories[categoryIndex].items[i] = result;
                    
                    // Check if price was updated
                    if (result.priceRefresh && result.priceRefresh.updated) {
                        updatedCount++;
                    }
                    
                    // Small delay to be respectful to APIs
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error('Failed to refresh price for item:', item.name, error);
                }
            }
        }
        
        this.render();
        alert(`Price refresh complete! Updated ${updatedCount} out of ${processedCount} items.`);
    }
    
    render() {
        // If we're currently viewing a specific category, re-render that view
        if (this.currentCategoryIndex !== null && this.categories[this.currentCategoryIndex]) {
            this.openCategoryView(this.currentCategoryIndex, false);
            return;
        }
        
        this.renderMainView();
    }

    renderMainView() {
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
        
        // Render categories as a grid of blocks
        this.categoriesContainer.innerHTML = '<div class="categories-grid"></div>';
        const grid = this.categoriesContainer.querySelector('.categories-grid');
        
        this.categories.forEach((category, categoryIndex) => {
            const categoryElement = this.createCategoryElement(category, categoryIndex);
            grid.appendChild(categoryElement);
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
        categoryDiv.className = 'category-block';
        categoryDiv.dataset.categoryIndex = categoryIndex;
        
        const boughtCount = category.items.filter(item => item.bought).length;
        const totalCount = category.items.length;
        const totalValue = category.items.reduce((sum, item) => sum + (item.bought ? 0 : item.price), 0);
        
        // Get icon based on category type
        const getIcon = (type) => {
            switch(type) {
                case 'books': return 'fas fa-book';
                case 'movies': return 'fas fa-film';
                default: return 'fas fa-list';
            }
        };
        
        categoryDiv.innerHTML = `
            <div class="category-block-content" onclick="app.openCategoryView(${categoryIndex})">
                <div class="category-icon">
                    <i class="${getIcon(category.type)}"></i>
                </div>
                <h3 class="category-name">${category.name}</h3>
                <div class="category-type">${category.type.charAt(0).toUpperCase() + category.type.slice(1)}</div>
                <div class="category-stats">
                    <div class="stat-item">
                        <span class="stat-number">${totalCount}</span>
                        <span class="stat-label">Items</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${boughtCount}</span>
                        <span class="stat-label">Bought</span>
                    </div>
                </div>
                ${totalValue > 0 ? `<div class="category-value">£${totalValue.toFixed(2)}</div>` : ''}
            </div>
        `;
        
        return categoryDiv;
    }
    
    openCategoryView(categoryIndex, updateUrl = true) {
        // Reset view mode only if switching to a different category
        if (this.currentCategoryIndex !== categoryIndex) {
            this.currentViewMode = 'grid';
        }
        
        // Store the current category for detailed view
        this.currentCategoryIndex = categoryIndex;
        const category = this.categories[categoryIndex];
        
        // Update URL if requested
        if (updateUrl) {
            this.navigateTo(`/category/${encodeURIComponent(category.name)}`);
        }
        
        // Update the main container to show detailed category view
        const container = document.getElementById('categories-container');
        container.innerHTML = `
            <div class="category-detail-view">
                <div class="category-detail-header">
                    <button class="btn btn-secondary back-btn" onclick="app.backToCategories()">
                        <i class="fas fa-arrow-left"></i> Back to Categories
                    </button>
                    <div class="category-detail-info">
                        <h1><i class="${this.getCategoryIcon(category.type)}"></i> ${category.name}</h1>
                        <span class="category-type-badge">${category.type.charAt(0).toUpperCase() + category.type.slice(1)}</span>
                    </div>
                    <div class="view-toggle">
                        <button class="btn btn-small view-toggle-btn ${this.currentViewMode === 'grid' ? 'active' : ''}" data-view="grid" onclick="app.toggleItemView('grid')">
                            <i class="fas fa-th"></i> Grid
                        </button>
                        <button class="btn btn-small view-toggle-btn ${this.currentViewMode === 'list' ? 'active' : ''}" data-view="list" onclick="app.toggleItemView('list')">
                            <i class="fas fa-list"></i> List
                        </button>
                    </div>
                </div>
                
                <div class="category-actions">
                    <button class="btn btn-primary" onclick="app.openItemModal(${categoryIndex})">
                        <i class="fas fa-plus"></i> Add Item
                    </button>
                    ${category.bookLookupEnabled ? `
                        <button class="btn btn-success" onclick="app.openKoboModal(${categoryIndex})">
                            <i class="fas fa-book"></i> Add from Books
                        </button>
                    ` : ''}
                    ${(category.type === 'movies' || category.type === 'books') ? `
                        <button class="btn btn-secondary" onclick="app.refreshAllPrices(${categoryIndex})">
                            <i class="fas fa-sync"></i> Refresh Prices
                        </button>
                    ` : ''}
                    ${category.type === 'movies' ? `
                        <button class="btn btn-success" onclick="app.openMovieModal(${categoryIndex})">
                            <i class="fas fa-film"></i> Add from Movies
                        </button>
                        <button class="btn btn-primary" onclick="app.openDirectManualAddModal(${categoryIndex})">
                            <i class="fas fa-plus"></i> Add Manually
                        </button>
                        <button class="btn btn-info" onclick="app.csvImporter.openCsvImportModal(${categoryIndex}, app.categories[${categoryIndex}])">
                            <i class="fas fa-file-csv"></i> Import CSV
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="app.openCategoryModal(${categoryIndex})">
                        <i class="fas fa-edit"></i> Edit Category
                    </button>
                    <button class="btn btn-danger" onclick="app.deleteCategory(${categoryIndex})">
                        <i class="fas fa-trash"></i> Delete Category
                    </button>
                </div>
                
                <div class="category-items ${this.currentViewMode}-view" id="category-items-container">
                    ${category.items.length > 0 ? this.createItemsSection(category, categoryIndex) : this.createEmptyItemsState(categoryIndex)}
                </div>
            </div>
        `;
    }
    
    backToCategories() {
        // Update URL to go back to main view
        this.navigateTo('');
    }
    
    createEmptyItemsState(categoryIndex) {
        const emptyState = UIComponents.EmptyState.createEmptyItemsState(() => {
            this.openItemModal(categoryIndex);
        });
        return emptyState.outerHTML;
    }
    
    toggleItemView(view) {
        this.currentViewMode = view; // Store the current view mode
        const container = document.getElementById('category-items-container');
        const toggleBtns = document.querySelectorAll('.view-toggle-btn');
        
        // Update active button
        toggleBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Update container class
        container.className = view === 'grid' ? 'category-items grid-view' : 'category-items list-view';
    }
    
    getCategoryIcon(type) {
        switch(type) {
            case 'books': return 'fas fa-book';
            case 'movies': return 'fas fa-film';
            default: return 'fas fa-list';
        }
    }
    
    toggleCategory(categoryIndex) {
        // Legacy method - now redirects to new category view
        this.openCategoryView(categoryIndex);
    }
    
    createItemsSection(category, categoryIndex) {
        if (category.items.length === 0) {
            const emptyState = UIComponents.EmptyState.create({
                icon: 'fas fa-shopping-cart',
                title: 'No items in this category',
                message: 'Add your first item to start tracking!',
                actions: [
                    {
                        text: 'Add Item',
                        icon: 'fas fa-plus',
                        className: 'btn-primary',
                        onClick: () => this.openItemModal(categoryIndex)
                    }
                ]
            });
            return emptyState.outerHTML;
        }
        
        const itemsHtml = category.items.map((item, itemIndex) => 
            this.createItemElement(item, categoryIndex, itemIndex, category)
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
    
    createItemElement(item, categoryIndex, itemIndex, category) {
        const isKoboItem = item.url.includes('kobo.com');
        const canRefreshPrice = isKoboItem || category.type === 'movies' || category.type === 'books';
        
        // Show last updated time
        const lastUpdated = item.lastUpdated ? 
            new Date(item.lastUpdated).toLocaleDateString() : 
            'Never updated';
        
        // Price change indicators will be shown via hover tooltip
        const priceChangeHtml = item.lastUpdated && item.lastUpdated !== item.createdAt ? 
            `<span class="price-updated-indicator" title="Price recently updated">
                <i class="fas fa-clock" style="color: #1976d2; font-size: 10px;"></i>
            </span>` : '';
        
        const priceHistoryHtml = '';
        
        // Get artwork URL or placeholder
        const artworkUrl = item.artworkUrl || item.imageUrl || null;
        
        return `
            <div class="item-card ${item.bought ? 'bought' : ''}">
                <!-- Artwork column for list view -->
                <div class="item-artwork">
                    ${artworkUrl ? 
                        `<img src="${artworkUrl}" alt="${item.title || item.name}" onerror="this.style.display='none'">` : 
                        `<div class="artwork-placeholder"><i class="fas ${this.getItemIcon(item)}"></i></div>`
                    }
                </div>
                
                <!-- Main info column -->
                <div class="item-info">
                    <div class="item-title">${item.title || item.name}</div>
                    <div class="item-subtitle">
                        <a href="${item.url}" target="_blank" class="item-url" title="${item.url}">
                            <i class="fas fa-external-link-alt"></i> View Item
                        </a>
                    </div>
                    
                    <!-- Grid view additional info -->
                    <div class="grid-only-info">
                        <div class="price-update-info">
                            Last updated: ${lastUpdated}
                            ${isKoboItem ? '<i class="fas fa-book" title="Kobo item"></i>' : ''}
                        </div>
                        ${priceHistoryHtml}
                    </div>
                </div>
                
                <!-- Details column for list view -->
                <div class="item-details">
                    ${item.year ? `<span class="item-year">${item.year}</span>` : ''}
                    ${item.director ? `<span class="item-director">Dir: ${item.director}</span>` : ''}
                    ${item.author ? `<span class="item-author">By: ${item.author}</span>` : ''}
                </div>
                
                <!-- Price column -->
                <div class="item-price-cell">
                    <div class="item-price">
                        £${item.price.toFixed(2)}
                        ${priceChangeHtml}
                        ${item.priceSource ? this.getPriceSourceIndicator(item.priceSource) : ''}
                    </div>
                </div>
                
                <!-- Actions column -->
                <div class="item-actions">
                    <button class="btn ${item.bought ? 'btn-secondary' : 'btn-success'} btn-small" 
                            onclick="app.toggleItemBought(${categoryIndex}, ${itemIndex})"
                            title="${item.bought ? 'Mark as not purchased' : 'Mark as purchased'}">
                        <i class="fas ${item.bought ? 'fa-undo' : 'fa-check'}"></i>
                        <span class="btn-text">${item.bought ? 'Unbought' : 'Bought'}</span>
                    </button>
                    <button class="btn btn-secondary btn-small" 
                            onclick="app.openItemModal(${categoryIndex}, ${itemIndex})"
                            title="Edit item">
                        <i class="fas fa-edit"></i>
                        <span class="btn-text">Edit</span>
                    </button>
                    ${canRefreshPrice ? `
                        <button class="btn btn-secondary btn-small refresh-price-btn" 
                                onclick="app.refreshItemPrice(${categoryIndex}, ${itemIndex})"
                                title="Refresh price">
                            <i class="fas fa-sync"></i>
                            <span class="btn-text">Refresh</span>
                        </button>
                    ` : ''}
                    <button class="btn btn-info btn-small" 
                            onclick="app.showPriceHistoryModal(${item.id})"
                            title="View price history">
                        <i class="fas fa-chart-line"></i>
                        <span class="btn-text">History</span>
                    </button>
                    <button class="btn btn-danger btn-small" 
                            onclick="app.deleteItem(${categoryIndex}, ${itemIndex})"
                            title="Delete item">
                        <i class="fas fa-trash"></i>
                        <span class="btn-text">Delete</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    getItemIcon(item) {
        if (item.title && item.director) return 'fa-film'; // Movie
        if (item.title && item.author) return 'fa-book'; // Book
        if (item.url && item.url.includes('kobo.com')) return 'fa-book'; // Kobo book
        return 'fa-shopping-cart'; // Generic item
    }

    async showPriceHistoryModal(itemId) {
        try {
            // Fetch price history
            const historyData = await this.api.getItemPriceHistory(itemId);
            const history = historyData.priceHistory || [];
            
            if (history.length === 0) {
                this.showError('No price history available for this item.');
                return;
            }
            
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal price-history-modal';
            modal.style.display = 'block';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-chart-line"></i> Price History</h2>
                        <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    </div>
                    <div class="modal-body">
                        ${this.createPriceHistoryContent(history, historyData.itemName)}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                    </div>
                </div>
            `;
            
            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            document.body.appendChild(modal);
            
        } catch (error) {
            console.error('Failed to load price history:', error);
            this.showError('Failed to load price history.');
        }
    }
    
    createPriceHistoryContent(history, itemName) {
        // Show all price changes in reverse chronological order (newest first)
        const reversedHistory = [...history].reverse();
        
        let html = `
            <div class="price-history-header">
                <h3>${itemName}</h3>
                <p>Total price changes: ${history.length}</p>
            </div>
            
            <!-- Price History Graph -->
            <div class="price-history-graph">
                ${this.createPriceLineChart(history)}
            </div>
            
            <!-- Price History Table -->
            <div class="price-history-table">
                <div class="price-history-row header">
                    <div class="col-date">Date</div>
                    <div class="col-change">Price Change</div>
                    <div class="col-difference">Difference</div>
                    <div class="col-source">Source</div>
                </div>
        `;
        
        reversedHistory.forEach((entry, index) => {
            const date = new Date(entry.date).toLocaleDateString();
            const priceChange = entry.newPrice - entry.oldPrice;
            const changeText = priceChange > 0 ? `+£${Math.abs(priceChange).toFixed(2)}` : `-£${Math.abs(priceChange).toFixed(2)}`;
            const changeColor = priceChange > 0 ? '#d32f2f' : '#388e3c';
            const changeIcon = priceChange > 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            
            html += `
                <div class="price-history-row">
                    <div class="col-date">${date}</div>
                    <div class="col-change">
                        £${entry.oldPrice.toFixed(2)} → £${entry.newPrice.toFixed(2)}
                    </div>
                    <div class="col-difference" style="color: ${changeColor};">
                        <i class="fas ${changeIcon}"></i> ${changeText}
                    </div>
                    <div class="col-source">${entry.priceSource || 'Unknown'}</div>
                </div>
            `;
        });
        
        html += '</div>';
        
        // Add some inline styles for the table
        html += `
            <style>
                .price-history-header { margin-bottom: 20px; text-align: center; }
                .price-history-header h3 { margin: 0 0 8px 0; color: #333; }
                .price-history-header p { margin: 0; color: #666; font-size: 14px; }
                .price-history-table { width: 100%; }
                .price-history-row { 
                    display: grid; 
                    grid-template-columns: 1fr 2fr 1fr 1fr; 
                    gap: 12px; 
                    padding: 12px 8px; 
                    border-bottom: 1px solid #eee; 
                    align-items: center;
                }
                .price-history-row.header { 
                    background: #f5f5f5; 
                    font-weight: bold; 
                    border-bottom: 2px solid #ddd; 
                }
                .price-history-row:hover:not(.header) { background: #f9f9f9; }
                .col-date { font-size: 14px; }
                .col-change { font-family: monospace; font-size: 14px; }
                .col-difference { font-weight: bold; font-size: 14px; }
                .col-source { font-size: 12px; color: #666; text-transform: capitalize; }
            </style>
        `;
        
        return html;
    }

    createPriceLineChart(history) {
        if (history.length === 0) return '<p>No price data to display</p>';
        
        // Create data points for the chart showing the complete price progression
        const dataPoints = [];
        
        // Add the first old price as starting point
        const firstEntry = history[0];
        dataPoints.push({
            date: new Date(firstEntry.date).getTime() - 86400000, // 1 day before first change
            price: firstEntry.oldPrice,
            label: `Initial: £${firstEntry.oldPrice.toFixed(2)}`,
            type: 'initial'
        });
        
        // For each history entry, add both the old price (if different from previous) and new price
        history.forEach((entry, index) => {
            const entryDate = new Date(entry.date).getTime();
            
            // If this old price is different from the previous new price, add it as an intermediate point
            if (index > 0 && entry.oldPrice !== history[index - 1].newPrice) {
                dataPoints.push({
                    date: entryDate - 30000, // 30 seconds before the change
                    price: entry.oldPrice,
                    label: `£${entry.oldPrice.toFixed(2)} (before change on ${new Date(entry.date).toLocaleDateString()})`,
                    type: 'intermediate'
                });
            }
            
            // Add the new price point
            dataPoints.push({
                date: entryDate,
                price: entry.newPrice,
                label: `£${entry.newPrice.toFixed(2)} (${new Date(entry.date).toLocaleDateString()} ${new Date(entry.date).toLocaleTimeString()})`,
                type: 'change'
            });
        });
        
        // Chart dimensions
        const width = 500;
        const height = 200;
        const margin = { top: 20, right: 20, bottom: 40, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Calculate scales
        const minDate = Math.min(...dataPoints.map(d => d.date));
        const maxDate = Math.max(...dataPoints.map(d => d.date));
        const minPrice = Math.min(...dataPoints.map(d => d.price)) * 0.95; // Add 5% padding
        const maxPrice = Math.max(...dataPoints.map(d => d.price)) * 1.05; // Add 5% padding
        
        const xScale = (date) => ((date - minDate) / (maxDate - minDate)) * chartWidth;
        const yScale = (price) => chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;
        
        // Create SVG path for the line
        let pathData = '';
        dataPoints.forEach((point, index) => {
            const x = xScale(point.date);
            const y = yScale(point.price);
            pathData += index === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
        });
        
        // Create grid lines
        const gridLines = [];
        const priceStep = (maxPrice - minPrice) / 4;
        for (let i = 0; i <= 4; i++) {
            const price = minPrice + (priceStep * i);
            const y = yScale(price);
            gridLines.push(`<line x1="0" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="#e0e0e0" stroke-width="1"/>`);
            gridLines.push(`<text x="-10" y="${y + 4}" fill="#666" font-size="12" text-anchor="end">£${price.toFixed(2)}</text>`);
        }
        
        // Create data point circles with different colors based on type
        const circles = dataPoints.map((point, index) => {
            const x = xScale(point.date);
            const y = yScale(point.price);
            
            let color;
            let radius = 4;
            switch (point.type) {
                case 'initial':
                    color = '#666';
                    radius = 5;
                    break;
                case 'intermediate':
                    color = '#ff9800';
                    radius = 3;
                    break;
                case 'change':
                    color = index === dataPoints.length - 1 ? '#1976d2' : '#4caf50';
                    radius = 4;
                    break;
                default:
                    color = '#2196f3';
            }
            
            return `
                <circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" stroke="white" stroke-width="2">
                    <title>${point.label}</title>
                </circle>
            `;
        }).join('');
        
        // Create x-axis labels (dates)
        const dateLabels = dataPoints.map((point, index) => {
            if (index === 0 || index === dataPoints.length - 1 || dataPoints.length <= 3) {
                const x = xScale(point.date);
                const dateStr = new Date(point.date).toLocaleDateString('en-GB', { 
                    month: 'short', 
                    day: 'numeric'
                });
                return `<text x="${x}" y="${chartHeight + 15}" fill="#666" font-size="10" text-anchor="middle">${dateStr}</text>`;
            }
            return '';
        }).join('');
        
        return `
            <div class="chart-container" style="text-align: center; margin: 20px 0;">
                <h4 style="margin: 0 0 15px 0; color: #333;">Price Trend</h4>
                <svg width="${width}" height="${height}" style="border: 1px solid #e0e0e0; background: #fafafa;">
                    <g transform="translate(${margin.left}, ${margin.top})">
                        <!-- Grid lines and Y-axis labels -->
                        ${gridLines.join('')}
                        
                        <!-- Price line -->
                        <path d="${pathData}" fill="none" stroke="#1976d2" stroke-width="3" stroke-linecap="round"/>
                        
                        <!-- Data points -->
                        ${circles}
                        
                        <!-- X-axis -->
                        <line x1="0" y1="${chartHeight}" x2="${chartWidth}" y2="${chartHeight}" stroke="#333" stroke-width="1"/>
                        
                        <!-- X-axis labels -->
                        ${dateLabels}
                        
                        <!-- Y-axis -->
                        <line x1="0" y1="0" x2="0" y2="${chartHeight}" stroke="#333" stroke-width="1"/>
                    </g>
                </svg>
                <div style="margin: 15px 0 0 0; display: flex; justify-content: center; gap: 20px; font-size: 12px; color: #666;">
                    <div><span style="color: #666;">●</span> Initial Price</div>
                    <div><span style="color: #ff9800;">●</span> Manual Changes</div>
                    <div><span style="color: #4caf50;">●</span> API Updates</div>
                    <div><span style="color: #1976d2;">●</span> Current Price</div>
                </div>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 12px; text-align: center;">
                    ${dataPoints.length > 1 ? 
                        `Complete price journey from £${dataPoints[0].price.toFixed(2)} to £${dataPoints[dataPoints.length-1].price.toFixed(2)}` :
                        'Single price point'
                    }
                </p>
            </div>
        `;
    }
}

const app = new PriceNest();
// Make it available globally for onclick handlers and CSV importer access
window.priceNest = app;
window.app = app;

// Make search services globally available for onclick handlers in generated HTML
window.movieSearch = app.movieSearch;
window.bookSearch = app.bookSearch;
window.searchManager = app.searchManager;