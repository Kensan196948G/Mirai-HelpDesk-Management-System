"""
Test Knowledge Module

ナレッジベース機能のテスト:
- 記事CRUD操作
- 検索とフィルタリング
- 可視性制御
- フィードバック機能
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import KnowledgeArticle, KnowledgeVisibility
from app.models.user import User, UserRole


@pytest.mark.knowledge
class TestKnowledgeArticleModel:
    """KnowledgeArticle モデルのテスト"""

    @pytest.mark.asyncio
    async def test_create_knowledge_article(self, db_session: AsyncSession, test_user_agent: User):
        """ナレッジ記事が作成できることを確認"""
        article = KnowledgeArticle(
            title="テスト記事",
            content="これはテスト記事です。",
            summary="テスト記事の概要",
            category="FAQ",
            tags="test,faq",
            visibility=KnowledgeVisibility.PUBLIC,
            article_type="faq",
            author_id=test_user_agent.id,
        )

        db_session.add(article)
        await db_session.commit()
        await db_session.refresh(article)

        assert article.id is not None
        assert article.title == "テスト記事"
        assert article.is_published is False  # デフォルトは非公開
        assert article.view_count == 0
        assert article.helpful_count == 0

    @pytest.mark.asyncio
    async def test_increment_view(self, db_session: AsyncSession, test_user_agent: User):
        """閲覧数がインクリメントできることを確認"""
        article = KnowledgeArticle(
            title="テスト記事",
            content="これはテスト記事です。",
            category="FAQ",
            article_type="faq",
            author_id=test_user_agent.id,
        )

        db_session.add(article)
        await db_session.commit()

        assert article.view_count == 0

        article.increment_view()
        await db_session.commit()

        assert article.view_count == 1


@pytest.mark.knowledge
class TestListKnowledgeArticles:
    """ナレッジ記事一覧取得のテスト"""

    @pytest.mark.asyncio
    async def test_list_articles_as_requester(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        test_user_agent: User,
        create_auth_headers,
    ):
        """一般ユーザーが公開記事のみ取得できることを確認"""
        # 公開記事を作成
        public_article = KnowledgeArticle(
            title="公開記事",
            content="公開記事の内容",
            category="FAQ",
            article_type="faq",
            visibility=KnowledgeVisibility.PUBLIC,
            is_published=True,
            author_id=test_user_agent.id,
        )
        db_session.add(public_article)

        # 内部記事を作成
        internal_article = KnowledgeArticle(
            title="内部記事",
            content="内部記事の内容",
            category="FAQ",
            article_type="faq",
            visibility=KnowledgeVisibility.INTERNAL,
            is_published=True,
            author_id=test_user_agent.id,
        )
        db_session.add(internal_article)

        await db_session.commit()

        headers = create_auth_headers(test_user_requester.id)
        response = await client.get("/api/knowledge", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # 公開記事のみ取得できる
        assert data["total"] == 1
        assert data["items"][0]["title"] == "公開記事"

    @pytest.mark.asyncio
    async def test_list_articles_as_agent(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_agent: User,
        create_auth_headers,
    ):
        """エージェントが全ての記事を取得できることを確認"""
        # 各可視性の記事を作成
        for visibility in [KnowledgeVisibility.PUBLIC, KnowledgeVisibility.DEPARTMENT, KnowledgeVisibility.INTERNAL]:
            article = KnowledgeArticle(
                title=f"{visibility.value}記事",
                content="記事内容",
                category="FAQ",
                article_type="faq",
                visibility=visibility,
                is_published=True,
                author_id=test_user_agent.id,
            )
            db_session.add(article)

        await db_session.commit()

        headers = create_auth_headers(test_user_agent.id)
        response = await client.get("/api/knowledge", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # 全ての記事が取得できる
        assert data["total"] == 3

    @pytest.mark.asyncio
    async def test_list_articles_with_category_filter(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_agent: User,
        create_auth_headers,
    ):
        """カテゴリフィルタが正しく動作することを確認"""
        # 異なるカテゴリの記事を作成
        faq_article = KnowledgeArticle(
            title="FAQ記事",
            content="FAQ内容",
            category="FAQ",
            article_type="faq",
            visibility=KnowledgeVisibility.PUBLIC,
            is_published=True,
            author_id=test_user_agent.id,
        )
        db_session.add(faq_article)

        procedure_article = KnowledgeArticle(
            title="手順書",
            content="手順内容",
            category="Procedure",
            article_type="procedure",
            visibility=KnowledgeVisibility.PUBLIC,
            is_published=True,
            author_id=test_user_agent.id,
        )
        db_session.add(procedure_article)

        await db_session.commit()

        headers = create_auth_headers(test_user_agent.id)
        response = await client.get("/api/knowledge?category=FAQ", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # FAQカテゴリのみ取得できる
        assert data["total"] == 1
        assert data["items"][0]["category"] == "FAQ"

    @pytest.mark.asyncio
    async def test_list_articles_with_search(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_agent: User,
        create_auth_headers,
    ):
        """検索機能が正しく動作することを確認"""
        # 記事を作成
        article1 = KnowledgeArticle(
            title="ログイン問題の解決方法",
            content="ログインできない場合の対処方法",
            category="FAQ",
            article_type="faq",
            visibility=KnowledgeVisibility.PUBLIC,
            is_published=True,
            author_id=test_user_agent.id,
        )
        db_session.add(article1)

        article2 = KnowledgeArticle(
            title="パスワードリセット手順",
            content="パスワードを忘れた場合の手順",
            category="Procedure",
            article_type="procedure",
            visibility=KnowledgeVisibility.PUBLIC,
            is_published=True,
            author_id=test_user_agent.id,
        )
        db_session.add(article2)

        await db_session.commit()

        headers = create_auth_headers(test_user_agent.id)
        response = await client.get("/api/knowledge?search=ログイン", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # ログインを含む記事のみ取得できる
        assert data["total"] == 1
        assert "ログイン" in data["items"][0]["title"]

    @pytest.mark.asyncio
    async def test_list_articles_published_only(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_agent: User,
        create_auth_headers,
    ):
        """公開記事のみが取得されることを確認"""
        # 公開記事
        published = KnowledgeArticle(
            title="公開記事",
            content="公開済み",
            category="FAQ",
            article_type="faq",
            visibility=KnowledgeVisibility.PUBLIC,
            is_published=True,
            author_id=test_user_agent.id,
        )
        db_session.add(published)

        # 下書き記事
        draft = KnowledgeArticle(
            title="下書き記事",
            content="未公開",
            category="FAQ",
            article_type="faq",
            visibility=KnowledgeVisibility.PUBLIC,
            is_published=False,
            author_id=test_user_agent.id,
        )
        db_session.add(draft)

        await db_session.commit()

        headers = create_auth_headers(test_user_agent.id)
        response = await client.get("/api/knowledge?published_only=true", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # 公開記事のみ取得できる
        assert data["total"] == 1
        assert data["items"][0]["is_published"] is True


@pytest.mark.knowledge
class TestCreateKnowledgeArticle:
    """ナレッジ記事作成のテスト"""

    @pytest.mark.asyncio
    async def test_create_article_as_agent(
        self,
        client: AsyncClient,
        test_user_agent: User,
        create_auth_headers,
    ):
        """エージェントが記事を作成できることを確認"""
        headers = create_auth_headers(test_user_agent.id)

        article_data = {
            "title": "新しいFAQ記事",
            "content": "これは新しいFAQ記事の内容です。詳細な説明が含まれています。",
            "summary": "FAQ記事の概要",
            "category": "FAQ",
            "tags": "test,faq",
            "visibility": "public",
            "article_type": "faq",
        }

        response = await client.post(
            "/api/knowledge",
            json=article_data,
            headers=headers,
        )

        assert response.status_code == 201
        data = response.json()

        assert data["title"] == article_data["title"]
        assert data["content"] == article_data["content"]
        assert data["category"] == article_data["category"]
        assert data["author_id"] == test_user_agent.id
        assert data["is_published"] is False  # デフォルトは下書き

    @pytest.mark.asyncio
    async def test_create_article_as_requester_forbidden(
        self,
        client: AsyncClient,
        test_user_requester: User,
        create_auth_headers,
    ):
        """一般ユーザーが記事を作成できないことを確認"""
        headers = create_auth_headers(test_user_requester.id)

        article_data = {
            "title": "新しい記事",
            "content": "記事の内容です。",
            "category": "FAQ",
            "article_type": "faq",
        }

        response = await client.post(
            "/api/knowledge",
            json=article_data,
            headers=headers,
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_create_article_validation_error(
        self,
        client: AsyncClient,
        test_user_agent: User,
        create_auth_headers,
    ):
        """バリデーションエラーが正しく処理されることを確認"""
        headers = create_auth_headers(test_user_agent.id)

        # タイトルが短すぎる
        article_data = {
            "title": "短い",
            "content": "短い内容",
            "category": "FAQ",
            "article_type": "faq",
        }

        response = await client.post(
            "/api/knowledge",
            json=article_data,
            headers=headers,
        )

        assert response.status_code == 422


@pytest.mark.knowledge
class TestGetKnowledgeArticle:
    """ナレッジ記事詳細取得のテスト"""

    @pytest.mark.asyncio
    async def test_get_article_and_increment_view(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_agent: User,
        test_user_requester: User,
        create_auth_headers,
    ):
        """記事取得時に閲覧数がインクリメントされることを確認"""
        article = KnowledgeArticle(
            title="テスト記事",
            content="記事の内容",
            category="FAQ",
            article_type="faq",
            visibility=KnowledgeVisibility.PUBLIC,
            is_published=True,
            author_id=test_user_agent.id,
        )
        db_session.add(article)
        await db_session.commit()
        await db_session.refresh(article)

        initial_views = article.view_count

        headers = create_auth_headers(test_user_requester.id)
        response = await client.get(f"/api/knowledge/{article.id}", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # 閲覧数がインクリメントされている
        assert data["view_count"] == initial_views + 1

    @pytest.mark.asyncio
    async def test_get_article_not_found(
        self,
        client: AsyncClient,
        test_user_agent: User,
        create_auth_headers,
    ):
        """存在しない記事の取得で404が返されることを確認"""
        headers = create_auth_headers(test_user_agent.id)
        response = await client.get("/api/knowledge/99999", headers=headers)

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_article_requester_access_denied(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_agent: User,
        test_user_requester: User,
        create_auth_headers,
    ):
        """一般ユーザーが内部記事にアクセスできないことを確認"""
        article = KnowledgeArticle(
            title="内部記事",
            content="内部記事の内容",
            category="FAQ",
            article_type="faq",
            visibility=KnowledgeVisibility.INTERNAL,
            is_published=True,
            author_id=test_user_agent.id,
        )
        db_session.add(article)
        await db_session.commit()

        headers = create_auth_headers(test_user_requester.id)
        response = await client.get(f"/api/knowledge/{article.id}", headers=headers)

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_unpublished_article_as_requester(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_agent: User,
        test_user_requester: User,
        create_auth_headers,
    ):
        """一般ユーザーが未公開記事にアクセスできないことを確認"""
        article = KnowledgeArticle(
            title="未公開記事",
            content="未公開記事の内容",
            category="FAQ",
            article_type="faq",
            visibility=KnowledgeVisibility.PUBLIC,
            is_published=False,
            author_id=test_user_agent.id,
        )
        db_session.add(article)
        await db_session.commit()

        headers = create_auth_headers(test_user_requester.id)
        response = await client.get(f"/api/knowledge/{article.id}", headers=headers)

        assert response.status_code == 404


@pytest.mark.knowledge
class TestKnowledgeFeedback:
    """ナレッジ記事フィードバックのテスト"""

    @pytest.mark.asyncio
    async def test_submit_helpful_feedback(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_agent: User,
        test_user_requester: User,
        create_auth_headers,
    ):
        """有用フィードバックが記録されることを確認"""
        article = KnowledgeArticle(
            title="テスト記事",
            content="記事の内容",
            category="FAQ",
            article_type="faq",
            visibility=KnowledgeVisibility.PUBLIC,
            is_published=True,
            author_id=test_user_agent.id,
        )
        db_session.add(article)
        await db_session.commit()
        await db_session.refresh(article)

        initial_helpful = article.helpful_count

        headers = create_auth_headers(test_user_requester.id)
        response = await client.post(
            f"/api/knowledge/{article.id}/feedback?helpful=true",
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()

        assert data["helpful"] is True

        # DBを再読み込みして確認
        await db_session.refresh(article)
        assert article.helpful_count == initial_helpful + 1

    @pytest.mark.asyncio
    async def test_submit_not_helpful_feedback(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_agent: User,
        test_user_requester: User,
        create_auth_headers,
    ):
        """無用フィードバックが記録されることを確認"""
        article = KnowledgeArticle(
            title="テスト記事",
            content="記事の内容",
            category="FAQ",
            article_type="faq",
            visibility=KnowledgeVisibility.PUBLIC,
            is_published=True,
            author_id=test_user_agent.id,
        )
        db_session.add(article)
        await db_session.commit()
        await db_session.refresh(article)

        initial_not_helpful = article.not_helpful_count

        headers = create_auth_headers(test_user_requester.id)
        response = await client.post(
            f"/api/knowledge/{article.id}/feedback?helpful=false",
            headers=headers,
        )

        assert response.status_code == 200

        # DBを再読み込みして確認
        await db_session.refresh(article)
        assert article.not_helpful_count == initial_not_helpful + 1

    @pytest.mark.asyncio
    async def test_submit_feedback_article_not_found(
        self,
        client: AsyncClient,
        test_user_requester: User,
        create_auth_headers,
    ):
        """存在しない記事へのフィードバックで404が返されることを確認"""
        headers = create_auth_headers(test_user_requester.id)
        response = await client.post(
            "/api/knowledge/99999/feedback?helpful=true",
            headers=headers,
        )

        assert response.status_code == 404
