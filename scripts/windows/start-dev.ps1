<#
.SYNOPSIS
    Mirai HelpDesk - 開発環境起動スクリプト (Windows)
.DESCRIPTION
    開発環境のバックエンドAPIとフロントエンドWebUIを起動します。
    ポート: API=8000, WebUI=8080
.NOTES
    ブックマーク: [開発] Mirai HelpDesk
    URL: http://192.168.0.187:8080
#>

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$host.UI.RawUI.WindowTitle = "[開発] Mirai HelpDesk"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Mirai HelpDesk - 開発環境起動" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration (avoid $Host - it's a reserved variable in PowerShell)
$ApiHost = "192.168.0.187"
$ApiPort = 8000
$WebHost = "192.168.0.187"
$WebPort = 8080

# Check Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python が見つかりません。インストールしてください。" -ForegroundColor Red
    exit 1
}

# Setup Backend Virtual Environment
$VenvPath = Join-Path $ProjectRoot "backend\.venv-win"
$EnvFile = Join-Path $ProjectRoot "backend\.env.development"

if (-not (Test-Path $VenvPath)) {
    Write-Host "📦 Python仮想環境を作成中..." -ForegroundColor Yellow
    Push-Location (Join-Path $ProjectRoot "backend")
    python -m venv .venv-win
    Pop-Location
}

# Activate venv and install dependencies
$ActivateScript = Join-Path $VenvPath "Scripts\Activate.ps1"
if (Test-Path $ActivateScript) {
    . $ActivateScript

    # Install requirements if needed
    $RequirementsFile = Join-Path $ProjectRoot "backend\requirements.txt"
    if (Test-Path $RequirementsFile) {
        Write-Host "📦 依存関係をチェック中..." -ForegroundColor Yellow
        pip install -r $RequirementsFile -q
    }
}

# Copy environment file
if (Test-Path $EnvFile) {
    Copy-Item $EnvFile -Destination (Join-Path $ProjectRoot "backend\.env") -Force
    Write-Host "✅ 開発環境設定を適用しました" -ForegroundColor Green
}

# Start Backend
if (-not $FrontendOnly) {
    Write-Host ""
    Write-Host "🚀 バックエンドAPIを起動中..." -ForegroundColor Yellow
    Write-Host "   URL: http://${ApiHost}:${ApiPort}/api" -ForegroundColor Gray
    Write-Host "   Docs: http://${ApiHost}:${ApiPort}/api/docs" -ForegroundColor Gray

    $BackendJob = Start-Job -ScriptBlock {
        param($ProjectRoot, $BindHost, $Port, $VenvPath)
        Set-Location (Join-Path $ProjectRoot "backend")
        & (Join-Path $VenvPath "Scripts\python.exe") -m uvicorn app.main:app --host $BindHost --port $Port --reload
    } -ArgumentList $ProjectRoot, $ApiHost, $ApiPort, $VenvPath

    Write-Host "✅ バックエンドAPI起動完了 (JobId: $($BackendJob.Id))" -ForegroundColor Green
}

# Start Frontend
if (-not $BackendOnly) {
    Start-Sleep -Seconds 2
    Write-Host ""
    Write-Host "🌐 フロントエンドWebUIを起動中..." -ForegroundColor Yellow
    Write-Host "   URL: http://${WebHost}:${WebPort}" -ForegroundColor Gray

    $FrontendJob = Start-Job -ScriptBlock {
        param($ProjectRoot, $BindHost, $Port)
        Set-Location (Join-Path $ProjectRoot "frontend")
        python -m http.server $Port --bind $BindHost
    } -ArgumentList $ProjectRoot, $WebHost, $WebPort

    Write-Host "✅ フロントエンドWebUI起動完了 (JobId: $($FrontendJob.Id))" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ✅ 開発環境が起動しました！" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📌 アクセスURL:" -ForegroundColor White
Write-Host "   [開発] フロントエンド: http://${WebHost}:${WebPort}" -ForegroundColor Cyan
Write-Host "   [開発] API: http://${ApiHost}:${ApiPort}/api" -ForegroundColor Cyan
Write-Host "   [開発] API Docs: http://${ApiHost}:${ApiPort}/api/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "🛑 停止するには: .\scripts\windows\stop-all.ps1" -ForegroundColor Yellow
Write-Host ""

# Keep running
Write-Host "Ctrl+C で終了します..." -ForegroundColor Gray
try {
    while ($true) {
        Start-Sleep -Seconds 5

        # Check job status
        if ($BackendJob -and $BackendJob.State -eq "Failed") {
            Write-Host "❌ バックエンドが停止しました" -ForegroundColor Red
            Receive-Job $BackendJob
        }
        if ($FrontendJob -and $FrontendJob.State -eq "Failed") {
            Write-Host "❌ フロントエンドが停止しました" -ForegroundColor Red
            Receive-Job $FrontendJob
        }
    }
}
finally {
    Write-Host ""
    Write-Host "🛑 サービスを停止中..." -ForegroundColor Yellow
    if ($BackendJob) { Stop-Job $BackendJob -ErrorAction SilentlyContinue; Remove-Job $BackendJob -Force -ErrorAction SilentlyContinue }
    if ($FrontendJob) { Stop-Job $FrontendJob -ErrorAction SilentlyContinue; Remove-Job $FrontendJob -Force -ErrorAction SilentlyContinue }
    Write-Host "✅ 停止完了" -ForegroundColor Green
}
