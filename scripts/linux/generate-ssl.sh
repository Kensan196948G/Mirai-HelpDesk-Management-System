#!/bin/bash
#
# Mirai HelpDesk - SSL証明書生成スクリプト (Linux)
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
CERT_DIR="$PROJECT_ROOT/certificates"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}  Mirai HelpDesk - SSL証明書生成${NC}"
echo -e "${YELLOW}============================================${NC}"
echo ""

# Check if OpenSSL is available
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ OpenSSL が見つかりません。インストールしてください。${NC}"
    echo -e "   sudo apt install openssl  # Debian/Ubuntu"
    echo -e "   sudo yum install openssl  # CentOS/RHEL"
    exit 1
fi

# Create certificates directory
mkdir -p "$CERT_DIR"

CERT_PATH="$CERT_DIR/server.crt"
KEY_PATH="$CERT_DIR/server.key"

echo -e "${YELLOW}🔐 自己署名証明書を生成中...${NC}"

# Generate private key and certificate
openssl req -x509 -nodes -days 730 \
    -newkey rsa:2048 \
    -keyout "$KEY_PATH" \
    -out "$CERT_PATH" \
    -subj "/CN=192.168.0.187/O=Mirai HelpDesk/C=JP" \
    -addext "subjectAltName=IP:192.168.0.187,DNS:localhost" \
    2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SSL証明書を生成しました${NC}"
    echo -e "   証明書: $CERT_PATH"
    echo -e "   秘密鍵: $KEY_PATH"
else
    echo -e "${RED}❌ 証明書の生成に失敗しました${NC}"
    exit 1
fi

# Set permissions
chmod 600 "$KEY_PATH"
chmod 644 "$CERT_PATH"

echo ""
echo -e "${YELLOW}============================================${NC}"
echo -e "${GREEN}  ✅ SSL証明書の準備が完了しました${NC}"
echo -e "${YELLOW}============================================${NC}"
