/**
 * Mirai HelpDesk - Authentication
 * 
 * Handles user authentication state and tokens.
 */

const Auth = {
    TOKEN_KEY: 'mirai_access_token',
    REFRESH_TOKEN_KEY: 'mirai_refresh_token',
    USER_KEY: 'mirai_user',

    /**
     * Get access token
     */
    getAccessToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    /**
     * Get refresh token
     */
    getRefreshToken() {
        return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    },

    /**
     * Get current user from storage
     */
    getUser() {
        const userData = localStorage.getItem(this.USER_KEY);
        return userData ? JSON.parse(userData) : null;
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.getAccessToken();
    },

    /**
     * Login user
     */
    async login(email, password) {
        try {
            // Get tokens
            const tokenData = await API.login(email, password);

            // Store tokens
            localStorage.setItem(this.TOKEN_KEY, tokenData.access_token);
            localStorage.setItem(this.REFRESH_TOKEN_KEY, tokenData.refresh_token);

            // Get user info
            const user = await API.getCurrentUser();
            localStorage.setItem(this.USER_KEY, JSON.stringify(user));

            return user;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Logout user
     */
    logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);

        // Redirect to login
        window.location.reload();
    },

    /**
     * Refresh access token
     */
    async refreshToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            return false;
        }

        try {
            const tokenData = await API.refreshToken(refreshToken);
            localStorage.setItem(this.TOKEN_KEY, tokenData.access_token);
            localStorage.setItem(this.REFRESH_TOKEN_KEY, tokenData.refresh_token);
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Check if user has required role
     */
    hasRole(roles) {
        const user = this.getUser();
        if (!user) return false;

        if (typeof roles === 'string') {
            return user.role === roles;
        }

        return roles.includes(user.role);
    },

    /**
     * Check if user is staff
     */
    isStaff() {
        return this.hasRole(['agent', 'manager', 'm365_operator']);
    },

    /**
     * Get role display name
     */
    getRoleDisplayName(role) {
        const roleNames = {
            'requester': '一般ユーザー',
            'agent': 'エージェント',
            'm365_operator': 'M365オペレータ',
            'approver': '承認者',
            'manager': '管理者',
            'auditor': '監査担当者',
        };
        return roleNames[role] || role;
    },
};

// Export for use
window.Auth = Auth;
