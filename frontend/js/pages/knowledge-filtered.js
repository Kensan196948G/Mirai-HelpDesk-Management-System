/**
 * Mirai HelpDesk - Knowledge Management Filtered Pages
 *
 * Handles FAQ, Procedures, and Known Issues pages with filtering.
 */

const KnowledgeFilteredPage = {
    currentPage: 1,
    pageSize: 20,
    filters: {},
    category: 'all',

    categoryLabels: {
        'faq': 'FAQ',
        'procedure': '手順書',
        'known_issue': '既知の問題',
        'troubleshooting': 'トラブルシューティング',
        'reference': 'リファレンス'
    },

    /**
     * Render FAQ page
     */
    async renderFAQ() {
        this.category = 'faq';
        this.filters.article_type = 'faq';

        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = 'FAQ';

        content.innerHTML = `
            <div class="alert alert-info" style="margin-bottom: var(--spacing-lg);">
                <i class="lucide-help-circle"></i>
                <span>よくある質問と回答を表示します。問題解決の第一歩として、まずFAQを確認してください。</span>
            </div>

            ${this.renderToolbar()}
            ${this.renderStatsGrid()}

            <div class="card">
                <div id="knowledge-list">
                    <div class="loading-spinner"><div class="spinner"></div></div>
                </div>
            </div>
        `;

        this.attachEventListeners();
        await this.loadKnowledge();
        await this.loadStats();
    },

    /**
     * Render Procedures page
     */
    async renderProcedures() {
        this.category = 'procedure';
        this.filters.article_type = 'procedure';

        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = '手順書';

        content.innerHTML = `
            <div class="alert alert-info" style="margin-bottom: var(--spacing-lg);">
                <i class="lucide-book-open"></i>
                <span>各種操作の手順書を表示します。業務の標準化と効率化のため、手順書に従って作業を実施してください。</span>
            </div>

            ${this.renderToolbar()}
            ${this.renderStatsGrid()}

            <div class="card">
                <div id="knowledge-list">
                    <div class="loading-spinner"><div class="spinner"></div></div>
                </div>
            </div>
        `;

        this.attachEventListeners();
        await this.loadKnowledge();
        await this.loadStats();
    },

    /**
     * Render Known Issues page
     */
    async renderKnownIssues() {
        this.category = 'known_issue';
        this.filters.article_type = 'known_issue';

        const content = document.getElementById('page-content');
        document.getElementById('page-title').textContent = '既知の問題';

        content.innerHTML = `
            <div class="alert alert-warning" style="margin-bottom: var(--spacing-lg);">
                <i class="lucide-alert-triangle"></i>
                <span>現在把握している問題と回避策を表示します。同じ問題が発生している場合、回避策を試してください。</span>
            </div>

            ${this.renderToolbar()}
            ${this.renderStatsGrid()}

            <div class="card">
                <div id="knowledge-list">
                    <div class="loading-spinner"><div class="spinner"></div></div>
                </div>
            </div>
        `;

        this.attachEventListeners();
        await this.loadKnowledge();
        await this.loadStats();
    },

    /**
     * Render toolbar HTML
     */
    renderToolbar() {
        return `
            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="search-input">
                        <i class="lucide-search"></i>
                        <input type="text" id="knowledge-search" placeholder="ナレッジを検索...">
                    </div>
                    <select id="filter-tag" class="filter-select">
                        <option value="">すべてのタグ</option>
                        <option value="m365">Microsoft 365</option>
                        <option value="account">アカウント</option>
                        <option value="email">メール</option>
                        <option value="license">ライセンス</option>
                        <option value="teams">Teams</option>
                        <option value="sharepoint">SharePoint</option>
                    </select>
                </div>
                <div class="toolbar-right">
                    <button id="refresh-btn" class="btn btn-secondary">
                        <i class="lucide-refresh-cw"></i><span>更新</span>
                    </button>
                    <button id="create-article-btn" class="btn btn-primary">
                        <i class="lucide-plus"></i><span>新規作成</span>
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Render stats grid HTML
     */
    renderStatsGrid() {
        return `
            <div class="stats-grid" style="margin-bottom: var(--spacing-lg);">
                <div class="stat-card">
                    <div class="stat-icon info">
                        <i class="lucide-file-text"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="total-articles-count">-</div>
                        <div class="stat-label">記事数</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i class="lucide-eye"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="total-views-count">-</div>
                        <div class="stat-label">総閲覧数</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="lucide-thumbs-up"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="helpful-rate">-</div>
                        <div class="stat-label">役立った率</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const searchInput = document.getElementById('knowledge-search');
        const filterTag = document.getElementById('filter-tag');
        const refreshBtn = document.getElementById('refresh-btn');
        const createBtn = document.getElementById('create-article-btn');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value || undefined;
                this.loadKnowledge();
            });
        }

        if (filterTag) {
            filterTag.addEventListener('change', (e) => {
                this.filters.tag = e.target.value || undefined;
                this.loadKnowledge();
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadKnowledge());
        }

        if (createBtn) {
            createBtn.addEventListener('click', () => this.showCreateModal());
        }
    },

    /**
     * Load knowledge articles
     */
    async loadKnowledge() {
        const container = document.getElementById('knowledge-list');
        try {
            const data = await API.getKnowledge({
                page: this.currentPage,
                published_only: true,
                ...this.filters
            });
            this.renderKnowledgeList(data);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
        }
    },

    /**
     * Load statistics
     */
    async loadStats() {
        try {
            const data = await API.getKnowledge({
                article_type: this.filters.article_type,
                published_only: true,
                page_size: 100
            });

            const totalArticles = data.total || 0;
            const totalViews = data.items.reduce((sum, item) => sum + (item.view_count || 0), 0);
            const totalHelpful = data.items.reduce((sum, item) => sum + (item.helpful_count || 0), 0);
            const totalFeedback = data.items.reduce((sum, item) => sum + (item.helpful_count || 0) + (item.not_helpful_count || 0), 0);
            const helpfulRate = totalFeedback > 0 ? Math.round((totalHelpful / totalFeedback) * 100) : 0;

            document.getElementById('total-articles-count').textContent = totalArticles;
            document.getElementById('total-views-count').textContent = totalViews;
            document.getElementById('helpful-rate').textContent = helpfulRate + '%';
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    },

    /**
     * Render knowledge list
     */
    renderKnowledgeList(data) {
        const container = document.getElementById('knowledge-list');
        const { items } = data;

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="lucide-book-open"></i>
                    <h3>ナレッジがありません</h3>
                    <p>現在、該当する記事は登録されていません</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="knowledge-list-grid">
                ${items.map(article => `
                    <div class="knowledge-list-card" data-id="${article.id}">
                        <div class="knowledge-card-header">
                            <div class="knowledge-icon">
                                ${this.getArticleIcon(article.article_type)}
                            </div>
                            <div class="knowledge-meta">
                                <span class="badge badge-info">${this.categoryLabels[article.article_type] || article.article_type}</span>
                                ${article.tags ? article.tags.split(',').map(tag => `
                                    <span class="badge badge-secondary">${tag.trim()}</span>
                                `).join('') : ''}
                            </div>
                        </div>
                        <div class="knowledge-card-title">${article.title}</div>
                        <div class="knowledge-card-summary">${article.summary || ''}</div>
                        <div class="knowledge-card-footer">
                            <div class="knowledge-stats">
                                <span><i class="lucide-eye"></i> ${article.view_count || 0}</span>
                                <span><i class="lucide-thumbs-up"></i> ${article.helpful_count || 0}</span>
                            </div>
                            <div class="knowledge-actions">
                                <button class="btn btn-ghost btn-sm view-article-btn" data-id="${article.id}">
                                    <i class="lucide-external-link"></i> 開く
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Event listeners
        container.querySelectorAll('.view-article-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showArticleModal(btn.dataset.id, items.find(a => a.id == btn.dataset.id)));
        });
    },

    /**
     * Get article icon
     */
    getArticleIcon(articleType) {
        const icons = {
            'faq': '<i class="lucide-help-circle"></i>',
            'procedure': '<i class="lucide-book-open"></i>',
            'known_issue': '<i class="lucide-alert-triangle"></i>',
            'troubleshooting': '<i class="lucide-wrench"></i>',
            'reference': '<i class="lucide-bookmark"></i>'
        };
        return icons[articleType] || '<i class="lucide-file-text"></i>';
    },

    /**
     * Show article detail modal
     */
    async showArticleModal(id, article) {
        try {
            // Increment view count
            const fullArticle = await API.getKnowledgeArticle(id);

            Modal.create({
                title: fullArticle.title,
                content: `
                    <div class="knowledge-detail">
                        <div class="knowledge-detail-meta">
                            <span class="badge badge-info">${this.categoryLabels[fullArticle.article_type] || fullArticle.article_type}</span>
                            ${fullArticle.tags ? fullArticle.tags.split(',').map(tag => `
                                <span class="badge badge-secondary">${tag.trim()}</span>
                            `).join('') : ''}
                            <span class="text-secondary" style="margin-left: auto;">
                                <i class="lucide-eye"></i> ${(fullArticle.view_count || 0) + 1} 閲覧
                            </span>
                        </div>
                        <div class="knowledge-detail-content">
                            ${fullArticle.content ? fullArticle.content.replace(/\n/g, '<br>') : fullArticle.summary}
                        </div>
                        <div class="knowledge-detail-footer">
                            <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: var(--spacing-md);">
                                この記事は役に立ちましたか？
                            </p>
                            <div class="knowledge-feedback-buttons">
                                <button class="btn btn-success feedback-btn" data-helpful="true" data-id="${id}">
                                    <i class="lucide-thumbs-up"></i> 役に立った
                                </button>
                                <button class="btn btn-error feedback-btn" data-helpful="false" data-id="${id}">
                                    <i class="lucide-thumbs-down"></i> 役に立たなかった
                                </button>
                            </div>
                        </div>
                    </div>
                `,
                size: 'large'
            });

            // Attach feedback event listeners
            document.querySelectorAll('.feedback-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const helpful = btn.dataset.helpful === 'true';
                    try {
                        await API.submitKnowledgeFeedback(btn.dataset.id, helpful);
                        Toast.success('フィードバックをありがとうございます');
                        btn.disabled = true;
                        // Disable both buttons
                        document.querySelectorAll('.feedback-btn').forEach(b => b.disabled = true);
                    } catch (err) {
                        Toast.error(err.message);
                    }
                });
            });
        } catch (err) {
            Toast.error(err.message);
        }
    },

    /**
     * Show create article modal
     */
    showCreateModal() {
        Modal.create({
            title: '新規ナレッジ作成',
            content: `
                <form id="create-article-form">
                    <div class="form-group">
                        <label>記事種別 <span class="required">*</span></label>
                        <select name="article_type" required>
                            <option value="faq" ${this.category === 'faq' ? 'selected' : ''}>FAQ</option>
                            <option value="procedure" ${this.category === 'procedure' ? 'selected' : ''}>手順書</option>
                            <option value="known_issue" ${this.category === 'known_issue' ? 'selected' : ''}>既知の問題</option>
                            <option value="troubleshooting">トラブルシューティング</option>
                            <option value="reference">リファレンス</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>タイトル <span class="required">*</span></label>
                        <input type="text" name="title" required minlength="5" placeholder="記事のタイトル">
                    </div>
                    <div class="form-group">
                        <label>概要 <span class="required">*</span></label>
                        <textarea name="summary" required rows="2" placeholder="記事の概要（検索結果に表示されます）"></textarea>
                    </div>
                    <div class="form-group">
                        <label>本文 <span class="required">*</span></label>
                        <textarea name="content" required rows="8" placeholder="記事の詳細内容"></textarea>
                    </div>
                    <div class="form-group">
                        <label>タグ</label>
                        <input type="text" name="tags" placeholder="カンマ区切り（例: m365, email, license）">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="is_published" checked>
                            公開する
                        </label>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.hide()">キャンセル</button>
                <button type="submit" form="create-article-form" class="btn btn-primary">作成</button>
            `,
            size: 'large'
        });

        document.getElementById('create-article-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                await API.createKnowledgeArticle({
                    article_type: fd.get('article_type'),
                    title: fd.get('title'),
                    summary: fd.get('summary'),
                    content: fd.get('content'),
                    tags: fd.get('tags') || null,
                    is_published: fd.get('is_published') === 'on'
                });
                Modal.hide();
                Toast.success('ナレッジを作成しました');
                this.loadKnowledge();
                this.loadStats();
            } catch (err) {
                Toast.error(err.message);
            }
        });
    }
};

// Export for use
window.KnowledgeFilteredPage = KnowledgeFilteredPage;
