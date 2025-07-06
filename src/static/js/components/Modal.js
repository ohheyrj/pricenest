/**
 * Modal Component
 * Provides a reusable modal management system with consistent behavior
 * 
 * @module Modal
 */

/**
 * Modal class for managing modal dialogs
 * Handles opening, closing, events, and common modal behaviors
 */
class Modal {
    /**
     * Create a new Modal instance
     * @param {Object} config - Modal configuration
     * @param {string} config.id - Modal element ID
     * @param {Function} config.onOpen - Callback when modal opens
     * @param {Function} config.onClose - Callback when modal closes
     * @param {Function} config.onBeforeOpen - Callback before modal opens (can return false to cancel)
     * @param {Function} config.onBeforeClose - Callback before modal closes (can return false to cancel)
     * @param {boolean} config.closeOnOutsideClick - Close when clicking outside (default: true)
     * @param {boolean} config.closeOnEsc - Close when pressing Escape (default: true)
     * @param {string} config.focusElementSelector - Selector for element to focus on open
     * @param {boolean} config.trapFocus - Trap focus within modal (default: true)
     */
    constructor(config) {
        this.id = config.id;
        this.element = document.getElementById(this.id);
        
        if (!this.element) {
            throw new Error(`Modal element with id "${this.id}" not found`);
        }
        
        // Configuration
        this.onOpen = config.onOpen || (() => {});
        this.onClose = config.onClose || (() => {});
        this.onBeforeOpen = config.onBeforeOpen || (() => true);
        this.onBeforeClose = config.onBeforeClose || (() => true);
        this.closeOnOutsideClick = config.closeOnOutsideClick !== false;
        this.closeOnEsc = config.closeOnEsc !== false;
        this.focusElementSelector = config.focusElementSelector;
        this.trapFocus = config.trapFocus !== false;
        
        // State
        this.isOpen = false;
        this.previousActiveElement = null;
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleOutsideClick = this.handleOutsideClick.bind(this);
        
        // Cache elements
        this.closeButtons = this.element.querySelectorAll('.close, [data-modal-close]');
        this.modalContent = this.element.querySelector('.modal-content');
        
        // Initialize
        this.bindStaticEvents();
    }
    
    /**
     * Bind static event listeners (close buttons, etc.)
     */
    bindStaticEvents() {
        // Close buttons
        this.closeButtons.forEach(button => {
            button.addEventListener('click', () => this.close());
        });
        
        // Form submission handling
        const forms = this.element.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', async (e) => {
                if (form.dataset.modalSubmit === 'false') return;
                
                // Allow form to handle its own submission
                // Modal will be closed by the form handler if needed
            });
        });
    }
    
    /**
     * Open the modal
     * @param {Object} data - Optional data to pass to onOpen callback
     * @returns {boolean} True if modal was opened
     */
    open(data = {}) {
        // Check if already open
        if (this.isOpen) {
            return false;
        }
        
        // Call before open callback
        if (!this.onBeforeOpen(data)) {
            return false;
        }
        
        // Store current active element for focus restoration
        this.previousActiveElement = document.activeElement;
        
        // Show modal
        this.element.style.display = 'block';
        this.isOpen = true;
        
        // Add body class to prevent scrolling
        document.body.classList.add('modal-open');
        
        // Set initial focus
        this.setInitialFocus();
        
        // Bind dynamic events
        this.bindDynamicEvents();
        
        // Call open callback
        this.onOpen(data);
        
        // Dispatch custom event
        this.element.dispatchEvent(new CustomEvent('modal:opened', { 
            detail: { modal: this, data } 
        }));
        
        return true;
    }
    
    /**
     * Close the modal
     * @param {Object} data - Optional data to pass to onClose callback
     * @returns {boolean} True if modal was closed
     */
    close(data = {}) {
        // Check if already closed
        if (!this.isOpen) {
            return false;
        }
        
        // Call before close callback
        if (!this.onBeforeClose(data)) {
            return false;
        }
        
        // Hide modal
        this.element.style.display = 'none';
        this.isOpen = false;
        
        // Remove body class
        document.body.classList.remove('modal-open');
        
        // Unbind dynamic events
        this.unbindDynamicEvents();
        
        // Restore focus
        if (this.previousActiveElement && this.previousActiveElement.focus) {
            this.previousActiveElement.focus();
        }
        
        // Call close callback
        this.onClose(data);
        
        // Dispatch custom event
        this.element.dispatchEvent(new CustomEvent('modal:closed', { 
            detail: { modal: this, data } 
        }));
        
        return true;
    }
    
    /**
     * Toggle modal open/closed state
     * @param {Object} data - Optional data to pass to callbacks
     */
    toggle(data = {}) {
        if (this.isOpen) {
            this.close(data);
        } else {
            this.open(data);
        }
    }
    
    /**
     * Set modal content
     * @param {string|HTMLElement} content - Content to set
     * @param {string} selector - Optional selector for content container
     */
    setContent(content, selector = '.modal-body') {
        const container = this.element.querySelector(selector);
        if (!container) {
            console.warn(`Content container "${selector}" not found in modal`);
            return;
        }
        
        if (typeof content === 'string') {
            container.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            container.innerHTML = '';
            container.appendChild(content);
        }
    }
    
    /**
     * Get form element if modal contains one
     * @returns {HTMLFormElement|null} Form element or null
     */
    getForm() {
        return this.element.querySelector('form');
    }
    
    /**
     * Reset form if modal contains one
     */
    resetForm() {
        const form = this.getForm();
        if (form) {
            form.reset();
        }
    }
    
    /**
     * Set initial focus when modal opens
     */
    setInitialFocus() {
        let focusElement = null;
        
        if (this.focusElementSelector) {
            focusElement = this.element.querySelector(this.focusElementSelector);
        }
        
        if (!focusElement) {
            // Try to find first input, textarea, or select
            focusElement = this.element.querySelector('input:not([type="hidden"]), textarea, select');
        }
        
        if (!focusElement) {
            // Focus the modal content itself
            focusElement = this.modalContent || this.element;
            // Make it focusable if it isn't already
            if (focusElement.tabIndex < 0) {
                focusElement.tabIndex = -1;
            }
        }
        
        if (focusElement && focusElement.focus) {
            // Small delay to ensure modal is fully rendered
            setTimeout(() => focusElement.focus(), 50);
        }
    }
    
    /**
     * Bind dynamic event listeners when modal opens
     */
    bindDynamicEvents() {
        if (this.closeOnEsc) {
            document.addEventListener('keydown', this.boundHandleKeyDown);
        }
        
        if (this.closeOnOutsideClick) {
            this.element.addEventListener('click', this.boundHandleOutsideClick);
        }
    }
    
    /**
     * Unbind dynamic event listeners when modal closes
     */
    unbindDynamicEvents() {
        document.removeEventListener('keydown', this.boundHandleKeyDown);
        this.element.removeEventListener('click', this.boundHandleOutsideClick);
    }
    
    /**
     * Handle keydown events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        if (event.key === 'Escape' || event.keyCode === 27) {
            event.preventDefault();
            this.close({ reason: 'escape' });
        }
        
        // Tab key handling for focus trap
        if (this.trapFocus && event.key === 'Tab') {
            this.handleTabKey(event);
        }
    }
    
    /**
     * Handle tab key for focus trapping
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleTabKey(event) {
        const focusableElements = this.element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const focusableArray = Array.from(focusableElements).filter(el => {
            return !el.disabled && el.offsetParent !== null;
        });
        
        if (focusableArray.length === 0) return;
        
        const firstFocusable = focusableArray[0];
        const lastFocusable = focusableArray[focusableArray.length - 1];
        
        if (event.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstFocusable) {
                event.preventDefault();
                lastFocusable.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastFocusable) {
                event.preventDefault();
                firstFocusable.focus();
            }
        }
    }
    
    /**
     * Handle clicks outside modal content
     * @param {MouseEvent} event - Click event
     */
    handleOutsideClick(event) {
        // Check if click was on the modal backdrop (not content)
        if (event.target === this.element && !this.modalContent?.contains(event.target)) {
            this.close({ reason: 'outside-click' });
        }
    }
    
    /**
     * Show loading state in modal
     * @param {string} message - Loading message
     */
    showLoading(message = 'Loading...') {
        const loadingHTML = `
            <div class="modal-loading">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        this.setContent(loadingHTML);
    }
    
    /**
     * Show error state in modal
     * @param {string} message - Error message
     */
    showError(message) {
        const errorHTML = `
            <div class="modal-error">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
            </div>
        `;
        this.setContent(errorHTML);
    }
    
    /**
     * Destroy the modal instance and clean up
     */
    destroy() {
        // Close if open
        if (this.isOpen) {
            this.close();
        }
        
        // Remove event listeners
        this.closeButtons.forEach(button => {
            button.removeEventListener('click', () => this.close());
        });
        
        // Clear references
        this.element = null;
        this.modalContent = null;
        this.closeButtons = null;
    }
    
    /**
     * Create a dynamic modal
     * @param {Object} config - Modal configuration
     * @param {string} config.title - Modal title
     * @param {string|HTMLElement} config.content - Modal content
     * @param {string} config.className - Additional CSS classes
     * @param {Array} config.buttons - Array of button configurations
     * @param {Function} config.onClose - Close callback
     * @returns {Modal} New modal instance
     */
    static createDynamic(config) {
        const modalId = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Create modal element
        const modalElement = document.createElement('div');
        modalElement.id = modalId;
        modalElement.className = `modal ${config.className || ''}`;
        
        // Build buttons HTML
        const buttonsHTML = (config.buttons || [{ text: 'Close', className: 'btn-secondary', action: 'close' }])
            .map(button => {
                const dataAction = button.action === 'close' ? 'data-modal-close' : '';
                return `<button class="btn ${button.className || ''}" ${dataAction}>${button.text}</button>`;
            }).join('');
        
        // Set modal HTML
        modalElement.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${config.title || ''}</h2>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    ${typeof config.content === 'string' ? config.content : ''}
                </div>
                <div class="modal-footer">
                    ${buttonsHTML}
                </div>
            </div>
        `;
        
        // Append to body
        document.body.appendChild(modalElement);
        
        // If content is an element, append it
        if (config.content instanceof HTMLElement) {
            modalElement.querySelector('.modal-body').appendChild(config.content);
        }
        
        // Create modal instance
        const modal = new Modal({
            id: modalId,
            onClose: () => {
                // Remove from DOM after close
                setTimeout(() => {
                    modalElement.remove();
                }, 300); // Allow for close animation
                
                if (config.onClose) {
                    config.onClose();
                }
            }
        });
        
        // Bind button actions
        if (config.buttons) {
            config.buttons.forEach((button, index) => {
                if (button.action && button.action !== 'close') {
                    const buttonElement = modalElement.querySelectorAll('.modal-footer button')[index];
                    buttonElement.addEventListener('click', () => button.action(modal));
                }
            });
        }
        
        return modal;
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
    
    // Export Modal
    universalExport(Modal);
})();