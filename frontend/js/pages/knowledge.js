/**
 * Mirai HelpDesk - Knowledge Page
 */

const KnowledgePage = {
    async render() {
        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'ナレッジ';

        content.innerHTML = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="search-input">
                        <i class="lucide-search"></i>
                        <input type="text" id="knowledge-search" placeholder="ナレッジを検索...">
                    </div>
                </div>
            </div>
            <div id="knowledge-grid" class="knowledge-grid">
                <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
        `;

        await this.loadKnowledge();
    },

    async loadKnowledge() {
        const container = document.getElementById('knowledge-grid');
        try {
            const data = await API.getKnowledge({ published_only: true });
            this.renderArticles(data.items);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
        }
    },

    renderArticles(articles) {
        const container = document.getElementById('knowledge-grid');

        if (articles.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="lucide-book-open"></i><h3>ナレッジがありません</h3></div>`;
            return;
        }

        container.innerHTML = articles.map(a => `
            <div class="knowledge-card" data-id="${a.id}">
                <div class="knowledge-card-header">
                    <div class="knowledge-icon"><i class="lucide-file-text"></i></div>
                    <div class="knowledge-title">${a.title}</div>
                </div>
                <div class="knowledge-summary">${a.summary || ''}</div>
                <div class="knowledge-footer">
                    <span>${a.category}</span>
                    <span>👁 ${a.view_count}</span>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.knowledge-card').forEach(card => {
            card.addEventListener('click', () => this.showArticle(card.dataset.id));
        });
    },

    async showArticle(id) {
        try {
            const article = await API.getKnowledgeArticle(id);
            Modal.create({
                title: article.title,
                content: `<div style="line-height:1.8">${article.content.replace(/\n/g, '<br>')}</div>`,
                size: 'large'
            });
        } catch (err) {
            Toast.error(err.message);
        }
    }
};

window.KnowledgePage = KnowledgePage;
