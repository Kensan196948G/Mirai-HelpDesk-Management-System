# Mirai HelpDesk Management System - Audit Log Rotation Script
# 監査ログのローテーションスクリプト (Windows PowerShell用)
#
# 機能:
# - 10MBを超えるログファイルをローテーション
# - 日次で自動ローテーション (サイズに関わらず)
# - 90日以上経過したログを自動削除
# - ZIP圧縮によるストレージ効率化
#
# インストール手順 (タスクスケジューラに登録):
# 1. タスクスケジューラを開く
# 2. 「基本タスクの作成」を選択
# 3. 名前: "Mirai Audit Log Rotation"
# 4. トリガー: 毎日 午前2:00
# 5. 操作: プログラムの開始
#    - プログラム: powershell.exe
#    - 引数: -ExecutionPolicy Bypass -File "Z:\Mirai-HelpDesk-Management-System\scripts\windows\rotate-logs.ps1"
# 6. 完了
#
# 手動実行:
# powershell.exe -ExecutionPolicy Bypass -File "Z:\Mirai-HelpDesk-Management-System\scripts\windows\rotate-logs.ps1"

#Requires -Version 5.1

# エラー時は停止
$ErrorActionPreference = "Stop"

# スクリプトの絶対パスを取得
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)

# ログディレクトリ (環境変数または既定値)
$LogDir = if ($env:LOG_DIR) { $env:LOG_DIR } else { Join-Path $ProjectRoot "backend\logs" }

# 設定
$MaxFileSizeMB = 10           # ローテーションするファイルサイズ (MB)
$RetentionDays = 90           # ログ保持期間 (日)
$DateFormat = "yyyyMMdd"      # ローテーション後のファイル名に付与する日付形式

# ログ関数
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$Timestamp] [$Level] $Message"
}

# ログディレクトリの存在確認
if (-not (Test-Path $LogDir)) {
    Write-Log "Log directory not found: $LogDir" "WARN"
    Write-Log "Creating log directory..." "INFO"
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

Write-Log "Starting audit log rotation" "INFO"
Write-Log "Log directory: $LogDir" "INFO"

# ローテーション対象のファイルパターン
$LogPatterns = @("*.jsonl")

foreach ($Pattern in $LogPatterns) {
    $LogFiles = Get-ChildItem -Path $LogDir -Filter $Pattern -File

    foreach ($LogFile in $LogFiles) {
        $FilePath = $LogFile.FullName
        $FileName = $LogFile.Name
        $FileSize = $LogFile.Length / 1MB

        Write-Log "Checking file: $FileName (Size: $([math]::Round($FileSize, 2)) MB)" "INFO"

        # ローテーション条件: 10MB以上、または最終更新が24時間以上前
        $ShouldRotate = $false
        $Reason = ""

        if ($FileSize -ge $MaxFileSizeMB) {
            $ShouldRotate = $true
            $Reason = "File size exceeds ${MaxFileSizeMB}MB"
        }
        elseif ($LogFile.LastWriteTime -lt (Get-Date).AddDays(-1)) {
            $ShouldRotate = $true
            $Reason = "File not modified in 24 hours"
        }

        if ($ShouldRotate) {
            Write-Log "Rotating file: $FileName ($Reason)" "INFO"

            try {
                # ローテーション後のファイル名を生成
                $DateSuffix = Get-Date -Format $DateFormat
                $BaseName = [System.IO.Path]::GetFileNameWithoutExtension($FileName)
                $Extension = [System.IO.Path]::GetExtension($FileName)
                $RotatedName = "${BaseName}-${DateSuffix}${Extension}"
                $RotatedPath = Join-Path $LogDir $RotatedName

                # 同名ファイルが存在する場合は連番を付与
                $Counter = 1
                while (Test-Path $RotatedPath) {
                    $RotatedName = "${BaseName}-${DateSuffix}-${Counter}${Extension}"
                    $RotatedPath = Join-Path $LogDir $RotatedName
                    $Counter++
                }

                # ファイルをコピー (copytruncate の代わり)
                Copy-Item -Path $FilePath -Destination $RotatedPath -Force
                Write-Log "Copied to: $RotatedName" "INFO"

                # 元のファイルを切り捨て (アプリケーションがファイルハンドルを保持している場合も対応)
                Clear-Content -Path $FilePath -Force
                Write-Log "Truncated original file: $FileName" "INFO"

                # ZIP圧縮
                $ZipPath = $RotatedPath -replace $Extension, ".zip"
                Compress-Archive -Path $RotatedPath -DestinationPath $ZipPath -Force
                Write-Log "Compressed to: $(Split-Path -Leaf $ZipPath)" "INFO"

                # 圧縮後に元のローテーションファイルを削除
                Remove-Item -Path $RotatedPath -Force
                Write-Log "Removed uncompressed file: $RotatedName" "INFO"

            }
            catch {
                Write-Log "Failed to rotate file: $FileName - $_" "ERROR"
            }
        }
        else {
            Write-Log "No rotation needed for: $FileName" "INFO"
        }
    }
}

# 古いログファイルの削除 (90日以上前)
Write-Log "Checking for old log files (older than $RetentionDays days)..." "INFO"

$OldFiles = Get-ChildItem -Path $LogDir -Filter "*.zip" -File |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) }

if ($OldFiles.Count -gt 0) {
    foreach ($OldFile in $OldFiles) {
        try {
            Write-Log "Deleting old file: $($OldFile.Name) (Last modified: $($OldFile.LastWriteTime))" "INFO"
            Remove-Item -Path $OldFile.FullName -Force
        }
        catch {
            Write-Log "Failed to delete file: $($OldFile.Name) - $_" "ERROR"
        }
    }
    Write-Log "Deleted $($OldFiles.Count) old log file(s)" "INFO"
}
else {
    Write-Log "No old log files to delete" "INFO"
}

Write-Log "Audit log rotation completed" "INFO"

# 注意事項:
# 1. このスクリプトはタスクスケジューラで毎日午前2:00に実行することを推奨
# 2. 監査要件に応じて $RetentionDays を調整すること (最低2年 = 730日)
# 3. 本番環境では適切なログディレクトリパスを設定すること
# 4. スクリプトの実行には管理者権限は不要ですが、ログディレクトリへの書き込み権限が必要
