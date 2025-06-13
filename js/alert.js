/**
 * AlertManager - Handles alert configuration, storage, and checking
 * Enhanced with visual alert display system
 */
export class AlertManager {
    constructor() {
        this.storageKey = 'dollarAlertBolivia_settings';
        this.notificationPermission = false;
        this.alertHistory = [];
        this.activeVisualAlert = null;
        this.alertBanner = null;
        
        this.requestNotificationPermission();
        this.initializeAlertBanner();
    }

    /**
     * Initialize the visual alert banner
     */
    initializeAlertBanner() {
        // Create alert banner if it doesn't exist
        this.alertBanner = document.getElementById('alert-banner');
        if (!this.alertBanner) {
            this.alertBanner = document.createElement('div');
            this.alertBanner.id = 'alert-banner';
            this.alertBanner.className = 'alert-banner hidden';
            
            // Insert at the top of the page, after header
            const header = document.querySelector('header');
            if (header && header.nextSibling) {
                header.parentNode.insertBefore(this.alertBanner, header.nextSibling);
            } else {
                document.body.insertBefore(this.alertBanner, document.body.firstChild);
            }
        }
    }

    /**
     * Request browser notification permission
     */
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission === 'granted';
        }
    }

    /**
     * Save alert configuration to localStorage
     * @param {number|string} threshold - Alert threshold value
     * @param {string} type - Alert type ('above', 'below', 'both')
     * @returns {Object} Saved alert data
     */
    saveAlert(threshold, type) {
        const alertData = {
            threshold: parseFloat(threshold),
            type: type,
            createdAt: new Date().toISOString(),
            isActive: true,
            id: this.generateAlertId()
        };

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(alertData));
            console.log('Alert saved to localStorage:', alertData);
        } catch (error) {
            console.warn('localStorage not available, using memory storage:', error.message);
            // Fallback to memory storage
            this.memoryStorage = alertData;
        }

        return alertData;
    }

    /**
     * Get saved alert configuration
     * @returns {Object|null} Alert configuration or null if none exists
     */
    getAlert() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn('localStorage not available, using memory storage:', error.message);
            return this.memoryStorage || null;
        }
    }

    /**
     * Update existing alert configuration
     * @param {Object} updates - Properties to update
     * @returns {Object|null} Updated alert data
     */
    updateAlert(updates) {
        const currentAlert = this.getAlert();
        if (!currentAlert) return null;

        const updatedAlert = {
            ...currentAlert,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(updatedAlert));
        } catch (error) {
            this.memoryStorage = updatedAlert;
        }

        return updatedAlert;
    }

    /**
     * Delete alert configuration
     * @returns {boolean} Success status
     */
    deleteAlert() {
        try {
            localStorage.removeItem(this.storageKey);
            this.memoryStorage = null;
            this.hideVisualAlert(); // Hide any active visual alerts
            return true;
        } catch (error) {
            console.error('Failed to delete alert:', error.message);
            return false;
        }
    }

    /**
     * Check if current rate should trigger an alert
     * @param {number} currentRate - Current exchange rate
     * @returns {boolean} Whether alert should trigger
     */
    checkAlert(currentRate) {
        const alert = this.getAlert();
        if (!alert || !alert.isActive) {
            this.hideVisualAlert(); // Hide alert if no active alert config
            return false;
        }

        const { threshold, type } = alert;
        let shouldTrigger = false;
        let alertMessage = '';

        switch (type) {
            case 'above':
                shouldTrigger = currentRate >= threshold;
                if (shouldTrigger) {
                    alertMessage = `¡ALERTA! El dólar está por ENCIMA de su umbral de ${threshold.toFixed(2)} BOB. Precio actual: ${currentRate.toFixed(2)} BOB`;
                }
                break;
            case 'below':
                shouldTrigger = currentRate <= threshold;
                if (shouldTrigger) {
                    alertMessage = `¡ALERTA! El dólar está por DEBAJO de su umbral de ${threshold.toFixed(2)} BOB. Precio actual: ${currentRate.toFixed(2)} BOB`;
                }
                break;
            case 'both':
                shouldTrigger = Math.abs(currentRate - threshold) <= 0.01; // Within 1 cent
                if (shouldTrigger) {
                    alertMessage = `¡ALERTA! El dólar ha ALCANZADO su umbral de ${threshold.toFixed(2)} BOB. Precio actual: ${currentRate.toFixed(2)} BOB`;
                }
                break;
            default:
                shouldTrigger = false;
        }

        if (shouldTrigger) {
            this.recordAlertTrigger(currentRate, alert);
            this.showVisualAlert(alertMessage, type, currentRate, threshold);
            
            // Send browser notification
            this.sendNotification(
                'Dollar Alert Bolivia - ¡ALERTA!',
                alertMessage
            );
        } else {
            this.hideVisualAlert();
        }

        return shouldTrigger;
    }

    /**
     * Show visual alert banner
     * @param {string} message - Alert message
     * @param {string} type - Alert type ('above', 'below', 'both')
     * @param {number} currentRate - Current exchange rate
     * @param {number} threshold - Alert threshold
     */
    showVisualAlert(message, type, currentRate, threshold) {
        if (!this.alertBanner) {
            this.initializeAlertBanner();
        }

        // Clear any existing content
        this.alertBanner.innerHTML = '';

        // Create alert content
        const alertContent = document.createElement('div');
        alertContent.className = 'alert-content';

        // Alert icon
        const alertIcon = document.createElement('div');
        alertIcon.className = 'alert-icon';
        alertIcon.innerHTML = '⚠️';

        // Alert message
        const alertMessage = document.createElement('div');
        alertMessage.className = 'alert-message';
        alertMessage.textContent = message;

        // Rate comparison
        const rateComparison = document.createElement('div');
        rateComparison.className = 'rate-comparison';
        
        const direction = type === 'above' ? 'SUBIÓ' : type === 'below' ? 'BAJÓ' : 'CAMBIÓ';
        const difference = Math.abs(currentRate - threshold);
        rateComparison.innerHTML = `
            <span class="rate-direction">${direction}</span>
            <span class="rate-difference">${difference.toFixed(2)} BOB</span>
        `;

        // Close button
        const closeButton = document.createElement('button');
        closeButton.className = 'alert-close';
        closeButton.innerHTML = '×';
        closeButton.onclick = () => this.hideVisualAlert();

        // Dismiss button
        const dismissButton = document.createElement('button');
        dismissButton.className = 'alert-dismiss';
        dismissButton.textContent = 'Descartar por ahora';
        dismissButton.onclick = () => this.hideVisualAlert();

        // Assemble alert
        alertContent.appendChild(alertIcon);
        alertContent.appendChild(alertMessage);
        alertContent.appendChild(rateComparison);
        alertContent.appendChild(closeButton);
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'alert-buttons';
        buttonContainer.appendChild(dismissButton);
        
        this.alertBanner.appendChild(alertContent);
        this.alertBanner.appendChild(buttonContainer);

        // Set alert type class for styling
        this.alertBanner.className = `alert-banner alert-${type}`;
        
        // Animate in
        this.alertBanner.classList.remove('hidden');
        setTimeout(() => {
            this.alertBanner.classList.add('show');
        }, 10);

        // Store reference
        this.activeVisualAlert = {
            message,
            type,
            currentRate,
            threshold,
            timestamp: new Date().toISOString()
        };

        // Add pulsing effect to exchange rate display
        const rateDisplay = document.getElementById('exchangeRate');
        if (rateDisplay) {
            rateDisplay.classList.add('rate-alert-pulse');
            setTimeout(() => {
                rateDisplay.classList.remove('rate-alert-pulse');
            }, 3000);
        }
    }

    /**
     * Hide visual alert banner
     */
    hideVisualAlert() {
        if (this.alertBanner && !this.alertBanner.classList.contains('hidden')) {
            this.alertBanner.classList.remove('show');
            this.alertBanner.classList.add('hiding');
            
            setTimeout(() => {
                this.alertBanner.classList.add('hidden');
                this.alertBanner.classList.remove('hiding');
            }, 300);
        }
        
        this.activeVisualAlert = null;
    }

    /**
     * Record when an alert was triggered
     * @param {number} rate - Rate that triggered the alert
     * @param {Object} alert - Alert configuration
     */
    recordAlertTrigger(rate, alert) {
        const triggerRecord = {
            rate,
            threshold: alert.threshold,
            type: alert.type,
            timestamp: new Date().toISOString(),
            id: Date.now()
        };

        this.alertHistory.push(triggerRecord);
        
        // Keep only last 10 triggers
        if (this.alertHistory.length > 10) {
            this.alertHistory = this.alertHistory.slice(-10);
        }

        // Save to localStorage
        try {
            localStorage.setItem('dollarAlert_history', JSON.stringify(this.alertHistory));
        } catch (error) {
            console.warn('Could not save alert history:', error.message);
        }
    }

    /**
     * Get alert trigger history
     * @returns {Array} Array of alert trigger records
     */
    getAlertHistory() {
        try {
            const stored = localStorage.getItem('dollarAlert_history');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            return this.alertHistory;
        }
    }

    /**
     * Send browser notification if permission granted
     * @param {string} title - Notification title
     * @param {string} body - Notification body
     * @param {Object} options - Additional notification options
     */
    sendNotification(title, body, options = {}) {
        if (!this.notificationPermission || !('Notification' in window)) {
            console.log('Notification not available or permission denied');
            return;
        }

        const notification = new Notification(title, {
            body,
            icon: '/assets/icon-192.png', // Add your app icon
            badge: '/assets/badge-72.png',
            tag: 'dollar-alert',
            requireInteraction: true,
            ...options
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // Auto close after 10 seconds
        setTimeout(() => notification.close(), 10000);
    }

    /**
     * Format alert message for display
     * @param {number} currentRate - Current exchange rate
     * @param {Object} alert - Alert configuration
     * @returns {string} Formatted alert message
     */
    formatAlertMessage(currentRate, alert) {
        const { threshold, type } = alert;
        const direction = type === 'above' ? 'por encima de' : 
                         type === 'below' ? 'por debajo de' : 'alcanzado';
        
        return `¡Alerta de cambio! El dólar está ${direction} ${threshold.toFixed(2)} BOB. Tipo actual: ${currentRate.toFixed(2)} BOB`;
    }

    /**
     * Generate unique alert ID
     * @returns {string} Unique identifier
     */
    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Validate alert parameters
     * @param {number} threshold - Threshold value
     * @param {string} type - Alert type
     * @returns {Object} Validation result
     */
    validateAlert(threshold, type) {
        const errors = [];

        if (!threshold || isNaN(parseFloat(threshold))) {
            errors.push('El umbral debe ser un número válido');
        }

        if (parseFloat(threshold) <= 0) {
            errors.push('El umbral debe ser mayor que 0');
        }

        if (parseFloat(threshold) > 50) {
            errors.push('El umbral parece demasiado alto para USD/BOB');
        }

        if (!['above', 'below', 'both'].includes(type)) {
            errors.push('Tipo de alerta inválido');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get alert statistics
     * @returns {Object} Alert usage statistics
     */
    getAlertStats() {
        const alert = this.getAlert();
        const history = this.getAlertHistory();

        return {
            hasActiveAlert: !!alert?.isActive,
            alertType: alert?.type || null,
            threshold: alert?.threshold || null,
            triggerCount: history.length,
            lastTrigger: history.length > 0 ? history[history.length - 1] : null,
            createdAt: alert?.createdAt || null,
            hasActiveVisualAlert: !!this.activeVisualAlert
        };
    }

    /**
     * Get current visual alert status
     * @returns {Object|null} Current visual alert data
     */
    getCurrentVisualAlert() {
        return this.activeVisualAlert;
    }
}