/**
 * Usage Examples for Universal Export Modules
 * Shows how to use the modules in different environments
 */

// =============================================================================
// 1. CommonJS Usage (Node.js, current usage)
// =============================================================================

// This is how you're currently using the modules - no changes needed
const APIClient = require('../src/static/js/api-client');
const Modal = require('../src/static/js/components/Modal');
const BookSearch = require('../src/static/js/services/BookSearch');
const MovieSearch = require('../src/static/js/services/MovieSearch');
const SearchManager = require('../src/static/js/services/SearchManager');

// Initialize services
const api = new APIClient('/api');
const bookSearch = new BookSearch(api, console.error, console.log);
const movieSearch = new MovieSearch(api, console.error, console.log);

// =============================================================================
// 2. ES Modules Usage (webpack, modern bundlers)
// =============================================================================

/*
// Default imports (recommended)
import APIClient from '../src/static/js/api-client.js';
import Modal from '../src/static/js/components/Modal.js';
import BookSearch from '../src/static/js/services/BookSearch.js';
import MovieSearch from '../src/static/js/services/MovieSearch.js';
import SearchManager from '../src/static/js/services/SearchManager.js';

// Named imports (also work)
import { APIClient } from '../src/static/js/api-client.js';
import { Modal } from '../src/static/js/components/Modal.js';
import { BookSearch } from '../src/static/js/services/BookSearch.js';
import { MovieSearch } from '../src/static/js/services/MovieSearch.js';
import { SearchManager } from '../src/static/js/services/SearchManager.js';

// Using webpack aliases (if configured)
import APIClient from '@api';
import Modal from '@components/Modal';
import BookSearch from '@services/BookSearch';
import MovieSearch from '@services/MovieSearch';
import SearchManager from '@services/SearchManager';

// Initialize services
const api = new APIClient('/api');
const bookSearch = new BookSearch(api, showError, showSuccess);
const movieSearch = new MovieSearch(api, showError, showSuccess);
const searchManager = new SearchManager(
    movieSearch, 
    bookSearch, 
    showError, 
    showSuccess, 
    onItemAdded
);

// Create modals
const itemModal = new Modal({ 
    id: 'item-modal',
    onOpen: () => console.log('Item modal opened'),
    onClose: () => console.log('Item modal closed')
});

const searchModal = new Modal({ 
    id: 'search-modal',
    onOpen: () => console.log('Search modal opened'),
    onClose: () => console.log('Search modal closed')
});
*/

// =============================================================================
// 3. Browser Globals Usage (direct script tags)
// =============================================================================

/*
<!-- Include scripts in HTML -->
<script src="../src/static/js/api-client.js"></script>
<script src="../src/static/js/components/Modal.js"></script>
<script src="../src/static/js/services/BookSearch.js"></script>
<script src="../src/static/js/services/MovieSearch.js"></script>
<script src="../src/static/js/services/SearchManager.js"></script>

<script>
// Modules are available as global variables
const api = new window.APIClient('/api');
const bookSearch = new window.BookSearch(api, showError, showSuccess);
const movieSearch = new window.MovieSearch(api, showError, showSuccess);
const searchManager = new window.SearchManager(
    movieSearch, 
    bookSearch, 
    showError, 
    showSuccess, 
    onItemAdded
);

// Create modals
const itemModal = new window.Modal({ 
    id: 'item-modal',
    onOpen: () => console.log('Item modal opened'),
    onClose: () => console.log('Item modal closed')
});

const searchModal = new window.Modal({ 
    id: 'search-modal',
    onOpen: () => console.log('Search modal opened'),
    onClose: () => console.log('Search modal closed')
});

// Or without explicit window reference (same thing)
const api2 = new APIClient('/api');
const modal2 = new Modal({ id: 'my-modal' });
</script>
*/

// =============================================================================
// 4. AMD Usage (RequireJS)
// =============================================================================

/*
// Configure RequireJS
require.config({
    baseUrl: '../src/static/js',
    paths: {
        'api-client': 'api-client',
        'Modal': 'components/Modal',
        'BookSearch': 'services/BookSearch',
        'MovieSearch': 'services/MovieSearch',
        'SearchManager': 'services/SearchManager'
    }
});

// Use modules
require(['api-client', 'Modal', 'BookSearch', 'MovieSearch', 'SearchManager'], 
    function(APIClient, Modal, BookSearch, MovieSearch, SearchManager) {
        
        // Initialize services
        const api = new APIClient('/api');
        const bookSearch = new BookSearch(api, showError, showSuccess);
        const movieSearch = new MovieSearch(api, showError, showSuccess);
        const searchManager = new SearchManager(
            movieSearch, 
            bookSearch, 
            showError, 
            showSuccess, 
            onItemAdded
        );

        // Create modals
        const itemModal = new Modal({ id: 'item-modal' });
        const searchModal = new Modal({ id: 'search-modal' });
    }
);
*/

// =============================================================================
// 5. Mixed Usage (CommonJS for now, ES modules later)
// =============================================================================

// Current code can stay as CommonJS
const api = new APIClient('/api');
const modal = new Modal({ id: 'my-modal' });

// Later, when you migrate to webpack, you can change imports one by one:
// import APIClient from './api-client.js';
// import Modal from './components/Modal.js';

// The rest of your code stays the same!
const api2 = new APIClient('/api');
const modal2 = new Modal({ id: 'my-modal' });

console.log('Universal export modules work in all environments!');

module.exports = {
    // Export examples for demonstration
    api: api,
    modal: modal
};