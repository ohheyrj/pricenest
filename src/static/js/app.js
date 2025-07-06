/**
 * PriceNest Application Entry Point
 * Coordinates all modules and initializes the application
 * 
 * @module app
 */

// Load all required modules in dependency order
// Note: These will be bundled by webpack in the correct order

// Core utilities and components (no dependencies)
require('./components/Modal.js');
require('./components/UIComponents.js');
require('./components/FilterControls.js');
require('./components/FormHandler.js');

// API layer
require('./api-client.js');

// Services that depend on API
require('./services/BookSearch.js');
require('./services/MovieSearch.js');
require('./services/SearchManager.js');

// Components that depend on API
require('./csv-importer.js');

// Main application (depends on everything above)
require('./script.js');

// Application initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('PriceNest application initialized');
    
    // The main PriceNest class is instantiated in script.js
    // and sets up all the necessary global variables and event handlers
    
    // Log module loading for debugging in development
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
        console.log('Modules loaded:', {
            Modal: typeof Modal !== 'undefined',
            UIComponents: typeof UIComponents !== 'undefined',
            FilterControls: typeof FilterControls !== 'undefined',
            FormHandler: typeof FormHandler !== 'undefined',
            APIClient: typeof APIClient !== 'undefined',
            CSVImporter: typeof CSVImporter !== 'undefined',
            BookSearch: typeof BookSearch !== 'undefined',
            MovieSearch: typeof MovieSearch !== 'undefined',
            SearchManager: typeof SearchManager !== 'undefined',
            PriceNest: typeof window.app !== 'undefined'
        });
    }
});

// Handle any global errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Show user-friendly error message
    if (typeof UIComponents !== 'undefined' && UIComponents.Notification) {
        UIComponents.Notification.showError('An unexpected error occurred. Please refresh the page.');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Show user-friendly error message
    if (typeof UIComponents !== 'undefined' && UIComponents.Notification) {
        UIComponents.Notification.showError('An unexpected error occurred. Please try again.');
    }
});

// Make the application available globally
window.PriceNestApp = {
    version: '1.0.0',
    name: 'PriceNest'
};

// Export for potential future use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.PriceNestApp;
}