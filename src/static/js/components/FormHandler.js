/**
 * Form Handler Component
 * Centralizes form handling, validation, and submission logic
 * 
 * @module FormHandler
 */

/**
 * FormHandler class for managing form operations
 * Provides validation, submission handling, and form state management
 */
class FormHandler {
    /**
     * Create a new FormHandler instance
     * @param {Object} config - Configuration options
     * @param {HTMLFormElement} config.form - Form element
     * @param {Object} config.validators - Custom validation functions
     * @param {Function} config.onSubmit - Submit handler
     * @param {Function} config.onValidationError - Validation error handler
     * @param {boolean} config.showValidationFeedback - Show inline validation feedback
     */
    constructor(config) {
        this.form = config.form;
        this.validators = config.validators || {};
        this.onSubmit = config.onSubmit || (() => {});
        this.onValidationError = config.onValidationError || (() => {});
        this.showValidationFeedback = config.showValidationFeedback !== false;
        
        // State
        this.isSubmitting = false;
        this.validationState = new Map();
        
        // Bind events
        this.bindEvents();
    }
    
    /**
     * Bind form event listeners
     */
    bindEvents() {
        if (!this.form) return;
        
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Real-time validation
        if (this.showValidationFeedback) {
            this.form.addEventListener('input', (e) => this.handleInput(e));
            this.form.addEventListener('blur', (e) => this.handleBlur(e), true);
        }
        
        // Prevent double submission
        this.form.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.type !== 'textarea') {
                if (this.isSubmitting) {
                    e.preventDefault();
                }
            }
        });
    }
    
    /**
     * Handle form submission
     * @param {Event} event - Submit event
     */
    async handleSubmit(event) {
        event.preventDefault();
        
        if (this.isSubmitting) return;
        
        // Validate form
        const validation = this.validateForm();
        if (!validation.valid) {
            this.onValidationError(validation.errors);
            this.showValidationErrors(validation.errors);
            return;
        }
        
        // Set submitting state
        this.setSubmittingState(true);
        
        try {
            // Call submit handler
            await this.onSubmit(validation.data, this.form);
        } catch (error) {
            console.error('Form submission error:', error);
            // Handle error (will be handled by the caller)
        } finally {
            this.setSubmittingState(false);
        }
    }
    
    /**
     * Handle input events for real-time validation
     * @param {Event} event - Input event
     */
    handleInput(event) {
        const field = event.target;
        if (this.validationState.has(field.name)) {
            // Only validate if field was previously invalid
            this.validateField(field);
        }
    }
    
    /**
     * Handle blur events for validation
     * @param {Event} event - Blur event
     */
    handleBlur(event) {
        const field = event.target;
        if (field.name) {
            this.validateField(field);
        }
    }
    
    /**
     * Validate entire form
     * @returns {Object} Validation result
     */
    validateForm() {
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData);
        const errors = [];
        
        // Clear previous validation state
        this.validationState.clear();
        this.clearValidationErrors();
        
        // Get all form fields
        const fields = this.form.querySelectorAll('input, select, textarea');
        
        fields.forEach(field => {
            const fieldErrors = this.validateField(field, data);
            if (fieldErrors.length > 0) {
                errors.push(...fieldErrors);
            }
        });
        
        return {
            valid: errors.length === 0,
            errors,
            data
        };
    }
    
    /**
     * Validate a single field
     * @param {HTMLElement} field - Field element
     * @param {Object} formData - Form data (optional)
     * @returns {Array} Field errors
     */
    validateField(field, formData = null) {
        const errors = [];
        const value = field.value;
        const fieldName = field.name || field.id;
        
        // Skip validation for disabled or hidden fields
        if (field.disabled || field.type === 'hidden') {
            return errors;
        }
        
        // Required validation
        if (field.required && (!value || value.trim() === '')) {
            errors.push(`${this.getFieldLabel(field)} is required`);
        }
        
        // Type-specific validation
        if (value && value.trim() !== '') {
            switch (field.type) {
                case 'email':
                    if (!this.isValidEmail(value)) {
                        errors.push(`${this.getFieldLabel(field)} must be a valid email address`);
                    }
                    break;
                    
                case 'url':
                    if (!this.isValidUrl(value)) {
                        errors.push(`${this.getFieldLabel(field)} must be a valid URL`);
                    }
                    break;
                    
                case 'number':
                    if (isNaN(value)) {
                        errors.push(`${this.getFieldLabel(field)} must be a valid number`);
                    } else {
                        const numValue = parseFloat(value);
                        if (field.min !== '' && numValue < parseFloat(field.min)) {
                            errors.push(`${this.getFieldLabel(field)} must be at least ${field.min}`);
                        }
                        if (field.max !== '' && numValue > parseFloat(field.max)) {
                            errors.push(`${this.getFieldLabel(field)} must be no more than ${field.max}`);
                        }
                    }
                    break;
            }
            
            // Length validation
            if (field.minLength && value.length < parseInt(field.minLength)) {
                errors.push(`${this.getFieldLabel(field)} must be at least ${field.minLength} characters`);
            }
            if (field.maxLength && value.length > parseInt(field.maxLength)) {
                errors.push(`${this.getFieldLabel(field)} must be no more than ${field.maxLength} characters`);
            }
            
            // Pattern validation
            if (field.pattern) {
                const regex = new RegExp(field.pattern);
                if (!regex.test(value)) {
                    errors.push(`${this.getFieldLabel(field)} format is invalid`);
                }
            }
        }
        
        // Custom validators
        if (this.validators[fieldName]) {
            try {
                const customResult = this.validators[fieldName](value, formData || this.getFormData(), field);
                if (customResult !== true) {
                    errors.push(typeof customResult === 'string' ? customResult : `${this.getFieldLabel(field)} is invalid`);
                }
            } catch (error) {
                console.error(`Custom validator error for ${fieldName}:`, error);
                errors.push(`${this.getFieldLabel(field)} validation failed`);
            }
        }
        
        // Update validation state
        this.validationState.set(fieldName, errors.length === 0);
        
        // Show/hide field-level feedback
        if (this.showValidationFeedback) {
            this.showFieldValidation(field, errors);
        }
        
        return errors;
    }
    
    /**
     * Get field label for error messages
     * @param {HTMLElement} field - Field element
     * @returns {string} Field label
     */
    getFieldLabel(field) {
        const label = this.form.querySelector(`label[for="${field.id}"]`);
        if (label) {
            return label.textContent.replace('*', '').trim();
        }
        
        return field.name || field.id || field.placeholder || 'Field';
    }
    
    /**
     * Show validation errors for the entire form
     * @param {Array} errors - Array of error messages
     */
    showValidationErrors(errors) {
        // Remove existing error container
        const existingContainer = this.form.querySelector('.form-errors');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        if (errors.length === 0) return;
        
        // Create error container
        const errorContainer = document.createElement('div');
        errorContainer.className = 'form-errors';
        errorContainer.innerHTML = `
            <div class="error-header">
                <i class="fas fa-exclamation-circle"></i>
                <span>Please correct the following errors:</span>
            </div>
            <ul class="error-list">
                ${errors.map(error => `<li>${error}</li>`).join('')}
            </ul>
        `;
        
        // Insert at top of form
        this.form.insertBefore(errorContainer, this.form.firstChild);
        
        // Scroll to errors
        errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    /**
     * Show validation feedback for a specific field
     * @param {HTMLElement} field - Field element
     * @param {Array} errors - Field errors
     */
    showFieldValidation(field, errors) {
        const formGroup = field.closest('.form-group');
        if (!formGroup) return;
        
        // Remove existing feedback
        const existingFeedback = formGroup.querySelector('.field-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        // Update field state
        field.classList.remove('field-valid', 'field-invalid');
        formGroup.classList.remove('has-error', 'has-success');
        
        if (errors.length > 0) {
            // Show error state
            field.classList.add('field-invalid');
            formGroup.classList.add('has-error');
            
            const feedback = document.createElement('div');
            feedback.className = 'field-feedback error-feedback';
            feedback.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${errors[0]}`;
            formGroup.appendChild(feedback);
        } else if (field.value && field.value.trim() !== '') {
            // Show success state for non-empty valid fields
            field.classList.add('field-valid');
            formGroup.classList.add('has-success');
            
            const feedback = document.createElement('div');
            feedback.className = 'field-feedback success-feedback';
            feedback.innerHTML = `<i class="fas fa-check-circle"></i>`;
            formGroup.appendChild(feedback);
        }
    }
    
    /**
     * Clear all validation errors
     */
    clearValidationErrors() {
        // Remove form-level errors
        const errorContainer = this.form.querySelector('.form-errors');
        if (errorContainer) {
            errorContainer.remove();
        }
        
        // Remove field-level errors
        this.form.querySelectorAll('.field-feedback').forEach(feedback => {
            feedback.remove();
        });
        
        // Remove validation classes
        this.form.querySelectorAll('.field-valid, .field-invalid').forEach(field => {
            field.classList.remove('field-valid', 'field-invalid');
        });
        
        this.form.querySelectorAll('.has-error, .has-success').forEach(group => {
            group.classList.remove('has-error', 'has-success');
        });
    }
    
    /**
     * Set form submitting state
     * @param {boolean} submitting - Submitting state
     */
    setSubmittingState(submitting) {
        this.isSubmitting = submitting;
        
        // Disable/enable form elements
        const elements = this.form.querySelectorAll('input, button, select, textarea');
        elements.forEach(element => {
            if (submitting) {
                element.dataset.wasDisabled = element.disabled;
                element.disabled = true;
            } else {
                element.disabled = element.dataset.wasDisabled === 'true';
                delete element.dataset.wasDisabled;
            }
        });
        
        // Update submit button
        const submitBtn = this.form.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn) {
            if (submitting) {
                UIComponents.Loading.setButtonLoading(submitBtn, 'Saving...');
            } else {
                UIComponents.Loading.clearButtonLoading(submitBtn);
            }
        }
    }
    
    /**
     * Get form data as object
     * @returns {Object} Form data
     */
    getFormData() {
        const formData = new FormData(this.form);
        return Object.fromEntries(formData);
    }
    
    /**
     * Reset form and validation state
     */
    reset() {
        this.form.reset();
        this.validationState.clear();
        this.clearValidationErrors();
        this.setSubmittingState(false);
    }
    
    /**
     * Populate form with data
     * @param {Object} data - Data to populate
     */
    populate(data) {
        Object.entries(data).forEach(([name, value]) => {
            const field = this.form.querySelector(`[name="${name}"]`);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = !!value;
                } else if (field.type === 'radio') {
                    const radio = this.form.querySelector(`[name="${name}"][value="${value}"]`);
                    if (radio) radio.checked = true;
                } else {
                    field.value = value || '';
                }
            }
        });
    }
    
    /**
     * Add custom validator
     * @param {string} fieldName - Field name
     * @param {Function} validator - Validator function
     */
    addValidator(fieldName, validator) {
        this.validators[fieldName] = validator;
    }
    
    /**
     * Remove custom validator
     * @param {string} fieldName - Field name
     */
    removeValidator(fieldName) {
        delete this.validators[fieldName];
    }
    
    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {boolean} Is valid email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Validate URL
     * @param {string} url - URL to validate
     * @returns {boolean} Is valid URL
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Destroy form handler
     */
    destroy() {
        // Remove event listeners
        if (this.form) {
            this.form.removeEventListener('submit', this.handleSubmit);
            this.form.removeEventListener('input', this.handleInput);
            this.form.removeEventListener('blur', this.handleBlur);
        }
        
        // Clear state
        this.validationState.clear();
        this.clearValidationErrors();
        
        // Clear references
        this.form = null;
        this.validators = null;
    }
    
    /**
     * Create a form handler for a specific form
     * @param {string|HTMLFormElement} form - Form selector or element
     * @param {Object} config - Configuration options
     * @returns {FormHandler} Form handler instance
     */
    static create(form, config = {}) {
        const formElement = typeof form === 'string' ? document.querySelector(form) : form;
        if (!formElement) {
            throw new Error('Form element not found');
        }
        
        return new FormHandler({
            form: formElement,
            ...config
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormHandler;
}