#!/bin/bash
# Resend Setup Helper Script
# This script helps you configure Resend in your .env file

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Resend Email Configuration Helper                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "This script will help you configure Resend email service."
echo ""
echo -e "${YELLOW}Prerequisites:${NC}"
echo "  1. You have a Resend account (https://resend.com)"
echo "  2. You have your Resend API key ready"
echo ""
read -p "Do you have your Resend API key ready? (y/n): " HAS_KEY

if [[ ! $HAS_KEY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}📝 How to get your Resend API key:${NC}"
    echo "  1. Go to https://resend.com"
    echo "  2. Sign up or log in"
    echo "  3. Navigate to 'API Keys' in the sidebar"
    echo "  4. Click '+ Create API Key'"
    echo "  5. Copy the key (starts with 're_')"
    echo ""
    echo "Run this script again once you have your API key."
    exit 0
fi

# Get API key
echo ""
echo -e "${GREEN}Step 1: Enter your Resend API key${NC}"
read -p "Resend API Key (starts with 're_'): " API_KEY

# Validate API key format
if [[ ! $API_KEY =~ ^re_ ]]; then
    echo -e "${RED}❌ Warning: API key should start with 're_'${NC}"
    read -p "Continue anyway? (y/n): " CONTINUE
    if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

# Get email configuration
echo ""
echo -e "${GREEN}Step 2: Configure email sender${NC}"
echo ""
echo "For testing, use: onboarding@resend.dev"
echo "For production, use your verified domain: noreply@yourdomain.com"
echo ""
read -p "From Email Address [onboarding@resend.dev]: " FROM_EMAIL
FROM_EMAIL=${FROM_EMAIL:-onboarding@resend.dev}

read -p "From Name [SAP GRC Platform]: " FROM_NAME
FROM_NAME=${FROM_NAME:-SAP GRC Platform}

# Get app base URL
echo ""
echo -e "${GREEN}Step 3: Configure application URL${NC}"
echo ""
echo "For development, use: http://localhost:3001"
echo "For production, use: https://yourdomain.com"
echo ""
read -p "App Base URL [http://localhost:3001]: " APP_URL
APP_URL=${APP_URL:-http://localhost:3001}

# Update .env file
echo ""
echo -e "${YELLOW}Updating .env file...${NC}"

# Backup .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backed up .env to .env.backup.*"

# Update EMAIL_PROVIDER
if grep -q "^EMAIL_PROVIDER=" .env; then
    sed -i "s|^EMAIL_PROVIDER=.*|EMAIL_PROVIDER=resend|" .env
    echo "✅ Set EMAIL_PROVIDER=resend"
else
    echo "EMAIL_PROVIDER=resend" >> .env
    echo "✅ Added EMAIL_PROVIDER=resend"
fi

# Update RESEND_API_KEY
if grep -q "^RESEND_API_KEY=" .env; then
    sed -i "s|^RESEND_API_KEY=.*|RESEND_API_KEY=$API_KEY|" .env
    echo "✅ Set RESEND_API_KEY"
else
    echo "RESEND_API_KEY=$API_KEY" >> .env
    echo "✅ Added RESEND_API_KEY"
fi

# Update EMAIL_FROM_EMAIL
if grep -q "^EMAIL_FROM_EMAIL=" .env; then
    sed -i "s|^EMAIL_FROM_EMAIL=.*|EMAIL_FROM_EMAIL=$FROM_EMAIL|" .env
    echo "✅ Set EMAIL_FROM_EMAIL=$FROM_EMAIL"
else
    echo "EMAIL_FROM_EMAIL=$FROM_EMAIL" >> .env
    echo "✅ Added EMAIL_FROM_EMAIL=$FROM_EMAIL"
fi

# Update EMAIL_FROM_NAME
if grep -q "^EMAIL_FROM_NAME=" .env; then
    sed -i "s|^EMAIL_FROM_NAME=.*|EMAIL_FROM_NAME=$FROM_NAME|" .env
    echo "✅ Set EMAIL_FROM_NAME=$FROM_NAME"
else
    echo "EMAIL_FROM_NAME=$FROM_NAME" >> .env
    echo "✅ Added EMAIL_FROM_NAME=$FROM_NAME"
fi

# Update APP_BASE_URL
if grep -q "^APP_BASE_URL=" .env; then
    sed -i "s|^APP_BASE_URL=.*|APP_BASE_URL=$APP_URL|" .env
    echo "✅ Set APP_BASE_URL=$APP_URL"
else
    echo "APP_BASE_URL=$APP_URL" >> .env
    echo "✅ Added APP_BASE_URL=$APP_URL"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ Configuration Complete!                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Your email configuration:"
echo "  Provider: Resend"
echo "  API Key: ${API_KEY:0:10}...${API_KEY: -4}"
echo "  From: $FROM_NAME <$FROM_EMAIL>"
echo "  App URL: $APP_URL"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Test your configuration:"
echo "     cd packages/api"
echo "     pnpm test:email YOUR_EMAIL@example.com"
echo ""
echo "  2. Start the server:"
echo "     pnpm dev"
echo ""
echo "  3. Check the logs for:"
echo "     📧 Email service initialized with provider: resend"
echo ""
echo -e "${GREEN}Happy emailing! 📧${NC}"
echo ""
