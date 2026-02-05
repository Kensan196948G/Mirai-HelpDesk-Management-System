#!/usr/bin/env python3
"""SQLiteデータベースにテストユーザーを作成"""

import sqlite3
from passlib.context import CryptContext
from datetime import datetime
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# データベース接続
conn = sqlite3.connect("data/helpdesk.db")
cursor = conn.cursor()

# パスワードハッシュ生成
password_hash = pwd_context.hash("password123")

# ユーザーID
user_id = "9057e96f-7dd1-45c1-b4a0-e757bb18a7a3"

# ユーザー作成（存在する場合は更新）
cursor.execute("""
    INSERT OR REPLACE INTO users (
        user_id, email, display_name, department, role, status,
        password_hash, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (
    user_id,
    "agent@example.com",
    "エージェント",
    "IT部門",
    "agent",
    "active",
    password_hash,
    datetime.now().isoformat(),
    datetime.now().isoformat()
))

conn.commit()
conn.close()

print("✅ ユーザー作成完了:")
print(f"   メール: agent@example.com")
print(f"   パスワード: password123")
print(f"   ロール: agent")
