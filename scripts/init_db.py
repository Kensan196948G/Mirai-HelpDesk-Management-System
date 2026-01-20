"""
Database Initialization Script

Creates all tables and seeds initial data based on environment.

Usage:
    python scripts/init_db.py [development|production]

    default: development
"""

import asyncio
import sys
import os
from pathlib import Path

# Windows環境でのUnicodeエンコーディング問題を解決
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except AttributeError:
        pass  # Python < 3.7

# Add parent directory to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Set environment
environment = sys.argv[1] if len(sys.argv) > 1 else "development"
if environment not in ["development", "production"]:
    print(f"❌ Invalid environment: {environment}")
    print("   Usage: python scripts/init_db.py [development|production]")
    sys.exit(1)

# Copy appropriate env file
env_file = backend_path / f".env.{environment}"
target_env = backend_path / ".env"
if env_file.exists() and not target_env.exists():
    import shutil
    try:
        shutil.copy(env_file, target_env)
        print(f"✅ 環境設定を適用: {environment}")
    except Exception as e:
        print(f"⚠️ 環境設定のコピーに失敗しました (手動でコピー済みであれば問題ありません): {e}")
elif target_env.exists():
    print(f"ℹ️ {target_env} は既に存在します。既存の設定を使用します。")

# Now import app modules
from app.database import engine, Base, async_session_factory
from app.models import *  # noqa: F401, F403
from app.core.security import get_password_hash


async def init_database():
    """Initialize database schema."""
    print("🔧 データベースを初期化中...")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print("✅ テーブルを作成しました")


async def seed_users():
    """Seed initial users."""
    print("👤 ユーザーをシード中...")
    
    async with async_session_factory() as session:
        from sqlalchemy import select
        
        result = await session.execute(select(User))
        if result.scalars().first():
            print("  ユーザーは既に存在します。スキップ...")
            return
        
        users = [
            User(
                email="admin@example.com",
                hashed_password=get_password_hash("admin123"),
                display_name="システム管理者",
                department="IT部門",
                role=UserRole.MANAGER,
            ),
            User(
                email="agent@example.com",
                hashed_password=get_password_hash("agent123"),
                display_name="田中 一郎",
                department="IT部門",
                role=UserRole.AGENT,
            ),
            User(
                email="operator@example.com",
                hashed_password=get_password_hash("operator123"),
                display_name="佐藤 花子",
                department="IT部門",
                role=UserRole.M365_OPERATOR,
            ),
            User(
                email="approver@example.com",
                hashed_password=get_password_hash("approver123"),
                display_name="鈴木 太郎",
                department="IT部門",
                role=UserRole.APPROVER,
            ),
            User(
                email="user@example.com",
                hashed_password=get_password_hash("user123"),
                display_name="山田 次郎",
                department="営業部",
                role=UserRole.REQUESTER,
            ),
            User(
                email="auditor@example.com",
                hashed_password=get_password_hash("auditor123"),
                display_name="監査担当者",
                department="監査部",
                role=UserRole.AUDITOR,
            ),
        ]
        
        for user in users:
            session.add(user)
        
        await session.commit()
        print(f"  ✅ {len(users)} ユーザーを作成しました")


async def seed_sample_tickets():
    """Seed sample tickets for development."""
    print("🎫 サンプルチケットをシード中...")
    
    async with async_session_factory() as session:
        from sqlalchemy import select
        from datetime import datetime, timezone
        
        result = await session.execute(select(Ticket))
        if result.scalars().first():
            print("  チケットは既に存在します。スキップ...")
            return
        
        # Get users
        users_result = await session.execute(select(User))
        users = {u.email: u for u in users_result.scalars().all()}
        
        requester = users.get("user@example.com")
        agent = users.get("agent@example.com")
        
        if not requester:
            print("  ⚠️ ユーザーが見つかりません")
            return
        
        tickets = [
            Ticket(
                ticket_number="TKT-2026-0001",
                type=TicketType.INCIDENT,
                category=TicketCategory.EMAIL,
                subject="メールが送信できません",
                description="Outlookでメールを送信しようとするとエラーが発生します。\n「サーバーに接続できません」と表示されます。",
                requester_id=requester.id,
                assignee_id=agent.id if agent else None,
                status=TicketStatus.IN_PROGRESS,
                priority=TicketPriority.P2,
                impact=2,
                urgency=2,
            ),
            Ticket(
                ticket_number="TKT-2026-0002",
                type=TicketType.SERVICE_REQUEST,
                category=TicketCategory.LICENSE,
                subject="新規ライセンス申請 - Microsoft Visio",
                description="プロジェクト管理のために Microsoft Visio のライセンスを申請します。",
                requester_id=requester.id,
                status=TicketStatus.PENDING_APPROVAL,
                priority=TicketPriority.P3,
                impact=4,
                urgency=3,
            ),
            Ticket(
                ticket_number="TKT-2026-0003",
                type=TicketType.INCIDENT,
                category=TicketCategory.TEAMS,
                subject="Teamsの会議に参加できない",
                description="チームの定例会議に参加しようとすると「会議が見つかりません」と表示されます。",
                requester_id=requester.id,
                status=TicketStatus.NEW,
                priority=TicketPriority.P1,
                impact=2,
                urgency=1,
            ),
            Ticket(
                ticket_number="TKT-2026-0004",
                type=TicketType.M365_REQUEST,
                category=TicketCategory.ACCOUNT,
                subject="共有メールボックス作成依頼",
                description="marketing-info@company.com の共有メールボックスを作成してください。",
                requester_id=requester.id,
                status=TicketStatus.PENDING_CHANGE,
                priority=TicketPriority.P3,
                impact=3,
                urgency=3,
            ),
            Ticket(
                ticket_number="TKT-2026-0005",
                type=TicketType.INCIDENT,
                category=TicketCategory.NETWORK,
                subject="VPN接続が不安定",
                description="自宅から VPN 接続すると頻繁に切断されます。再接続が必要になります。",
                requester_id=requester.id,
                assignee_id=agent.id if agent else None,
                status=TicketStatus.RESOLVED,
                priority=TicketPriority.P2,
                impact=3,
                urgency=2,
                resolved_at=datetime.now(timezone.utc),
            ),
        ]
        
        for ticket in tickets:
            session.add(ticket)
        
        await session.commit()
        print(f"  ✅ {len(tickets)} チケットを作成しました")


async def seed_sla_policies():
    """Seed default SLA policies."""
    print("⏱️ SLAポリシーをシード中...")

    async with async_session_factory() as session:
        from sqlalchemy import select

        result = await session.execute(select(SLAPolicy))
        if result.scalars().first():
            print("  SLAポリシーは既に存在します。スキップ...")
            return

        # デフォルトSLAポリシー
        # P1（全社停止）: 初動 15分 / 暫定復旧 2h / 恒久対応 24h
        # P2（部門影響）: 初動 1h / 復旧 8h
        # P3（個人）: 初動 4h / 解決 3営業日(24h)
        # P4（問い合わせ）: 初動 1営業日(8h) / 解決 5営業日(40h)

        policies = [
            SLAPolicy(
                name="P1: クリティカル（全社停止）",
                description="全社的なシステム停止やセキュリティインシデント。即座の対応が必要。",
                priority=TicketPriority.P1,
                response_time_hours=0.25,  # 15分
                resolution_time_hours=24.0,  # 24時間（恒久対応）
                is_active=True,
            ),
            SLAPolicy(
                name="P2: 高（部門影響）",
                description="部門や複数ユーザーに影響する問題。迅速な対応が必要。",
                priority=TicketPriority.P2,
                response_time_hours=1.0,  # 1時間
                resolution_time_hours=8.0,  # 8時間
                is_active=True,
            ),
            SLAPolicy(
                name="P3: 中（個人影響）",
                description="個人ユーザーの業務に影響する問題。通常対応。",
                priority=TicketPriority.P3,
                response_time_hours=4.0,  # 4時間
                resolution_time_hours=24.0,  # 3営業日(24h)
                is_active=True,
            ),
            SLAPolicy(
                name="P4: 低（問い合わせ）",
                description="一般的な問い合わせや情報提供要求。",
                priority=TicketPriority.P4,
                response_time_hours=8.0,  # 1営業日(8h)
                resolution_time_hours=40.0,  # 5営業日(40h)
                is_active=True,
            ),
        ]

        for policy in policies:
            session.add(policy)

        await session.commit()
        print(f"  ✅ {len(policies)} SLAポリシーを作成しました")


async def seed_knowledge():
    """Seed sample knowledge articles."""
    print("📚 ナレッジ記事をシード中...")

    async with async_session_factory() as session:
        from sqlalchemy import select

        result = await session.execute(select(KnowledgeArticle))
        if result.scalars().first():
            print("  ナレッジ記事は既に存在します。スキップ...")
            return

        users_result = await session.execute(
            select(User).where(User.email == "admin@example.com")
        )
        admin = users_result.scalar_one_or_none()

        if not admin:
            print("  ⚠️ 管理者ユーザーが見つかりません")
            return

        articles = [
            KnowledgeArticle(
                title="パスワードのリセット方法",
                content="## 概要\nパスワードを忘れた場合のリセット手順です。\n\n## 手順\n1. ログイン画面で「パスワードを忘れた場合」をクリック\n2. 登録済みメールアドレスを入力\n3. 届いたメールのリンクをクリック\n4. 新しいパスワードを設定",
                summary="パスワードリセットの手順を説明します",
                category="account",
                tags="パスワード,リセット,ログイン",
                visibility=KnowledgeVisibility.PUBLIC,
                article_type="procedure",
                is_published=True,
                author_id=admin.id,
            ),
            KnowledgeArticle(
                title="Microsoft Teams の利用開始ガイド",
                content="## 概要\nMicrosoft Teams を初めて使う方向けのガイドです。\n\n## 基本操作\n- チャット: 1対1のメッセージ\n- チャネル: チーム内での会話\n- 会議: ビデオ通話や画面共有",
                summary="Teams の基本的な使い方を解説",
                category="teams",
                tags="Teams,Office365,コミュニケーション",
                visibility=KnowledgeVisibility.PUBLIC,
                article_type="faq",
                is_published=True,
                author_id=admin.id,
            ),
            KnowledgeArticle(
                title="VPN接続トラブルシューティング",
                content="## 症状\nVPN接続ができない、または頻繁に切断される\n\n## 確認事項\n1. インターネット接続を確認\n2. VPNクライアントを再起動\n3. ファイアウォール設定を確認",
                summary="VPN接続の問題解決方法",
                category="network",
                tags="VPN,ネットワーク,接続",
                visibility=KnowledgeVisibility.PUBLIC,
                article_type="workaround",
                is_published=True,
                author_id=admin.id,
            ),
        ]

        for article in articles:
            session.add(article)

        await session.commit()
        print(f"  ✅ {len(articles)} 記事を作成しました")


async def main():
    """Main initialization function."""
    print("=" * 50)
    print(f"Mirai HelpDesk - データベース初期化 [{environment.upper()}]")
    print("=" * 50)
    
    # Ensure data directories exist
    data_dir = Path(__file__).parent.parent / "data" / environment
    uploads_dir = data_dir / "uploads"
    data_dir.mkdir(parents=True, exist_ok=True)
    uploads_dir.mkdir(exist_ok=True)
    
    await init_database()
    await seed_users()
    await seed_sla_policies()  # SLAポリシーは全環境で必須

    # Only seed sample data in development
    if environment == "development":
        await seed_sample_tickets()
        await seed_knowledge()
        print("\n📋 サンプルデータを作成しました")
    else:
        print("\n📋 本番環境: サンプルデータはスキップしました")
    
    print("=" * 50)
    print("✅ 初期化完了!")
    print("=" * 50)
    
    if environment == "development":
        print("\n📋 テストアカウント:")
        print("  - admin@example.com / admin123 (Manager)")
        print("  - agent@example.com / agent123 (Agent)")
        print("  - user@example.com / user123 (Requester)")
    else:
        print("\n⚠️ 本番環境では管理者アカウントでログインして")
        print("   実際のユーザーを作成してください。")


if __name__ == "__main__":
    asyncio.run(main())
