"""
Pytest Configuration and Shared Fixtures

テストデータベースの管理と共通フィクスチャを提供する。
"""

import asyncio
from collections.abc import AsyncGenerator
from typing import Any

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.sla_policy import SLAPolicy
from app.models.ticket import TicketPriority


# テスト用データベースURL（インメモリSQLite）
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    """
    セッションスコープのイベントループを作成する。

    pytest-asyncioがセッションスコープのasyncフィクスチャをサポートするために必要。
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    """
    テスト用の非同期SQLAlchemyエンジンを作成する。

    各テスト関数で独立したインメモリデータベースを使用。
    """
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        future=True,
    )

    # テーブルを作成
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # クリーンアップ
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def test_session_factory(test_engine):
    """
    テスト用のセッションファクトリを作成する。
    """
    session_factory = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    return session_factory


@pytest_asyncio.fixture(scope="function")
async def db_session(test_session_factory) -> AsyncGenerator[AsyncSession, None]:
    """
    テスト用のデータベースセッションを提供する。

    各テストで独立したトランザクションを使用。
    """
    async with test_session_factory() as session:
        yield session
        await session.rollback()  # テスト後にロールバック


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    テスト用のHTTPクライアントを提供する。

    FastAPIアプリケーションのエンドポイントをテストするために使用。
    """
    from httpx import ASGITransport

    # データベース依存関係をオーバーライド
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    # クリーンアップ
    app.dependency_overrides.clear()


# ============================================================================
# テストユーザーフィクスチャ
# ============================================================================

@pytest_asyncio.fixture
async def test_user_requester(db_session: AsyncSession) -> User:
    """
    テスト用の一般ユーザー（Requester）を作成する。
    """
    user = User(
        email="requester@example.com",
        hashed_password=get_password_hash("password123"),
        display_name="一般ユーザー",
        department="営業部",
        role=UserRole.REQUESTER,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_user_agent(db_session: AsyncSession) -> User:
    """
    テスト用のエージェント（Agent）を作成する。
    """
    user = User(
        email="agent@example.com",
        hashed_password=get_password_hash("password123"),
        display_name="サポート担当",
        department="IT部",
        role=UserRole.AGENT,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_user_m365_operator(db_session: AsyncSession) -> User:
    """
    テスト用のM365オペレーター（M365 Operator）を作成する。
    """
    user = User(
        email="operator@example.com",
        hashed_password=get_password_hash("password123"),
        display_name="M365担当",
        department="IT部",
        role=UserRole.M365_OPERATOR,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_user_approver(db_session: AsyncSession) -> User:
    """
    テスト用の承認者（Approver）を作成する。
    """
    user = User(
        email="approver@example.com",
        hashed_password=get_password_hash("password123"),
        display_name="承認者",
        department="IT部",
        role=UserRole.APPROVER,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_user_manager(db_session: AsyncSession) -> User:
    """
    テスト用の管理者（Manager）を作成する。
    """
    user = User(
        email="manager@example.com",
        hashed_password=get_password_hash("password123"),
        display_name="システム管理者",
        department="IT部",
        role=UserRole.MANAGER,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


# ============================================================================
# SLAポリシーフィクスチャ
# ============================================================================

@pytest_asyncio.fixture
async def test_sla_policies(db_session: AsyncSession) -> list[SLAPolicy]:
    """
    テスト用のSLAポリシーを作成する。
    """
    policies = [
        SLAPolicy(
            name="P1 - クリティカル",
            description="全社停止レベル",
            priority=TicketPriority.P1,
            response_time_hours=0.25,  # 15分
            resolution_time_hours=2.0,
            is_active=True,
        ),
        SLAPolicy(
            name="P2 - 高",
            description="部門影響レベル",
            priority=TicketPriority.P2,
            response_time_hours=1.0,
            resolution_time_hours=8.0,
            is_active=True,
        ),
        SLAPolicy(
            name="P3 - 中",
            description="個人影響レベル",
            priority=TicketPriority.P3,
            response_time_hours=4.0,
            resolution_time_hours=24.0,
            is_active=True,
        ),
        SLAPolicy(
            name="P4 - 低",
            description="問い合わせレベル",
            priority=TicketPriority.P4,
            response_time_hours=8.0,
            resolution_time_hours=40.0,
            is_active=True,
        ),
    ]

    for policy in policies:
        db_session.add(policy)

    await db_session.commit()

    for policy in policies:
        await db_session.refresh(policy)

    return policies


# ============================================================================
# 認証トークンヘルパー
# ============================================================================

@pytest.fixture
def auth_headers(test_user_requester: User) -> dict[str, str]:
    """
    認証ヘッダーを生成する。

    テストでAPIエンドポイントにアクセスする際に使用。
    """
    from app.core.security import create_access_token

    token = create_access_token(subject=str(test_user_requester.id))
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def create_auth_headers():
    """
    任意のユーザーIDに対する認証ヘッダーを生成する関数を返す。
    """
    from app.core.security import create_access_token

    def _create_headers(user_id: int) -> dict[str, str]:
        token = create_access_token(subject=str(user_id))
        return {"Authorization": f"Bearer {token}"}

    return _create_headers


# ============================================================================
# M365 Mocks
# ============================================================================

@pytest.fixture
def mock_graph_client(monkeypatch):
    """
    GraphClient のモックを提供する。
    """
    from unittest.mock import AsyncMock, MagicMock

    mock_client = AsyncMock()
    mock_client.get_user = AsyncMock(return_value={
        "id": "test-user-id",
        "userPrincipalName": "test@example.com",
        "displayName": "Test User",
        "mail": "test@example.com",
        "jobTitle": "Developer",
        "department": "IT",
        "accountEnabled": True,
    })
    mock_client.search_users = AsyncMock(return_value=[])
    mock_client.list_available_licenses = AsyncMock(return_value=[
        {
            "skuId": "sku-1",
            "skuPartNumber": "ENTERPRISEPACK",
            "consumedUnits": 10,
            "prepaidUnits": {"enabled": 50},
        }
    ])
    mock_client.get_user_licenses = AsyncMock(return_value=[])
    mock_client.assign_license = AsyncMock(return_value={"success": True})
    mock_client.remove_license = AsyncMock(return_value={"success": True})
    mock_client.reset_password = AsyncMock(return_value={"success": True})
    mock_client.list_authentication_methods = AsyncMock(return_value=[])
    mock_client.delete_authentication_method = AsyncMock(return_value={"success": True})
    mock_client.get_group = AsyncMock(return_value={"id": "group-1", "displayName": "Test Group"})
    mock_client.add_group_member = AsyncMock(return_value={"success": True})
    mock_client.remove_group_member = AsyncMock(return_value={"success": True})
    mock_client.list_group_members = AsyncMock(return_value=[])
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    return mock_client


@pytest.fixture
def mock_m365_operations(mock_graph_client, monkeypatch):
    """
    M365Operations のモックを提供する。
    """
    from unittest.mock import AsyncMock, MagicMock, patch
    from app.m365.operations import M365Operations

    # GraphClient を mock に置き換え
    def mock_get_client(self):
        return mock_graph_client

    monkeypatch.setattr(M365Operations, "_get_client", mock_get_client)

    return M365Operations
