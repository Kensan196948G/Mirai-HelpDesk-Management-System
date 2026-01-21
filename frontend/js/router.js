/**
 * Mirai HelpDesk - SPA Router
 * 
 * Simple hash-based router for single page application.
 */

const Router = {
    routes: {},
    currentRoute: null,

    /**
     * Register a route
     */
    register(path, handler) {
        this.routes[path] = handler;
    },

    /**
     * Navigate to a route
     */
    navigate(path) {
        window.location.hash = path;
    },

    /**
     * Get current path from hash
     */
    getCurrentPath() {
        return window.location.hash.slice(1) || '/dashboard';
    },

    /**
     * Handle route change
     */
    async handleRoute() {
        const path = this.getCurrentPath();
        const handler = this.routes[path];

        if (handler) {
            this.currentRoute = path;
            await handler();
        } else {
            // Default to dashboard
            this.navigate('/dashboard');
        }
    },

    /**
     * Initialize router
     */
    init() {
        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());

        // Handle initial route
        this.handleRoute();
    },
};

// Export for use
window.Router = Router;
