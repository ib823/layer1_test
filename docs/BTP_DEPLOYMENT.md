# SAP BTP Deployment Guide

## Prerequisites

- SAP BTP Global Account
- Cloud Foundry environment enabled
- PostgreSQL service instance
- XSUAA service instance

## Step 1: Create Service Instances
```bash
# PostgreSQL
cf create-service postgresql-db small sapframework-db

# XSUAA
cf create-service xsuaa application sapframework-xsuaa -c xsuaa-config.json
Step 2: Configure manifest.yml
yamlapplications:
  - name: sapframework-api
    memory: 512M
    instances: 2
    buildpacks:
      - nodejs_buildpack
    services:
      - sapframework-db
      - sapframework-xsuaa
    env:
      NODE_ENV: production
Step 3: Deploy
bashcf push
Step 4: Bind SAP Systems
Configure destination service for SAP system connections.

---

**STANDALONE_DEPLOYMENT.md:**
```markdown
# Standalone Deployment (Non-BTP)

## Requirements

- Node.js 20+
- PostgreSQL 14+
- Reverse proxy (nginx/Apache)

## Setup

### 1. Database
```bash
createdb sapframework
psql sapframework < infrastructure/database/schema.sql
2. Environment
bashexport DATABASE_URL=postgresql://user:pass@localhost/sapframework
export NODE_ENV=production
export PORT=3000
3. Build & Run
bashpnpm build
node packages/api/dist/index.js
4. Process Manager (PM2)
bashnpm install -g pm2
pm2 start packages/api/dist/index.js --name sapframework
pm2 save
5. Nginx Reverse Proxy
nginxserver {
    listen 80;
    server_name api.yourcompany.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

---