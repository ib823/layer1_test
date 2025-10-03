#!/bin/bash

# SAP BTP Cloud Foundry Deployment Script

set -e

echo "🚀 Starting SAP Framework BTP deployment..."

# Check CF CLI
if ! command -v cf &> /dev/null; then
    echo "❌ Cloud Foundry CLI not found. Install from: https://docs.cloudfoundry.org/cf-cli/install-go-cli.html"
    exit 1
fi

# Build all packages
echo "📦 Building packages..."
pnpm build

# Create service instances
echo "🔧 Creating service instances..."
cf create-service postgresql-db small sapframework-db || echo "Service sapframework-db already exists"
cf create-service xsuaa application sapframework-xsuaa -c infrastructure/cloud-foundry/xsuaa-config.json || echo "Service sapframework-xsuaa already exists"
cf create-service destination lite sapframework-destination || echo "Service sapframework-destination already exists"

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Deploy application
echo "🚀 Deploying application..."
cf push -f infrastructure/cloud-foundry/manifest.yml

# Show status
echo "✅ Deployment complete!"
cf apps
cf services

echo ""
echo "Application URL: https://sapframework-api.cfapps.sap.hana.ondemand.com"
echo "Health check: https://sapframework-api.cfapps.sap.hana.ondemand.com/api/health"
