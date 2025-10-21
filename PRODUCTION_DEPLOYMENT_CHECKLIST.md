# Production Deployment Checklist
## SAP GRC Platform - LHDN e-Invoice & SoD Control Modules

**Version**: 1.0.0
**Last Updated**: 2025-10-18
**Target Environment**: Production
**Deployment Type**: Initial Launch

---

## 🎯 Pre-Deployment Requirements

### Code Quality ✅
- [x] All packages build successfully (13/13)
- [x] TypeScript strict mode enabled
- [x] Zero TypeScript compilation errors
- [x] ESLint rules passing
- [x] Prettier formatting applied
- [ ] Code review completed by senior developer
- [ ] Security code review completed

### Testing ✅
- [x] Unit tests: 165/208 passing (79%)
- [x] Core functionality: 100% tested
- [x] SoD module: 85% test coverage
- [x] LHDN module: 100% unit tests passing
- [ ] Integration tests: Run and verify (currently 0/39 - workflows pending)
- [ ] E2E tests: Run full suite (4 test files created)
- [ ] Performance benchmarks: Meet SLA targets
- [ ] Load testing: 100 concurrent users
- [ ] Security audit: OWASP Top 10 verified

###Documentation ✅
- [x] API documentation (Swagger) complete
- [x] Database schema documented
- [x] README files up to date
- [x] Deployment guide available
- [x] Troubleshooting guide available
- [x] Architecture documentation complete
- [ ] User documentation complete
- [ ] Admin documentation complete

---

## 📋 Infrastructure Checklist

### Database
- [ ] PostgreSQL 15+ installed and configured
- [ ] Database created: `sapframework`
- [ ] Database user created with appropriate permissions
- [ ] Connection pooling configured (recommended: 20-50 connections)
- [ ] All migrations executed successfully:
  - [ ] 002_security_compliance.sql
  - [ ] 003_performance_indexes.sql
  - [ ] 004_add_invoice_matching.sql
  - [ ] 005_add_lhdn_einvoice.sql
  - [ ] 006_add_idempotency_queue.sql
  - [ ] 007_add_sod_control_core.sql
  - [ ] 008_add_sod_access_graph.sql
  - [ ] 009_add_sod_findings_mitigation.sql
  - [ ] 010_add_sod_certification_evidence.sql
- [ ] Prisma schema generated (`npx prisma generate`)
- [ ] Database backups configured
- [ ] Point-in-time recovery enabled
- [ ] Monitoring alerts configured

### Application Server
- [ ] Node.js 18+ LTS installed
- [ ] pnpm package manager installed
- [ ] All dependencies installed (`pnpm install`)
- [ ] Full build completed (`pnpm build`)
- [ ] Environment variables configured (see .env.example)
- [ ] Process manager configured (PM2, systemd, etc.)
- [ ] Auto-restart on failure enabled
- [ ] Log rotation configured
- [ ] Health check endpoint accessible

### Redis (Optional but Recommended)
- [ ] Redis 6+ installed
- [ ] Redis configured for rate limiting
- [ ] Redis persistence enabled
- [ ] Redis backups configured
- [ ] Connection pooling configured

### Web Server (Nginx/Apache)
- [ ] Reverse proxy configured
- [ ] SSL/TLS certificates installed
- [ ] HTTP/2 enabled
- [ ] GZIP compression enabled
- [ ] Static file caching configured
- [ ] Rate limiting configured
- [ ] Security headers configured:
  - [ ] X-Frame-Options
  - [ ] X-Content-Type-Options
  - [ ] X-XSS-Protection
  - [ ] Content-Security-Policy
  - [ ] Strict-Transport-Security (HSTS)

---

## 🔐 Security Checklist

### Encryption & Secrets
- [ ] `ENCRYPTION_MASTER_KEY` generated and secured
  - Command: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
  - Store in: Vault, AWS Secrets Manager, or Azure Key Vault
- [ ] `JWT_SECRET` generated and secured (if not using XSUAA)
- [ ] Database credentials secured
- [ ] SAP system credentials encrypted
- [ ] LHDN API credentials encrypted
- [ ] All secrets NOT in source code
- [ ] All secrets NOT in environment files committed to git

### Authentication & Authorization
- [ ] Authentication enabled (`AUTH_ENABLED=true`)
- [ ] XSUAA configured (if using SAP BTP) OR
- [ ] JWT authentication configured (standalone)
- [ ] RBAC policies defined and tested
- [ ] Default admin user created
- [ ] Default passwords changed
- [ ] Session timeout configured (recommended: 30 minutes)
- [ ] Password policies enforced

### Network Security
- [ ] Firewall rules configured
- [ ] Only required ports open (443, database port)
- [ ] Internal services not exposed to internet
- [ ] VPN/Private network for SAP connectivity
- [ ] IP whitelisting configured (if applicable)
- [ ] DDoS protection enabled

### Compliance
- [ ] GDPR compliance verified (if handling EU data)
- [ ] Data retention policies configured
- [ ] Audit logging enabled
- [ ] PII masking enabled
- [ ] Data encryption at rest enabled
- [ ] Data encryption in transit enabled (TLS 1.2+)

---

## ⚙️ Configuration Checklist

### Environment Variables

**Required**:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/sapframework

# Encryption
ENCRYPTION_MASTER_KEY=<32-byte-base64-key>

# Authentication
AUTH_ENABLED=true
JWT_SECRET=<secret> # or XSUAA config

# API Server
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com

# Logging
LOG_LEVEL=info
```

**SAP Connection** (per tenant):
```bash
SAP_BASE_URL=https://your-sap-system.com
SAP_CLIENT=100
SAP_CLIENT_ID=<client-id>
SAP_CLIENT_SECRET=<encrypted-secret>
```

**LHDN Integration** (per tenant):
```bash
LHDN_CLIENT_ID=<lhdn-client-id>
LHDN_CLIENT_SECRET=<encrypted-secret>
LHDN_API_BASE_URL=https://api.myinvois.hasil.gov.my
LHDN_ENVIRONMENT=PRODUCTION # or SANDBOX
```

**Optional** (Recommended):
```bash
# Redis
REDIS_URL=redis://user:pass@host:6379

# Monitoring
SENTRY_DSN=<sentry-dsn>
NEW_RELIC_LICENSE_KEY=<key>

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=<user>
SMTP_PASS=<encrypted-pass>
```

### Verification Steps
- [ ] All required environment variables set
- [ ] Environment variables loaded correctly (test with `node -e "console.log(process.env.DATABASE_URL)"`)
- [ ] Database connection successful
- [ ] SAP connection tested (health check)
- [ ] LHDN API connection tested (sandbox)
- [ ] Email notifications working (if configured)

---

## 🚀 Deployment Steps

### 1. Pre-Deployment
- [ ] Announce maintenance window to users
- [ ] Create database backup
- [ ] Create configuration backup
- [ ] Tag release in git: `git tag v1.0.0`
- [ ] Build artifacts on CI/CD or locally

### 2. Deployment
- [ ] Stop existing application (if updating)
- [ ] Deploy new code to application server
- [ ] Run database migrations:
  ```bash
  psql sapframework < infrastructure/database/schema.sql
  cd packages/core
  npx prisma migrate deploy
  ```
- [ ] Install dependencies:
  ```bash
  pnpm install --frozen-lockfile
  ```
- [ ] Build application:
  ```bash
  pnpm build
  ```
- [ ] Verify build artifacts in `dist/` folders
- [ ] Start application:
  ```bash
  # API Server
  cd packages/api
  NODE_ENV=production pnpm start

  # Web Server (if self-hosting)
  cd packages/web
  pnpm build
  # Serve .next/standalone with your web server
  ```
- [ ] Verify application starts without errors
- [ ] Check health endpoint: `curl http://localhost:3000/health`

### 3. Post-Deployment Verification
- [ ] Health checks passing
- [ ] Database connectivity verified
- [ ] API endpoints responding (test with curl/Postman)
- [ ] Web UI loading correctly
- [ ] Authentication working
- [ ] Test user can log in
- [ ] LHDN invoice submission workflow tested (sandbox)
- [ ] SoD analysis workflow tested
- [ ] Audit logs writing correctly
- [ ] Monitoring alerts configured and working
- [ ] Performance within acceptable limits

### 4. Smoke Tests
Run these critical path tests:
- [ ] User login → Dashboard
- [ ] LHDN: Create invoice → Validate → View status
- [ ] SoD: Run analysis → View violations → Filter results
- [ ] Exception handling: View exceptions → Retry
- [ ] Audit trail: View logs → Filter → Export
- [ ] Configuration: Update settings → Save

---

## 📊 Monitoring & Observability

### Application Monitoring
- [ ] Health check endpoint accessible: `/health`
- [ ] Module health endpoints:
  - [ ] `/api/modules/lhdn/health`
  - [ ] `/api/modules/sod/health`
- [ ] Application logs configured
- [ ] Log aggregation setup (ELK, Splunk, CloudWatch)
- [ ] Error tracking configured (Sentry, Rollbar)
- [ ] APM tool configured (New Relic, DataDog, AppDynamics)

### Database Monitoring
- [ ] Connection pool monitoring
- [ ] Slow query logging enabled
- [ ] Query performance tracking
- [ ] Disk space alerts configured
- [ ] Connection limit alerts configured

### Business Metrics
- [ ] LHDN invoice submission rate tracking
- [ ] LHDN acceptance rate tracking
- [ ] SoD violation detection rate tracking
- [ ] API response time tracking
- [ ] Error rate tracking
- [ ] User activity tracking

### Alerts Configuration
- [ ] CPU usage > 80% alert
- [ ] Memory usage > 85% alert
- [ ] Disk space < 20% alert
- [ ] Database connection errors alert
- [ ] API error rate > 5% alert
- [ ] Failed LHDN submissions alert
- [ ] Critical SoD violations alert

---

## 🔄 Backup & Recovery

### Backup Configuration
- [ ] Database backups scheduled (recommended: hourly incremental, daily full)
- [ ] Application configuration backups
- [ ] Backup retention policy defined (recommended: 30 days)
- [ ] Backup restoration tested
- [ ] Disaster recovery plan documented
- [ ] RTO (Recovery Time Objective) defined
- [ ] RPO (Recovery Point Objective) defined

### Backup Verification
- [ ] Test database restore from latest backup
- [ ] Verify restored data integrity
- [ ] Document restore procedure
- [ ] Train team on restore process

---

## 📈 Performance Targets

### API Response Times
- [ ] Health endpoints: < 100ms
- [ ] Simple queries (invoice details): < 500ms
- [ ] Complex queries (violation list): < 1000ms
- [ ] Analysis operations: < 2000ms
- [ ] Bulk operations: < 5000ms

### Throughput
- [ ] Support 100+ concurrent users
- [ ] Handle 1000+ invoices/day
- [ ] Process 100+ SoD analyses/hour

### Database Performance
- [ ] Query response time < 200ms (90th percentile)
- [ ] Connection pool utilization < 70%
- [ ] No long-running queries (> 30s)

---

## 🧪 Testing in Production (Initial 24 Hours)

### Hour 0-1: Critical Path
- [ ] Admin login successful
- [ ] User login successful
- [ ] LHDN sandbox submission works
- [ ] SoD analysis runs successfully
- [ ] Audit logs being written

### Hour 1-4: Extended Testing
- [ ] Process 10 test invoices through LHDN sandbox
- [ ] Run SoD analysis on test data
- [ ] Test exception handling workflows
- [ ] Test export functionality
- [ ] Verify email notifications (if configured)

### Hour 4-24: Monitoring
- [ ] Monitor error logs for unexpected issues
- [ ] Monitor performance metrics
- [ ] Monitor database performance
- [ ] Monitor memory usage patterns
- [ ] Check for memory leaks

---

## 🔧 Rollback Plan

### Rollback Triggers
- [ ] Application crashes on startup
- [ ] Critical functionality broken
- [ ] Performance degradation > 50%
- [ ] Data integrity issues
- [ ] Security vulnerability discovered

### Rollback Steps
1. [ ] Stop current application
2. [ ] Revert to previous code version
3. [ ] Restore database backup (if migrations were run)
4. [ ] Restart application
5. [ ] Verify previous version working
6. [ ] Document rollback reason
7. [ ] Plan remediation

---

## ✅ Go-Live Approval

### Sign-off Required From:
- [ ] Development Lead
- [ ] QA/Testing Lead
- [ ] Security Team
- [ ] Operations/DevOps Team
- [ ] Product Owner
- [ ] Business Stakeholders

### Final Checks
- [ ] All critical items in this checklist completed
- [ ] All stakeholders informed of go-live
- [ ] Support team briefed and on standby
- [ ] Escalation contacts documented
- [ ] Communication plan for issues ready

---

## 📞 Support & Escalation

### Support Contacts
- **L1 Support**: [Team Email/Slack Channel]
- **L2 Support**: [Development Team]
- **L3 Support**: [Lead Developer]
- **On-Call**: [On-Call Schedule]

### Issue Escalation
- **P1 (Critical)**: System down, data loss → Escalate immediately
- **P2 (High)**: Major feature broken → Escalate within 1 hour
- **P3 (Medium)**: Minor feature issues → Escalate within 4 hours
- **P4 (Low)**: Cosmetic issues → Log for next release

### Monitoring Dashboards
- Application Dashboard: [URL]
- Database Dashboard: [URL]
- Infrastructure Dashboard: [URL]
- Business Metrics Dashboard: [URL]

---

## 📝 Post-Deployment Tasks

### Week 1
- [ ] Daily health check review
- [ ] Monitor error rates
- [ ] Collect user feedback
- [ ] Address critical bugs (P1/P2)
- [ ] Performance tuning based on production data

### Week 2-4
- [ ] Review and optimize slow queries
- [ ] Adjust monitoring thresholds based on actual usage
- [ ] Address medium priority bugs (P3)
- [ ] Plan feature enhancements based on feedback
- [ ] Document lessons learned

### Ongoing
- [ ] Monthly security updates
- [ ] Quarterly dependency updates
- [ ] Regular backup testing
- [ ] Performance optimization reviews
- [ ] Feature enhancement releases

---

## 🎯 Success Criteria

### Technical Success
- [ ] 99.9% uptime in first month
- [ ] API response times within SLA
- [ ] Zero critical security incidents
- [ ] Zero data loss incidents
- [ ] Error rate < 0.1%

### Business Success
- [ ] LHDN invoice acceptance rate > 95%
- [ ] SoD violations detected and tracked
- [ ] User adoption targets met
- [ ] Positive user feedback (> 4.0/5.0)

---

## 📚 References

- **Deployment Guide**: `/docs/DEPLOYMENT.md`
- **Architecture Docs**: `/docs/ARCHITECTURE.md`
- **API Documentation**: `http://your-domain/api/docs`
- **Troubleshooting**: `/docs/TROUBLESHOOTING.md`
- **CLAUDE.md**: Project overview and commands

---

**Checklist Version**: 1.0.0
**Created**: 2025-10-18
**Owner**: Development Team
**Reviewed**: [Date]
**Approved**: [Date]

---

*This checklist should be reviewed and updated with each major release. All items must be verified before production deployment.*
