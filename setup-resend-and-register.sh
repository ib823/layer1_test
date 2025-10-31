#!/bin/bash

echo "================================================"
echo "🚀 SAP GRC Platform - Email Registration Setup"
echo "================================================"
echo ""

# Check if Node.js/pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first."
    exit 1
fi

# Get Resend API key
echo "📧 Resend Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "You need a Resend API key to send emails."
echo "If you don't have one:"
echo "  1. Visit https://resend.com"
echo "  2. Sign up for free (get 100 emails/day, 3,000/month)"
echo "  3. Create an API key in Dashboard → API Keys"
echo ""

read -p "🔑 Enter your Resend API key (starts with 're_'): " RESEND_API_KEY

if [[ ! $RESEND_API_KEY =~ ^re_ ]]; then
    echo "❌ Invalid API key format. Must start with 're_'"
    exit 1
fi

# Email addresses
echo ""
echo "📧 Email Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
EMAIL_TO_REGISTER="ikmls@hotmail.com"
RECIPIENT_EMAIL="ikmal.baharudin@gmail.com"

echo "Email to Register: $EMAIL_TO_REGISTER"
echo "Magic Link Will Be Sent To: $RECIPIENT_EMAIL"
echo ""
echo "⚠️  Resend Free Tier Restriction:"
echo "   Can only send to: $RECIPIENT_EMAIL (your registered email)"
echo "   To send to other emails, upgrade to paid plan"
echo ""

# Confirm
read -p "Is this correct? (yes/no): " CONFIRM

if [[ $CONFIRM != "yes" ]]; then
    echo "❌ Setup cancelled"
    exit 1
fi

# Check if .env exists
if [ ! -f "packages/api/.env" ]; then
    echo ""
    echo "📝 Creating .env file..."
    cp "packages/api/.env.example" "packages/api/.env"

    # Update .env with Resend API key
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/RESEND_API_KEY=.*/RESEND_API_KEY=$RESEND_API_KEY/" "packages/api/.env"
    else
        # Linux
        sed -i "s/RESEND_API_KEY=.*/RESEND_API_KEY=$RESEND_API_KEY/" "packages/api/.env"
    fi

    echo "✅ .env file created with Resend configuration"
else
    echo "✅ .env file already exists"
fi

# Register and send magic link
echo ""
echo "🔗 Generating Magic Link..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Build TypeScript if needed
cd packages/api
pnpm run register:magic-link "$EMAIL_TO_REGISTER" "$RECIPIENT_EMAIL" "$RESEND_API_KEY"
RESULT=$?

if [ $RESULT -eq 0 ]; then
    echo ""
    echo "✅ Setup Complete!"
    echo ""
    echo "📋 Next Steps:"
    echo "   1. Check your email at: $RECIPIENT_EMAIL"
    echo "   2. Look for email from: SAP GRC Platform"
    echo "   3. Click the magic link to complete registration"
    echo "   4. You'll be logged in as: $EMAIL_TO_REGISTER"
    echo ""
else
    echo ""
    echo "❌ Registration failed. Check errors above."
    exit 1
fi
