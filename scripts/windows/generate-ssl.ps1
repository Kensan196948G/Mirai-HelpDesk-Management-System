<#
.SYNOPSIS
    Mirai HelpDesk - SSL証明書生成スクリプト (Windows)
.DESCRIPTION
    自己署名SSL証明書を生成します。
#>

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$CertDir = Join-Path $ProjectRoot "certificates"

Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  Mirai HelpDesk - SSL証明書生成" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""

# Check if OpenSSL is available
$OpenSSL = Get-Command openssl -ErrorAction SilentlyContinue
if (-not $OpenSSL) {
    Write-Host "⚠️ OpenSSLが見つかりません。PowerShellで証明書を生成します..." -ForegroundColor Yellow
    
    # Create self-signed certificate using PowerShell
    $Cert = New-SelfSignedCertificate `
        -DnsName "192.168.0.187", "localhost" `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -NotAfter (Get-Date).AddYears(2) `
        -FriendlyName "Mirai HelpDesk SSL"
    
    # Export certificate
    $CertPath = Join-Path $CertDir "server.crt"
    $KeyPath = Join-Path $CertDir "server.key"
    $PfxPath = Join-Path $CertDir "server.pfx"
    
    # Export as PFX first
    $Password = ConvertTo-SecureString -String "mirai-helpdesk" -Force -AsPlainText
    Export-PfxCertificate -Cert $Cert -FilePath $PfxPath -Password $Password | Out-Null
    
    Write-Host "✅ 証明書をエクスポートしました: $PfxPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️ OpenSSLをインストールして以下を実行し、.crtと.keyに変換してください:" -ForegroundColor Yellow
    Write-Host "   openssl pkcs12 -in certificates\server.pfx -clcerts -nokeys -out certificates\server.crt" -ForegroundColor Gray
    Write-Host "   openssl pkcs12 -in certificates\server.pfx -nocerts -nodes -out certificates\server.key" -ForegroundColor Gray
}
else {
    # Use OpenSSL to generate certificate
    $CertPath = Join-Path $CertDir "server.crt"
    $KeyPath = Join-Path $CertDir "server.key"
    
    Write-Host "🔐 OpenSSLで自己署名証明書を生成中..." -ForegroundColor Yellow
    
    # Generate private key and certificate
    $OpenSSLArgs = @(
        "req", "-x509", "-nodes", "-days", "730",
        "-newkey", "rsa:2048",
        "-keyout", $KeyPath,
        "-out", $CertPath,
        "-subj", "/CN=192.168.0.187/O=Mirai HelpDesk/C=JP",
        "-addext", "subjectAltName=IP:192.168.0.187,DNS:localhost"
    )
    
    & openssl @OpenSSLArgs 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SSL証明書を生成しました" -ForegroundColor Green
        Write-Host "   証明書: $CertPath" -ForegroundColor Gray
        Write-Host "   秘密鍵: $KeyPath" -ForegroundColor Gray
    }
    else {
        Write-Host "❌ 証明書の生成に失敗しました" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  ✅ SSL証明書の準備が完了しました" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Yellow
