<#
.SYNOPSIS
    Mirai HelpDesk - 全サービス停止スクリプト (Windows)
.DESCRIPTION
    実行中の開発環境・本番環境のサービスを全て停止します。
#>

$ErrorActionPreference = "SilentlyContinue"

Write-Host "============================================" -ForegroundColor Red
Write-Host "  Mirai HelpDesk - サービス停止" -ForegroundColor Red
Write-Host "============================================" -ForegroundColor Red
Write-Host ""

# Stop all PowerShell jobs
$Jobs = Get-Job | Where-Object { $_.State -eq "Running" }
if ($Jobs) {
    Write-Host "🛑 実行中のジョブを停止中..." -ForegroundColor Yellow
    $Jobs | ForEach-Object {
        Write-Host "   停止: $($_.Name) (Id: $($_.Id))" -ForegroundColor Gray
        Stop-Job $_ -ErrorAction SilentlyContinue
        Remove-Job $_ -Force -ErrorAction SilentlyContinue
    }
}

# Stop uvicorn processes
$UvicornProcs = Get-Process -Name "python" -ErrorAction SilentlyContinue | 
    Where-Object { $_.CommandLine -like "*uvicorn*" }
if ($UvicornProcs) {
    Write-Host "🛑 uvicornプロセスを停止中..." -ForegroundColor Yellow
    $UvicornProcs | ForEach-Object {
        Write-Host "   停止: PID $($_.Id)" -ForegroundColor Gray
        Stop-Process $_ -Force -ErrorAction SilentlyContinue
    }
}

# Stop Python http.server processes on specific ports
$Ports = @(8000, 8080, 8443, 443)
foreach ($Port in $Ports) {
    $Connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($Connection) {
        $ProcessId = $Connection.OwningProcess
        $Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($Process) {
            Write-Host "🛑 ポート ${Port} を使用中のプロセスを停止中... (PID: $ProcessId)" -ForegroundColor Yellow
            Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host ""
Write-Host "✅ 全サービスを停止しました" -ForegroundColor Green
Write-Host ""
