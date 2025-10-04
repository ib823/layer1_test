# CI/CD Pipeline Setup Guide

**Last Updated**: 2025-10-04
**Status**: Ready for Implementation

---

## 📋 Overview

Complete CI/CD pipeline for SAP MVP Framework with automated testing, security scanning, and deployment.

### Pipeline Features

- ✅ Automated testing on every PR
- ✅ Security scanning (Snyk, CodeQL, secrets)
- ✅ Code quality checks (linting, type checking)
- ✅ Test coverage reporting (Codecov)
- ✅ Automated deployment to staging
- ✅ Manual approval for production
- ✅ Slack notifications
- ✅ GitHub releases

---

## 🚀 Quick Start

### 1. Workflows Already Configured

The workflows are already in `.github/workflows/`:
- `ci-cd.yml` - Main pipeline
- `security.yml` - Security scanning
- `test.yml` - Test suite
- `deploy-staging.yml` - Staging deployment

### 2. Configure GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

#### Required Secrets:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `CF_API_STAGING` | SAP BTP API endpoint (staging) | `https://api.cf.us10.hana.ondemand.com` |
| `CF_API_PROD` | SAP BTP API endpoint (production) | `https://api.cf.us10.hana.ondemand.com` |
| `CF_USERNAME` | Cloud Foundry username | `your-email@example.com` |
| `CF_PASSWORD` | Cloud Foundry password | `your-password` |
| `CF_ORG` | Cloud Foundry organization | `your-org` |
| `SNYK_TOKEN` | Snyk API token | Get from snyk.io |
| `SONAR_TOKEN` | SonarCloud token | Get from sonarcloud.io |
| `SLACK_WEBHOOK` | Slack webhook URL (optional) | `https://hooks.slack.com/...` |

### 3. Set Up GitHub Environments

#### A. Create Staging Environment

1. Go to **Settings → Environments**
2. Click **New environment**
3. Name: `staging`
4. **No protection rules needed** (auto-deploy)

#### B. Create Production Environment

1. Click **New environment**
2. Name: `production`
3. Enable **Required reviewers**
4. Add team members who can approve deployments
5. Enable **Wait timer**: 5 minutes (optional)

---

## 📦 External Services Setup

### 1. Snyk (Security Scanning)

```bash
# 1. Sign up at https://snyk.io
# 2. Connect your GitHub repo
# 3. Generate API token: Account Settings → API Token
# 4. Add to GitHub Secrets as SNYK_TOKEN
```

### 2. SonarCloud (Code Quality)

```bash
# 1. Sign up at https://sonarcloud.io
# 2. Import your repository
# 3. Get your token: My Account → Security → Generate Token
# 4. Add to GitHub Secrets as SONAR_TOKEN
```

Create `sonar-project.properties` in root:

```properties
sonar.projectKey=sap-mvp-framework
sonar.organization=your-org
sonar.sources=packages
sonar.tests=packages
sonar.test.inclusions=**/*.test.ts
sonar.javascript.lcov.reportPaths=coverage/lcov.info
```

### 3. Codecov (Test Coverage) - Optional

```bash
# 1. Sign up at https://codecov.io
# 2. Connect your GitHub repo
# No token needed for public repos
```

### 4. Slack Notifications - Optional

```bash
# 1. Create Slack app: https://api.slack.com/apps
# 2. Enable Incoming Webhooks
# 3. Add webhook URL to GitHub Secrets as SLACK_WEBHOOK
```

---

## 🔧 Production Manifest

Create `manifest-production.yml`:

```yaml
---
applications:
  - name: sap-framework-production
    memory: 1G
    instances: 2
    buildpacks:
      - nodejs_buildpack
    command: node packages/api/dist/server.js
    env:
      NODE_ENV: production
      AUTH_ENABLED: true
      LOG_LEVEL: info
    services:
      - sap-framework-db-prod
      - sap-framework-redis-prod
    routes:
      - route: sap-framework.cfapps.io
    health-check-type: http
    health-check-http-endpoint: /health
    timeout: 180
```

---

## 🎯 Pipeline Workflow

### On Pull Request:

1. **Lint & Type Check** (2 min)
2. **Unit Tests** (3-5 min)
3. **Security Scan** (3-5 min)
4. **Build** (2-3 min)

### On Push to Main:

1. All PR checks
2. **E2E Tests** (5-10 min)
3. **Deploy to Staging** (auto)
4. **Smoke Tests**
5. **Wait for Approval**
6. **Deploy to Production**
7. **Create GitHub Release**

---

## 🧪 Testing the Pipeline

### 1. Test on Feature Branch

```bash
git checkout -b test/ci-pipeline
echo "# Test" >> README.md
git add . && git commit -m "test: CI pipeline"
git push origin test/ci-pipeline
# Create PR and watch it run!
```

### 2. Test Staging Deployment

```bash
git checkout main
git merge test/ci-pipeline
git push origin main
# Watch staging deployment
```

### 3. Test Production Approval

1. Go to **Actions** tab
2. Find workflow run
3. Click **Deploy to Production**
4. Click **Review deployments**
5. Approve deployment

---

## 🐛 Troubleshooting

### Common Issues:

#### 1. "Resource not accessible by integration"

**Solution**: Enable workflow permissions
- Settings → Actions → General
- Workflow permissions → Read and write permissions

#### 2. Database connection fails in tests

**Solution**: PostgreSQL service is configured in workflows

#### 3. Snyk scan fails

**Solution**: Verify SNYK_TOKEN is set correctly

#### 4. Deployment fails

**Solution**: Check CF credentials and manifest
```bash
cf login -a $CF_API -u $CF_USERNAME -p $CF_PASSWORD
cf push --dry-run
```

---

## 🔐 Security Best Practices

### 1. Rotate Secrets Regularly

Update every 90 days:
- CF_PASSWORD
- SNYK_TOKEN
- SONAR_TOKEN

### 2. Branch Protection Rules

1. Settings → Branches → Add rule for `main`
2. Enable:
   - Require pull request reviews
   - Require status checks to pass
   - Require branches to be up to date

### 3. Enable Security Alerts

Settings → Security & analysis → Enable:
- Dependency graph
- Dependabot alerts
- Dependabot security updates

---

## 📈 Optimization Tips

### Speed Up Builds

```yaml
# Use pnpm caching
- uses: actions/setup-node@v4
  with:
    cache: 'pnpm'
```

### Reduce CI Costs

```yaml
# Skip CI on docs
on:
  push:
    paths-ignore:
      - 'docs/**'
      - '**.md'
```

---

## ✅ Pre-Launch Checklist

- [ ] All GitHub secrets configured
- [ ] Environments set up (staging, production)
- [ ] Branch protection rules enabled
- [ ] Snyk account connected
- [ ] SonarCloud project created
- [ ] Test on feature branch
- [ ] Test staging deployment
- [ ] Test production approval flow
- [ ] Document rollback procedure
- [ ] Team trained on workflow

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloud Foundry CLI Reference](https://docs.cloudfoundry.org/cf-cli/)
- [Snyk Documentation](https://docs.snyk.io/)
- [SonarCloud Documentation](https://docs.sonarcloud.io/)

---

## 🆘 Support

**Questions?** Create GitHub issue with `ci/cd` label

**Useful Commands**:

```bash
# View workflow runs
gh run list

# View specific run
gh run view <run-id>

# Re-run failed jobs
gh run rerun <run-id> --failed
```

---

**Status**: ✅ Ready to implement
**Estimated Setup Time**: 2-3 hours
**Maintenance**: Low (automated)
