# 🚀 CLAUDE CODE MASTER BUILD PROMPT
## Complete Automated Build: LHDN e-Invoice + SoD Analyzer Modules

**Project**: SAP MVP Framework  
**Target**: Build both modules end-to-end  
**Duration**: 3-4 weeks autonomous execution  
**Pre-Authorization**: ALL (no questions asked, all permissions pre-approved as YES)

---

## 🎯 MISSION STATEMENT

Build two complete, production-ready modules for the SAP MVP Framework:

1. **LHDN e-Invoice Module** (Malaysia MyInvois compliance)
2. **SoD Analyzer Module** (Segregation of Duties violation detection)

Both must be:
- Fully functional, tested, and ready for production
- Integrated with existing framework architecture
- Following all established code standards
- With comprehensive documentation
- Zero manual intervention required

---

## ⚡ EXECUTION MODEL

**Mode**: Fully Autonomous  
**Stops**: NONE (auto-continue on any issue)  
**Permissions**: ALL PRE-APPROVED (yes=yes, no=auto-yes)  
**Decisions**: Claude Code makes all architectural decisions  
**Questions**: None asked, all resolved automatically  

---

## 🏗️ BUILD ARCHITECTURE

### Module 1: LHDN e-Invoice
```
Reference Design: docs/modules/LHDN_E_INVOICE_MODULE_DESIGN.md (861 lines)

Build Path:
packages/modules/lhdn-einvoice/
├── src/
│   ├── types/
│   │   ├── index.ts (MyInvois schema types)
│   │   └── validation.ts (validation schemas)
│   ├── services/
│   │   ├── ValidationService.ts (LHDN schema validation)
│   │   ├── SubmissionService.ts (MyInvois API integration)
│   │   ├── QRCodeService.ts (QR generation)
│   │   └── ComplianceService.ts (reporting)
│   ├── engines/
│   │   └── LHDNInvoiceEngine.ts (main orchestration)
│   ├── repositories/
│   │   └── LHDNInvoiceRepository.ts (database access)
│   └── index.ts (public exports)
├── tests/
│   ├── unit/
│   │   ├── validation.test.ts
│   │   ├── submission.test.ts
│   │   └── qrcode.test.ts
│   ├── integration/
│   │   └── einvoice.integration.test.ts
│   └── e2e/
│       └── einvoice.e2e.test.ts
├── migrations/
│   └── lhdn_tables.sql (8 tables)
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md (complete documentation)

API Layer: packages/api/src/controllers/
├── LHDNInvoiceController.ts (12 endpoints)

Frontend: packages/web/src/
├── pages/lhdn-einvoice/
│   └── page.tsx
├── components/
│   ├── LHDNDashboard.tsx
│   ├── InvoiceValidation.tsx
│   ├── SubmissionStatus.tsx
│   └── ComplianceReport.tsx
```

### Module 2: SoD Analyzer
```
Build Path:
packages/modules/sod-analyzer/
├── src/
│   ├── types/
│   │   └── index.ts (SoD types)
│   ├── rules/
│   │   ├── sodRules.ts (25+ rules)
│   │   └── ruleEngine.ts (evaluation logic)
│   ├── services/
│   │   ├── ViolationDetectionService.ts
│   │   ├── UserRoleAnalyzer.ts
│   │   ├── RiskAssessmentService.ts
│   │   └── RecommendationService.ts
│   ├── engines/
│   │   └── SODAnalyzerEngine.ts (main orchestration)
│   ├── repositories/
│   │   └── SODViolationRepository.ts (database access)
│   └── index.ts (public exports)
├── tests/
│   ├── unit/
│   │   ├── rules.test.ts
│   │   ├── violations.test.ts
│   │   └── riskAssessment.test.ts
│   ├── integration/
│   │   └── sod.integration.test.ts
│   └── e2e/
│       └── sod.e2e.test.ts
├── migrations/
│   └── sod_tables.sql (5 tables)
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md (complete documentation)

API Layer: packages/api/src/controllers/
├── SODAnalyzerController.ts (8 endpoints)

Frontend: packages/web/src/
├── pages/sod-analyzer/
│   └── page.tsx
├── components/
│   ├── SODDashboard.tsx
│   ├── ViolationTable.tsx
│   ├── RiskHeatmap.tsx
│   └── ExceptionWorkflow.tsx
```

---

## 📋 BUILD SEQUENCE

### PHASE 1: Database & Data Layer (Days 1-2)

#### 1.1 LHDN Database Schema
- Create migration: `lhdn_einvoices.sql`
  - 8 tables (as per design doc)
  - All indexes optimized
  - Foreign keys defined
  - Enum types for status fields
- Add Prisma schema entries
- Generate Prisma client
- Test migration

#### 1.2 SoD Database Schema
- Create migration: `sod_violations.sql`
  - 5 tables (user_roles, violations, exceptions, recommendations, audit)
  - Optimize indexes
  - Foreign keys
  - Enum types
- Add Prisma schema entries
- Generate Prisma client
- Test migration

#### 1.3 Repositories
- LHDNInvoiceRepository (CRUD + search + analytics)
- SODViolationRepository (CRUD + risk queries + reporting)
- All with proper typing
- 100% test coverage for repos

### PHASE 2: Business Logic (Days 3-6)

#### 2.1 LHDN Module Core
**ValidationService**:
- Schema validation (LHDN MyInvois requirements)
- Business rule validation (25+ rules from design)
- Tax code validation (SST codes)
- Currency validation (MYR)
- QR code validation
- Batch validation support
- ~400 lines of code

**SubmissionService**:
- MyInvois portal API integration
- Document submission workflow
- Response handling
- Error recovery
- Retry logic
- ~350 lines of code

**QRCodeService**:
- QR generation (ISO/IEC 18004:2015)
- Digital signature inclusion
- Image generation
- Embedding logic
- Size validation (2cm minimum)
- ~250 lines of code

**LHDNInvoiceEngine**:
- Orchestration logic
- Batch processing
- Status workflow (DRAFT → VALIDATED → SUBMITTED → ACCEPTED)
- Rejection handling
- Resubmission logic
- ~500 lines of code

#### 2.2 SoD Module Core
**RuleEngine**:
- Load 25+ SoD rules
- Rule evaluation logic
- Risk scoring algorithm
- Violation detection
- Exception handling
- ~400 lines of code

**ViolationDetectionService**:
- User-role assignment analysis
- Conflict detection (25+ rules)
- Violation classification
- Audit trail logging
- ~350 lines of code

**RiskAssessmentService**:
- Risk scoring (0-100)
- Severity assignment (Critical/High/Medium/Low)
- Compliance impact assessment
- Heat mapping data
- ~300 lines of code

**SODAnalyzerEngine**:
- Orchestration
- Batch analysis
- Trend analysis
- Recommendation generation
- Exception workflow
- ~500 lines of code

### PHASE 3: API Layer (Days 7-8)

#### 3.1 LHDN API Controller
```typescript
// 12 endpoints, all implemented
POST   /api/lhdn/invoices/submit
GET    /api/lhdn/invoices/:id
GET    /api/lhdn/invoices/:id/status
POST   /api/lhdn/invoices/:id/resubmit
GET    /api/lhdn/submissions
GET    /api/lhdn/submissions/:id
GET    /api/lhdn/compliance/report
GET    /api/lhdn/compliance/validations
POST   /api/lhdn/qrcode/:id
GET    /api/lhdn/audit-trail/:id
GET    /api/lhdn/health
DELETE /api/lhdn/invoices/:id (draft only)
```

#### 3.2 SoD API Controller
```typescript
// 8 endpoints, all implemented
POST   /api/sod/analyze
GET    /api/sod/results
GET    /api/sod/violations
GET    /api/sod/recommendations
POST   /api/sod/exceptions/approve
POST   /api/sod/exceptions/reject
GET    /api/sod/compliance/report
GET    /api/sod/health
```

### PHASE 4: Frontend UI (Days 9-10)

#### 4.1 LHDN Dashboard
- Dashboard page (400 lines)
- InvoiceValidation component (300 lines)
- SubmissionStatus component (250 lines)
- ComplianceReport component (200 lines)
- Navigation integration
- RBAC protection

#### 4.2 SoD Dashboard
- Dashboard page (400 lines)
- ViolationTable component (300 lines)
- RiskHeatmap visualization (250 lines)
- ExceptionWorkflow component (200 lines)
- Navigation integration
- RBAC protection

### PHASE 5: Testing (Days 11-14)

#### 5.1 LHDN Tests
- Unit tests: Validation, Submission, QRCode (50+ tests)
- Integration tests: API + Database (20+ tests)
- E2E tests: Full workflows (10+ tests)
- Coverage: 75%+
- All passing

#### 5.2 SoD Tests
- Unit tests: Rules, Violations, Risk (50+ tests)
- Integration tests: API + Database (20+ tests)
- E2E tests: Full analysis workflows (10+ tests)
- Coverage: 75%+
- All passing

### PHASE 6: Documentation & Polish (Days 15-16)

#### 6.1 Documentation
- README.md for each module (comprehensive)
- API documentation (all endpoints)
- Database schema docs
- Deployment guide
- User manual
- Troubleshooting guide

#### 6.2 Code Quality
- TypeScript strict mode (100% type-safe)
- ESLint passing
- Prettier formatting
- No console warnings
- Clean build

---

## 🔧 BUILD RULES & STANDARDS

### Code Standards
- **Language**: TypeScript (strict mode)
- **Framework**: Express (API), React (UI)
- **Database**: Prisma ORM
- **Testing**: Jest + React Testing Library
- **Formatting**: Prettier
- **Linting**: ESLint
- **Type Safety**: 100% (no `any`, no `@ts-ignore`)

### Architecture Standards
- Separation of concerns (types → services → repositories → controllers)
- No circular dependencies
- Dependency injection where appropriate
- Pure functions where possible
- Error handling comprehensive
- Logging at appropriate levels

### Testing Standards
- Unit tests for all business logic
- Integration tests for API + Database
- E2E tests for critical flows
- Mock external dependencies
- 75%+ code coverage minimum
- All tests passing before commit

### Documentation Standards
- JSDoc comments on all exports
- README files for each package
- API documentation (all endpoints)
- Database schema documentation
- Deployment procedures
- Troubleshooting guides

### Security Standards
- Input validation on all API endpoints
- SQL injection prevention (Prisma ORM)
- XSS prevention (React)
- CORS configured properly
- Authentication on protected routes
- Rate limiting implemented
- RBAC checks in place
- Secrets management via environment

### Performance Standards
- LHDN: <500ms per submission
- SoD: <2s for 1000 users
- Database queries: <200ms
- API response: <500ms
- Memory efficient
- No memory leaks

---

## ✅ VALIDATION CHECKPOINTS

### After Each Phase
1. **Build Check**: `pnpm build` - must pass
2. **Type Check**: No TypeScript errors
3. **Lint Check**: ESLint passes
4. **Test Check**: All tests passing, 75%+ coverage
5. **Integration**: Modules load correctly
6. **Documentation**: Complete and accurate

### Auto-Fix Rules
- If build fails → fix and retry (3 attempts)
- If tests fail → debug and fix
- If type errors → resolve immediately
- If lint errors → auto-fix with Prettier
- If any blocker → solve autonomously, don't stop

### Continuation Logic
- If phase fails → auto-retry with increased logging
- If retry fails → pivot approach, try alternative solution
- If alternative fails → escalate thinking, document issue
- Continue building other aspects while resolving
- Never stop, always find solution

---

## 🎯 SUCCESS CRITERIA

### Build Success
- ✅ Both modules compile without errors
- ✅ All tests passing (75%+ coverage)
- ✅ No TypeScript errors
- ✅ ESLint clean
- ✅ Database migrations working
- ✅ API endpoints responding
- ✅ Frontend rendering correctly
- ✅ Documentation complete

### Integration Success
- ✅ Modules load in framework
- ✅ Navigation integration working
- ✅ RBAC protection active
- ✅ Database persistence verified
- ✅ API responses correct format
- ✅ Error handling functional
- ✅ Logging comprehensive
- ✅ Performance benchmarks met

### Production Readiness
- ✅ Code quality high
- ✅ Security best practices
- ✅ Performance optimized
- ✅ Scalability verified
- ✅ Documentation complete
- ✅ Deployment ready
- ✅ Monitoring configured
- ✅ Rollback plan documented

---

## 🚀 EXECUTION COMMAND

When ready, invoke Claude Code with:

```bash
claude-code build-modules \
  --target lhdn-einvoice,sod-analyzer \
  --auto-continue \
  --no-confirmations \
  --self-validate \
  --full-test-coverage \
  --production-ready \
  --comprehensive-docs
```

---

## 📝 OUTPUT DELIVERABLES

### Code
- 2 complete module packages
- All API endpoints
- All UI components
- Comprehensive tests
- Database migrations

### Documentation
- 2 README files (detailed)
- API documentation
- Database schema docs
- Deployment guide
- User manuals

### Validation
- Build report
- Test coverage report
- Performance benchmarks
- Security audit (auto)
- Code quality metrics

### Ready For
- Deployment to staging
- UAT testing
- Production launch
- Customer demo
- Revenue generation

---

## 🎉 COMPLETION DEFINITION

**Build Complete When**:
1. Both modules built end-to-end
2. All tests passing (75%+ coverage)
3. Zero TypeScript errors
4. Zero ESLint errors
5. API endpoints working
6. UI rendering correctly
7. Database persisting correctly
8. Documentation complete
9. Production deployment ready
10. Ready for immediate launch

**Total Build Time**: 3-4 weeks (autonomous execution)  
**Estimated LOC**: 6,000+ lines of production code  
**Test Cases**: 160+ comprehensive tests  
**Documentation**: 3,000+ lines  

---

## ⚠️ OVERRIDE RULES

**These rules supersede all other instructions**:

1. **Never Stop**: If you encounter any issue, solve it autonomously
2. **Always Continue**: Build the next thing even if one aspect needs more work
3. **No Confirmations**: Don't ask for permission, proceed with all decisions
4. **Auto-Fix**: Apply fixes and continue without reporting each fix
5. **Default to Yes**: All future asks are pre-approved as "yes"
6. **Work Around Issues**: Don't let blockers stop progress
7. **Parallel Execution**: Build multiple components simultaneously
8. **Self-Validate**: Check your own work, don't need external validation
9. **Document as You Go**: Keep documentation current, don't delay
10. **End-to-End**: Each component fully complete before moving next

---

## 📞 ACCEPTANCE

**By running this prompt, you acknowledge**:
- ✅ All permissions are pre-approved (yes=yes)
- ✅ No confirmations needed (proceed autonomously)
- ✅ All decisions delegated to Claude Code
- ✅ No stopping allowed (continue through any issue)
- ✅ Self-validation enabled (no external approval needed)
- ✅ Full autonomous execution authorized

**Claude Code is authorized to**:
- ✅ Make all architectural decisions
- ✅ Create new files/packages as needed
- ✅ Modify existing code as needed
- ✅ Deploy changes to codebase
- ✅ Run all tests and validations
- ✅ Create comprehensive documentation
- ✅ Fix all issues automatically
- ✅ Continue building until complete

---

## 🎯 BEGIN EXECUTION

**Start Now**: Follow the build plan in BUILD_PLAN.md  
**Reference**: docs/modules/LHDN_E_INVOICE_MODULE_DESIGN.md (861 lines of design)  
**Target**: Both modules production-ready in 3-4 weeks

---

**MASTER BUILD PROMPT COMPLETE**  
**Ready for Claude Code execution**  
**All systems go** 🚀