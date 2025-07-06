/**
 * Filter Controls Component
 * Manages filtering, sorting, and view modes for category items
 * 
 * @module FilterControls
 */

/**
 * FilterControls class for managing item filtering and display options
 * Provides search, status filtering, sorting, and view mode switching
 */
class FilterControls {
    /**
     * Create a new FilterControls instance
     * @param {Object} config - Configuration options
     * @param {Function} config.onFilterChange - Callback when filters change
     * @param {Function} config.onViewModeChange - Callback when view mode changes
     * @param {Object} config.initialState - Initial filter state
     * @param {string} config.storageKey - LocalStorage key for persistence
     */
    constructor(config = {}) {
        this.onFilterChange = config.onFilterChange || (() => {});
        this.onViewModeChange = config.onViewModeChange || (() => {});
        this.storageKey = config.storageKey || 'filterControls';
        
        // Initialize state
        this.state = this.loadState() || {
            search: '',
            status: 'all', // all, bought, not-bought
            sortBy: 'default', // default, name, price-low, price-high, date-added
            viewMode: 'grid', // grid, list
            priceRange: { min: null, max: null }
        };
        
        // Apply any initial state overrides
        if (config.initialState) {
            this.state = { ...this.state, ...config.initialState };
        }
        
        // Debounce timer for search
        this.searchDebounceTimer = null;
        this.searchDebounceDelay = 300;
    }
    
    /**
     * Initialize filter controls in the DOM
     * @param {Object} elements - DOM element references
     * @param {HTMLElement} elements.container - Container for filter controls
     * @param {HTMLElement} elements.itemsContainer - Container for filtered items
     */
    initialize(elements) {
        this.elements = elements;
        this.render();
        this.bindEvents();
    }
    
    /**
     * Render filter controls UI
     */
    render() {
        if (!this.elements?.container) return;
        
        const activeFiltersCount = this.getActiveFiltersCount();
        
        this.elements.container.innerHTML = `
            <div class="filter-controls">
                <div class="filter-row">
                    <!-- Search -->
                    <div class="filter-group search-group">
                        <input type="text" 
                               id="filter-search" 
                               class="filter-search" 
                               placeholder="Search items..." 
                               value="${this.state.search}">
                        ${this.state.search ? `
                            <button class="clear-search" data-action="clear-search">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>
                    
                    <!-- Status Filter -->
                    <div class="filter-group status-group">
                        <button class="filter-btn ${this.state.status === 'all' ? 'active' : ''}" 
                                data-filter="status" data-value="all">
                            All Items
                        </button>
                        <button class="filter-btn ${this.state.status === 'not-bought' ? 'active' : ''}" 
                                data-filter="status" data-value="not-bought">
                            <i class="fas fa-shopping-cart"></i> Not Bought
                        </button>
                        <button class="filter-btn ${this.state.status === 'bought' ? 'active' : ''}" 
                                data-filter="status" data-value="bought">
                            <i class="fas fa-check-circle"></i> Bought
                        </button>
                    </div>
                    
                    <!-- Sort Controls -->
                    <div class="filter-group sort-group">
                        <label>Sort by:</label>
                        <select id="filter-sort" class="filter-sort">
                            <option value="default" ${this.state.sortBy === 'default' ? 'selected' : ''}>Default</option>
                            <option value="name" ${this.state.sortBy === 'name' ? 'selected' : ''}>Name</option>
                            <option value="price-low" ${this.state.sortBy === 'price-low' ? 'selected' : ''}>Price (Low to High)</option>
                            <option value="price-high" ${this.state.sortBy === 'price-high' ? 'selected' : ''}>Price (High to Low)</option>
                            <option value="date-added" ${this.state.sortBy === 'date-added' ? 'selected' : ''}>Recently Added</option>
                        </select>
                    </div>
                    
                    <!-- View Mode Toggle -->
                    <div class="filter-group view-toggle">
                        <button class="view-toggle-btn ${this.state.viewMode === 'grid' ? 'active' : ''}" 
                                data-view="grid" title="Grid View">
                            <i class="fas fa-th"></i>
                        </button>
                        <button class="view-toggle-btn ${this.state.viewMode === 'list' ? 'active' : ''}" 
                                data-view="list" title="List View">
                            <i class="fas fa-list"></i>
                        </button>
                    </div>
                    
                    <!-- Clear Filters -->
                    ${activeFiltersCount > 0 ? `
                        <div class="filter-group">
                            <button class="btn btn-small btn-secondary clear-filters" data-action="clear-all">
                                Clear Filters (${activeFiltersCount})
                            </button>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Active Filters Display -->
                ${this.renderActiveFilters()}
            </div>
        `;
    }
    
    /**
     * Render active filters indicators
     * @returns {string} HTML for active filters
     */
    renderActiveFilters() {
        const activeFilters = [];
        
        if (this.state.search) {
            activeFilters.push(`
                <span class="active-filter">
                    <i class="fas fa-search"></i> "${this.state.search}"
                    <button data-action="clear-filter" data-filter="search">×</button>
                </span>
            `);
        }
        
        if (this.state.status !== 'all') {
            const statusLabel = this.state.status === 'bought' ? 'Bought' : 'Not Bought';
            activeFilters.push(`
                <span class="active-filter">
                    <i class="fas fa-filter"></i> ${statusLabel}
                    <button data-action="clear-filter" data-filter="status">×</button>
                </span>
            `);
        }
        
        if (this.state.sortBy !== 'default') {
            const sortLabels = {
                'name': 'Name',
                'price-low': 'Price ↑',
                'price-high': 'Price ↓',
                'date-added': 'Recently Added'
            };
            activeFilters.push(`
                <span class="active-filter">
                    <i class="fas fa-sort"></i> ${sortLabels[this.state.sortBy]}
                    <button data-action="clear-filter" data-filter="sortBy">×</button>
                </span>
            `);
        }
        
        return activeFilters.length > 0 ? `
            <div class="active-filters">
                ${activeFilters.join('')}
            </div>
        ` : '';
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        if (!this.elements?.container) return;
        
        // Search input
        const searchInput = this.elements.container.querySelector('#filter-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }
        
        // Filter buttons
        this.elements.container.addEventListener('click', (e) => {
            const target = e.target.closest('[data-filter]');
            if (target) {
                const filter = target.dataset.filter;
                const value = target.dataset.value;
                this.setFilter(filter, value);
            }
            
            // View mode buttons
            const viewBtn = e.target.closest('[data-view]');
            if (viewBtn) {
                this.setViewMode(viewBtn.dataset.view);
            }
            
            // Action buttons
            const actionBtn = e.target.closest('[data-action]');
            if (actionBtn) {
                this.handleAction(actionBtn.dataset.action, actionBtn.dataset);
            }
        });
        
        // Sort dropdown
        const sortSelect = this.elements.container.querySelector('#filter-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.setFilter('sortBy', e.target.value);
            });
        }
    }
    
    /**
     * Handle search input with debouncing
     * @param {string} value - Search value
     */
    handleSearch(value) {
        // Clear existing timer
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }
        
        // Set new timer
        this.searchDebounceTimer = setTimeout(() => {
            this.setFilter('search', value);
        }, this.searchDebounceDelay);
    }
    
    /**
     * Handle action buttons
     * @param {string} action - Action to perform
     * @param {Object} data - Additional data
     */
    handleAction(action, data = {}) {
        switch (action) {
            case 'clear-all':
                this.clearAllFilters();
                break;
                
            case 'clear-filter':
                if (data.filter === 'search') {
                    this.setFilter('search', '');
                } else if (data.filter === 'status') {
                    this.setFilter('status', 'all');
                } else if (data.filter === 'sortBy') {
                    this.setFilter('sortBy', 'default');
                }
                break;
                
            case 'clear-search':
                this.setFilter('search', '');
                const searchInput = this.elements.container.querySelector('#filter-search');
                if (searchInput) searchInput.focus();
                break;
        }
    }
    
    /**
     * Set a filter value
     * @param {string} filter - Filter name
     * @param {*} value - Filter value
     */
    setFilter(filter, value) {
        if (this.state[filter] === value) return;
        
        this.state[filter] = value;
        this.saveState();
        this.render();
        this.onFilterChange(this.state);
    }
    
    /**
     * Set view mode
     * @param {string} mode - View mode (grid/list)
     */
    setViewMode(mode) {
        if (this.state.viewMode === mode) return;
        
        this.state.viewMode = mode;
        this.saveState();
        
        // Update view toggle buttons
        const viewBtns = this.elements.container.querySelectorAll('.view-toggle-btn');
        viewBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === mode);
        });
        
        this.onViewModeChange(mode);
    }
    
    /**
     * Clear all filters
     */
    clearAllFilters() {
        this.state = {
            ...this.state,
            search: '',
            status: 'all',
            sortBy: 'default',
            priceRange: { min: null, max: null }
        };
        
        this.saveState();
        this.render();
        this.onFilterChange(this.state);
    }
    
    /**
     * Apply filters to items array
     * @param {Array} items - Items to filter
     * @returns {Array} Filtered and sorted items
     */
    applyFilters(items) {
        let filtered = [...items];
        
        // Apply search filter
        if (this.state.search) {
            const searchLower = this.state.search.toLowerCase();
            filtered = filtered.filter(item => {
                return (
                    item.name?.toLowerCase().includes(searchLower) ||
                    item.title?.toLowerCase().includes(searchLower) ||
                    item.author?.toLowerCase().includes(searchLower) ||
                    item.director?.toLowerCase().includes(searchLower) ||
                    item.year?.toString().includes(searchLower)
                );
            });
        }
        
        // Apply status filter
        if (this.state.status !== 'all') {
            filtered = filtered.filter(item => {
                if (this.state.status === 'bought') {
                    return item.bought === true;
                } else if (this.state.status === 'not-bought') {
                    return item.bought !== true;
                }
                return true;
            });
        }
        
        // Apply price range filter
        if (this.state.priceRange.min !== null || this.state.priceRange.max !== null) {
            filtered = filtered.filter(item => {
                const price = parseFloat(item.price);
                if (isNaN(price)) return false;
                
                if (this.state.priceRange.min !== null && price < this.state.priceRange.min) {
                    return false;
                }
                if (this.state.priceRange.max !== null && price > this.state.priceRange.max) {
                    return false;
                }
                return true;
            });
        }
        
        // Apply sorting
        filtered = this.sortItems(filtered, this.state.sortBy);
        
        return filtered;
    }
    
    /**
     * Sort items array
     * @param {Array} items - Items to sort
     * @param {string} sortBy - Sort method
     * @returns {Array} Sorted items
     */
    sortItems(items, sortBy) {
        const sorted = [...items];
        
        switch (sortBy) {
            case 'name':
                sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
                
            case 'price-low':
                sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
                break;
                
            case 'price-high':
                sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
                break;
                
            case 'date-added':
                sorted.sort((a, b) => {
                    // Assume newer items have higher IDs or timestamps
                    if (a.created_at && b.created_at) {
                        return new Date(b.created_at) - new Date(a.created_at);
                    }
                    return (b.id || 0) - (a.id || 0);
                });
                break;
                
            default:
                // Keep original order
                break;
        }
        
        return sorted;
    }
    
    /**
     * Get count of active filters
     * @returns {number} Number of active filters
     */
    getActiveFiltersCount() {
        let count = 0;
        
        if (this.state.search) count++;
        if (this.state.status !== 'all') count++;
        if (this.state.sortBy !== 'default') count++;
        if (this.state.priceRange.min !== null || this.state.priceRange.max !== null) count++;
        
        return count;
    }
    
    /**
     * Get current filter state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Update filter state
     * @param {Object} newState - New state values
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.saveState();
        this.render();
        this.onFilterChange(this.state);
    }
    
    /**
     * Save state to localStorage
     */
    saveState() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        } catch (e) {
            console.warn('Failed to save filter state:', e);
        }
    }
    
    /**
     * Load state from localStorage
     * @returns {Object|null} Saved state or null
     */
    loadState() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.warn('Failed to load filter state:', e);
            return null;
        }
    }
    
    /**
     * Reset to default state
     */
    reset() {
        this.state = {
            search: '',
            status: 'all',
            sortBy: 'default',
            viewMode: 'grid',
            priceRange: { min: null, max: null }
        };
        
        this.saveState();
        this.render();
        this.onFilterChange(this.state);
    }
    
    /**
     * Destroy the filter controls instance
     */
    destroy() {
        // Clear timers
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }
        
        // Clear event listeners
        if (this.elements?.container) {
            this.elements.container.innerHTML = '';
        }
        
        // Clear references
        this.elements = null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterControls;
}