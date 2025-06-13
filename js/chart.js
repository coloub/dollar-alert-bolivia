/**
 * ChartManager - Handles historical exchange rate chart display
 * Uses Chart.js for responsive line chart of USD to BOB rates
 * Enhanced with debugging and error handling
 */
export class ChartManager {
    constructor() {
        this.chart = null;
        this.canvas = null;
        this.historicalData = [];
        this.isLoading = false;
        this.debugMode = true; // Set to false in production
        
        // Chart configuration
        this.chartConfig = {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'USD → BOB',
                    data: [],
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#4299e1',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#2c5282',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Fecha',
                            font: {
                                family: 'Poppins',
                                size: 14,
                                weight: '600'
                            },
                            color: '#4a5568'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            lineWidth: 1
                        },
                        ticks: {
                            font: {
                                family: 'Roboto',
                                size: 12
                            },
                            color: '#718096',
                            maxTicksLimit: 7
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Bolivianos (BOB)',
                            font: {
                                family: 'Poppins',
                                size: 14,
                                weight: '600'
                            },
                            color: '#4a5568'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            lineWidth: 1
                        },
                        ticks: {
                            font: {
                                family: 'Roboto',
                                size: 12
                            },
                            color: '#718096',
                            callback: function(value) {
                                return value.toFixed(2) + ' BOB';
                            }
                        },
                        beginAtZero: false
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                family: 'Poppins',
                                size: 14,
                                weight: '500'
                            },
                            color: '#2c5282',
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(45, 82, 130, 0.95)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#4299e1',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        titleFont: {
                            family: 'Poppins',
                            size: 14,
                            weight: '600'
                        },
                        bodyFont: {
                            family: 'Roboto',
                            size: 13
                        },
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                return `Tipo de cambio: ${context.parsed.y.toFixed(2)} BOB`;
                            },
                            afterLabel: function(context) {
                                const currentValue = context.parsed.y;
                                const previousValue = context.dataset.data[context.dataIndex - 1];
                                if (previousValue && typeof previousValue === 'number') {
                                    const change = currentValue - previousValue;
                                    const changePercent = ((change / previousValue) * 100);
                                    const arrow = change > 0 ? '↗' : change < 0 ? '↘' : '→';
                                    const sign = change > 0 ? '+' : '';
                                    return `${arrow} Cambio: ${sign}${change.toFixed(3)} BOB (${sign}${changePercent.toFixed(2)}%)`;
                                }
                                return null;
                            }
                        }
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeInOutQuart'
                }
            }
        };

        this.initializeChart();
    }

    /**
     * Debug logging helper
     */
    debug(...args) {
        if (this.debugMode) {
            console.log('[ChartManager]', ...args);
        }
    }

    /**
     * Initialize the chart canvas and Chart.js instance
     */
    async initializeChart() {
        try {
            this.debug('Starting chart initialization...');
            
            // Check if Chart.js is available
            this.debug('Chart.js loaded:', typeof Chart !== 'undefined');
            if (typeof Chart !== 'undefined') {
                this.debug('Chart.js version:', Chart.version || 'Unknown');
            }

            // Wait for Chart.js to load if not available
            if (typeof Chart === 'undefined') {
                this.debug('Chart.js not loaded yet, waiting...');
                await this.waitForChartJS();
            }

            // Find canvas element
            this.canvas = document.getElementById('historyChart');
            if (!this.canvas) {
                throw new Error('Chart canvas element not found');
            }

            this.debug('Canvas element found:', {
                id: this.canvas.id,
                width: this.canvas.clientWidth,
                height: this.canvas.clientHeight,
                offsetWidth: this.canvas.offsetWidth,
                offsetHeight: this.canvas.offsetHeight
            });

            // Check container dimensions
            const container = this.canvas.closest('.chart-container');
            if (container) {
                const containerStyles = getComputedStyle(container);
                this.debug('Container dimensions:', {
                    height: containerStyles.height,
                    width: containerStyles.width,
                    display: containerStyles.display
                });
            }

            // Create chart instance with error handling
            try {
                this.chart = new Chart(this.canvas, this.chartConfig);
                this.debug('Chart instance created successfully');
            } catch (chartError) {
                throw new Error(`Chart creation failed: ${chartError.message}`);
            }
            
            // Load historical data
            this.debug('Loading historical data...');
            await this.loadHistoricalData();
            
            this.debug('Chart initialization completed successfully');
        } catch (error) {
            console.error('Failed to initialize chart:', error);
            this.showChartError(`Error al inicializar el gráfico: ${error.message}`);
        }
    }

    /**
     * Wait for Chart.js library to load
     */
    async waitForChartJS() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100; // Increased for better reliability
            
            const checkChart = () => {
                attempts++;
                if (typeof Chart !== 'undefined') {
                    this.debug(`Chart.js loaded after ${attempts} attempts`);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error(`Chart.js failed to load after ${maxAttempts} attempts`));
                } else {
                    setTimeout(checkChart, 50); // Check every 50ms
                }
            };
            
            checkChart();
        });
    }

    /**
     * Load historical exchange rate data for the last 7 days
     */
    async loadHistoricalData() {
        if (this.isLoading) {
            this.debug('Already loading data, skipping...');
            return;
        }
        
        this.isLoading = true;
        this.showLoadingState();

        try {
            this.debug('Generating historical data...');
            
            // Generate date range for last 7 days
            const dates = this.generateDateRange(7);
            this.debug('Generated dates:', dates.map(d => d.toDateString()));
            
            const historicalRates = [];

            // Get current rate for simulation base
            const currentRate = await this.getCurrentRate();
            this.debug('Current rate for simulation:', currentRate);
            
            for (let i = 0; i < dates.length; i++) {
                const date = dates[i];
                const simulatedRate = this.generateRealisticRate(currentRate, i, dates.length);
                
                historicalRates.push({
                    date: date,
                    rate: simulatedRate,
                    formattedDate: this.formatDateForDisplay(date)
                });
            }

            this.debug('Generated historical rates:', historicalRates);
            
            // Validate data before storing
            if (historicalRates.length === 0) {
                throw new Error('No historical data generated');
            }

            // Check for invalid rates
            const invalidRates = historicalRates.filter(item => 
                isNaN(item.rate) || item.rate <= 0 || item.rate > 20
            );
            
            if (invalidRates.length > 0) {
                this.debug('Invalid rates found:', invalidRates);
                throw new Error('Invalid exchange rates generated');
            }

            this.historicalData = historicalRates;
            this.updateChart(historicalRates);
            this.hideLoadingState();
            
            this.debug('Historical data loaded successfully');
            
        } catch (error) {
            console.error('Failed to load historical data:', error);
            this.showChartError(`Error al cargar datos históricos: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Get current exchange rate (fallback for historical simulation)
     */
    async getCurrentRate() {
        try {
            this.debug('Fetching current exchange rate...');
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            const data = await response.json();
            const rate = data.rates?.BOB || 6.96;
            this.debug('Fetched current rate:', rate);
            return rate;
        } catch (error) {
            this.debug('Could not fetch current rate, using fallback:', error.message);
            return 6.96; // Fallback rate
        }
    }

    /**
     * Generate realistic historical rates based on typical USD/BOB volatility
     */
    generateRealisticRate(currentRate, daysAgo, totalDays) {
        // BOB is relatively stable, typical daily variation is 0.01-0.05 BOB
        const maxVariation = 0.15; // Maximum total variation over 7 days
        const dailyVolatility = 0.02; // Daily volatility
        
        // Create a slight trend (rates tend to gradually increase over time)
        const trendFactor = (daysAgo / totalDays) * -0.05;
        
        // Add some random daily fluctuation
        const randomFactor = (Math.random() - 0.5) * dailyVolatility;
        
        // Weekend effect (less volatility on weekends)
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const weekendDamping = isWeekend ? 0.5 : 1.0;
        
        const simulatedRate = currentRate + trendFactor + (randomFactor * weekendDamping);
        
        // Ensure rate stays within reasonable bounds
        return Math.max(6.80, Math.min(7.20, simulatedRate));
    }

    /**
     * Generate array of dates for the last N days
     */
    generateDateRange(days) {
        const dates = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            dates.push(date);
        }
        
        return dates;
    }

    /**
     * Format date for chart display
     */
    formatDateForDisplay(date) {
        return date.toLocaleDateString('es-BO', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Update chart with new data
     */
    updateChart(historicalRates) {
        if (!this.chart) {
            console.error('Chart not initialized');
            return;
        }
        
        if (!historicalRates || historicalRates.length === 0) {
            console.error('No historical data to display');
            return;
        }

        const labels = historicalRates.map(item => item.formattedDate);
        const data = historicalRates.map(item => item.rate);

        this.debug('Updating chart with data:', {
            labels: labels,
            data: data,
            labelsCount: labels.length,
            dataCount: data.length
        });
        
        // Validate data consistency
        if (labels.length !== data.length) {
            console.error('Labels and data length mismatch:', {
                labelsLength: labels.length,
                dataLength: data.length
            });
            return;
        }

        // Update chart data
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = data;

        // Update colors based on trend
        this.updateChartColors(data);
        
        // Update chart with animation
        try {
            this.chart.update('active');
            this.debug('Chart updated successfully');
        } catch (updateError) {
            console.error('Chart update failed:', updateError);
            this.showChartError('Error al actualizar el gráfico');
            return;
        }
        
        // Update summary statistics
        this.updateChartSummary(historicalRates);
    }

    /**
     * Update chart colors based on trend
     */
    updateChartColors(data) {
        if (data.length < 2) return;

        const firstRate = data[0];
        const lastRate = data[data.length - 1];
        const overallTrend = lastRate - firstRate;

        // Update chart colors based on overall trend
        if (overallTrend > 0.02) {
            // Rising trend - red
            this.chart.data.datasets[0].borderColor = '#e53e3e';
            this.chart.data.datasets[0].backgroundColor = 'rgba(229, 62, 62, 0.1)';
            this.chart.data.datasets[0].pointBackgroundColor = '#e53e3e';
            this.chart.data.datasets[0].pointHoverBackgroundColor = '#c53030';
        } else if (overallTrend < -0.02) {
            // Falling trend - green
            this.chart.data.datasets[0].borderColor = '#38a169';
            this.chart.data.datasets[0].backgroundColor = 'rgba(56, 161, 105, 0.1)';
            this.chart.data.datasets[0].pointBackgroundColor = '#38a169';
            this.chart.data.datasets[0].pointHoverBackgroundColor = '#2f855a';
        } else {
            // Stable - blue
            this.chart.data.datasets[0].borderColor = '#4299e1';
            this.chart.data.datasets[0].backgroundColor = 'rgba(66, 153, 225, 0.1)';
            this.chart.data.datasets[0].pointBackgroundColor = '#4299e1';
            this.chart.data.datasets[0].pointHoverBackgroundColor = '#2c5282';
        }
    }

    /**
     * Update chart summary with statistics
     */
    updateChartSummary(historicalRates) {
        const summaryElement = document.getElementById('chartSummary');
        if (!summaryElement) {
            this.debug('Chart summary element not found');
            return;
        }

        const rates = historicalRates.map(item => item.rate);
        const minRate = Math.min(...rates);
        const maxRate = Math.max(...rates);
        const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
        const firstRate = rates[0];
        const lastRate = rates[rates.length - 1];
        const change = lastRate - firstRate;
        const changePercent = ((change / firstRate) * 100);

        const trendIcon = change > 0.01 ? '📈' : change < -0.01 ? '📉' : '➡️';
        const trendText = change > 0.01 ? 'Subida' : change < -0.01 ? 'Bajada' : 'Estable';
        const trendColor = change > 0.01 ? '#e53e3e' : change < -0.01 ? '#38a169' : '#4a5568';

        summaryElement.innerHTML = `
            <div class="chart-stats">
                <div class="stat-item">
                    <span class="stat-label">Promedio 7 días:</span>
                    <span class="stat-value">${avgRate.toFixed(3)} BOB</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Mínimo:</span>
                    <span class="stat-value">${minRate.toFixed(3)} BOB</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Máximo:</span>
                    <span class="stat-value">${maxRate.toFixed(3)} BOB</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Tendencia:</span>
                    <span class="stat-value" style="color: ${trendColor}">
                        ${trendIcon} ${trendText} (${change > 0 ? '+' : ''}${change.toFixed(3)} BOB, ${changePercent.toFixed(2)}%)
                    </span>
                </div>
            </div>
        `;
        
        this.debug('Chart summary updated');
    }

    /**
     * Show loading state for chart
     */
    showLoadingState() {
        const container = document.getElementById('rate-history');
        if (container) {
            container.classList.add('loading');
            this.debug('Loading state enabled');
        }
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        const container = document.getElementById('rate-history');
        if (container) {
            container.classList.remove('loading');
            this.debug('Loading state disabled');
        }
    }

    /**
     * Show error message in chart area
     */
    showChartError(message) {
        const container = document.getElementById('rate-history');
        if (!container) {
            console.error('Chart container not found for error display');
            return;
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'chart-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <div class="error-icon">📊❌</div>
                <div class="error-message">${message}</div>
                <button class="retry-button" onclick="window.chartManager?.loadHistoricalData()">
                    Reintentar
                </button>
            </div>
        `;

        // Replace chart canvas with error message
        const chartContainer = container.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = '';
            chartContainer.appendChild(errorDiv);
        }
        
        this.debug('Error displayed:', message);
    }

    /**
     * Refresh chart data
     */
    async refresh() {
        this.debug('Refreshing chart data...');
        await this.loadHistoricalData();
    }

    /**
     * Resize chart (useful for responsive design)
     */
    resize() {
        if (this.chart) {
            this.chart.resize();
            this.debug('Chart resized');
        }
    }

    /**
     * Destroy chart instance
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
            this.debug('Chart destroyed');
        }
    }

    /**
     * Get chart statistics for debugging
     */
    getStats() {
        const stats = {
            isInitialized: !!this.chart,
            hasData: this.historicalData.length > 0,
            dataPoints: this.historicalData.length,
            isLoading: this.isLoading,
            lastUpdate: this.historicalData.length > 0 ? new Date().toISOString() : null,
            canvasFound: !!this.canvas,
            chartJsLoaded: typeof Chart !== 'undefined'
        };
        
        this.debug('Chart stats:', stats);
        return stats;
    }
}

// Initialize chart when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('[ChartManager] DOM loaded, initializing chart...');
    
    // Small delay to ensure all scripts are loaded
    setTimeout(() => {
        try {
            window.chartManager = new ChartManager();
            console.log('[ChartManager] Chart manager initialized');
        } catch (error) {
            console.error('[ChartManager] Failed to initialize chart manager:', error);
        }
    }, 500); // Reduced delay for faster initialization
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.chartManager) {
        window.chartManager.resize();
    }
});
