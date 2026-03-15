#!/bin/bash
set -e

# ==============================================================================
# Deploy: FreeSpeech API
# ==============================================================================
#
# Service:        freespeech-api
# Runtime:        tsx (no build step needed)
# Branch:         main
# Port:           5104
# Database:       freespeech_api (PostgreSQL)
# Working Dir:    /opt/freespeech-api
# Systemd Unit:   /etc/systemd/system/freespeech-api.service
# Nginx Config:   /etc/nginx/sites-available/freespeech-api.archers.tools
# URL:            https://freespeech-api.archers.tools
# Env File:       /opt/freespeech-api/.env
#
# Dependencies:   postgresql, chromium (puppeteer)
#
# NOTE: Do NOT run "npm run build" — this project runs directly via tsx.
# ==============================================================================

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

SERVICE="freespeech-api"
BRANCH="main"
PORT=5104
DIR="/opt/freespeech-api"

echo ""
echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD}  Deploying: ${CYAN}${SERVICE}${NC}"
echo -e "${BOLD}  Branch:    ${CYAN}${BRANCH}${NC}"
echo -e "${BOLD}  Port:      ${CYAN}${PORT}${NC}"
echo -e "${BOLD}========================================${NC}"
echo ""

# Step 1: Pull latest changes
echo -e "${YELLOW}[1/4] Pulling latest changes from origin/${BRANCH}...${NC}"
cd "$DIR"
git pull origin "$BRANCH"
echo ""

# Step 2: Install dependencies
echo -e "${YELLOW}[2/4] Installing dependencies...${NC}"
npm install
echo ""

# Step 3: Push Prisma schema to database
echo -e "${YELLOW}[3/4] Pushing Prisma schema to database...${NC}"
npx prisma db push
echo ""

# Step 4: Restart service
echo -e "${YELLOW}[4/4] Restarting ${SERVICE}...${NC}"
systemctl restart "$SERVICE"
echo ""

# Verify
echo -e "${YELLOW}Verifying service health...${NC}"
sleep 3

if systemctl is-active --quiet "$SERVICE"; then
    echo -e "  ${GREEN}Service is active${NC}"
else
    echo -e "  ${RED}Service is NOT running!${NC}"
    echo ""
    echo -e "${RED}Recent logs:${NC}"
    journalctl -u "$SERVICE" -n 30 --no-pager
    exit 1
fi

echo ""
echo -e "${CYAN}Recent logs:${NC}"
journalctl -u "$SERVICE" -n 10 --no-pager
echo ""

echo -e "${GREEN}${BOLD}Deploy complete: ${SERVICE}${NC}"
echo -e "${CYAN}  URL: https://freespeech-api.archers.tools${NC}"
echo -e "${CYAN}  Logs: journalctl -u ${SERVICE} -f${NC}"
echo ""
