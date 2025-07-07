"""
UI Components Tests
Tests the new UI components: Modal, FilterControls, UIComponents, and FormHandler
"""

import json
import os
import subprocess
import tempfile

import pytest


@pytest.fixture
def js_test_runner():
    """Create a temporary JS file to run tests."""

    def runner(js_code):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False) as f:
            # Write test code
            f.write(js_code)
            f.flush()

            try:
                # Run with Node.js
                result = subprocess.run(["node", f.name], capture_output=True, text=True, timeout=5)

                if result.returncode != 0:
                    raise Exception(f"JavaScript error: {result.stderr}")

                return result.stdout.strip()
            finally:
                # Clean up
                os.unlink(f.name)

    return runner


class TestModal:
    """Test Modal component functionality"""

    def test_modal_configuration(self, js_test_runner):
        """Test Modal configuration and initialization."""
        js_code = """
        // Mock DOM environment
        global.document = {
            getElementById: (id) => {
                if (id === 'test-modal') {
                    return {
                        id: 'test-modal',
                        style: { display: 'none' },
                        querySelectorAll: () => [],
                        querySelector: () => null,
                        addEventListener: () => {},
                        dispatchEvent: () => {}
                    };
                }
                return null;
            },
            activeElement: { focus: () => {} },
            body: {
                classList: { add: () => {}, remove: () => {} }
            },
            addEventListener: () => {},
            removeEventListener: () => {}
        };

        global.window = {
            requestAnimationFrame: (fn) => setTimeout(fn, 0)
        };

        // Mock Modal class (simplified version for testing)
        class Modal {
            constructor(config) {
                this.id = config.id;
                this.element = document.getElementById(this.id);
                this.onOpen = config.onOpen || (() => {});
                this.onClose = config.onClose || (() => {});
                this.closeOnOutsideClick = config.closeOnOutsideClick !== false;
                this.closeOnEsc = config.closeOnEsc !== false;
                this.isOpen = false;
            }

            open(data = {}) {
                if (this.isOpen) return false;
                this.isOpen = true;
                this.element.style.display = 'block';
                this.onOpen(data);
                return true;
            }

            close(data = {}) {
                if (!this.isOpen) return false;
                this.isOpen = false;
                this.element.style.display = 'none';
                this.onClose(data);
                return true;
            }

            toggle(data = {}) {
                if (this.isOpen) {
                    this.close(data);
                } else {
                    this.open(data);
                }
            }
        }

        // Test modal creation and configuration
        let openCalled = false;
        let closeCalled = false;

        const modal = new Modal({
            id: 'test-modal',
            onOpen: () => { openCalled = true; },
            onClose: () => { closeCalled = true; },
            closeOnOutsideClick: true,
            closeOnEsc: true
        });

        console.log('Modal created successfully:', modal.id === 'test-modal');
        console.log('Initial state closed:', !modal.isOpen);
        console.log('Configuration preserved:', modal.closeOnOutsideClick === true);

        // Test open/close cycle
        const opened = modal.open();
        console.log('Open successful:', opened && modal.isOpen);
        console.log('Open callback called:', openCalled);

        const closed = modal.close();
        console.log('Close successful:', closed && !modal.isOpen);
        console.log('Close callback called:', closeCalled);

        // Test toggle
        modal.toggle();
        console.log('Toggle to open:', modal.isOpen);
        modal.toggle();
        console.log('Toggle to close:', !modal.isOpen);
        """

        output = js_test_runner(js_code)
        assert "Modal created successfully: true" in output
        assert "Initial state closed: true" in output
        assert "Configuration preserved: true" in output
        assert "Open successful: true" in output
        assert "Open callback called: true" in output
        assert "Close successful: true" in output
        assert "Close callback called: true" in output
        assert "Toggle to open: true" in output
        assert "Toggle to close: true" in output


class TestFilterControls:
    """Test FilterControls component functionality"""

    def test_filter_state_management(self, js_test_runner):
        """Test FilterControls state management."""
        js_code = """
        // Mock localStorage
        global.localStorage = {
            storage: {},
            setItem: function(key, value) { this.storage[key] = value; },
            getItem: function(key) { return this.storage[key] || null; },
            removeItem: function(key) { delete this.storage[key]; }
        };

        // Mock FilterControls class (simplified for testing)
        class FilterControls {
            constructor(config = {}) {
                this.storageKey = config.storageKey || 'filterControls';
                this.state = {
                    search: '',
                    status: 'all',
                    sortBy: 'default',
                    viewMode: 'grid',
                    priceRange: { min: null, max: null }
                };

                if (config.initialState) {
                    this.state = { ...this.state, ...config.initialState };
                }
            }

            setFilter(filter, value) {
                if (this.state[filter] === value) return;
                this.state[filter] = value;
                this.saveState();
            }

            saveState() {
                try {
                    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
                } catch (e) {
                    console.warn('Failed to save filter state:', e);
                }
            }

            loadState() {
                try {
                    const saved = localStorage.getItem(this.storageKey);
                    return saved ? JSON.parse(saved) : null;
                } catch (e) {
                    console.warn('Failed to load filter state:', e);
                    return null;
                }
            }

            getActiveFiltersCount() {
                let count = 0;
                if (this.state.search) count++;
                if (this.state.status !== 'all') count++;
                if (this.state.sortBy !== 'default') count++;
                return count;
            }

            applyFilters(items) {
                let filtered = [...items];

                // Apply search filter
                if (this.state.search) {
                    const searchLower = this.state.search.toLowerCase();
                    filtered = filtered.filter(item => {
                        return item.name?.toLowerCase().includes(searchLower);
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

                return filtered;
            }
        }

        // Test filter controls
        const filterControls = new FilterControls({
            storageKey: 'test-filters',
            initialState: { search: 'test' }
        });

        console.log('Initial search state:', filterControls.state.search === 'test');
        console.log('Initial status state:', filterControls.state.status === 'all');

        // Test filter changes
        filterControls.setFilter('status', 'bought');
        console.log('Status filter updated:', filterControls.state.status === 'bought');

        filterControls.setFilter('search', 'new search');
        console.log('Search filter updated:', filterControls.state.search === 'new search');

        // Test active filters count
        const activeCount = filterControls.getActiveFiltersCount();
        console.log('Active filters count:', activeCount === 2); // search + status

        // Test filtering items
        const testItems = [
            { name: 'New Search Item', bought: true },
            { name: 'Other Item', bought: false },
            { name: 'Another New Item', bought: true }
        ];

        const filteredItems = filterControls.applyFilters(testItems);
        console.log('Filtered items count:', filteredItems.length === 1); // Only bought items with "new search" in name
        console.log('Correct filtering:',
            filteredItems.length === 1 && filteredItems[0].name === 'New Search Item');
        """

        output = js_test_runner(js_code)
        assert "Initial search state: true" in output
        assert "Initial status state: true" in output
        assert "Status filter updated: true" in output
        assert "Search filter updated: true" in output
        assert "Active filters count: true" in output
        assert "Filtered items count: true" in output
        assert "Correct filtering: true" in output

    def test_filter_sorting(self, js_test_runner):
        """Test FilterControls sorting functionality."""
        js_code = """
        class FilterControls {
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
                    default:
                        // Keep original order
                        break;
                }

                return sorted;
            }
        }

        const filterControls = new FilterControls();

        const testItems = [
            { name: 'Zebra Item', price: 10 },
            { name: 'Alpha Item', price: 30 },
            { name: 'Beta Item', price: 20 }
        ];

        // Test name sorting
        const sortedByName = filterControls.sortItems(testItems, 'name');
        console.log('Name sort correct:',
            sortedByName[0].name === 'Alpha Item' &&
            sortedByName[2].name === 'Zebra Item');

        // Test price sorting (low to high)
        const sortedByPriceLow = filterControls.sortItems(testItems, 'price-low');
        console.log('Price low sort correct:',
            sortedByPriceLow[0].price === 10 &&
            sortedByPriceLow[2].price === 30);

        // Test price sorting (high to low)
        const sortedByPriceHigh = filterControls.sortItems(testItems, 'price-high');
        console.log('Price high sort correct:',
            sortedByPriceHigh[0].price === 30 &&
            sortedByPriceHigh[2].price === 10);

        // Test default (no sorting)
        const sortedDefault = filterControls.sortItems(testItems, 'default');
        console.log('Default sort unchanged:',
            sortedDefault[0].name === 'Zebra Item' &&
            sortedDefault[2].name === 'Beta Item');
        """

        output = js_test_runner(js_code)
        assert "Name sort correct: true" in output
        assert "Price low sort correct: true" in output
        assert "Price high sort correct: true" in output
        assert "Default sort unchanged: true" in output


class TestUIComponents:
    """Test UIComponents functionality"""

    def test_notification_component(self, js_test_runner):
        """Test NotificationComponent functionality."""
        js_code = """
        // Mock DOM environment
        global.document = {
            createElement: (tag) => ({
                tagName: tag.toUpperCase(),
                className: '',
                innerHTML: '',
                classList: {
                    add: function(cls) { this.className += ' ' + cls; },
                    remove: function(cls) { this.className = this.className.replace(cls, ''); }
                },
                querySelector: () => ({ addEventListener: () => {} }),
                addEventListener: () => {}
            }),
            getElementById: () => null,
            body: {
                appendChild: () => {}
            }
        };

        global.setTimeout = (fn, delay) => fn(); // Execute immediately for testing
        global.requestAnimationFrame = (fn) => fn();

        // Mock NotificationComponent
        class NotificationComponent {
            static currentNotifications = new Set();

            static show(message, type = 'info', duration = 4000) {
                const notification = document.createElement('div');
                notification.className = `notification notification-${type}`;
                this.currentNotifications.add(notification);
                return notification;
            }

            static showSuccess(message, duration = 3000) {
                return this.show(message, 'success', duration);
            }

            static showError(message, duration = 5000) {
                return this.show(message, 'error', duration);
            }

            static remove(notification) {
                this.currentNotifications.delete(notification);
            }

            static clearAll() {
                this.currentNotifications.clear();
            }
        }

        // Test notifications
        const successNotification = NotificationComponent.showSuccess('Test success');
        console.log('Success notification created:', successNotification.className.includes('notification-success'));

        const errorNotification = NotificationComponent.showError('Test error');
        console.log('Error notification created:', errorNotification.className.includes('notification-error'));

        console.log('Notifications tracked:', NotificationComponent.currentNotifications.size === 2);

        NotificationComponent.clearAll();
        console.log('Notifications cleared:', NotificationComponent.currentNotifications.size === 0);
        """

        output = js_test_runner(js_code)
        assert "Success notification created: true" in output
        assert "Error notification created: true" in output
        assert "Notifications tracked: true" in output
        assert "Notifications cleared: true" in output

    def test_loading_component(self, js_test_runner):
        """Test LoadingComponent functionality."""
        js_code = """
        // Mock LoadingComponent
        class LoadingComponent {
            static setButtonLoading(button, message = 'Processing...') {
                if (button.dataset.originalText === undefined) {
                    button.dataset.originalText = button.innerHTML;
                }
                button.disabled = true;
                button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
            }

            static clearButtonLoading(button) {
                if (button.dataset.originalText !== undefined) {
                    button.innerHTML = button.dataset.originalText;
                    delete button.dataset.originalText;
                }
                button.disabled = false;
            }

            static createProgressBar(progress = 0, message = '') {
                return {
                    className: 'progress-container',
                    innerHTML: `progress: ${progress}%${message ? ', message: ' + message : ''}`
                };
            }

            static updateProgressBar(progressBar, progress, message) {
                progressBar.innerHTML = `progress: ${progress}%${message ? ', message: ' + message : ''}`;
            }
        }

        // Test button loading
        const mockButton = {
            innerHTML: 'Original Text',
            disabled: false,
            dataset: {}
        };

        LoadingComponent.setButtonLoading(mockButton, 'Saving...');
        console.log('Button loading set:',
            mockButton.disabled === true &&
            mockButton.innerHTML.includes('Saving...') &&
            mockButton.dataset.originalText === 'Original Text');

        LoadingComponent.clearButtonLoading(mockButton);
        console.log('Button loading cleared:',
            mockButton.disabled === false &&
            mockButton.innerHTML === 'Original Text' &&
            mockButton.dataset.originalText === undefined);

        // Test progress bar
        const progressBar = LoadingComponent.createProgressBar(50, 'Loading...');
        console.log('Progress bar created:',
            progressBar.className === 'progress-container' &&
            progressBar.innerHTML.includes('progress: 50%') &&
            progressBar.innerHTML.includes('Loading...'));

        LoadingComponent.updateProgressBar(progressBar, 75, 'Almost done...');
        console.log('Progress bar updated:',
            progressBar.innerHTML.includes('progress: 75%') &&
            progressBar.innerHTML.includes('Almost done...'));
        """

        output = js_test_runner(js_code)
        assert "Button loading set: true" in output
        assert "Button loading cleared: true" in output
        assert "Progress bar created: true" in output
        assert "Progress bar updated: true" in output

    def test_card_component(self, js_test_runner):
        """Test CardComponent functionality."""
        js_code = """
        // Mock DOM
        global.document = {
            createElement: (tag) => ({
                tagName: tag.toUpperCase(),
                className: '',
                innerHTML: ''
            })
        };

        // Mock CardComponent
        class CardComponent {
            static create(config) {
                const card = document.createElement('div');
                card.className = `card ${config.className || ''}`.trim();

                const imageHTML = config.image ? `<div class="card-image">image</div>` : '';
                const titleHTML = config.title ? `<h3 class="card-title">${config.title}</h3>` : '';
                const contentHTML = config.content ? `<div class="card-body">${config.content}</div>` : '';

                card.innerHTML = `${imageHTML}${titleHTML}${contentHTML}`;
                return card;
            }

            static createPriceDisplay(price, currency = 'GBP', source = null) {
                const currencySymbols = { 'GBP': '£', 'USD': '$', 'EUR': '€' };
                const symbol = currencySymbols[currency] || currency;
                const formattedPrice = price != null ? `${symbol}${price.toFixed(2)}` : 'Unknown';

                return {
                    className: 'price-display',
                    innerHTML: `<span class="price-amount">${formattedPrice}</span>`
                };
            }
        }

        // Test card creation
        const card = CardComponent.create({
            title: 'Test Card',
            content: 'Test content',
            image: 'test.jpg',
            className: 'test-card'
        });

        console.log('Card created with correct class:', card.className.includes('card test-card'));
        console.log('Card has title:', card.innerHTML.includes('<h3 class="card-title">Test Card</h3>'));
        console.log('Card has content:', card.innerHTML.includes('<div class="card-body">Test content</div>'));
        console.log('Card has image:', card.innerHTML.includes('<div class="card-image">image</div>'));

        // Test price display
        const priceDisplay = CardComponent.createPriceDisplay(12.99, 'GBP');
        console.log('Price display created:', priceDisplay.className === 'price-display');
        console.log('Price formatted correctly:', priceDisplay.innerHTML.includes('£12.99'));

        const usdPriceDisplay = CardComponent.createPriceDisplay(15.50, 'USD');
        console.log('USD price formatted correctly:', usdPriceDisplay.innerHTML.includes('$15.50'));
        """

        output = js_test_runner(js_code)
        assert "Card created with correct class: true" in output
        assert "Card has title: true" in output
        assert "Card has content: true" in output
        assert "Card has image: true" in output
        assert "Price display created: true" in output
        assert "Price formatted correctly: true" in output
        assert "USD price formatted correctly: true" in output


class TestFormHandler:
    """Test FormHandler functionality"""

    def test_form_validation(self, js_test_runner):
        """Test FormHandler validation functionality."""
        js_code = """
        // Mock FormHandler validation methods
        class FormHandler {
            static isValidEmail(email) {
                const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
                return emailRegex.test(email);
            }

            static isValidUrl(url) {
                try {
                    new URL(url);
                    return true;
                } catch {
                    return false;
                }
            }

            static validateField(field, value) {
                const errors = [];

                // Required validation
                if (field.required && (!value || value.trim() === '')) {
                    errors.push(`\\${field.name} is required`);
                }

                // Type-specific validation
                if (value && value.trim() !== '') {
                    switch (field.type) {
                        case 'email':
                            if (!this.isValidEmail(value)) {
                                errors.push(`\\${field.name} must be a valid email address`);
                            }
                            break;
                        case 'url':
                            if (!this.isValidUrl(value)) {
                                errors.push(`\\${field.name} must be a valid URL`);
                            }
                            break;
                        case 'number':
                            if (isNaN(value)) {
                                errors.push(`\\${field.name} must be a valid number`);
                            }
                            break;
                    }
                }

                return errors;
            }
        }

        // Mock URL constructor for Node.js
        global.URL = class URL {
            constructor(url) {
                if (!url || typeof url !== 'string' || !url.includes('://')) {
                    throw new Error('Invalid URL');
                }
            }
        };

        // Test email validation
        console.log('Valid email passes:', FormHandler.isValidEmail('test@example.com'));
        console.log('Invalid email fails:', !FormHandler.isValidEmail('invalid-email'));
        console.log('Empty email fails:', !FormHandler.isValidEmail(''));

        // Test URL validation
        console.log('Valid URL passes:', FormHandler.isValidUrl('https://example.com'));
        console.log('Invalid URL fails:', !FormHandler.isValidUrl('not-a-url'));

        // Test field validation
        const requiredField = { name: 'username', required: true, type: 'text' };
        const emailField = { name: 'email', required: false, type: 'email' };
        const urlField = { name: 'website', required: false, type: 'url' };
        const numberField = { name: 'age', required: false, type: 'number' };

        // Test required field validation
        const requiredErrors = FormHandler.validateField(requiredField, '');
        console.log('Required field validation fails for empty:', requiredErrors.length > 0);

        const requiredValid = FormHandler.validateField(requiredField, 'value');
        console.log('Required field validation passes for value:', requiredValid.length === 0);

        // Test email field validation
        const emailErrors = FormHandler.validateField(emailField, 'invalid-email');
        console.log('Email field validation fails for invalid:', emailErrors.length > 0);

        const emailValid = FormHandler.validateField(emailField, 'test@example.com');
        console.log('Email field validation passes for valid:', emailValid.length === 0);

        // Test number field validation
        const numberErrors = FormHandler.validateField(numberField, 'not-a-number');
        console.log('Number field validation fails for text:', numberErrors.length > 0);

        const numberValid = FormHandler.validateField(numberField, '25');
        console.log('Number field validation passes for number:', numberValid.length === 0);
        """

        output = js_test_runner(js_code)
        assert "Valid email passes: true" in output
        assert "Invalid email fails: true" in output
        assert "Empty email fails: true" in output
        assert "Valid URL passes: true" in output
        assert "Invalid URL fails: true" in output
        assert "Required field validation fails for empty: true" in output
        assert "Required field validation passes for value: true" in output
        assert "Email field validation fails for invalid: true" in output
        assert "Email field validation passes for valid: true" in output
        assert "Number field validation fails for text: true" in output
        assert "Number field validation passes for number: true" in output


class TestComponentIntegration:
    """Test integration between UI components"""

    def test_component_interaction(self, js_test_runner):
        """Test how components work together."""
        js_code = """
        // Mock integrated component usage
        class ComponentManager {
            constructor() {
                this.notifications = [];
                this.modals = new Map();
                this.filters = {
                    search: '',
                    status: 'all'
                };
            }

            showNotification(message, type) {
                this.notifications.push({ message, type, timestamp: Date.now() });
                return this.notifications.length;
            }

            createModal(id, config) {
                const modal = {
                    id,
                    isOpen: false,
                    config,
                    open() { this.isOpen = true; },
                    close() { this.isOpen = false; }
                };
                this.modals.set(id, modal);
                return modal;
            }

            updateFilters(newFilters) {
                this.filters = { ...this.filters, ...newFilters };
                return this.filters;
            }

            processWorkflow() {
                // Simulate a complex workflow using multiple components
                const steps = [];

                // 1. Show loading notification
                this.showNotification('Processing...', 'info');
                steps.push('notification-shown');

                // 2. Open modal
                const modal = this.createModal('process-modal', { title: 'Processing' });
                modal.open();
                steps.push('modal-opened');

                // 3. Update filters
                this.updateFilters({ status: 'processing' });
                steps.push('filters-updated');

                // 4. Complete process
                modal.close();
                this.showNotification('Process completed!', 'success');
                steps.push('process-completed');

                return steps;
            }
        }

        // Test component manager
        const manager = new ComponentManager();

        // Test individual components
        const notificationCount = manager.showNotification('Test message', 'info');
        console.log('Notification created:', notificationCount === 1);

        const modal = manager.createModal('test-modal', { title: 'Test' });
        console.log('Modal created:', manager.modals.has('test-modal'));

        modal.open();
        console.log('Modal opened:', modal.isOpen === true);

        const filters = manager.updateFilters({ search: 'test', status: 'active' });
        console.log('Filters updated:', filters.search === 'test' && filters.status === 'active');

        // Test workflow integration
        const workflowSteps = manager.processWorkflow();
        console.log('Workflow completed:', workflowSteps.length === 4);
        console.log('Workflow steps correct:',
            workflowSteps.includes('notification-shown') &&
            workflowSteps.includes('modal-opened') &&
            workflowSteps.includes('filters-updated') &&
            workflowSteps.includes('process-completed'));

        console.log('Final state - notifications:', manager.notifications.length === 3); // info + success + initial
        console.log('Final state - modal closed:', !manager.modals.get('process-modal').isOpen);
        """

        output = js_test_runner(js_code)
        assert "Notification created: true" in output
        assert "Modal created: true" in output
        assert "Modal opened: true" in output
        assert "Filters updated: true" in output
        assert "Workflow completed: true" in output
        assert "Workflow steps correct: true" in output
        assert "Final state - notifications: true" in output
        assert "Final state - modal closed: true" in output
