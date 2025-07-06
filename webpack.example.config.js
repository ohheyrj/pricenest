/**
 * Example Webpack Configuration
 * Shows how to use the universal export modules with webpack
 */

const path = require('path');

module.exports = {
    entry: './src/static/js/app.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
        clean: true
    },
    resolve: {
        extensions: ['.js'],
        alias: {
            // Create aliases for easier imports
            '@api': path.resolve(__dirname, 'src/static/js/api-client.js'),
            '@components': path.resolve(__dirname, 'src/static/js/components'),
            '@services': path.resolve(__dirname, 'src/static/js/services'),
            '@utils': path.resolve(__dirname, 'src/static/js/utils')
        }
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    mode: 'development',
    devtool: 'source-map'
};

// Example of how to use the modules with webpack imports:
/*
// In your main app file (app.js):
import APIClient from './api-client.js';
import Modal from './components/Modal.js';
import BookSearch from './services/BookSearch.js';
import MovieSearch from './services/MovieSearch.js';
import SearchManager from './services/SearchManager.js';

// Or using aliases:
import APIClient from '@api';
import Modal from '@components/Modal';
import BookSearch from '@services/BookSearch';
import MovieSearch from '@services/MovieSearch';
import SearchManager from '@services/SearchManager';

// Initialize your app
const api = new APIClient();
const bookSearch = new BookSearch(api, showError, showSuccess);
const movieSearch = new MovieSearch(api, showError, showSuccess);
const searchManager = new SearchManager(movieSearch, bookSearch, showError, showSuccess, onItemAdded);

// Create modals
const itemModal = new Modal({ id: 'item-modal' });
const searchModal = new Modal({ id: 'search-modal' });
*/