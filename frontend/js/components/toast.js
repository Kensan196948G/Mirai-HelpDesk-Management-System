/**
 * Mirai HelpDesk - Toast Notifications
 */

const Toast = {
    container: null,

    /**
     * Initialize toast container
     */
    init() {
        this.container = document.getElementById('toast-container');
    },

    /**
     * Show a toast notification
     */
    show(message, type = 'info', duration = 5000) {
        if (!this.container) this.init();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: 'lucide-check-circle',
            error: 'lucide-x-circle',
            warning: 'lucide-alert-triangle',
            info: 'lucide-info',
        };

        toast.innerHTML = `
            <i class="${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;

        this.container.appendChild(toast);

        // Auto-remove after duration
        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /**
     * Show success toast
     */
    success(message, duration) {
        this.show(message, 'success', duration);
    },

    /**
     * Show error toast
     */
    error(message, duration) {
        this.show(message, 'error', duration);
    },

    /**
     * Show warning toast
     */
    warning(message, duration) {
        this.show(message, 'warning', duration);
    },

    /**
     * Show info toast
     */
    info(message, duration) {
        this.show(message, 'info', duration);
    },
};

// Add animation
const style = document.createElement('style');
style.textContent = `
    @keyframes toastOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// Export for use
window.Toast = Toast;
