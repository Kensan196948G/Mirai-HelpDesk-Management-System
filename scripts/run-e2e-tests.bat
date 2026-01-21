@echo off
REM Mirai HelpDesk - E2E Test Runner (Windows)
REM このスクリプトはバックエンド、フロントエンドを起動してE2Eテストを実行します

setlocal enabledelayedexpansion

echo ========================================
echo Mirai HelpDesk - E2E Test Runner
echo ========================================

REM プロジェクトルートディレクトリ
set "PROJECT_ROOT=%~dp0.."
cd /d "%PROJECT_ROOT%"

REM 1. 依存関係のチェック
echo.
echo [1/6] Checking dependencies...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed
    exit /b 1
)

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Python is not installed
    exit /b 1
)

for /f "delims=" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "delims=" %%i in ('python --version') do set PYTHON_VERSION=%%i

echo Node.js: !NODE_VERSION!
echo Python: !PYTHON_VERSION!

REM 2. ログディレクトリの作成
if not exist "%PROJECT_ROOT%\logs" mkdir "%PROJECT_ROOT%\logs"

REM 3. データベースの初期化
echo.
echo [2/6] Initializing test database...
cd /d "%PROJECT_ROOT%\backend"

if not exist "data" mkdir "data"

if exist "seed_sla.py" (
    echo Seeding SLA policies...
    python seed_sla.py
) else (
    echo Warning: seed_sla.py not found, skipping...
)

REM 4. バックエンドサーバーの起動
echo.
echo [3/6] Starting backend server...
cd /d "%PROJECT_ROOT%\backend"

set DATABASE_URL=sqlite:///./data/test.db
set ENVIRONMENT=test
set DEBUG=true
set SECRET_KEY=test-secret-key-for-e2e

start /b cmd /c "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > ..\logs\backend-test.log 2>&1"
timeout /t 3 /nobreak >nul

echo Waiting for backend to be ready...
set BACKEND_READY=0
for /l %%i in (1,1,30) do (
    curl -sf http://127.0.0.1:8000/health >nul 2>&1
    if !errorlevel! equ 0 (
        echo Backend is ready!
        set BACKEND_READY=1
        goto :backend_ready
    )
    timeout /t 1 /nobreak >nul
)

:backend_ready
if !BACKEND_READY! equ 0 (
    echo Error: Backend failed to start
    type "%PROJECT_ROOT%\logs\backend-test.log"
    goto :cleanup
)

REM 5. フロントエンドサーバーの起動
echo.
echo [4/6] Starting frontend server...
cd /d "%PROJECT_ROOT%\frontend"

start /b cmd /c "python -m http.server 8080 > ..\logs\frontend-test.log 2>&1"
timeout /t 2 /nobreak >nul

echo Waiting for frontend to be ready...
set FRONTEND_READY=0
for /l %%i in (1,1,15) do (
    curl -sf http://127.0.0.1:8080 >nul 2>&1
    if !errorlevel! equ 0 (
        echo Frontend is ready!
        set FRONTEND_READY=1
        goto :frontend_ready
    )
    timeout /t 1 /nobreak >nul
)

:frontend_ready
if !FRONTEND_READY! equ 0 (
    echo Error: Frontend failed to start
    type "%PROJECT_ROOT%\logs\frontend-test.log"
    goto :cleanup
)

REM 6. Playwrightテストの実行
echo.
echo [5/6] Running Playwright E2E tests...
cd /d "%PROJECT_ROOT%"

set API_BASE_URL=http://127.0.0.1:8000
set FRONTEND_URL=http://127.0.0.1:8080

REM Playwright browsers のインストール確認
if not exist "%USERPROFILE%\AppData\Local\ms-playwright" (
    echo Installing Playwright browsers...
    call npx playwright install
)

REM テスト実行
call npm run test:e2e
set TEST_EXIT_CODE=!errorlevel!

REM 7. レポート表示
echo.
echo [6/6] Test execution complete!

if !TEST_EXIT_CODE! equ 0 (
    echo All tests passed!
) else (
    echo Some tests failed (exit code: !TEST_EXIT_CODE!)
)

echo.
echo View test report:
echo   npx playwright show-report
echo.
echo Logs location:
echo   Backend:  %PROJECT_ROOT%\logs\backend-test.log
echo   Frontend: %PROJECT_ROOT%\logs\frontend-test.log

REM 8. クリーンアップ
:cleanup
echo.
echo Cleaning up...

REM バックエンドサーバーの停止
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM フロントエンドサーバーの停止
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Cleanup complete.

exit /b !TEST_EXIT_CODE!
