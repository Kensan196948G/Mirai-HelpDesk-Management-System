# Mirai ヘルプデスク - 統合起動スクリプト (Windows PowerShell)
# バックエンドとフロントエンドを同時起動

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🌟 Mirai ヘルプデスク - 統合起動" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# IPアドレス取得
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -eq "Dhcp" -or $_.PrefixOrigin -eq "Manual" }
$mainIP = $ipAddresses | Select-Object -First 1 -ExpandProperty IPAddress

if ($mainIP) {
    Write-Host "✅ IPアドレス: $mainIP" -ForegroundColor Green
} else {
    $mainIP = "localhost"
}

Write-Host ""
Write-Host "🚀 バックエンドとフロントエンドを並列起動します..." -ForegroundColor Yellow
Write-Host ""

# バックエンド起動（バックグラウンド）
Write-Host "🔧 バックエンドを起動中..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '.\start-backend.ps1'"

# 5秒待機（バックエンドの起動を待つ）
Start-Sleep -Seconds 5

# フロントエンド起動（バックグラウンド）
Write-Host "🎨 フロントエンドを起動中..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '.\start-frontend.ps1'"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 起動完了！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 アクセスURL:" -ForegroundColor Cyan
Write-Host "  🎨 フロントエンド:" -ForegroundColor Yellow
Write-Host "    - http://localhost:5173" -ForegroundColor White
Write-Host "    - http://${mainIP}:5173" -ForegroundColor White
Write-Host ""
Write-Host "  🔧 バックエンドAPI:" -ForegroundColor Yellow
Write-Host "    - http://localhost:3000/api" -ForegroundColor White
Write-Host "    - http://${mainIP}:3000/api" -ForegroundColor White
Write-Host ""
Write-Host "🔑 デフォルトログイン:" -ForegroundColor Cyan
Write-Host "  Email: admin@example.com" -ForegroundColor White
Write-Host "  Password: Admin123!" -ForegroundColor White
Write-Host ""
Write-Host "💡 各ウィンドウを閉じると対応するサーバーが停止します" -ForegroundColor Yellow
Write-Host ""
