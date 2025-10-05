"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseSAPConnector = void 0;
const axios_1 = __importDefault(require("axios"));
const events_1 = require("events");
/**
 * Base SAP Connector
 * All SAP system connectors inherit from this
 */
class BaseSAPConnector extends events_1.EventEmitter {
    config;
    client;
    constructor(config) {
        super();
        this.config = config;
        this.client = axios_1.default.create({
            baseURL: config.baseUrl,
            timeout: config.timeout || 30000,
            headers: {
                'Content-Type': 'application/json',
                ...config.headers,
            },
        });
        this.setupInterceptors();
    }
    setupInterceptors() {
        this.client.interceptors.request.use(async (config) => {
            const token = await this.getAuthToken();
            config.headers.Authorization = `Bearer ${token}`;
            this.emit('request', {
                method: config.method,
                url: config.url,
                timestamp: Date.now(),
            });
            return config;
        }, (error) => {
            this.emit('request-error', error);
            return Promise.reject(error);
        });
        this.client.interceptors.response.use((response) => {
            this.emit('response', {
                status: response.status,
                url: response.config.url,
                timestamp: Date.now(),
            });
            return response;
        }, (error) => {
            const mappedError = this.mapSAPError(error);
            this.emit('response-error', mappedError);
            return Promise.reject(mappedError);
        });
    }
    async request(config) {
        const response = await this.client.request(config);
        return response.data;
    }
    /**
     * Public method for external classes (like ServiceDiscovery) to make requests
     */
    async executeRequest(config) {
        return this.request(config);
    }
    async healthCheck() {
        try {
            await this.request({
                method: 'GET',
                url: this.getHealthCheckEndpoint(),
            });
            return {
                status: 'healthy',
                timestamp: Date.now(),
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                timestamp: Date.now(),
                details: error,
            };
        }
    }
}
exports.BaseSAPConnector = BaseSAPConnector;
//# sourceMappingURL=BaseSAPConnector.js.map