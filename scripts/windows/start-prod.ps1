<#
.SYNOPSIS
    Mirai HelpDesk - 本番環境起動スクリプト (Windows)
.DESCRIPTION
    本番環境のバックエンドAPIとフロントエンドWebUIを起動します。
    ポート: API=8443, WebUI=443 (HTTPS)
.NOTES
    ブックマーク: [本番] Mirai HelpDesk
    URL: https://192.168.0.187
#>

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$host.UI.RawUI.WindowTitle = "[本番] Mirai HelpDesk"

Write-Host "============================================" -ForegroundColor Magenta
Write-Host "  Mirai HelpDesk - 本番環境起動" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""

# Configuration (avoid $Host - it's a reserved variable in PowerShell)
$ApiHost = "192.168.0.187"
$ApiPort = 8443
$WebHost = "192.168.0.187"
$WebPort = 443

# SSL Certificates
$CertPath = Join-Path $ProjectRoot "certificates\server.crt"
$KeyPath = Join-Path $ProjectRoot "certificates\server.key"

# Check SSL Certificates
if (-not (Test-Path $CertPath) -or -not (Test-Path $KeyPath)) {
    Write-Host "❌ SSL証明書が見つかりません。" -ForegroundColor Red
    Write-Host "   .\scripts\windows\generate-ssl.ps1 を実行してください。" -ForegroundColor Yellow
    exit 1
}

# Check Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python が見つかりません。インストールしてください。" -ForegroundColor Red
    exit 1
}

# Setup Backend Virtual Environment
$VenvPath = Join-Path $ProjectRoot "backend\.venv-win"
$EnvFile = Join-Path $ProjectRoot "backend\.env.production"

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

    $RequirementsFile = Join-Path $ProjectRoot "backend\requirements.txt"
    if (Test-Path $RequirementsFile) {
        Write-Host "📦 依存関係をチェック中..." -ForegroundColor Yellow
        pip install -r $RequirementsFile -q
    }
}

# Copy environment file
if (Test-Path $EnvFile) {
    Copy-Item $EnvFile -Destination (Join-Path $ProjectRoot "backend\.env") -Force
    Write-Host "✅ 本番環境設定を適用しました" -ForegroundColor Green
}

# Start Backend with HTTPS
if (-not $FrontendOnly) {
    Write-Host ""
    Write-Host "🚀 バックエンドAPI (HTTPS) を起動中..." -ForegroundColor Yellow
    Write-Host "   URL: https://${ApiHost}:${ApiPort}/api" -ForegroundColor Gray

    $BackendJob = Start-Job -ScriptBlock {
        param($ProjectRoot, $BindHost, $Port, $VenvPath, $CertPath, $KeyPath)
        Set-Location (Join-Path $ProjectRoot "backend")
        & (Join-Path $VenvPath "Scripts\python.exe") -m uvicorn app.main:app --host $BindHost --port $Port --ssl-certfile $CertPath --ssl-keyfile $KeyPath
    } -ArgumentList $ProjectRoot, $ApiHost, $ApiPort, $VenvPath, $CertPath, $KeyPath

    Write-Host "✅ バックエンドAPI起動完了 (JobId: $($BackendJob.Id))" -ForegroundColor Green
}

# Note: For production frontend with HTTPS, you need a proper web server like nginx
# This is a simplified version using Python's http.server (not recommended for production)
if (-not $BackendOnly) {
    Start-Sleep -Seconds 2
    Write-Host ""
    Write-Host "🌐 フロントエンドWebUI (HTTPS) を起動中..." -ForegroundColor Yellow
    Write-Host "   URL: https://${WebHost}" -ForegroundColor Gray
    Write-Host "   ⚠️ 本番環境ではnginx等の利用を推奨します" -ForegroundColor DarkYellow

    # For now, use Python's simple HTTPS server
    $FrontendJob = Start-Job -ScriptBlock {
        param($ProjectRoot, $BindHost, $Port, $CertPath, $KeyPath)
        Set-Location (Join-Path $ProjectRoot "frontend")
        # Create a simple HTTPS server script
        $ServerScript = @"
import http.server
import ssl
import os

os.chdir('$($ProjectRoot -replace '\\', '/')/frontend')

server_address = ('$BindHost', $Port)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('$($CertPath -replace '\\', '/')', '$($KeyPath -replace '\\', '/')')
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
httpd.serve_forever()
"@
        python -c $ServerScript
    } -ArgumentList $ProjectRoot, $WebHost, $WebPort, $CertPath, $KeyPath

    Write-Host "✅ フロントエンドWebUI起動完了 (JobId: $($FrontendJob.Id))" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "  ✅ 本番環境が起動しました！" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "📌 アクセスURL:" -ForegroundColor White
Write-Host "   [本番] フロントエンド: https://${WebHost}" -ForegroundColor Magenta
Write-Host "   [本番] API: https://${ApiHost}:${ApiPort}/api" -ForegroundColor Magenta
Write-Host ""
Write-Host "⚠️ 自己署名証明書のため、ブラウザで警告が表示されます" -ForegroundColor Yellow
Write-Host ""
Write-Host "🛑 停止するには: .\scripts\windows\stop-all.ps1" -ForegroundColor Yellow
Write-Host ""

# Keep running
Write-Host "Ctrl+C で終了します..." -ForegroundColor Gray
try {
    while ($true) {
        Start-Sleep -Seconds 5
    }
}
finally {
    Write-Host ""
    Write-Host "🛑 サービスを停止中..." -ForegroundColor Yellow
    if ($BackendJob) { Stop-Job $BackendJob -ErrorAction SilentlyContinue; Remove-Job $BackendJob -Force -ErrorAction SilentlyContinue }
    if ($FrontendJob) { Stop-Job $FrontendJob -ErrorAction SilentlyContinue; Remove-Job $FrontendJob -Force -ErrorAction SilentlyContinue }
    Write-Host "✅ 停止完了" -ForegroundColor Green
}
