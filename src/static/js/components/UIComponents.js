/**
 * UI Components Module
 * Provides reusable UI components and utilities
 * 
 * @module UIComponents
 */

/**
 * Notification Component
 * Handles displaying temporary notifications to users
 */
class NotificationComponent {
    static currentNotifications = new Set();
    
    /**
     * Show a notification
     * @param {string} message - Message to display
     * @param {string} type - Notification type (success, error, info, warning)
     * @param {number} duration - Display duration in milliseconds
     */
    static show(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${iconMap[type] || iconMap.info}"></i>
                <span class="notification-message">${message}</span>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Add to container
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(notification);
        this.currentNotifications.add(notification);
        
        // Handle close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.remove(notification));
        
        // Auto-remove after duration
        setTimeout(() => this.remove(notification), duration);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('notification-show');
        });
        
        return notification;
    }
    
    static showSuccess(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }
    
    static showError(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }
    
    static showWarning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    }
    
    static showInfo(message, duration = 4000) {
        return this.show(message, 'info', duration);
    }
    
    static remove(notification) {
        if (!this.currentNotifications.has(notification)) return;
        
        notification.classList.add('notification-hide');
        this.currentNotifications.delete(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
    
    static clearAll() {
        this.currentNotifications.forEach(notification => this.remove(notification));
    }
}

/**
 * Loading Component
 * Handles loading states and spinners
 */
class LoadingComponent {
    /**
     * Show inline spinner in container
     * @param {HTMLElement} container - Container element
     * @param {string} message - Loading message
     */
    static showInlineSpinner(container, message = 'Loading...') {
        container.innerHTML = `
            <div class="loading-inline">
                <i class="fas fa-spinner fa-spin"></i>
                <span>${message}</span>
            </div>
        `;
    }
    
    /**
     * Set button to loading state
     * @param {HTMLButtonElement} button - Button element
     * @param {string} message - Loading message
     */
    static setButtonLoading(button, message = 'Processing...') {
        if (button.dataset.originalText === undefined) {
            button.dataset.originalText = button.innerHTML;
        }
        
        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
        button.classList.add('btn-loading');
    }
    
    /**
     * Remove loading state from button
     * @param {HTMLButtonElement} button - Button element
     */
    static clearButtonLoading(button) {
        if (button.dataset.originalText !== undefined) {
            button.innerHTML = button.dataset.originalText;
            delete button.dataset.originalText;
        }
        
        button.disabled = false;
        button.classList.remove('btn-loading');
    }
    
    /**
     * Create progress bar element
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} message - Progress message
     */
    static createProgressBar(progress = 0, message = '') {
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-container';
        progressBar.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min(100, Math.max(0, progress))}%"></div>
            </div>
            ${message ? `<div class="progress-message">${message}</div>` : ''}
        `;
        return progressBar;
    }
    
    /**
     * Update existing progress bar
     * @param {HTMLElement} progressBar - Progress bar element
     * @param {number} progress - New progress percentage
     * @param {string} message - New message
     */
    static updateProgressBar(progressBar, progress, message) {
        const fill = progressBar.querySelector('.progress-fill');
        const messageEl = progressBar.querySelector('.progress-message');
        
        if (fill) {
            fill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }
        
        if (messageEl && message !== undefined) {
            messageEl.textContent = message;
        }
    }
}

/**
 * Button Component
 * Creates standardized buttons
 */
class ButtonComponent {
    /**
     * Create a button element
     * @param {Object} config - Button configuration
     * @param {string} config.text - Button text
     * @param {string} config.icon - Font Awesome icon class
     * @param {string} config.className - Additional CSS classes
     * @param {Function} config.onClick - Click handler
     * @param {boolean} config.disabled - Disabled state
     * @param {string} config.type - Button type (button, submit, reset)
     * @param {string} config.title - Tooltip title
     */
    static create(config) {
        const button = document.createElement('button');
        button.type = config.type || 'button';
        button.className = `btn ${config.className || ''}`.trim();
        
        if (config.disabled) {
            button.disabled = true;
        }
        
        if (config.title) {
            button.title = config.title;
        }
        
        // Build button content
        const iconHTML = config.icon ? `<i class="${config.icon}"></i>` : '';
        const textHTML = config.text ? `<span class="btn-text">${config.text}</span>` : '';
        button.innerHTML = `${iconHTML}${textHTML}`.trim();
        
        if (config.onClick) {
            button.addEventListener('click', config.onClick);
        }
        
        return button;
    }
    
    /**
     * Create a button group
     * @param {Array} buttons - Array of button configs
     * @param {string} className - Additional CSS class for group
     */
    static createGroup(buttons, className = '') {
        const group = document.createElement('div');
        group.className = `btn-group ${className}`.trim();
        
        buttons.forEach(config => {
            group.appendChild(this.create(config));
        });
        
        return group;
    }
}

/**
 * Card Component
 * Creates standardized card layouts
 */
class CardComponent {
    /**
     * Create a card element
     * @param {Object} config - Card configuration
     * @param {string} config.title - Card title
     * @param {string} config.content - Card content HTML
     * @param {Array} config.actions - Action buttons
     * @param {string} config.className - Additional CSS classes
     * @param {string} config.image - Image URL
     * @param {Object} config.metadata - Additional metadata to display
     */
    static create(config) {
        const card = document.createElement('div');
        card.className = `card ${config.className || ''}`.trim();
        
        const imageHTML = config.image ? `
            <div class="card-image">
                <img src="${config.image}" alt="${config.title || ''}" onerror="this.style.display='none'">
            </div>
        ` : '';
        
        const metadataHTML = config.metadata ? Object.entries(config.metadata)
            .map(([key, value]) => `<div class="card-meta-item"><strong>${key}:</strong> ${value}</div>`)
            .join('') : '';
        
        const actionsHTML = config.actions ? `
            <div class="card-actions">
                ${config.actions.map(action => {
                    if (typeof action === 'string') return action;
                    return ButtonComponent.create(action).outerHTML;
                }).join('')}
            </div>
        ` : '';
        
        card.innerHTML = `
            ${imageHTML}
            <div class="card-content">
                ${config.title ? `<h3 class="card-title">${config.title}</h3>` : ''}
                ${config.content ? `<div class="card-body">${config.content}</div>` : ''}
                ${metadataHTML ? `<div class="card-metadata">${metadataHTML}</div>` : ''}
            </div>
            ${actionsHTML}
        `;
        
        return card;
    }
    
    /**
     * Create a price display element
     * @param {number} price - Price value
     * @param {string} currency - Currency code
     * @param {string} source - Price source
     */
    static createPriceDisplay(price, currency = 'GBP', source = null) {
        const currencySymbols = {
            'GBP': '£',
            'USD': '$',
            'EUR': '€',
            'CAD': 'C$',
            'AUD': 'A$'
        };
        
        const symbol = currencySymbols[currency] || currency;
        const formattedPrice = price != null ? `${symbol}${price.toFixed(2)}` : 'Unknown';
        
        const sourceIndicator = source ? this.createPriceSourceIndicator(source) : '';
        
        const priceEl = document.createElement('div');
        priceEl.className = 'price-display';
        priceEl.innerHTML = `
            <span class="price-amount">${formattedPrice}</span>
            ${sourceIndicator}
        `;
        
        return priceEl;
    }
    
    /**
     * Create price source indicator
     * @param {string} source - Price source
     */
    static createPriceSourceIndicator(source) {
        const indicators = {
            'apple': { icon: '🍎', title: 'Apple Store' },
            'kobo': { icon: '📚', title: 'Kobo' },
            'google_books': { icon: '📖', title: 'Google Books' },
            'manual': { icon: '✏️', title: 'Manually Added' }
        };
        
        const indicator = indicators[source];
        if (!indicator) return '';
        
        return `<span class="price-source" title="${indicator.title}">${indicator.icon}</span>`;
    }
}

/**
 * Empty State Component
 * Creates empty state displays
 */
class EmptyStateComponent {
    /**
     * Create an empty state element
     * @param {Object} config - Empty state configuration
     * @param {string} config.icon - Font Awesome icon class
     * @param {string} config.title - Title text
     * @param {string} config.message - Message text
     * @param {Array} config.actions - Action buttons
     * @param {string} config.className - Additional CSS classes
     */
    static create(config) {
        const emptyState = document.createElement('div');
        emptyState.className = `empty-state ${config.className || ''}`.trim();
        
        const actionsHTML = config.actions ? `
            <div class="empty-state-actions">
                ${config.actions.map(action => ButtonComponent.create(action).outerHTML).join('')}
            </div>
        ` : '';
        
        emptyState.innerHTML = `
            ${config.icon ? `<div class="empty-state-icon"><i class="${config.icon}"></i></div>` : ''}
            ${config.title ? `<h3 class="empty-state-title">${config.title}</h3>` : ''}
            ${config.message ? `<p class="empty-state-message">${config.message}</p>` : ''}
            ${actionsHTML}
        `;
        
        return emptyState;
    }
    
    /**
     * Create welcome state for new users
     */
    static createWelcomeState(onAddCategory) {
        return this.create({
            icon: 'fas fa-star',
            title: 'Welcome to PriceNest!',
            message: 'Start by creating your first category to organize your items.',
            actions: [
                {
                    text: 'Add Category',
                    icon: 'fas fa-plus',
                    className: 'btn-primary',
                    onClick: onAddCategory
                }
            ]
        });
    }
    
    /**
     * Create empty items state
     */
    static createEmptyItemsState(onAddItem) {
        return this.create({
            icon: 'fas fa-inbox',
            title: 'No items yet',
            message: 'Add your first item to start tracking prices.',
            actions: [
                {
                    text: 'Add Item',
                    icon: 'fas fa-plus',
                    className: 'btn-primary',
                    onClick: onAddItem
                }
            ]
        });
    }
    
    /**
     * Create no search results state
     */
    static createNoResultsState(searchType = 'items') {
        return this.create({
            icon: 'fas fa-search',
            title: 'No results found',
            message: `No ${searchType} match your search criteria. Try adjusting your filters.`,
            className: 'no-results'
        });
    }
}

/**
 * Form Component
 * Form utilities and components
 */
class FormComponent {
    /**
     * Create a form field
     * @param {Object} config - Field configuration
     * @param {string} config.type - Input type
     * @param {string} config.name - Field name
     * @param {string} config.label - Field label
     * @param {string} config.placeholder - Placeholder text
     * @param {*} config.value - Field value
     * @param {boolean} config.required - Required field
     * @param {Array} config.options - Options for select fields
     * @param {string} config.className - Additional CSS classes
     */
    static createField(config) {
        const fieldContainer = document.createElement('div');
        fieldContainer.className = `form-group ${config.className || ''}`.trim();
        
        const labelHTML = config.label ? `
            <label for="${config.name}">${config.label}${config.required ? ' *' : ''}</label>
        ` : '';
        
        let inputHTML = '';
        switch (config.type) {
            case 'select':
                const optionsHTML = (config.options || []).map(option => {
                    const value = typeof option === 'object' ? option.value : option;
                    const label = typeof option === 'object' ? option.label : option;
                    const selected = value === config.value ? 'selected' : '';
                    return `<option value="${value}" ${selected}>${label}</option>`;
                }).join('');
                
                inputHTML = `
                    <select id="${config.name}" name="${config.name}" ${config.required ? 'required' : ''}>
                        ${optionsHTML}
                    </select>
                `;
                break;
                
            case 'textarea':
                inputHTML = `
                    <textarea id="${config.name}" name="${config.name}" 
                              placeholder="${config.placeholder || ''}"
                              ${config.required ? 'required' : ''}>${config.value || ''}</textarea>
                `;
                break;
                
            default:
                inputHTML = `
                    <input type="${config.type || 'text'}" 
                           id="${config.name}" 
                           name="${config.name}"
                           placeholder="${config.placeholder || ''}"
                           value="${config.value || ''}"
                           ${config.required ? 'required' : ''}">
                `;
        }
        
        fieldContainer.innerHTML = `${labelHTML}${inputHTML}`;
        return fieldContainer;
    }
    
    /**
     * Toggle field visibility
     * @param {string|HTMLElement} field - Field selector or element
     * @param {boolean} visible - Visibility state
     */
    static toggleFieldVisibility(field, visible) {
        const element = typeof field === 'string' ? document.querySelector(field) : field;
        if (!element) return;
        
        const formGroup = element.closest('.form-group');
        if (formGroup) {
            formGroup.style.display = visible ? '' : 'none';
        }
    }
    
    /**
     * Validate form
     * @param {HTMLFormElement} form - Form element
     * @returns {Object} Validation result
     */
    static validateForm(form) {
        const errors = [];
        const formData = new FormData(form);
        
        // Check required fields
        const requiredFields = form.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                errors.push(`${field.name || field.id} is required`);
                field.classList.add('error');
            } else {
                field.classList.remove('error');
            }
        });
        
        return {
            valid: errors.length === 0,
            errors,
            data: Object.fromEntries(formData)
        };
    }
}

/**
 * Confirmation Component
 * Creates confirmation dialogs
 */
class ConfirmationComponent {
    /**
     * Show confirmation dialog
     * @param {Object} config - Configuration
     * @param {string} config.title - Dialog title
     * @param {string} config.message - Confirmation message
     * @param {string} config.confirmText - Confirm button text
     * @param {string} config.cancelText - Cancel button text
     * @param {string} config.type - Dialog type (danger, warning, info)
     * @returns {Promise<boolean>} User's choice
     */
    static show(config) {
        return new Promise((resolve) => {
            let resolved = false; // Prevent multiple resolves
            
            const safeResolve = (value) => {
                if (!resolved) {
                    resolved = true;
                    resolve(value);
                }
            };
            
            const modal = Modal.createDynamic({
                title: config.title || 'Confirm Action',
                content: `<p>${config.message}</p>`,
                className: `confirmation-modal ${config.type || ''}`,
                buttons: [
                    {
                        text: config.cancelText || 'Cancel',
                        className: 'btn-secondary',
                        action: () => {
                            safeResolve(false);
                            setTimeout(() => modal.close(), 0);
                        }
                    },
                    {
                        text: config.confirmText || 'Confirm',
                        className: config.type === 'danger' ? 'btn-danger' : 'btn-primary',
                        action: () => {
                            safeResolve(true);
                            setTimeout(() => modal.close(), 0);
                        }
                    }
                ],
                onClose: () => {
                    safeResolve(false);
                }
            });
            
            modal.open();
        });
    }
    
    /**
     * Show destructive action confirmation
     * @param {string} message - Confirmation message
     * @param {string} itemName - Name of item being deleted
     * @returns {Promise<boolean>} User's choice
     */
    static showDestructive(message, itemName = '') {
        return this.show({
            title: 'Delete Confirmation',
            message: `${message}${itemName ? ` "${itemName}"` : ''}? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger'
        });
    }
}

/**
 * Main UIComponents export
 * Provides access to all UI component classes
 */
class UIComponents {
    static Notification = NotificationComponent;
    static Loading = LoadingComponent;
    static Button = ButtonComponent;
    static Card = CardComponent;
    static EmptyState = EmptyStateComponent;
    static Form = FormComponent;
    static Confirmation = ConfirmationComponent;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIComponents;
}