"""
監査ログミドルウェア

すべてのAPI操作を自動的にJSON Lines形式で記録します。
認証ユーザー情報、リクエスト詳細、レスポンスステータスを含みます。
"""

import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.security import verify_token
from utils.audit_log import log_api_operation


class AuditMiddleware(BaseHTTPMiddleware):
    """
    すべてのAPI操作を監査ログに記録するミドルウェア

    記録内容:
    - ユーザー情報 (認証済みの場合)
    - HTTPメソッドとパス
    - リクエストIP、User-Agent
    - レスポンスステータスコード
    - 処理時間

    除外パス:
    - /health (ヘルスチェック)
    - /api/docs, /api/redoc (API ドキュメント)
    - /static/* (静的ファイル)
    """

    # ログ記録を除外するパス
    EXCLUDED_PATHS = {
        "/health",
        "/",
        "/api/docs",
        "/api/redoc",
        "/openapi.json",
    }

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        """リクエストを処理し、監査ログを記録"""

        # 除外パスのチェック
        if self._should_exclude(request.url.path):
            return await call_next(request)

        # 処理開始時刻
        start_time = time.time()

        # ユーザー情報の取得
        user_id, user_email = await self._get_user_info(request)

        # リクエスト情報の取得
        ip_address = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        method = request.method
        path = request.url.path

        # レスポンスの処理
        response = await call_next(request)

        # 処理時間の計算
        process_time = time.time() - start_time

        # 監査ログの記録
        if user_id:  # 認証済みユーザーのみログ記録
            self._log_request(
                user_id=user_id,
                user_email=user_email,
                method=method,
                path=path,
                status_code=response.status_code,
                ip_address=ip_address,
                user_agent=user_agent,
                process_time=process_time,
            )

        # レスポンスヘッダーに処理時間を追加
        response.headers["X-Process-Time"] = str(process_time)

        return response

    def _should_exclude(self, path: str) -> bool:
        """パスがログ記録から除外されるべきかチェック"""
        if path in self.EXCLUDED_PATHS:
            return True

        # 静的ファイル、OpenAPIドキュメントを除外
        if path.startswith(("/static/", "/api/docs", "/api/redoc")):
            return True

        return False

    async def _get_user_info(self, request: Request) -> tuple[int | None, str]:
        """リクエストから認証ユーザー情報を取得"""
        try:
            # Authorization ヘッダーからトークンを取得
            auth_header = request.headers.get("authorization", "")
            if not auth_header.startswith("Bearer "):
                return None, ""

            token = auth_header.split(" ")[1]
            payload = verify_token(token)

            if not payload:
                return None, ""

            # トークンペイロードからユーザー情報を取得
            # subject には "user_id:email" の形式を想定
            subject = payload.get("sub", "")
            if ":" in subject:
                user_id_str, email = subject.split(":", 1)
                return int(user_id_str), email

            return None, subject

        except Exception:
            # トークン検証失敗時はNoneを返す
            return None, ""

    def _get_client_ip(self, request: Request) -> str:
        """クライアントのIPアドレスを取得"""
        # X-Forwarded-For ヘッダーを優先 (プロキシ経由の場合)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # カンマ区切りの最初のIPを取得
            return forwarded_for.split(",")[0].strip()

        # X-Real-IP ヘッダーをチェック
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        # クライアントのIPアドレス
        if request.client:
            return request.client.host

        return "unknown"

    def _log_request(
        self,
        user_id: int,
        user_email: str,
        method: str,
        path: str,
        status_code: int,
        ip_address: str,
        user_agent: str,
        process_time: float,
    ) -> None:
        """API操作を監査ログに記録"""

        # アクション名の生成
        action = self._determine_action(method, path, status_code)

        # リソースタイプの抽出
        resource_type = self._extract_resource_type(path)

        # リソースIDの抽出
        resource_id = self._extract_resource_id(path)

        # 詳細情報
        details = {
            "method": method,
            "path": path,
            "status_code": status_code,
            "process_time_seconds": round(process_time, 3),
        }

        try:
            log_api_operation(
                user_id=user_id,
                user_email=user_email,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=ip_address,
                user_agent=user_agent,
                details=details,
            )
        except Exception as e:
            # ログ記録の失敗は処理を止めない
            print(f"[WARN] Failed to write audit log: {e}")

    def _determine_action(self, method: str, path: str, status_code: int) -> str:
        """HTTPメソッドとパスからアクション名を決定"""

        # エラーレスポンスの場合
        if status_code >= 400:
            return f"{method}_FAILED"

        # 標準的なRESTマッピング
        action_map = {
            "GET": "READ",
            "POST": "CREATE",
            "PUT": "UPDATE",
            "PATCH": "UPDATE",
            "DELETE": "DELETE",
        }

        base_action = action_map.get(method, method)

        # パスに基づく特殊なアクション
        if "/login" in path:
            return "LOGIN"
        elif "/logout" in path:
            return "LOGOUT"
        elif "/approve" in path:
            return "APPROVE"
        elif "/reject" in path:
            return "REJECT"
        elif "/assign" in path:
            return "ASSIGN"
        elif "/close" in path:
            return "CLOSE"
        elif "/resolve" in path:
            return "RESOLVE"

        return base_action

    def _extract_resource_type(self, path: str) -> str:
        """パスからリソースタイプを抽出"""

        # /api/tickets/123 -> "tickets"
        # /api/users -> "users"
        parts = path.strip("/").split("/")

        # /api/ プレフィックスをスキップ
        if len(parts) > 1 and parts[0] == "api":
            return parts[1]

        return parts[0] if parts else "unknown"

    def _extract_resource_id(self, path: str) -> int | None:
        """パスからリソースIDを抽出"""

        # /api/tickets/123/comments -> 123
        # /api/users/456 -> 456
        parts = path.strip("/").split("/")

        for part in parts:
            # 数値のみの部分をリソースIDとして扱う
            if part.isdigit():
                return int(part)

        return None
