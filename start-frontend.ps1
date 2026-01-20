# Mirai ヘルプデスク - フロントエンド起動スクリプト (Windows PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎨 Mirai ヘルプデスク - フロントエンド起動" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# IPアドレス取得
Write-Host "🔍 ネットワーク情報を取得中..." -ForegroundColor Yellow
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -eq "Dhcp" -or $_.PrefixOrigin -eq "Manual" }
$mainIP = $ipAddresses | Select-Object -First 1 -ExpandProperty IPAddress

if ($mainIP) {
    Write-Host "✅ IPアドレス: $mainIP" -ForegroundColor Green
} else {
    $mainIP = "localhost"
    Write-Host "⚠️ IPアドレスが取得できませんでした。localhostを使用します。" -ForegroundColor Yellow
}

Write-Host ""

# Node.jsバージョン確認
Write-Host "🔍 Node.js バージョン確認..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green

$npmVersion = npm --version
Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
Write-Host ""

# frontendディレクトリに移動
Set-Location frontend

# .envファイルの確認と更新
Write-Host "🔧 環境変数の設定..." -ForegroundColor Yellow
if (Test-Path .env) {
    Write-Host "✅ .env ファイルが見つかりました" -ForegroundColor Green
} else {
    Write-Host "⚠️ .env ファイルが見つかりません。.env.exampleをコピーします。" -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ .env ファイルを作成しました" -ForegroundColor Green
}

# バックエンドAPIのURLを動的に設定
$envContent = Get-Content .env -Raw
$envContent = $envContent -replace "VITE_API_BASE_URL=.*", "VITE_API_BASE_URL=http://${mainIP}:3000/api"
Set-Content .env $envContent
Write-Host "✅ API URL設定: http://${mainIP}:3000/api" -ForegroundColor Green

Write-Host ""

# node_modulesの確認
if (-not (Test-Path node_modules)) {
    Write-Host "📦 依存関係をインストール中..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 依存関係のインストール完了" -ForegroundColor Green
    } else {
        Write-Host "❌ 依存関係のインストールに失敗しました" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ 依存関係は既にインストール済み" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎉 フロントエンドサーバーを起動します" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 アクセスURL:" -ForegroundColor Cyan
Write-Host "  - http://localhost:5173" -ForegroundColor White
Write-Host "  - http://${mainIP}:5173" -ForegroundColor White
Write-Host ""
Write-Host "🔗 バックエンドAPI: http://${mainIP}:3000/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "🛑 停止するには Ctrl+C を押してください" -ForegroundColor Yellow
Write-Host ""

# 開発サーバー起動
npm run dev -- --host 0.0.0.0
