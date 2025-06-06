/**
 * ExchangeRateAPI - Handles all API calls for fetching USD to BOB exchange rates
 */
export class ExchangeRateAPI {
    constructor() {
        // Using exchangerate-api.com as primary source (free and reliable)
        this.baseURL = 'https://api.exchangerate-api.com/v4/latest/USD';
        this.fallbackURL = 'https://api.fxratesapi.com/latest?base=USD&symbols=BOB';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    }

    /**
     * Fetch USD to BOB exchange rate
     * @returns {Promise<Object>} Rate data with rate, timestamp, and source
     */
    async fetchUSDToBOB() {
        // Check cache first
        const cached = this.getFromCache('USD_BOB');
        if (cached) {
            return cached;
        }

        try {
            const response = await fetch(this.baseURL);
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            
            const data = await response.json();
            const result = {
                rate: data.rates?.BOB || 6.96, // Fallback rate
                timestamp: data.date || new Date().toISOString(),
                source: 'exchangerate-api.com',
                success: true
            };

            this.setCache('USD_BOB', result);
            return result;
        } catch (error) {
            console.warn('Primary API failed, trying fallback:', error.message);
            return await this.fetchFromFallback();
        }
    }

    /**
     * Fallback API call when primary fails
     * @returns {Promise<Object>} Rate data from fallback source
     */
    async fetchFromFallback() {
        try {
            const response = await fetch(this.fallbackURL);
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            
            const data = await response.json();
            const result = {
                rate: data.rates?.BOB || 6.96,
                timestamp: data.date || new Date().toISOString(),
                source: 'fxratesapi.com',
                success: true
            };

            this.setCache('USD_BOB', result);
            return result;
        } catch (error) {
            console.error('All APIs failed:', error.message);
            return this.getMockData();
        }
    }

    /**
     * Returns mock data when all APIs fail
     * @returns {Object} Mock exchange rate data
     */
    getMockData() {
        return {
            rate: 6.96,
            timestamp: new Date().toISOString(),
            source: 'fallback-data',
            success: false,
            error: 'No API available'
        };
    }

    /**
     * Cache management - set cached data
     * @param {string} key - Cache key
     * @param {Object} data - Data to cache
     */
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Cache management - get cached data if still valid
     * @param {string} key - Cache key
     * @returns {Object|null} Cached data or null if expired/not found
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const isExpired = (Date.now() - cached.timestamp) > this.cacheTimeout;
        if (isExpired) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache status for debugging
     * @returns {Object} Cache information
     */
    getCacheInfo() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            timeout: this.cacheTimeout
        };
    }
}