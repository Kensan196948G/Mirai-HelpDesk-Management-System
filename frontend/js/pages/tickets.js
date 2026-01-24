/**
 * Mirai HelpDesk - Tickets Page
 */

const TicketsPage = {
    currentPage: 1,
    pageSize: 20,
    filters: {},

    async render() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'チケット';

        content.innerHTML = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="search-input">
                        <i class="lucide-search"></i>
                        <input type="text" id="ticket-search" placeholder="チケットを検索...">
                    </div>
                    <select id="filter-status" class="filter-select">
                        <option value="">すべてのステータス</option>
                        <option value="new">新規</option>
                        <option value="in_progress">対応中</option>
                        <option value="resolved">解決済</option>
                    </select>
                </div>
                <div class="toolbar-right">
                    <button id="create-ticket-btn" class="btn btn-primary">
                        <i class="lucide-plus"></i><span>新規チケット</span>
                    </button>
                </div>
            </div>
            <div class="card">
                <div id="tickets-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
            </div>
        `;

        document.getElementById('filter-status').addEventListener('change', (e) => {
            this.filters.status = e.target.value || undefined;
            this.loadTickets();
        });
        document.getElementById('create-ticket-btn').addEventListener('click', () => this.showCreateModal());

        await this.loadTickets();
    },

    async loadTickets() {
        const container = document.getElementById('tickets-list');
        try {
            const data = await API.getTickets({ page: this.currentPage, ...this.filters });
            this.renderTickets(data);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
        }
    },

    renderTickets(data) {
        const container = document.getElementById('tickets-list');
        const { items } = data;

        if (items.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="lucide-inbox"></i><h3>チケットがありません</h3></div>`;
            return;
        }

        container.innerHTML = items.map(t => `
            <div class="ticket-item" data-id="${t.id}">
                <div class="ticket-priority ${t.priority}"></div>
                <div class="ticket-info">
                    <div class="ticket-title">${t.subject}</div>
                    <div class="ticket-meta"><span>${t.ticket_number}</span></div>
                </div>
                <span class="ticket-status ${t.status}">${t.status}</span>
            </div>
        `).join('');

        container.querySelectorAll('.ticket-item').forEach(item => {
            item.addEventListener('click', () => this.showTicketDetail(item.dataset.id));
        });
    },

    showCreateModal() {
        Modal.create({
            title: '新規チケット作成',
            content: `
                <form id="create-ticket-form">
                    <div class="form-group">
                        <label>種別</label>
                        <select name="type" required>
                            <option value="incident">インシデント</option>
                            <option value="service_request">サービス要求</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>カテゴリ</label>
                        <select name="category" required>
                            <option value="account">アカウント</option>
                            <option value="email">メール</option>
                            <option value="other">その他</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>件名</label>
                        <input type="text" name="subject" required minlength="5">
                    </div>
                    <div class="form-group">
                        <label>詳細</label>
                        <textarea name="description" required rows="4"></textarea>
                    </div>
                </form>
            `,
            footer: `<button class="btn btn-secondary" onclick="Modal.hide()">キャンセル</button>
                     <button type="submit" form="create-ticket-form" class="btn btn-primary">作成</button>`,
        });

        document.getElementById('create-ticket-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                await API.createTicket({
                    type: fd.get('type'),
                    category: fd.get('category'),
                    subject: fd.get('subject'),
                    description: fd.get('description'),
                    impact: 2, urgency: 2
                });
                Modal.hide();
                Toast.success('チケットを作成しました');
                this.loadTickets();
            } catch (err) {
                Toast.error(err.message);
            }
        });
    },

    async showTicketDetail(id) {
        try {
            const ticket = await API.getTicket(id);
            Modal.create({
                title: ticket.ticket_number,
                content: `<h2>${ticket.subject}</h2><p>${ticket.description}</p>`,
                size: 'large'
            });
        } catch (err) {
            Toast.error(err.message);
        }
    }
};

window.TicketsPage = TicketsPage;
