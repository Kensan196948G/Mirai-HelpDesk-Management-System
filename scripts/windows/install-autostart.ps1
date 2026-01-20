<#
.SYNOPSIS
    Mirai HelpDesk - Windows自動起動設定スクリプト
.DESCRIPTION
    タスクスケジューラにサービスを登録し、PC起動時に自動起動するようにします。
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "production")]
    [string]$Environment,
    
    [switch]$Remove
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

$TaskNameDev = "Mirai-HelpDesk-Development"
$TaskNameProd = "Mirai-HelpDesk-Production"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Mirai HelpDesk - 自動起動設定" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($Remove) {
    # Remove scheduled tasks
    if ($Environment -eq "development") {
        Write-Host "🗑 開発環境の自動起動を削除中..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $TaskNameDev -Confirm:$false -ErrorAction SilentlyContinue
        Write-Host "✅ 削除完了" -ForegroundColor Green
    }
    else {
        Write-Host "🗑 本番環境の自動起動を削除中..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $TaskNameProd -Confirm:$false -ErrorAction SilentlyContinue
        Write-Host "✅ 削除完了" -ForegroundColor Green
    }
    exit 0
}

# Create scheduled task
if ($Environment -eq "development") {
    $TaskName = $TaskNameDev
    $ScriptPath = Join-Path $ProjectRoot "scripts\windows\start-dev.ps1"
    $Description = "[開発] Mirai HelpDesk 開発環境自動起動"
}
else {
    $TaskName = $TaskNameProd
    $ScriptPath = Join-Path $ProjectRoot "scripts\windows\start-prod.ps1"
    $Description = "[本番] Mirai HelpDesk 本番環境自動起動"
}

Write-Host "📋 タスク名: $TaskName" -ForegroundColor White
Write-Host "📄 スクリプト: $ScriptPath" -ForegroundColor White
Write-Host ""

# Remove existing task if exists
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($ExistingTask) {
    Write-Host "⚠️ 既存のタスクを削除中..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create action
$Action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ScriptPath`"" `
    -WorkingDirectory $ProjectRoot

# Create trigger (at system startup)
$Trigger = New-ScheduledTaskTrigger -AtStartup

# Create principal (run as current user)
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

# Create settings
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Register task
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Description $Description

Write-Host ""
Write-Host "✅ 自動起動設定が完了しました" -ForegroundColor Green
Write-Host ""
Write-Host "📌 確認方法:" -ForegroundColor White
Write-Host "   タスクスケジューラを開いて '$TaskName' を確認してください" -ForegroundColor Gray
Write-Host ""
Write-Host "📌 削除方法:" -ForegroundColor White
Write-Host "   .\install-autostart.ps1 -Environment $Environment -Remove" -ForegroundColor Gray
Write-Host ""
