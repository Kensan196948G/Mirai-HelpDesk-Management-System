/**
 * Mirai HelpDesk - API Client
 *
 * Handles all HTTP requests to the backend API.
 * 環境に応じて自動的にAPIエンドポイントを切り替えます。
 */

// 環境設定を自動判定
const ENV_CONFIG = (() => {
    const host = window.location.hostname;
    const port = parseInt(window.location.port) || (window.location.protocol === 'https:' ? 443 : 80);
    const isHttps = window.location.protocol === 'https:';

    // 開発環境: ポート8080 (HTTP)
    // 本番環境: ポート443 (HTTPS)
    if (port === 8080 || (!isHttps && port === 80)) {
        return {
            env: 'development',
            apiBaseUrl: `http://${host}:8000/api`,
            isProduction: false,
        };
    } else {
        return {
            env: 'production',
            apiBaseUrl: `https://${host}:8443/api`,
            isProduction: true,
        };
    }
})();

// デバッグ用: 環境情報をコンソールに出力
console.log(`[Mirai HelpDesk] Environment: ${ENV_CONFIG.env}, API: ${ENV_CONFIG.apiBaseUrl}`);

const API = {
    baseUrl: ENV_CONFIG.apiBaseUrl,
    
    /**
     * Get authorization headers
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        const token = Auth.getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    },
    
    /**
     * Make API request
     */
    async request(method, endpoint, data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: this.getHeaders(),
        };
        
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            
            // Handle 401 Unauthorized
            if (response.status === 401) {
                // Try to refresh token
                const refreshed = await Auth.refreshToken();
                if (refreshed) {
                    // Retry request with new token
                    options.headers = this.getHeaders();
                    const retryResponse = await fetch(url, options);
                    return this.handleResponse(retryResponse);
                } else {
                    Auth.logout();
                    throw new Error('Session expired. Please login again.');
                }
            }
            
            return this.handleResponse(response);
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    /**
     * Handle response
     */
    async handleResponse(response) {
        const data = await response.json().catch(() => ({}));
        
        if (!response.ok) {
            const error = new Error(data.detail || 'An error occurred');
            error.status = response.status;
            error.data = data;
            throw error;
        }
        
        return data;
    },
    
    // ============== Auth ==============
    
    async login(email, password) {
        return this.request('POST', '/auth/login', { email, password });
    },
    
    async logout() {
        return this.request('POST', '/auth/logout');
    },
    
    async getCurrentUser() {
        return this.request('GET', '/auth/me');
    },
    
    async refreshToken(refreshToken) {
        return this.request('POST', '/auth/refresh', { refresh_token: refreshToken });
    },
    
    // ============== Tickets ==============
    
    async getTickets(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request('GET', `/tickets${query ? '?' + query : ''}`);
    },
    
    async getTicket(id) {
        return this.request('GET', `/tickets/${id}`);
    },
    
    async createTicket(data) {
        return this.request('POST', '/tickets', data);
    },
    
    async updateTicket(id, data) {
        return this.request('PATCH', `/tickets/${id}`, data);
    },
    
    async getTicketComments(ticketId) {
        return this.request('GET', `/tickets/${ticketId}/comments`);
    },
    
    async addTicketComment(ticketId, data) {
        return this.request('POST', `/tickets/${ticketId}/comments`, data);
    },

    async getTicketAttachments(ticketId) {
        return this.request('GET', `/tickets/${ticketId}/attachments`);
    },

    async uploadTicketAttachment(ticketId, file) {
        const url = `${this.baseUrl}/tickets/${ticketId}/attachments`;
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Auth.getAccessToken()}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.detail || 'Upload failed');
        }

        return response.json();
    },

    // ============== Knowledge ==============
    
    async getKnowledge(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request('GET', `/knowledge${query ? '?' + query : ''}`);
    },
    
    async getKnowledgeArticle(id) {
        return this.request('GET', `/knowledge/${id}`);
    },
    
    async createKnowledgeArticle(data) {
        return this.request('POST', '/knowledge', data);
    },
    
    async submitKnowledgeFeedback(id, helpful) {
        return this.request('POST', `/knowledge/${id}/feedback?helpful=${helpful}`);
    },
    
    // ============== Users ==============
    
    async getUsers(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request('GET', `/users${query ? '?' + query : ''}`);
    },
    
    async getUser(id) {
        return this.request('GET', `/users/${id}`);
    },
    
    async createUser(data) {
        return this.request('POST', '/users', data);
    },
    
    async updateUser(id, data) {
        return this.request('PATCH', `/users/${id}`, data);
    },
    
    // ============== Reports ==============
    
    async getDashboardStats() {
        return this.request('GET', '/reports/dashboard');
    },
    
    async getSLAReport(days = 30) {
        return this.request('GET', `/reports/sla?days=${days}`);
    },
    
    // ============== M365 ==============

    async getM365Tasks(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request('GET', `/m365/tasks${query ? '?' + query : ''}`);
    },

    async getM365Task(id) {
        return this.request('GET', `/m365/tasks/${id}`);
    },

    async createM365Task(data) {
        return this.request('POST', '/m365/tasks', data);
    },

    async requestApproval(taskId, reason) {
        return this.request('POST', `/m365/tasks/${taskId}/request-approval`, { reason });
    },

    async getApprovals(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request('GET', `/m365/approvals${query ? '?' + query : ''}`);
    },

    async approveTask(approvalId, comment = null) {
        return this.request('POST', `/m365/approvals/${approvalId}/approve`, { comment });
    },

    async rejectTask(approvalId, comment) {
        return this.request('POST', `/m365/approvals/${approvalId}/reject`, { comment });
    },

    async logExecution(taskId, data) {
        return this.request('POST', `/m365/tasks/${taskId}/execute`, data);
    },

    // ============== M365 Users ==============

    async searchM365Users(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request('GET', `/m365/users/search${query ? '?' + query : ''}`);
    },

    async getM365User(upn) {
        return this.request('GET', `/m365/users/${encodeURIComponent(upn)}`);
    },

    async getM365UserLicenses(upn) {
        return this.request('GET', `/m365/users/${encodeURIComponent(upn)}/licenses`);
    },

    // ============== M365 Licenses ==============

    async getM365Licenses() {
        return this.request('GET', '/m365/licenses/available');
    },

    async getM365LicenseUsers(skuId) {
        return this.request('GET', `/m365/licenses/${skuId}/users`);
    },

    async getM365LicenseDetails(skuId) {
        return this.request('GET', `/m365/licenses/${skuId}`);
    },

    // ============== Settings ==============

    async getSettings() {
        return this.request('GET', '/settings');
    },

    async updateSettings(data) {
        return this.request('PATCH', '/settings', data);
    },
};

// Export for use
window.API = API;
