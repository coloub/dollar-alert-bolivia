// compare.js - Exchange Rate Comparison Module for Dollar Alert Bolivia

/**
 * ComparisonManager Class
 * Handles the rate comparison table functionality
 */
class ComparisonManager {
    constructor() {
        this.tableBody = null;
        this.summaryElements = {};
        this.mockData = this.generateMockData();
        this.init();
    }

    /**
     * Initialize the comparison manager
     */
    init() {
        // Get DOM elements
        this.tableBody = document.getElementById('comparisonTableBody');
        this.summaryElements = {
            bestBuy: document.getElementById('bestBuy'),
            bestSell: document.getElementById('bestSell'),
            lowestSpread: document.getElementById('lowestSpread')
        };

        // Check if required elements exist
        if (!this.tableBody) {
            console.error('Comparison table body not found');
            return;
        }

        // Load and display data
        this.loadComparisonData();
        
        // Make refresh method available globally
        window.comparisonManager = this;
    }

    /**
     * Generate mock exchange rate data
     * In a real application, this would fetch from APIs
     */
    generateMockData() {
        const baseRate = 6.96; // Base USD to BOB rate
        const variation = 0.15; // Variation range
        
        return [
            {
                id: 'banco-union',
                name: 'Banco Unión',
                type: 'Banco Nacional',
                buyRate: baseRate - 0.08,
                sellRate: baseRate + 0.05,
                reliability: 'high',
                notes: 'Tasas oficiales del banco, disponible en sucursales',
                lastUpdated: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
            },
            {
                id: 'cambio-central',
                name: 'Cambio Central',
                type: 'Casa de Cambio',
                buyRate: baseRate - 0.05,
                sellRate: baseRate + 0.08,
                reliability: 'high',
                notes: 'Casa de cambio autorizada, centro de La Paz',
                lastUpdated: new Date(Date.now() - 8 * 60 * 1000) // 8 minutes ago
            },
            {
                id: 'mercado-paralelo',
                name: 'Mercado Paralelo',
                type: 'Mercado Informal',
                buyRate: baseRate + 0.12,
                sellRate: baseRate + 0.18,
                reliability: 'medium',
                notes: 'Cotización del mercado informal, mayor riesgo',
                lastUpdated: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
            },
            {
                id: 'banco-economico',
                name: 'Banco Económico',
                type: 'Banco Privado',
                buyRate: baseRate - 0.06,
                sellRate: baseRate + 0.07,
                reliability: 'high',
                notes: 'Disponible para clientes del banco',
                lastUpdated: new Date(Date.now() - 22 * 60 * 1000) // 22 minutes ago
            },
            {
                id: 'cambios-rosario',
                name: 'Cambios Rosario',
                type: 'Casa de Cambio',
                buyRate: baseRate - 0.03,
                sellRate: baseRate + 0.10,
                reliability: 'medium',
                notes: 'Red de casas de cambio, varias ubicaciones',
                lastUpdated: new Date(Date.now() - 12 * 60 * 1000) // 12 minutes ago
            }
        ];
    }

    /**
     * Load and display comparison data
     */
    async loadComparisonData() {
        try {
            // Show loading state
            this.showLoadingState();
            
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Process and display data
            const processedData = this.processData(this.mockData);
            this.renderTable(processedData);
            this.updateSummary(processedData);
            
        } catch (error) {
            console.error('Error loading comparison data:', error);
            this.showErrorState();
        }
    }

    /**
     * Process raw data to add calculated fields and rankings
     */
    processData(data) {
        return data.map(item => ({
            ...item,
            spread: item.sellRate - item.buyRate,
            spreadPercentage: ((item.sellRate - item.buyRate) / item.buyRate * 100)
        })).sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Find best and worst rates for highlighting
     */
    findExtremes(data) {
        const buyRates = data.map(item => item.buyRate);
        const sellRates = data.map(item => item.sellRate);
        const spreads = data.map(item => item.spread);

        return {
            bestBuy: Math.max(...buyRates), // Highest buy rate is best for selling USD
            worstBuy: Math.min(...buyRates),
            bestSell: Math.min(...sellRates), // Lowest sell rate is best for buying USD
            worstSell: Math.max(...sellRates),
            lowestSpread: Math.min(...spreads)
        };
    }

    /**
     * Render the comparison table
     */
    renderTable(data) {
        const extremes = this.findExtremes(data);
        
        this.tableBody.innerHTML = data.map(item => {
            const buyClass = this.getRateClass('buy', item.buyRate, extremes);
            const sellClass = this.getRateClass('sell', item.sellRate, extremes);
            const spreadClass = item.spread === extremes.lowestSpread ? 'lowest-spread' : '';
            const timeClass = this.getTimeClass(item.lastUpdated);

            return `
                <tr>
                    <td class="source-column">
                        <div class="source-name">${item.name}</div>
                        <div class="source-type">${item.type}</div>
                    </td>
                    <td class="rate-column">
                        <div class="rate-value ${buyClass}">${item.buyRate.toFixed(2)}</div>
                    </td>
                    <td class="rate-column">
                        <div class="rate-value ${sellClass}">${item.sellRate.toFixed(2)}</div>
                    </td>
                    <td class="spread-column">
                        <div class="spread-value ${spreadClass}">
                            ${item.spread.toFixed(2)}
                            <div class="spread-percentage">${item.spreadPercentage.toFixed(1)}%</div>
                        </div>
                    </td>
                    <td class="notes-column">
                        <div class="reliability-indicator ${item.reliability}">${item.reliability}</div>
                        <div class="rate-notes">${item.notes}</div>
                    </td>
                    <td class="updated-column">
                        <div class="updated-time ${timeClass}">${this.formatUpdateTime(item.lastUpdated)}</div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Get CSS class for rate highlighting
     */
    getRateClass(type, rate, extremes) {
        if (type === 'buy') {
            if (rate === extremes.bestBuy) return 'best-buy';
            if (rate === extremes.worstBuy) return 'worst-buy';
        } else if (type === 'sell') {
            if (rate === extremes.bestSell) return 'best-sell';
            if (rate === extremes.worstSell) return 'worst-sell';
        }
        return '';
    }

    /**
     * Get CSS class based on update time
     */
    getTimeClass(updateTime) {
        const minutesAgo = (Date.now() - updateTime.getTime()) / (1000 * 60);
        if (minutesAgo < 10) return 'recent';
        if (minutesAgo > 30) return 'stale';
        return '';
    }

    /**
     * Format update time for display
     */
    formatUpdateTime(date) {
        const minutesAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
        if (minutesAgo < 1) return 'Ahora mismo';
        if (minutesAgo === 1) return 'Hace 1 minuto';
        if (minutesAgo < 60) return `Hace ${minutesAgo} minutos`;
        
        const hoursAgo = Math.floor(minutesAgo / 60);
        if (hoursAgo === 1) return 'Hace 1 hora';
        return `Hace ${hoursAgo} horas`;
    }

    /**
     * Update summary section
     */
    updateSummary(data) {
        const extremes = this.findExtremes(data);
        
        // Find sources with best rates
        const bestBuySource = data.find(item => item.buyRate === extremes.bestBuy);
        const bestSellSource = data.find(item => item.sellRate === extremes.bestSell);
        const lowestSpreadSource = data.find(item => item.spread === extremes.lowestSpread);

        if (this.summaryElements.bestBuy) {
            this.summaryElements.bestBuy.textContent = `${extremes.bestBuy.toFixed(2)} (${bestBuySource.name})`;
        }
        
        if (this.summaryElements.bestSell) {
            this.summaryElements.bestSell.textContent = `${extremes.bestSell.toFixed(2)} (${bestSellSource.name})`;
        }
        
        if (this.summaryElements.lowestSpread) {
            this.summaryElements.lowestSpread.textContent = `${extremes.lowestSpread.toFixed(2)} (${lowestSpreadSource.name})`;
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        this.tableBody.innerHTML = `
            <tr class="loading-row">
                <td colspan="6" class="loading-cell">
                    <div class="loading-spinner"></div>
                    Cargando datos de comparación...
                </td>
            </tr>
        `;
    }

    /**
     * Show error state
     */
    showErrorState() {
        this.tableBody.innerHTML = `
            <tr class="error-row">
                <td colspan="6">
                    ❌ Error al cargar los datos de comparación
                    <button class="retry-comparison" onclick="window.comparisonManager.refresh()">
                        Reintentar
                    </button>
                </td>
            </tr>
        `;
    }

    /**
     * Refresh comparison data (public method)
     */
    async refresh() {
        console.log('Refreshing comparison data...');
        
        // Regenerate mock data with slight variations
        this.mockData = this.generateMockData();
        
        // Reload data
        await this.loadComparisonData();
    }
}

/**
 * Initialize the comparison manager when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    new ComparisonManager();
});

// Export for ES6 modules
export default ComparisonManager;