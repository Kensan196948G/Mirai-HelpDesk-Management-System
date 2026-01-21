/**
 * Mirai HelpDesk - Modal Component
 */

const Modal = {
    activeModal: null,

    /**
     * Show a modal
     */
    show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            this.activeModal = modal;

            // Close on overlay click
            modal.querySelector('.modal-overlay')?.addEventListener('click', () => this.hide());
        }
    },

    /**
     * Hide the active modal
     */
    hide() {
        if (this.activeModal) {
            this.activeModal.classList.remove('active');
            this.activeModal = null;
        }
    },

    /**
     * Create and show a custom modal
     */
    create(options) {
        const { title, content, footer, size = 'medium' } = options;

        // Remove existing custom modal
        const existing = document.getElementById('custom-modal');
        if (existing) existing.remove();

        const sizeClass = {
            small: 'width: 400px;',
            medium: 'width: 600px;',
            large: 'width: 800px;',
            full: 'width: 90%; max-width: 1200px;',
        }[size] || '';

        const modalHtml = `
            <div id="custom-modal" class="modal active">
                <div class="modal-overlay"></div>
                <div class="modal-content" style="${sizeClass}">
                    ${title ? `
                        <div class="modal-header">
                            <h3>${title}</h3>
                            <button class="btn-icon modal-close" aria-label="Close">
                                <i class="lucide-x"></i>
                            </button>
                        </div>
                    ` : ''}
                    <div class="modal-body">
                        ${content}
                    </div>
                    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('custom-modal');
        this.activeModal = modal;

        // Close handlers
        modal.querySelector('.modal-overlay').addEventListener('click', () => this.hide());
        modal.querySelector('.modal-close')?.addEventListener('click', () => this.hide());

        return modal;
    },

    /**
     * Show confirmation dialog
     */
    confirm(message, onConfirm, onCancel) {
        const modal = this.create({
            title: '確認',
            content: `<p>${message}</p>`,
            footer: `
                <button class="btn btn-secondary" id="modal-cancel">キャンセル</button>
                <button class="btn btn-primary" id="modal-confirm">確認</button>
            `,
            size: 'small',
        });

        modal.querySelector('#modal-confirm').addEventListener('click', () => {
            this.hide();
            onConfirm?.();
        });

        modal.querySelector('#modal-cancel').addEventListener('click', () => {
            this.hide();
            onCancel?.();
        });
    },
};

// Export for use
window.Modal = Modal;
