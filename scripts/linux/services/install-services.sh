#!/bin/bash
#
# Mirai HelpDesk - systemdサービスインストールスクリプト (Linux)
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"
SERVICE_DIR="$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ このスクリプトはroot権限で実行してください${NC}"
    echo -e "   sudo $0"
    exit 1
fi

echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}  Mirai HelpDesk - サービスインストール${NC}"
echo -e "${YELLOW}============================================${NC}"
echo ""

# Update paths in service files
for SERVICE_FILE in "$SERVICE_DIR"/*.service; do
    if [ -f "$SERVICE_FILE" ]; then
        FILENAME=$(basename "$SERVICE_FILE")
        echo -e "${YELLOW}📦 $FILENAME を設定中...${NC}"
        
        # Replace placeholder paths with actual paths
        sed -e "s|/path/to/Mirai-HelpDesk-Management-System|$PROJECT_ROOT|g" \
            "$SERVICE_FILE" > "/etc/systemd/system/$FILENAME"
        
        echo -e "${GREEN}✅ /etc/systemd/system/$FILENAME にコピーしました${NC}"
    fi
done

# Reload systemd
systemctl daemon-reload

echo ""
echo -e "${GREEN}✅ サービスのインストールが完了しました${NC}"
echo ""
echo -e "利用可能なコマンド:"
echo -e "  ${YELLOW}開発環境:${NC}"
echo -e "    sudo systemctl start mirai-dev-backend mirai-dev-frontend"
echo -e "    sudo systemctl enable mirai-dev-backend mirai-dev-frontend  # 自動起動有効化"
echo ""
echo -e "  ${YELLOW}本番環境:${NC}"
echo -e "    sudo systemctl start mirai-prod-backend mirai-prod-frontend"
echo -e "    sudo systemctl enable mirai-prod-backend mirai-prod-frontend  # 自動起動有効化"
echo ""
echo -e "  ${YELLOW}ブックマーク:${NC}"
echo -e "    [開発] http://192.168.0.187:8080"
echo -e "    [本番] https://192.168.0.187"
echo ""
