/**
 * API通信モジュール
 */

const API_BASE_URL = 'http://192.168.0.145:3001/api';
let authToken = localStorage.getItem('token');

// APIリクエストヘルパー
async function apiRequest(method, endpoint, data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (authToken) {
        options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (data && (method === 'POST' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'APIエラー');
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// 認証API
const authAPI = {
    login: (username, password) =>
        apiRequest('POST', '/auth/login', { username, password })
            .then(res => {
                authToken = res.token;
                localStorage.setItem('token', res.token);
                localStorage.setItem('user', JSON.stringify(res.user));
                return res;
            }),

    logout: () => {
        authToken = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },
};

// チケットAPI
const ticketAPI = {
    list: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest('GET', `/tickets${query ? '?' + query : ''}`);
    },

    get: (id) =>
        apiRequest('GET', `/tickets/${id}`),

    create: (data) =>
        apiRequest('POST', '/tickets', data),

    update: (id, data) =>
        apiRequest('PATCH', `/tickets/${id}`, data),

    addComment: (id, body, visibility = 'public') =>
        apiRequest('POST', `/tickets/${id}/comments`, { body, visibility }),

    getComments: (id) =>
        apiRequest('GET', `/tickets/${id}/comments`),

    getHistory: (id) =>
        apiRequest('GET', `/tickets/${id}/history`),
};

// 承認API
const approvalAPI = {
    list: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest('GET', `/approvals${query ? '?' + query : ''}`);
    },

    requestApproval: (ticketId, data) =>
        apiRequest('POST', `/approvals/tickets/${ticketId}/approvals`, data),

    approve: (id, decisionNotes) =>
        apiRequest('POST', `/approvals/${id}/approve`, { decision_notes: decisionNotes }),

    reject: (id, decisionNotes) =>
        apiRequest('POST', `/approvals/${id}/reject`, { decision_notes: decisionNotes }),
};

// M365 API
const m365API = {
    listTasks: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest('GET', `/m365/tasks${query ? '?' + query : ''}`);
    },

    createTask: (ticketId, data) =>
        apiRequest('POST', `/m365/tickets/${ticketId}/tasks`, data),

    recordExecution: (taskId, data) =>
        apiRequest('POST', `/m365/tasks/${taskId}/execute`, data),
};

// ナレッジAPI
const knowledgeAPI = {
    list: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest('GET', `/knowledge${query ? '?' + query : ''}`);
    },

    get: (id) =>
        apiRequest('GET', `/knowledge/${id}`),

    create: (data) =>
        apiRequest('POST', '/knowledge', data),
};
