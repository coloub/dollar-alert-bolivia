/**
 * Main Application Controller
 * Coordinates between API calls, alert management, and UI updates
 */

import { ExchangeRateAPI } from './api.js';
import { AlertManager } from './alert.js';

class DollarAlertApp {
    constructor() {
        this.api = new ExchangeRateAPI();
        this.alertManager = new AlertManager();
        this.currentRate = null;
        this.updateInterval = null;
        this.isInitialized = false;
        
        // DOM elements
        this.elements = {
            exchangeRate: null,
            lastUpdated: null,
            alertForm: null,
            alertThreshold: null,
            alertType: null,
            alertStatus: null
        };

        this.initializeApp();
    }

    /**
     * Initialize the application
     */
    async initializeApp() {
        try {
            this.cacheElements();
            this.bindEvents();
            await this.updateExchangeRate();
            this.loadSavedAlert();
            this.startAutoUpdate();
            this.isInitialized = true;
            
            console.log('Dollar Alert Bolivia initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Error al inicializar la aplicación');
        }
    }

    /**
     * Cache DOM elements for better performance
     */
    cacheElements() {
        this.elements = {
            exchangeRate: document.getElementById('exchangeRate'),
            lastUpdated: document.getElementById('lastUpdated'),
            alertForm: document.getElementById('alertForm'),
            alertThreshold: document.getElementById('alertThreshold'),
            alertType: document.getElementById('alertType'),
            alertStatus: document.getElementById('alertStatus')
        };

        // Validate that all elements exist
        const missingElements = Object.entries(this.elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingElements.length > 0) {
            throw new Error(`Missing DOM elements: ${missingElements.join(', ')}`);
        }
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Alert form submission
        this.elements.alertForm.addEventListener('submit', (e) => this.handleAlertSubmit(e));

        // Input validation
        this.elements.alertThreshold.addEventListener('input', (e) => this.validateThresholdInput(e));

        // Page visibility change (pause/resume updates when tab is hidden)
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => this.cleanup());

        // Handle online/offline status
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    /**
     * Update exchange rate display
     */
    async updateExchangeRate() {
        try {
            const rateElement = this.elements.exchangeRate;
            const updatedElement = this.elements.lastUpdated;

            // Show loading state
            rateElement.classList.add('loading');

            const data = await this.api.fetchUSDToBOB();
            this.currentRate = data.rate;

            // Update display with animation
            await this.animateRateUpdate(rateElement, data.rate);
            rateElement.classList.remove('loading');

            // Update timestamp
            const updateTime = this.formatTimestamp(data.timestamp);
            updatedElement.textContent = `Actualizado: ${updateTime}`;

            // Check alerts
            this.checkAlerts();

            // Update status indicator
            this.updateStatusIndicator(data.success);

        } catch (error) {
            console.error('Failed to update exchange rate:', error);
            this.elements.lastUpdated.textContent = 'Error al actualizar';
            this.updateStatusIndicator(false);
        }
    }

    /**
     * Animate rate value update
     * @param {HTMLElement} element - Rate display element
     * @param {number} newRate - New rate value
     */
    async animateRateUpdate(element, newRate) {
        const oldValue = parseFloat(element.textContent) || 0;
        const difference = newRate - oldValue;
        
        // Add visual indicator for rate changes
        if (Math.abs(difference) > 0.01) {
            element.style.color = difference > 0 ? '#e53e3e' : '#38a169';
            setTimeout(() => {
                element.style.color = '#2c5282';
            }, 2000);
        }

        // Animate the number change
        const duration = 1000;
        const steps = 30;
        const stepValue = difference / steps;
        
        for (let i = 0; i <= steps; i++) {
            setTimeout(() => {
                const currentValue = oldValue + (stepValue * i);
                element.textContent = currentValue.toFixed(2);
            }, (duration / steps) * i);
        }
    }

    /**
     * Handle alert form submission
     * @param {Event} e - Form submit event
     */
    handleAlertSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const threshold = formData.get('alertThreshold');
        const type = formData.get('alertType');

        // Validate input
        const validation = this.alertManager.validateAlert(threshold, type);
        if (!validation.isValid) {
            this.showAlertStatus(validation.errors.join('. '), 'error');
            return;
        }

        try {
            const alertData = this.alertManager.saveAlert(threshold, type);
            const message = `Alerta configurada: ${this.getAlertTypeText(type)} ${threshold} BOB`;
            this.showAlertStatus(message, 'success');
            
            console.log('Alert saved:', alertData);
        } catch (error) {
            console.error('Failed to save alert:', error);
            this.showAlertStatus('Error al guardar la alerta', 'error');
        }
    }

    /**
     * Validate threshold input in real-time
     * @param {Event} e - Input event
     */
    validateThresholdInput(e) {
        const value = parseFloat(e.target.value);
        const input = e.target;
        
        // Remove any previous validation classes
        input.classList.remove('invalid', 'valid');
        
        if (isNaN(value) || value <= 0) {
            input.classList.add('invalid');
        } else if (value > 50) {
            input.classList.add('invalid');
            this.showAlertStatus('El umbral parece muy alto para USD/BOB', 'warning');
        } else {
            input.classList.add('valid');
        }
    }

    /**
     * Check if current rate triggers any alerts
     */
    checkAlerts() {
        if (!this.currentRate) return;

        const shouldAlert = this.alertManager.checkAlert(this.currentRate);
        if (shouldAlert) {
            const alert = this.alertManager.getAlert();
            const message = this.alertManager.formatAlertMessage(this.currentRate, alert);
            
            // Show visual alert
            this.showAlertStatus(message, 'alert');
            
            // Send browser notification if available
            this.alertManager.sendNotification(
                'Dollar Alert Bolivia',
                message,
                { tag: 'rate-alert' }
            );
            
            console.log('ALERT TRIGGERED:', message);
        }
    }

    /**
     * Load and display saved alert configuration
     */
    loadSavedAlert() {
        const savedAlert = this.alertManager.getAlert();
        if (savedAlert && savedAlert.isActive) {
            this.elements.alertThreshold.value = savedAlert.threshold;
            this.elements.alertType.value = savedAlert.type;
            
            const message = `Alerta activa: ${this.getAlertTypeText(savedAlert.type)} ${savedAlert.threshold} BOB`;
            this.showAlertStatus(message, 'info');
        }
    }

    /**
     * Show alert status message
     * @param {string} message - Message to display
     * @param {string} type - Message type ('success', 'error', 'warning', 'info', 'alert')
     */
    showAlertStatus(message, type = 'success') {
        const statusElement = this.elements.alertStatus;
        
        // Reset classes
        statusElement.className = 'alert-status';
        
        // Add type-specific styling
        switch (type) {
            case 'error':
                statusElement.style.background = '#fed7d7';
                statusElement.style.borderColor = '#fc8181';
                statusElement.style.color = '#c53030';
                break;
            case 'warning':
                statusElement.style.background = '#fefcbf';
                statusElement.style.borderColor = '#f6e05e';
                statusElement.style.color = '#d69e2e';
                break;
            case 'info':
                statusElement.style.background = '#bee3f8';
                statusElement.style.borderColor = '#63b3ed';
                statusElement.style.color = '#2b6cb0';
                break;
            case 'alert':
                statusElement.style.background = '#fed7d7';
                statusElement.style.borderColor = '#fc8181';
                statusElement.style.color = '#c53030';
                statusElement.style.fontWeight = 'bold';
                break;
            default: // success
                statusElement.style.background = '#f0fff4';
                statusElement.style.borderColor = '#9ae6b4';
                statusElement.style.color = '#276749';
        }

        statusElement.textContent = message;
        statusElement.classList.remove('hidden');

        // Auto-hide after delay (except for alerts)
        if (type !== 'alert') {
            setTimeout(() => {
                statusElement.classList.add('hidden');
            }, type === 'error' ? 5000 : 3000);
        }
    }

    /**
     * Start automatic rate updates
     */
    startAutoUpdate() {
        // Update every 5 minutes
        this.updateInterval = setInterval(() => {
            if (!document.hidden) {
                this.updateExchangeRate();
            }
        }, 5 * 60 * 1000);
    }

    /**
     * Stop automatic updates
     */
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Handle page visibility changes
     */
    handleVisibilityChange() {
        if (document.hidden) {
            console.log('App paused - tab hidden');
        } else {
            console.log('App resumed - tab visible');
            // Update immediately when tab becomes visible
            this.updateExchangeRate();
        }
    }

    /**
     * Handle online status
     */
    handleOnline() {
        console.log('App online');
        this.updateStatusIndicator(true);
        this.updateExchangeRate();
    }

    /**
     * Handle offline status
     */
    handleOffline() {
        console.log('App offline');
        this.updateStatusIndicator(false);
        this.showAlertStatus('Sin conexión a internet', 'warning');
    }

    /**
     * Update status indicator
     * @param {boolean} isOnline - Connection status
     */
    updateStatusIndicator(isOnline) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-indicator span');
        
        if (statusDot && statusText) {
            if (isOnline) {
                statusDot.style.background = '#48bb78';
                statusText.textContent = 'En vivo';
            } else {
                statusDot.style.background = '#f56565';
                statusText.textContent = 'Sin conexión';
            }
        }
    }

    /**
     * Format timestamp for display
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleString('es-BO', {
                timeZone: 'America/La_Paz',
                dateStyle: 'short',
                timeStyle: 'short'
            });
        } catch (error) {
            return 'Fecha inválida';
        }
    }

    /**
     * Get human-readable alert type text
     * @param {string} type - Alert type
     * @returns {string} Human-readable text
     */
    getAlertTypeText(type) {
        const types = {
            'above': 'por encima de',
            'below': 'por debajo de',
            'both': 'alrededor de'
        };
        return types[type] || type;
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        this.showAlertStatus(message, 'error');
        console.error('App Error:', message);
    }

    /**
     * Get application statistics
     * @returns {Object} App stats
     */
    getAppStats() {
        return {
            isInitialized: this.isInitialized,
            currentRate: this.currentRate,
            hasActiveAlerts: !!this.alertManager.getAlert()?.isActive,
            alertStats: this.alertManager.getAlertStats(),
            cacheInfo: this.api.getCacheInfo(),
            isOnline: navigator.onLine,
            isVisible: !document.hidden
        };
    }

    /**
     * Cleanup resources before page unload
     */
    cleanup() {
        this.stopAutoUpdate();
        console.log('Dollar Alert Bolivia cleaned up');
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.dollarApp = new DollarAlertApp();
    } catch (error) {
        console.error('Failed to initialize Dollar Alert Bolivia:', error);
        
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fed7d7;
            border: 1px solid #fc8181;
            color: #c53030;
            padding: 1rem;
            border-radius: 10px;
            z-index: 1000;
            max-width: 300px;
        `;
        errorDiv.textContent = 'Error al inicializar la aplicación. Por favor, recarga la página.';
        document.body.appendChild(errorDiv);
    }
});

// Export for external access
export { DollarAlertApp };