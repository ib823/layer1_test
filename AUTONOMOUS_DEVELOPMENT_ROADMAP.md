# SAP MVP Framework - Autonomous Development Roadmap
## Complete Development Plan to 100% Production Ready

**Created**: October 13, 2025  
**Current Status**: 85% Complete  
**Target Status**: 100% Production Ready  
**Estimated Duration**: 3-4 weeks  
**Execution Mode**: Autonomous, Background-Capable, Resumable

---

## 🔐 PRE-AUTHORIZATION DECLARATION

**ALL PERMISSIONS ARE HEREBY GRANTED FOR AUTONOMOUS EXECUTION:**

✅ **Code Modification**: Full authorization to modify any file in the repository  
✅ **Package Installation**: Authorized to install any npm/pnpm packages  
✅ **Database Changes**: Authorized to create/modify schemas and migrations  
✅ **Configuration Changes**: Authorized to modify all config files  
✅ **Test Creation**: Authorized to create and run all test suites  
✅ **Build & Deploy**: Authorized to build, package, and prepare deployments  
✅ **Documentation**: Authorized to create/update all documentation  
✅ **Git Operations**: Authorized to commit changes (if applicable)  

**EXECUTION INSTRUCTIONS FOR CLAUDE CODE:**
- Do NOT stop to ask for permission at any step
- Execute all steps autonomously
- Create checkpoint files after each phase
- Log all actions to `EXECUTION_LOG.md`
- If error occurs: log, attempt fix, continue if possible
- Background execution: Create status file updated every 15 minutes
- On disconnection: Save state to `RESUME_STATE.json`
- On reconnection: Read `RESUME_STATE.json` and continue from last checkpoint

---

## 📋 EXECUTION STRATEGY

### Priority Levels
- **P0 (Critical)**: Blocks production deployment - complete first
- **P1 (High)**: Essential for feature completeness
- **P2 (Medium)**: Quality & maintainability improvements
- **P3 (Low)**: Nice-to-have enhancements

### Parallel Execution Tracks
- **Track A**: Database & Backend (can run in parallel)
- **Track B**: Testing (can run in parallel)
- **Track C**: Frontend UI (sequential, depends on Track A)
- **Track D**: DevOps & Deployment (can run in parallel)

---

## 🎯 PHASE 1: FOUNDATION & DATABASE (Days 1-3)
**Priority**: P0 - Critical  
**Track**: A (Backend)  
**Estimated Time**: 3 days

### Checkpoint 1.1: Database Schema Extensions
**File**: `packages/core/prisma/schema.prisma`

```typescript
// ADD THESE TABLES TO EXISTING schema.prisma

model InvoiceMatchRun {
  id                String   @id @default(uuid())
  tenantId          String
  runDate           DateTime @default(now())
  status            String   // 'running', 'completed', 'failed'
  totalInvoices     Int
  matchedInvoices   Int
  unmatchedInvoices Int
  fraudAlertsCount  Int
  parameters        Json
  results           Json?
  errorMessage      String?
  executionTimeMs   Int?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  tenant            Tenant   @relation(fields: [tenantId], references: [id])
  matchResults      InvoiceMatchResult[]
  fraudAlerts       FraudAlert[]
  
  @@index([tenantId, runDate])
  @@index([status])
}

model InvoiceMatchResult {
  id              String   @id @default(uuid())
  runId           String
  invoiceNumber   String
  poNumber        String?
  grNumber        String?
  matchStatus     String   // 'matched', 'partial', 'unmatched'
  matchScore      Float
  discrepancies   Json
  amounts         Json
  vendorId        String?
  vendorName      String?
  createdAt       DateTime @default(now())
  
  run             InvoiceMatchRun @relation(fields: [runId], references: [id])
  
  @@index([runId])
  @@index([invoiceNumber])
  @@index([matchStatus])
}

model FraudAlert {
  id              String   @id @default(uuid())
  runId           String
  alertType       String   // 'duplicate', 'pattern', 'outlier'
  severity        String   // 'high', 'medium', 'low'
  invoiceNumber   String
  description     String
  evidence        Json
  status          String   @default("open") // 'open', 'investigating', 'resolved', 'false_positive'
  assignedTo      String?
  resolvedAt      DateTime?
  resolution      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  run             InvoiceMatchRun @relation(fields: [runId], references: [id])
  
  @@index([runId])
  @@index([status])
  @@index([severity])
}

model GLAnomalyRun {
  id                String   @id @default(uuid())
  tenantId          String
  fiscalYear        String
  fiscalPeriod      String?
  runDate           DateTime @default(now())
  status            String   // 'running', 'completed', 'failed'
  totalTransactions Int
  anomaliesFound    Int
  parameters        Json
  summary           Json?
  errorMessage      String?
  executionTimeMs   Int?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  tenant            Tenant   @relation(fields: [tenantId], references: [id])
  anomalies         GLAnomaly[]
  
  @@index([tenantId, fiscalYear, fiscalPeriod])
  @@index([status])
}

model GLAnomaly {
  id              String   @id @default(uuid())
  runId           String
  documentNumber  String
  lineItem        String?
  glAccount       String
  amount          Float
  postingDate     DateTime
  detectionMethod String   // 'benford', 'outlier', 'after_hours', etc.
  riskScore       Float
  riskLevel       String   // 'critical', 'high', 'medium', 'low'
  description     String
  evidence        Json
  status          String   @default("open")
  assignedTo      String?
  resolvedAt      DateTime?
  resolution      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  run             GLAnomalyRun @relation(fields: [runId], references: [id])
  
  @@index([runId])
  @@index([glAccount])
  @@index([riskLevel])
  @@index([status])
}

model VendorQualityRun {
  id                    String   @id @default(uuid())
  tenantId              String
  runDate               DateTime @default(now())
  status                String   // 'running', 'completed', 'failed'
  totalVendors          Int
  issuesFound           Int
  duplicatesFound       Int
  potentialSavings      Float
  parameters            Json
  summary               Json?
  errorMessage          String?
  executionTimeMs       Int?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  qualityIssues         VendorQualityIssue[]
  duplicateClusters     VendorDuplicateCluster[]
  
  @@index([tenantId, runDate])
  @@index([status])
}

model VendorQualityIssue {
  id              String   @id @default(uuid())
  runId           String
  vendorId        String
  vendorName      String
  issueType       String   // 'missing_field', 'invalid_format', 'outdated', 'risk'
  severity        String   // 'high', 'medium', 'low'
  fieldName       String?
  currentValue    String?
  suggestedValue  String?
  description     String
  qualityScore    Float
  status          String   @default("open")
  assignedTo      String?
  resolvedAt      DateTime?
  resolution      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  run             VendorQualityRun @relation(fields: [runId], references: [id])
  
  @@index([runId])
  @@index([vendorId])
  @@index([issueType])
  @@index([status])
}

model VendorDuplicateCluster {
  id                String   @id @default(uuid())
  runId             String
  clusterSize       Int
  vendorIds         String[] // Array of vendor IDs in cluster
  vendorNames       String[] // Array of vendor names
  similarityScore   Float
  matchFields       String[] // Fields that matched
  estimatedSavings  Float
  recommendedAction String
  status            String   @default("pending") // 'pending', 'merged', 'ignored'
  reviewedBy        String?
  reviewedAt        DateTime?
  notes             String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  run               VendorQualityRun @relation(fields: [runId], references: [id])
  
  @@index([runId])
  @@index([status])
}
```

**Validation**:
```bash
cd packages/core
pnpm prisma format
pnpm prisma validate
pnpm prisma generate
```

**Success Criteria**:
- ✅ Schema file valid
- ✅ No Prisma errors
- ✅ Prisma client generated
- ✅ Checkpoint file created: `checkpoints/phase1.1_complete.json`

---

### Checkpoint 1.2: Database Migrations
**File**: `packages/core/prisma/migrations/YYYYMMDDHHMMSS_add_module_persistence/migration.sql`

**Steps**:
1. Create migration: `pnpm prisma migrate dev --name add_module_persistence`
2. Apply to dev database: `pnpm prisma migrate deploy`
3. Verify tables exist: Run SQL query to check all 7 new tables

**Success Criteria**:
- ✅ Migration file created
- ✅ Migration applied successfully
- ✅ All 7 tables exist in database
- ✅ Checkpoint file created: `checkpoints/phase1.2_complete.json`

---

### Checkpoint 1.3: Repository Layer
**Files to Create**:

1. **`packages/core/src/repositories/InvoiceMatchRepository.ts`** (350 lines)
```typescript
import { PrismaClient } from '@prisma/client';
import { 
  InvoiceMatchRun, 
  InvoiceMatchResult, 
  FraudAlert 
} from '@prisma/client';

export class InvoiceMatchRepository {
  constructor(private prisma: PrismaClient) {}

  async createRun(data: {
    tenantId: string;
    totalInvoices: number;
    matchedInvoices: number;
    unmatchedInvoices: number;
    fraudAlertsCount: number;
    parameters: any;
  }): Promise<InvoiceMatchRun> {
    return this.prisma.invoiceMatchRun.create({
      data: {
        ...data,
        status: 'completed',
      },
    });
  }

  async saveResults(
    runId: string, 
    results: Array<Omit<InvoiceMatchResult, 'id' | 'runId' | 'createdAt'>>
  ): Promise<void> {
    await this.prisma.invoiceMatchResult.createMany({
      data: results.map(r => ({ ...r, runId })),
    });
  }

  async saveFraudAlerts(
    runId: string,
    alerts: Array<Omit<FraudAlert, 'id' | 'runId' | 'status' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    await this.prisma.fraudAlert.createMany({
      data: alerts.map(a => ({ ...a, runId, status: 'open' })),
    });
  }

  async getRun(runId: string): Promise<InvoiceMatchRun | null> {
    return this.prisma.invoiceMatchRun.findUnique({
      where: { id: runId },
      include: {
        matchResults: true,
        fraudAlerts: true,
      },
    });
  }

  async getRunsByTenant(
    tenantId: string,
    limit: number = 20
  ): Promise<InvoiceMatchRun[]> {
    return this.prisma.invoiceMatchRun.findMany({
      where: { tenantId },
      orderBy: { runDate: 'desc' },
      take: limit,
      include: {
        _count: {
          select: {
            matchResults: true,
            fraudAlerts: true,
          },
        },
      },
    });
  }

  async getMatchResults(
    runId: string,
    filters?: {
      matchStatus?: string;
      minMatchScore?: number;
    }
  ): Promise<InvoiceMatchResult[]> {
    return this.prisma.invoiceMatchResult.findMany({
      where: {
        runId,
        ...(filters?.matchStatus && { matchStatus: filters.matchStatus }),
        ...(filters?.minMatchScore && { matchScore: { gte: filters.minMatchScore } }),
      },
      orderBy: { matchScore: 'asc' },
    });
  }

  async getFraudAlerts(
    runId: string,
    filters?: {
      severity?: string;
      status?: string;
    }
  ): Promise<FraudAlert[]> {
    return this.prisma.fraudAlert.findMany({
      where: {
        runId,
        ...(filters?.severity && { severity: filters.severity }),
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateFraudAlertStatus(
    alertId: string,
    status: string,
    resolution?: string,
    assignedTo?: string
  ): Promise<FraudAlert> {
    return this.prisma.fraudAlert.update({
      where: { id: alertId },
      data: {
        status,
        resolution,
        assignedTo,
        ...(status === 'resolved' && { resolvedAt: new Date() }),
      },
    });
  }

  async getStatistics(tenantId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalRuns, totalInvoices, totalFraudAlerts, recentRuns] = await Promise.all([
      this.prisma.invoiceMatchRun.count({
        where: { tenantId, runDate: { gte: since } },
      }),
      this.prisma.invoiceMatchRun.aggregate({
        where: { tenantId, runDate: { gte: since } },
        _sum: { totalInvoices: true, matchedInvoices: true, unmatchedInvoices: true },
      }),
      this.prisma.fraudAlert.count({
        where: { 
          run: { tenantId },
          createdAt: { gte: since },
        },
      }),
      this.prisma.invoiceMatchRun.findMany({
        where: { tenantId, runDate: { gte: since } },
        orderBy: { runDate: 'desc' },
        take: 10,
        select: {
          id: true,
          runDate: true,
          totalInvoices: true,
          matchedInvoices: true,
          fraudAlertsCount: true,
        },
      }),
    ]);

    return {
      totalRuns,
      totalInvoices: totalInvoices._sum.totalInvoices || 0,
      matchedInvoices: totalInvoices._sum.matchedInvoices || 0,
      unmatchedInvoices: totalInvoices._sum.unmatchedInvoices || 0,
      totalFraudAlerts,
      matchRate: totalInvoices._sum.totalInvoices 
        ? ((totalInvoices._sum.matchedInvoices || 0) / totalInvoices._sum.totalInvoices) * 100 
        : 0,
      recentRuns,
    };
  }
}
```

2. **`packages/core/src/repositories/GLAnomalyRepository.ts`** (300 lines)
```typescript
import { PrismaClient } from '@prisma/client';
import { GLAnomalyRun, GLAnomaly } from '@prisma/client';

export class GLAnomalyRepository {
  constructor(private prisma: PrismaClient) {}

  async createRun(data: {
    tenantId: string;
    fiscalYear: string;
    fiscalPeriod?: string;
    totalTransactions: number;
    anomaliesFound: number;
    parameters: any;
    summary?: any;
  }): Promise<GLAnomalyRun> {
    return this.prisma.gLAnomalyRun.create({
      data: {
        ...data,
        status: 'completed',
      },
    });
  }

  async saveAnomalies(
    runId: string,
    anomalies: Array<Omit<GLAnomaly, 'id' | 'runId' | 'status' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    await this.prisma.gLAnomaly.createMany({
      data: anomalies.map(a => ({ ...a, runId, status: 'open' })),
    });
  }

  async getRun(runId: string): Promise<GLAnomalyRun | null> {
    return this.prisma.gLAnomalyRun.findUnique({
      where: { id: runId },
      include: {
        anomalies: true,
      },
    });
  }

  async getRunsByTenant(
    tenantId: string,
    fiscalYear?: string,
    limit: number = 20
  ): Promise<GLAnomalyRun[]> {
    return this.prisma.gLAnomalyRun.findMany({
      where: { 
        tenantId,
        ...(fiscalYear && { fiscalYear }),
      },
      orderBy: { runDate: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { anomalies: true },
        },
      },
    });
  }

  async getAnomalies(
    runId: string,
    filters?: {
      riskLevel?: string;
      detectionMethod?: string;
      status?: string;
      glAccount?: string;
    }
  ): Promise<GLAnomaly[]> {
    return this.prisma.gLAnomaly.findMany({
      where: {
        runId,
        ...(filters?.riskLevel && { riskLevel: filters.riskLevel }),
        ...(filters?.detectionMethod && { detectionMethod: filters.detectionMethod }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.glAccount && { glAccount: filters.glAccount }),
      },
      orderBy: [{ riskScore: 'desc' }, { amount: 'desc' }],
    });
  }

  async updateAnomalyStatus(
    anomalyId: string,
    status: string,
    resolution?: string,
    assignedTo?: string
  ): Promise<GLAnomaly> {
    return this.prisma.gLAnomaly.update({
      where: { id: anomalyId },
      data: {
        status,
        resolution,
        assignedTo,
        ...(status === 'resolved' && { resolvedAt: new Date() }),
      },
    });
  }

  async getStatistics(tenantId: string, fiscalYear: string) {
    const [totalRuns, anomalyStats, byRiskLevel, byDetectionMethod] = await Promise.all([
      this.prisma.gLAnomalyRun.count({
        where: { tenantId, fiscalYear },
      }),
      this.prisma.gLAnomalyRun.aggregate({
        where: { tenantId, fiscalYear },
        _sum: { totalTransactions: true, anomaliesFound: true },
        _avg: { anomaliesFound: true },
      }),
      this.prisma.gLAnomaly.groupBy({
        by: ['riskLevel'],
        where: {
          run: { tenantId, fiscalYear },
        },
        _count: true,
      }),
      this.prisma.gLAnomaly.groupBy({
        by: ['detectionMethod'],
        where: {
          run: { tenantId, fiscalYear },
        },
        _count: true,
      }),
    ]);

    return {
      totalRuns,
      totalTransactions: anomalyStats._sum.totalTransactions || 0,
      totalAnomalies: anomalyStats._sum.anomaliesFound || 0,
      avgAnomaliesPerRun: anomalyStats._avg.anomaliesFound || 0,
      byRiskLevel: byRiskLevel.reduce((acc, curr) => {
        acc[curr.riskLevel] = curr._count;
        return acc;
      }, {} as Record<string, number>),
      byDetectionMethod: byDetectionMethod.reduce((acc, curr) => {
        acc[curr.detectionMethod] = curr._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  async getTopAnomalousAccounts(
    tenantId: string,
    fiscalYear: string,
    limit: number = 10
  ) {
    const accounts = await this.prisma.gLAnomaly.groupBy({
      by: ['glAccount'],
      where: {
        run: { tenantId, fiscalYear },
      },
      _count: true,
      _avg: { riskScore: true },
      orderBy: {
        _count: {
          glAccount: 'desc',
        },
      },
      take: limit,
    });

    return accounts.map(a => ({
      glAccount: a.glAccount,
      anomalyCount: a._count,
      avgRiskScore: a._avg.riskScore || 0,
    }));
  }
}
```

3. **`packages/core/src/repositories/VendorQualityRepository.ts`** (300 lines)
```typescript
import { PrismaClient } from '@prisma/client';
import { 
  VendorQualityRun, 
  VendorQualityIssue, 
  VendorDuplicateCluster 
} from '@prisma/client';

export class VendorQualityRepository {
  constructor(private prisma: PrismaClient) {}

  async createRun(data: {
    tenantId: string;
    totalVendors: number;
    issuesFound: number;
    duplicatesFound: number;
    potentialSavings: number;
    parameters: any;
    summary?: any;
  }): Promise<VendorQualityRun> {
    return this.prisma.vendorQualityRun.create({
      data: {
        ...data,
        status: 'completed',
      },
    });
  }

  async saveQualityIssues(
    runId: string,
    issues: Array<Omit<VendorQualityIssue, 'id' | 'runId' | 'status' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    await this.prisma.vendorQualityIssue.createMany({
      data: issues.map(i => ({ ...i, runId, status: 'open' })),
    });
  }

  async saveDuplicateClusters(
    runId: string,
    clusters: Array<Omit<VendorDuplicateCluster, 'id' | 'runId' | 'status' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    await this.prisma.vendorDuplicateCluster.createMany({
      data: clusters.map(c => ({ ...c, runId, status: 'pending' })),
    });
  }

  async getRun(runId: string): Promise<VendorQualityRun | null> {
    return this.prisma.vendorQualityRun.findUnique({
      where: { id: runId },
      include: {
        qualityIssues: true,
        duplicateClusters: true,
      },
    });
  }

  async getRunsByTenant(
    tenantId: string,
    limit: number = 20
  ): Promise<VendorQualityRun[]> {
    return this.prisma.vendorQualityRun.findMany({
      where: { tenantId },
      orderBy: { runDate: 'desc' },
      take: limit,
      include: {
        _count: {
          select: {
            qualityIssues: true,
            duplicateClusters: true,
          },
        },
      },
    });
  }

  async getQualityIssues(
    runId: string,
    filters?: {
      severity?: string;
      issueType?: string;
      status?: string;
      vendorId?: string;
    }
  ): Promise<VendorQualityIssue[]> {
    return this.prisma.vendorQualityIssue.findMany({
      where: {
        runId,
        ...(filters?.severity && { severity: filters.severity }),
        ...(filters?.issueType && { issueType: filters.issueType }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.vendorId && { vendorId: filters.vendorId }),
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getDuplicateClusters(
    runId: string,
    status?: string
  ): Promise<VendorDuplicateCluster[]> {
    return this.prisma.vendorDuplicateCluster.findMany({
      where: {
        runId,
        ...(status && { status }),
      },
      orderBy: { estimatedSavings: 'desc' },
    });
  }

  async updateIssueStatus(
    issueId: string,
    status: string,
    resolution?: string,
    assignedTo?: string
  ): Promise<VendorQualityIssue> {
    return this.prisma.vendorQualityIssue.update({
      where: { id: issueId },
      data: {
        status,
        resolution,
        assignedTo,
        ...(status === 'resolved' && { resolvedAt: new Date() }),
      },
    });
  }

  async updateClusterStatus(
    clusterId: string,
    status: string,
    reviewedBy: string,
    notes?: string
  ): Promise<VendorDuplicateCluster> {
    return this.prisma.vendorDuplicateCluster.update({
      where: { id: clusterId },
      data: {
        status,
        reviewedBy,
        reviewedAt: new Date(),
        notes,
      },
    });
  }

  async getStatistics(tenantId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalRuns, vendorStats, topIssueTypes, duplicateStats] = await Promise.all([
      this.prisma.vendorQualityRun.count({
        where: { tenantId, runDate: { gte: since } },
      }),
      this.prisma.vendorQualityRun.aggregate({
        where: { tenantId, runDate: { gte: since } },
        _sum: { 
          totalVendors: true, 
          issuesFound: true, 
          duplicatesFound: true,
          potentialSavings: true,
        },
        _avg: { issuesFound: true },
      }),
      this.prisma.vendorQualityIssue.groupBy({
        by: ['issueType'],
        where: {
          run: { tenantId, runDate: { gte: since } },
        },
        _count: true,
        orderBy: {
          _count: {
            issueType: 'desc',
          },
        },
        take: 5,
      }),
      this.prisma.vendorDuplicateCluster.aggregate({
        where: {
          run: { tenantId, runDate: { gte: since } },
        },
        _sum: { estimatedSavings: true, clusterSize: true },
      }),
    ]);

    return {
      totalRuns,
      totalVendors: vendorStats._sum.totalVendors || 0,
      totalIssues: vendorStats._sum.issuesFound || 0,
      totalDuplicates: vendorStats._sum.duplicatesFound || 0,
      potentialSavings: vendorStats._sum.potentialSavings || 0,
      avgIssuesPerRun: vendorStats._avg.issuesFound || 0,
      topIssueTypes: topIssueTypes.map(t => ({
        type: t.issueType,
        count: t._count,
      })),
      duplicateClustersSavings: duplicateStats._sum.estimatedSavings || 0,
      vendorsInDuplicateClusters: duplicateStats._sum.clusterSize || 0,
    };
  }
}
```

4. **`packages/core/src/repositories/index.ts`**
```typescript
export { InvoiceMatchRepository } from './InvoiceMatchRepository';
export { GLAnomalyRepository } from './GLAnomalyRepository';
export { VendorQualityRepository } from './VendorQualityRepository';
```

**Validation**:
```bash
cd packages/core
pnpm build
pnpm typecheck
```

**Success Criteria**:
- ✅ All 3 repository files created
- ✅ TypeScript compilation successful
- ✅ No type errors
- ✅ Exports configured correctly
- ✅ Checkpoint file created: `checkpoints/phase1.3_complete.json`

---

### Checkpoint 1.4: Update Controllers to Use Persistence
**Files to Modify**:

1. **`packages/api/src/controllers/InvoiceMatchingController.ts`** - Add persistence calls
2. **`packages/api/src/controllers/GLAnomalyDetectionController.ts`** - Add persistence calls
3. **`packages/api/src/controllers/VendorDataQualityController.ts`** - Add persistence calls

**Pattern for each controller**:
```typescript
// Add at top
import { InvoiceMatchRepository } from '@sap-framework/core/repositories';
import { PrismaClient } from '@prisma/client';

// In class
private repository: InvoiceMatchRepository;

constructor() {
  this.repository = new InvoiceMatchRepository(new PrismaClient());
}

// In analyze method, after getting results from engine:
const run = await this.repository.createRun({
  tenantId,
  totalInvoices: results.totalInvoices,
  matchedInvoices: results.matched.length,
  unmatchedInvoices: results.unmatched.length,
  fraudAlertsCount: results.fraudAlerts.length,
  parameters: { fromDate, toDate },
});

await this.repository.saveResults(run.id, results.matched);
await this.repository.saveFraudAlerts(run.id, results.fraudAlerts);

return { runId: run.id, ...results };
```

**Validation**:
```bash
cd packages/api
pnpm build
pnpm typecheck
```

**Success Criteria**:
- ✅ All 3 controllers updated
- ✅ Persistence logic added after analysis
- ✅ No compilation errors
- ✅ Checkpoint file created: `checkpoints/phase1.4_complete.json`

**Phase 1 Complete**: Save state to `RESUME_STATE.json` with `phase: 1, checkpoint: 1.4, status: complete`

---

## 🧪 PHASE 2: TESTING INFRASTRUCTURE (Days 4-7)
**Priority**: P0 - Critical  
**Track**: B (Testing)  
**Estimated Time**: 4 days

### Checkpoint 2.1: GL Anomaly Detection Tests
**File**: `packages/modules/gl-anomaly-detection/src/__tests__/GLAnomalyEngine.test.ts` (500 lines)

```typescript
import { GLAnomalyEngine } from '../GLAnomalyEngine';
import { GLDataSource, GLLineItem } from '../types';

describe('GLAnomalyEngine', () => {
  let engine: GLAnomalyEngine;
  let mockDataSource: jest.Mocked<GLDataSource>;

  beforeEach(() => {
    mockDataSource = {
      getGLLineItems: jest.fn(),
    };
    engine = new GLAnomalyEngine(mockDataSource);
  });

  describe('Benford\'s Law Analysis', () => {
    it('should detect violations of Benford\'s Law', async () => {
      // Create test data that violates Benford's Law
      const testData: GLLineItem[] = Array.from({ length: 100 }, (_, i) => ({
        documentNumber: `DOC${i}`,
        lineItem: '1',
        glAccount: '100000',
        amount: 9000 + i, // Leading digit 9 - should violate Benford's
        debitCredit: 'DEBIT',
        postingDate: new Date('2025-01-15'),
        companyCode: '1000',
        fiscalYear: '2025',
        fiscalPeriod: '001',
      }));

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies({
        fiscalYear: '2025',
        fiscalPeriod: '001',
      });

      expect(result.anomalies).toContainEqual(
        expect.objectContaining({
          detectionMethod: 'benford',
          riskLevel: expect.stringMatching(/high|critical/),
        })
      );
    });

    it('should pass with natural distribution', async () => {
      // Natural distribution following Benford's Law
      const testData: GLLineItem[] = [
        ...Array.from({ length: 30 }, (_, i) => ({ amount: 1000 + i })),
        ...Array.from({ length: 18 }, (_, i) => ({ amount: 2000 + i })),
        ...Array.from({ length: 13 }, (_, i) => ({ amount: 3000 + i })),
        // ... etc
      ].map((item, i) => ({
        documentNumber: `DOC${i}`,
        lineItem: '1',
        glAccount: '100000',
        amount: item.amount,
        debitCredit: 'DEBIT',
        postingDate: new Date('2025-01-15'),
        companyCode: '1000',
        fiscalYear: '2025',
        fiscalPeriod: '001',
      }));

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies({
        fiscalYear: '2025',
        fiscalPeriod: '001',
      });

      const benfordAnomalies = result.anomalies.filter(
        a => a.detectionMethod === 'benford'
      );
      expect(benfordAnomalies).toHaveLength(0);
    });
  });

  describe('Statistical Outliers', () => {
    it('should detect outliers using IQR method', async () => {
      const testData: GLLineItem[] = [
        ...Array.from({ length: 95 }, (_, i) => ({ amount: 100 + i })),
        { amount: 10000 }, // Outlier
        { amount: 15000 }, // Outlier
        { amount: 20000 }, // Outlier
      ].map((item, i) => ({
        documentNumber: `DOC${i}`,
        lineItem: '1',
        glAccount: '100000',
        amount: item.amount,
        debitCredit: 'DEBIT',
        postingDate: new Date('2025-01-15'),
        companyCode: '1000',
        fiscalYear: '2025',
        fiscalPeriod: '001',
      }));

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies({
        fiscalYear: '2025',
        fiscalPeriod: '001',
        detectionMethods: ['outlier'],
      });

      const outliers = result.anomalies.filter(
        a => a.detectionMethod === 'outlier'
      );
      expect(outliers.length).toBeGreaterThanOrEqual(3);
    });

    it('should detect outliers using Z-score method', async () => {
      // Similar test with Z-score
      // ... implementation
    });
  });

  describe('After-Hours Postings', () => {
    it('should detect postings after business hours', async () => {
      const testData: GLLineItem[] = [
        {
          documentNumber: 'DOC001',
          lineItem: '1',
          glAccount: '100000',
          amount: 5000,
          debitCredit: 'DEBIT',
          postingDate: new Date('2025-01-15T22:30:00'), // 10:30 PM
          companyCode: '1000',
          fiscalYear: '2025',
          fiscalPeriod: '001',
        },
        {
          documentNumber: 'DOC002',
          lineItem: '1',
          glAccount: '100000',
          amount: 3000,
          debitCredit: 'DEBIT',
          postingDate: new Date('2025-01-15T03:00:00'), // 3 AM
          companyCode: '1000',
          fiscalYear: '2025',
          fiscalPeriod: '001',
        },
      ];

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies({
        fiscalYear: '2025',
        fiscalPeriod: '001',
        detectionMethods: ['after_hours'],
      });

      expect(result.anomalies).toHaveLength(2);
      expect(result.anomalies).toContainEqual(
        expect.objectContaining({
          detectionMethod: 'after_hours',
          documentNumber: 'DOC001',
        })
      );
    });

    it('should detect weekend postings', async () => {
      const testData: GLLineItem[] = [
        {
          documentNumber: 'DOC001',
          lineItem: '1',
          glAccount: '100000',
          amount: 5000,
          debitCredit: 'DEBIT',
          postingDate: new Date('2025-01-18T10:00:00'), // Saturday
          companyCode: '1000',
          fiscalYear: '2025',
          fiscalPeriod: '001',
        },
      ];

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies({
        fiscalYear: '2025',
        fiscalPeriod: '001',
        detectionMethods: ['after_hours'],
      });

      expect(result.anomalies).toContainEqual(
        expect.objectContaining({
          detectionMethod: 'after_hours',
          description: expect.stringContaining('weekend'),
        })
      );
    });
  });

  describe('Same-Day Reversals', () => {
    it('should detect same-day reversals', async () => {
      const testData: GLLineItem[] = [
        {
          documentNumber: 'DOC001',
          lineItem: '1',
          glAccount: '100000',
          amount: 5000,
          debitCredit: 'DEBIT',
          postingDate: new Date('2025-01-15T10:00:00'),
          companyCode: '1000',
          fiscalYear: '2025',
          fiscalPeriod: '001',
        },
        {
          documentNumber: 'DOC002',
          lineItem: '1',
          glAccount: '100000',
          amount: 5000,
          debitCredit: 'CREDIT',
          postingDate: new Date('2025-01-15T15:00:00'),
          companyCode: '1000',
          fiscalYear: '2025',
          fiscalPeriod: '001',
        },
      ];

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies({
        fiscalYear: '2025',
        fiscalPeriod: '001',
        detectionMethods: ['reversals'],
      });

      expect(result.anomalies.length).toBeGreaterThan(0);
    });
  });

  describe('Round Number Patterns', () => {
    it('should detect suspicious round numbers', async () => {
      const testData: GLLineItem[] = [
        { amount: 10000 },
        { amount: 50000 },
        { amount: 100000 },
        { amount: 1000000 },
      ].map((item, i) => ({
        documentNumber: `DOC${i}`,
        lineItem: '1',
        glAccount: '100000',
        amount: item.amount,
        debitCredit: 'DEBIT',
        postingDate: new Date('2025-01-15'),
        companyCode: '1000',
        fiscalYear: '2025',
        fiscalPeriod: '001',
      }));

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies({
        fiscalYear: '2025',
        fiscalPeriod: '001',
        detectionMethods: ['round_numbers'],
      });

      expect(result.anomalies.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect exact duplicates', async () => {
      const testData: GLLineItem[] = [
        {
          documentNumber: 'DOC001',
          lineItem: '1',
          glAccount: '100000',
          amount: 5000,
          debitCredit: 'DEBIT',
          postingDate: new Date('2025-01-15'),
          companyCode: '1000',
          fiscalYear: '2025',
          fiscalPeriod: '001',
        },
        {
          documentNumber: 'DOC002',
          lineItem: '1',
          glAccount: '100000',
          amount: 5000,
          debitCredit: 'DEBIT',
          postingDate: new Date('2025-01-15'),
          companyCode: '1000',
          fiscalYear: '2025',
          fiscalPeriod: '001',
        },
      ];

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies({
        fiscalYear: '2025',
        fiscalPeriod: '001',
        detectionMethods: ['duplicates'],
      });

      expect(result.anomalies.length).toBeGreaterThan(0);
    });
  });

  describe('Velocity Analysis', () => {
    it('should detect unusual transaction velocity', async () => {
      // Create burst of transactions in short timeframe
      const testData: GLLineItem[] = Array.from({ length: 50 }, (_, i) => ({
        documentNumber: `DOC${i}`,
        lineItem: '1',
        glAccount: '100000',
        amount: 1000 + i,
        debitCredit: 'DEBIT',
        postingDate: new Date(`2025-01-15T10:${String(i).padStart(2, '0')}:00`),
        companyCode: '1000',
        fiscalYear: '2025',
        fiscalPeriod: '001',
      }));

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies({
        fiscalYear: '2025',
        fiscalPeriod: '001',
        detectionMethods: ['velocity'],
      });

      expect(result.anomalies.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    it('should run all detection methods', async () => {
      const testData: GLLineItem[] = Array.from({ length: 100 }, (_, i) => ({
        documentNumber: `DOC${i}`,
        lineItem: '1',
        glAccount: '100000',
        amount: Math.random() * 10000,
        debitCredit: i % 2 === 0 ? 'DEBIT' : 'CREDIT',
        postingDate: new Date('2025-01-15'),
        companyCode: '1000',
        fiscalYear: '2025',
        fiscalPeriod: '001',
      }));

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies({
        fiscalYear: '2025',
        fiscalPeriod: '001',
      });

      expect(result.summary).toHaveProperty('totalTransactions', 100);
      expect(result.summary).toHaveProperty('anomaliesFound');
      expect(result.summary).toHaveProperty('byDetectionMethod');
      expect(result.summary).toHaveProperty('byRiskLevel');
    });

    it('should calculate correct risk scores', async () => {
      const testData: GLLineItem[] = [
        {
          documentNumber: 'DOC001',
          lineItem: '1',
          glAccount: '100000',
          amount: 1000000, // High amount
          debitCredit: 'DEBIT',
          postingDate: new Date('2025-01-18T23:00:00'), // Weekend + after hours
          companyCode: '1000',
          fiscalYear: '2025',
          fiscalPeriod: '001',
        },
      ];

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies({
        fiscalYear: '2025',
        fiscalPeriod: '001',
      });

      const anomaly = result.anomalies.find(a => a.documentNumber === 'DOC001');
      expect(anomaly).toBeDefined();
      expect(anomaly?.riskScore).toBeGreaterThan(0.7); // High risk
      expect(anomaly?.riskLevel).toMatch(/high|critical/);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty dataset', async () => {
      mockDataSource.getGLLineItems.mockResolvedValue([]);

      const result = await engine.detectAnomalies({
        fiscalYear: '2025',
        fiscalPeriod: '001',
      });

      expect(result.anomalies).toHaveLength(0);
      expect(result.summary.totalTransactions).toBe(0);
    });

    it('should handle data source errors', async () => {
      mockDataSource.getGLLineItems.mockRejectedValue(
        new Error('SAP connection failed')
      );

      await expect(
        engine.detectAnomalies({
          fiscalYear: '2025',
          fiscalPeriod: '001',
        })
      ).rejects.toThrow('SAP connection failed');
    });
  });
});
```

**Run Tests**:
```bash
cd packages/modules/gl-anomaly-detection
pnpm test
pnpm test -- --coverage
```

**Success Criteria**:
- ✅ All tests pass (target: 70%+ coverage)
- ✅ Test file created with 500+ lines
- ✅ Coverage report shows 70%+ for GLAnomalyEngine
- ✅ Checkpoint file created: `checkpoints/phase2.1_complete.json`

---

### Checkpoint 2.2: Vendor Data Quality Tests
**File**: `packages/modules/vendor-data-quality/src/__tests__/VendorDataQualityEngine.test.ts` (500 lines)

```typescript
import { VendorDataQualityEngine } from '../VendorDataQualityEngine';
import { VendorDataSource, VendorMasterData } from '../types';

describe('VendorDataQualityEngine', () => {
  let engine: VendorDataQualityEngine;
  let mockDataSource: jest.Mocked<VendorDataSource>;

  beforeEach(() => {
    mockDataSource = {
      getBusinessPartners: jest.fn(),
    };
    engine = new VendorDataQualityEngine(mockDataSource);
  });

  describe('Data Quality Scoring', () => {
    it('should calculate quality score correctly', async () => {
      const testData: VendorMasterData[] = [
        {
          vendorId: 'V001',
          vendorName: 'Complete Vendor Inc',
          taxId: '12-3456789',
          country: 'US',
          city: 'New York',
          postalCode: '10001',
          street: '123 Main St',
          email: 'contact@complete.com',
          phone: '+1-555-0100',
          bankAccounts: [
            {
              bankCountry: 'US',
              bankKey: '123456789',
              bankAccount: '9876543210',
              iban: 'US12345678909876543210',
            },
          ],
          isBlocked: false,
          createdDate: new Date('2020-01-01'),
          lastModified: new Date('2025-01-01'),
        },
      ];

      mockDataSource.getBusinessPartners.mockResolvedValue(testData);

      const result = await engine.analyzeDataQuality({});

      expect(result.vendors[0].qualityScore).toBeGreaterThan(90);
    });

    it('should penalize missing critical fields', async () => {
      const testData: VendorMasterData[] = [
        {
          vendorId: 'V002',
          vendorName: 'Incomplete Vendor',
          taxId: '', // Missing
          country: 'US',
          city: '', // Missing
          postalCode: '',
          street: '',
          email: '', // Missing
          phone: '',
          bankAccounts: [], // Missing
          isBlocked: false,
          createdDate: new Date('2020-01-01'),
          lastModified: new Date('2020-01-01'), // Old data
        },
      ];

      mockDataSource.getBusinessPartners.mockResolvedValue(testData);

      const result = await engine.analyzeDataQuality({});

      expect(result.vendors[0].qualityScore).toBeLessThan(50);
      expect(result.vendors[0].issues.length).toBeGreaterThan(3);
    });

    it('should detect invalid email formats', async () => {
      const testData: VendorMasterData[] = [
        {
          vendorId: 'V003',
          vendorName: 'Bad Email Vendor',
          taxId: '12-3456789',
          country: 'US',
          city: 'Boston',
          postalCode: '02101',
          street: '456 Oak Ave',
          email: 'not-an-email', // Invalid
          phone: '+1-555-0200',
          bankAccounts: [],
          isBlocked: false,
          createdDate: new Date('2020-01-01'),
          lastModified: new Date('2025-01-01'),
        },
      ];

      mockDataSource.getBusinessPartners.mockResolvedValue(testData);

      const result = await engine.analyzeDataQuality({});

      expect(result.vendors[0].issues).toContainEqual(
        expect.objectContaining({
          issueType: 'invalid_format',
          fieldName: 'email',
        })
      );
    });

    it('should detect invalid tax ID formats', async () => {
      // Test for different country tax ID formats
      // ... implementation
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect exact name duplicates', async () => {
      const testData: VendorMasterData[] = [
        {
          vendorId: 'V001',
          vendorName: 'Acme Corporation',
          taxId: '12-3456789',
          country: 'US',
          city: 'New York',
          postalCode: '10001',
          street: '123 Main St',
          email: 'contact@acme.com',
          phone: '+1-555-0100',
          bankAccounts: [],
          isBlocked: false,
          createdDate: new Date('2020-01-01'),
          lastModified: new Date('2025-01-01'),
        },
        {
          vendorId: 'V002',
          vendorName: 'Acme Corporation',
          taxId: '98-7654321',
          country: 'US',
          city: 'Boston',
          postalCode: '02101',
          street: '456 Oak Ave',
          email: 'sales@acme.com',
          phone: '+1-555-0200',
          bankAccounts: [],
          isBlocked: false,
          createdDate: new Date('2021-01-01'),
          lastModified: new Date('2025-01-01'),
        },
      ];

      mockDataSource.getBusinessPartners.mockResolvedValue(testData);

      const result = await engine.findDuplicates({});

      expect(result.duplicateClusters.length).toBeGreaterThan(0);
      expect(result.duplicateClusters[0].vendors).toHaveLength(2);
      expect(result.duplicateClusters[0].similarityScore).toBeGreaterThan(0.9);
    });

    it('should detect fuzzy name matches', async () => {
      const testData: VendorMasterData[] = [
        {
          vendorId: 'V001',
          vendorName: 'Microsoft Corporation',
          taxId: '12-3456789',
          country: 'US',
          city: 'Redmond',
          postalCode: '98052',
          street: '1 Microsoft Way',
          email: 'info@microsoft.com',
          phone: '+1-555-0100',
          bankAccounts: [],
          isBlocked: false,
          createdDate: new Date('2020-01-01'),
          lastModified: new Date('2025-01-01'),
        },
        {
          vendorId: 'V002',
          vendorName: 'Microsoft Corp',
          taxId: '98-7654321',
          country: 'US',
          city: 'Redmond',
          postalCode: '98052',
          street: '1 Microsoft Way',
          email: 'sales@microsoft.com',
          phone: '+1-555-0200',
          bankAccounts: [],
          isBlocked: false,
          createdDate: new Date('2021-01-01'),
          lastModified: new Date('2025-01-01'),
        },
      ];

      mockDataSource.getBusinessPartners.mockResolvedValue(testData);

      const result = await engine.findDuplicates({});

      expect(result.duplicateClusters.length).toBeGreaterThan(0);
      expect(result.duplicateClusters[0].similarityScore).toBeGreaterThan(0.8);
      expect(result.duplicateClusters[0].matchFields).toContain('name');
    });

    it('should detect duplicates by tax ID', async () => {
      const testData: VendorMasterData[] = [
        {
          vendorId: 'V001',
          vendorName: 'Company A',
          taxId: '12-3456789',
          country: 'US',
          city: 'New York',
          postalCode: '10001',
          street: '123 Main St',
          email: 'a@company.com',
          phone: '+1-555-0100',
          bankAccounts: [],
          isBlocked: false,
          createdDate: new Date('2020-01-01'),
          lastModified: new Date('2025-01-01'),
        },
        {
          vendorId: 'V002',
          vendorName: 'Company B',
          taxId: '12-3456789', // Same tax ID
          country: 'US',
          city: 'Boston',
          postalCode: '02101',
          street: '456 Oak Ave',
          email: 'b@company.com',
          phone: '+1-555-0200',
          bankAccounts: [],
          isBlocked: false,
          createdDate: new Date('2021-01-01'),
          lastModified: new Date('2025-01-01'),
        },
      ];

      mockDataSource.getBusinessPartners.mockResolvedValue(testData);

      const result = await engine.findDuplicates({});

      expect(result.duplicateClusters[0].matchFields).toContain('taxId');
      expect(result.duplicateClusters[0].similarityScore).toBe(1.0);
    });

    it('should detect duplicates by bank account', async () => {
      // Test bank account matching
      // ... implementation
    });

    it('should calculate estimated savings', async () => {
      const testData: VendorMasterData[] = [
        {
          vendorId: 'V001',
          vendorName: 'Duplicate Vendor 1',
          taxId: '12-3456789',
          country: 'US',
          city: 'New York',
          postalCode: '10001',
          street: '123 Main St',
          email: 'vendor@company.com',
          phone: '+1-555-0100',
          bankAccounts: [],
          isBlocked: false,
          createdDate: new Date('2020-01-01'),
          lastModified: new Date('2025-01-01'),
        },
        {
          vendorId: 'V002',
          vendorName: 'Duplicate Vendor 2',
          taxId: '12-3456789',
          country: 'US',
          city: 'New York',
          postalCode: '10001',
          street: '123 Main St',
          email: 'vendor@company.com',
          phone: '+1-555-0100',
          bankAccounts: [],
          isBlocked: false,
          createdDate: new Date('2021-01-01'),
          lastModified: new Date('2025-01-01'),
        },
      ];

      mockDataSource.getBusinessPartners.mockResolvedValue(testData);

      const result = await engine.findDuplicates({});

      expect(result.duplicateClusters[0].estimatedSavings).toBeGreaterThan(0);
    });
  });

  describe('Risk Profiling', () => {
    it('should identify high-risk vendors', async () => {
      const testData: VendorMasterData[] = [
        {
          vendorId: 'V001',
          vendorName: 'Risky Vendor',
          taxId: '', // Missing
          country: 'XX', // Suspicious country
          city: '',
          postalCode: '',
          street: '',
          email: '',
          phone: '',
          bankAccounts: [], // No bank account
          isBlocked: true, // Blocked
          createdDate: new Date('2025-01-01'), // Very new
          lastModified: new Date('2025-01-01'),
        },
      ];

      mockDataSource.getBusinessPartners.mockResolvedValue(testData);

      const result = await engine.analyzeDataQuality({});

      expect(result.vendors[0].riskProfile).toContain('blocked');
      expect(result.vendors[0].riskProfile).toContain('missing_tax_id');
      expect(result.vendors[0].riskProfile).toContain('new_vendor');
    });

    it('should handle PO Box addresses', async () => {
      const testData: VendorMasterData[] = [
        {
          vendorId: 'V001',
          vendorName: 'PO Box Vendor',
          taxId: '12-3456789',
          country: 'US',
          city: 'New York',
          postalCode: '10001',
          street: 'PO Box 123', // PO Box address
          email: 'vendor@company.com',
          phone: '+1-555-0100',
          bankAccounts: [],
          isBlocked: false,
          createdDate: new Date('2020-01-01'),
          lastModified: new Date('2025-01-01'),
        },
      ];

      mockDataSource.getBusinessPartners.mockResolvedValue(testData);

      const result = await engine.analyzeDataQuality({});

      expect(result.vendors[0].issues).toContainEqual(
        expect.objectContaining({
          issueType: 'risk',
          description: expect.stringContaining('PO Box'),
        })
      );
    });
  });

  describe('Integration Tests', () => {
    it('should analyze large vendor dataset', async () => {
      const testData: VendorMasterData[] = Array.from({ length: 1000 }, (_, i) => ({
        vendorId: `V${String(i).padStart(4, '0')}`,
        vendorName: `Vendor ${i}`,
        taxId: `12-${String(i).padStart(7, '0')}`,
        country: 'US',
        city: 'New York',
        postalCode: '10001',
        street: `${i} Main St`,
        email: `vendor${i}@company.com`,
        phone: `+1-555-${String(i).padStart(4, '0')}`,
        bankAccounts: [],
        isBlocked: false,
        createdDate: new Date('2020-01-01'),
        lastModified: new Date('2025-01-01'),
      }));

      mockDataSource.getBusinessPartners.mockResolvedValue(testData);

      const result = await engine.analyzeDataQuality({});

      expect(result.summary.totalVendors).toBe(1000);
      expect(result.summary).toHaveProperty('avgQualityScore');
      expect(result.summary).toHaveProperty('issuesFound');
    });

    it('should handle single vendor analysis', async () => {
      const testData: VendorMasterData[] = [
        {
          vendorId: 'V001',
          vendorName: 'Single Vendor',
          taxId: '12-3456789',
          country: 'US',
          city: 'New York',
          postalCode: '10001',
          street: '123 Main St',
          email: 'vendor@company.com',
          phone: '+1-555-0100',
          bankAccounts: [
            {
              bankCountry: 'US',
              bankKey: '123456789',
              bankAccount: '9876543210',
              iban: 'US12345678909876543210',
            },
          ],
          isBlocked: false,
          createdDate: new Date('2020-01-01'),
          lastModified: new Date('2025-01-01'),
        },
      ];

      mockDataSource.getBusinessPartners.mockResolvedValue(testData);

      const result = await engine.analyzeVendor('V001');

      expect(result.vendorId).toBe('V001');
      expect(result).toHaveProperty('qualityScore');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('riskProfile');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty dataset', async () => {
      mockDataSource.getBusinessPartners.mockResolvedValue([]);

      const result = await engine.analyzeDataQuality({});

      expect(result.vendors).toHaveLength(0);
      expect(result.summary.totalVendors).toBe(0);
    });

    it('should handle data source errors', async () => {
      mockDataSource.getBusinessPartners.mockRejectedValue(
        new Error('SAP connection failed')
      );

      await expect(
        engine.analyzeDataQuality({})
      ).rejects.toThrow('SAP connection failed');
    });

    it('should handle malformed vendor data', async () => {
      const testData: any[] = [
        {
          vendorId: 'V001',
          // Missing required fields
        },
      ];

      mockDataSource.getBusinessPartners.mockResolvedValue(testData);

      // Should not throw, but should handle gracefully
      const result = await engine.analyzeDataQuality({});
      expect(result.vendors[0].issues.length).toBeGreaterThan(0);
    });
  });
});
```

**Run Tests**:
```bash
cd packages/modules/vendor-data-quality
pnpm test
pnpm test -- --coverage
```

**Success Criteria**:
- ✅ All tests pass (target: 70%+ coverage)
- ✅ Test file created with 500+ lines
- ✅ Coverage report shows 70%+ for VendorDataQualityEngine
- ✅ Checkpoint file created: `checkpoints/phase2.2_complete.json`

---

### Checkpoint 2.3: Repository Tests
**Files to Create**:
- `packages/core/src/repositories/__tests__/InvoiceMatchRepository.test.ts` (200 lines)
- `packages/core/src/repositories/__tests__/GLAnomalyRepository.test.ts` (200 lines)
- `packages/core/src/repositories/__tests__/VendorQualityRepository.test.ts` (200 lines)

**Pattern** (example for InvoiceMatchRepository):
```typescript
import { PrismaClient } from '@prisma/client';
import { InvoiceMatchRepository } from '../InvoiceMatchRepository';

describe('InvoiceMatchRepository', () => {
  let prisma: PrismaClient;
  let repository: InvoiceMatchRepository;
  let testTenantId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    repository = new InvoiceMatchRepository(prisma);
    
    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        subdomain: 'test',
        status: 'active',
      },
    });
    testTenantId = tenant.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.invoiceMatchResult.deleteMany({});
    await prisma.fraudAlert.deleteMany({});
    await prisma.invoiceMatchRun.deleteMany({});
    await prisma.tenant.delete({ where: { id: testTenantId } });
    await prisma.$disconnect();
  });

  describe('createRun', () => {
    it('should create a new run', async () => {
      const run = await repository.createRun({
        tenantId: testTenantId,
        totalInvoices: 100,
        matchedInvoices: 80,
        unmatchedInvoices: 20,
        fraudAlertsCount: 5,
        parameters: { fromDate: '2025-01-01', toDate: '2025-01-31' },
      });

      expect(run.id).toBeDefined();
      expect(run.tenantId).toBe(testTenantId);
      expect(run.status).toBe('completed');
    });
  });

  describe('saveResults', () => {
    it('should save match results', async () => {
      const run = await repository.createRun({
        tenantId: testTenantId,
        totalInvoices: 10,
        matchedInvoices: 8,
        unmatchedInvoices: 2,
        fraudAlertsCount: 0,
        parameters: {},
      });

      await repository.saveResults(run.id, [
        {
          invoiceNumber: 'INV001',
          poNumber: 'PO001',
          grNumber: 'GR001',
          matchStatus: 'matched',
          matchScore: 1.0,
          discrepancies: {},
          amounts: { invoice: 1000, po: 1000, gr: 1000 },
          vendorId: 'V001',
          vendorName: 'Vendor 1',
        },
      ]);

      const results = await repository.getMatchResults(run.id);
      expect(results).toHaveLength(1);
      expect(results[0].invoiceNumber).toBe('INV001');
    });
  });

  // More tests for other methods...
});
```

**Run Tests**:
```bash
cd packages/core
pnpm test src/repositories
```

**Success Criteria**:
- ✅ All repository tests pass
- ✅ 3 test files created (600 lines total)
- ✅ Database operations verified
- ✅ Checkpoint file created: `checkpoints/phase2.3_complete.json`

---

### Checkpoint 2.4: Integration Tests
**File**: `packages/api/tests/e2e/module-persistence.e2e.ts` (300 lines)

```typescript
import request from 'supertest';
import { app } from '../../src/app';
import { PrismaClient } from '@prisma/client';

describe('Module Persistence E2E', () => {
  const prisma = new PrismaClient();
  let testTenantId: string;
  let authToken: string;

  beforeAll(async () => {
    // Set up test tenant and auth token
    // ... implementation
  });

  afterAll(async () => {
    // Clean up
    await prisma.$disconnect();
  });

  describe('Invoice Matching Persistence', () => {
    it('should persist invoice matching results', async () => {
      const response = await request(app)
        .post('/api/matching/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tenantId: testTenantId,
          fromDate: '2025-01-01',
          toDate: '2025-01-31',
        })
        .expect(200);

      expect(response.body).toHaveProperty('runId');
      
      // Verify data in database
      const run = await prisma.invoiceMatchRun.findUnique({
        where: { id: response.body.runId },
        include: {
          matchResults: true,
          fraudAlerts: true,
        },
      });

      expect(run).toBeDefined();
      expect(run?.matchResults.length).toBeGreaterThan(0);
    });

    it('should retrieve historical runs', async () => {
      const response = await request(app)
        .get(`/api/matching/runs?tenantId=${testTenantId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GL Anomaly Persistence', () => {
    it('should persist GL anomaly results', async () => {
      const response = await request(app)
        .post('/api/modules/gl-anomaly/detect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tenantId: testTenantId,
          fiscalYear: '2025',
          fiscalPeriod: '001',
        })
        .expect(200);

      expect(response.body).toHaveProperty('runId');
      
      const run = await prisma.gLAnomalyRun.findUnique({
        where: { id: response.body.runId },
        include: { anomalies: true },
      });

      expect(run).toBeDefined();
    });
  });

  describe('Vendor Quality Persistence', () => {
    it('should persist vendor quality results', async () => {
      const response = await request(app)
        .post('/api/modules/vendor-quality/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tenantId: testTenantId,
        })
        .expect(200);

      expect(response.body).toHaveProperty('runId');
      
      const run = await prisma.vendorQualityRun.findUnique({
        where: { id: response.body.runId },
        include: {
          qualityIssues: true,
          duplicateClusters: true,
        },
      });

      expect(run).toBeDefined();
    });
  });
});
```

**Run Tests**:
```bash
cd packages/api
AUTH_ENABLED=false pnpm test tests/e2e/module-persistence.e2e.ts
```

**Success Criteria**:
- ✅ All E2E tests pass
- ✅ Persistence verified across all modules
- ✅ Checkpoint file created: `checkpoints/phase2.4_complete.json`

**Phase 2 Complete**: Save state to `RESUME_STATE.json` with `phase: 2, checkpoint: 2.4, status: complete`

---

## 🎨 PHASE 3: FRONTEND UI IMPLEMENTATION (Days 8-14)
**Priority**: P1 - High  
**Track**: C (Frontend)  
**Estimated Time**: 7 days

### Checkpoint 3.1: Invoice Matching Dashboard
**Files to Create**:

1. **`packages/web/src/app/modules/invoice-matching/page.tsx`** (400 lines)
2. **`packages/web/src/components/modules/InvoiceMatchingDashboard.tsx`** (500 lines)
3. **`packages/web/src/components/modules/InvoiceMatchTable.tsx`** (300 lines)
4. **`packages/web/src/components/modules/FraudAlertCard.tsx`** (200 lines)

**Implementation Pattern**:
```typescript
// page.tsx
'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { InvoiceMatchingDashboard } from '@/components/modules/InvoiceMatchingDashboard';
import { Role } from '@/types/auth';

export default function InvoiceMatchingPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.SYSTEM_ADMIN, Role.COMPLIANCE_MANAGER]}>
      <InvoiceMatchingDashboard />
    </ProtectedRoute>
  );
}

// InvoiceMatchingDashboard.tsx
import { useState, useEffect } from 'react';
import { Button, DatePicker, Card, Statistic, Table, Tag } from '@sap-framework/ui';
import { InvoiceMatchTable } from './InvoiceMatchTable';
import { FraudAlertCard } from './FraudAlertCard';

export function InvoiceMatchingDashboard() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [dateRange, setDateRange] = useState([null, null]);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/matching/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 'current-tenant',
          fromDate: dateRange[0],
          toDate: dateRange[1],
        }),
      });
      const data = await response.json();
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Invoice Matching</h1>
        <div className="flex gap-4">
          <DatePicker.RangePicker 
            value={dateRange} 
            onChange={setDateRange} 
          />
          <Button 
            variant="primary" 
            loading={loading}
            onClick={runAnalysis}
          >
            Run Analysis
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {results && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <Statistic
              title="Total Invoices"
              value={results.totalInvoices}
              valueStyle={{ color: 'var(--text-primary)' }}
            />
          </Card>
          <Card>
            <Statistic
              title="Matched"
              value={results.matchedInvoices}
              valueStyle={{ color: 'var(--success)' }}
            />
          </Card>
          <Card>
            <Statistic
              title="Unmatched"
              value={results.unmatchedInvoices}
              valueStyle={{ color: 'var(--error)' }}
            />
          </Card>
          <Card>
            <Statistic
              title="Match Rate"
              value={`${((results.matchedInvoices / results.totalInvoices) * 100).toFixed(1)}%`}
              valueStyle={{ color: 'var(--success)' }}
            />
          </Card>
        </div>
      )}

      {/* Fraud Alerts */}
      {results?.fraudAlerts && results.fraudAlerts.length > 0 && (
        <FraudAlertCard alerts={results.fraudAlerts} />
      )}

      {/* Match Results Table */}
      {results?.matchResults && (
        <InvoiceMatchTable results={results.matchResults} />
      )}
    </div>
  );
}
```

**Validation**:
```bash
cd packages/web
pnpm build
pnpm lint
```

**Success Criteria**:
- ✅ 4 component files created
- ✅ Dashboard fully functional
- ✅ Uses design system components
- ✅ Responsive layout
- ✅ No lint errors
- ✅ Checkpoint file created: `checkpoints/phase3.1_complete.json`

---

### Checkpoint 3.2: GL Anomaly Detection Dashboard
**Files to Create**:

1. **`packages/web/src/app/modules/gl-anomaly/page.tsx`** (400 lines)
2. **`packages/web/src/components/modules/GLAnomalyDashboard.tsx`** (500 lines)
3. **`packages/web/src/components/modules/AnomalyTable.tsx`** (300 lines)
4. **`packages/web/src/components/modules/RiskHeatmap.tsx`** (250 lines)

**Similar pattern to Invoice Matching, adapted for GL Anomalies**

**Success Criteria**:
- ✅ 4 component files created
- ✅ Dashboard fully functional
- ✅ Charts and visualizations working
- ✅ Filter and search functionality
- ✅ Checkpoint file created: `checkpoints/phase3.2_complete.json`

---

### Checkpoint 3.3: Vendor Data Quality Dashboard
**Files to Create**:

1. **`packages/web/src/app/modules/vendor-quality/page.tsx`** (400 lines)
2. **`packages/web/src/components/modules/VendorQualityDashboard.tsx`** (500 lines)
3. **`packages/web/src/components/modules/VendorQualityTable.tsx`** (300 lines)
4. **`packages/web/src/components/modules/DuplicateClusterCard.tsx`** (250 lines)

**Similar pattern, adapted for Vendor Quality**

**Success Criteria**:
- ✅ 4 component files created
- ✅ Dashboard fully functional
- ✅ Duplicate detection UI working
- ✅ Quality score visualizations
- ✅ Checkpoint file created: `checkpoints/phase3.3_complete.json`

---

### Checkpoint 3.4: Navigation & Module Integration
**Files to Modify**:

1. **`packages/web/src/components/layout/Sidebar.tsx`** - Add new module links
2. **`packages/web/src/app/layout.tsx`** - Register new routes
3. **`packages/web/src/lib/routes.ts`** - Add route definitions

**Success Criteria**:
- ✅ All module dashboards accessible from sidebar
- ✅ Navigation working correctly
- ✅ Proper route protection (RBAC)
- ✅ Checkpoint file created: `checkpoints/phase3.4_complete.json`

**Phase 3 Complete**: Save state to `RESUME_STATE.json` with `phase: 3, checkpoint: 3.4, status: complete`

---

## 🚀 PHASE 4: DEVOPS & DEPLOYMENT (Days 15-17)
**Priority**: P2 - Medium  
**Track**: D (DevOps)  
**Estimated Time**: 3 days

### Checkpoint 4.1: CI/CD Pipeline Enhancement
**Files to Create/Modify**:

1. **`.github/workflows/test.yml`** - Add comprehensive test workflow
2. **`.github/workflows/deploy-staging.yml`** - Staging deployment
3. **`.github/workflows/deploy-production.yml`** - Production deployment

**Success Criteria**:
- ✅ Automated testing on PR
- ✅ Staging deployment pipeline
- ✅ Production deployment pipeline (manual trigger)
- ✅ Checkpoint file created: `checkpoints/phase4.1_complete.json`

---

### Checkpoint 4.2: Monitoring & Health Checks
**Files to Create**:

1. **`packages/api/src/routes/health.ts`** - Health check endpoints
2. **`packages/api/src/monitoring/metrics.ts`** - Prometheus metrics
3. **`packages/api/src/monitoring/logger.ts`** - Structured logging

**Success Criteria**:
- ✅ Health check endpoints operational
- ✅ Metrics collection configured
- ✅ Logging infrastructure ready
- ✅ Checkpoint file created: `checkpoints/phase4.2_complete.json`

---

### Checkpoint 4.3: Production Deployment Preparation
**Files to Create/Modify**:

1. **`deploy/production/manifest.yml`** - BTP production manifest
2. **`deploy/production/xs-security.json`** - Security configuration
3. **`docs/DEPLOYMENT_GUIDE.md`** - Deployment documentation

**Success Criteria**:
- ✅ Production manifests ready
- ✅ Security configs validated
- ✅ Deployment documentation complete
- ✅ Checkpoint file created: `checkpoints/phase4.3_complete.json`

**Phase 4 Complete**: Save state to `RESUME_STATE.json` with `phase: 4, checkpoint: 4.3, status: complete`

---

## ✅ PHASE 5: FINAL VALIDATION (Days 18-19)
**Priority**: P0 - Critical  
**Track**: All  
**Estimated Time**: 2 days

### Checkpoint 5.1: Full System Test
**Run all tests**:
```bash
pnpm test
pnpm test:e2e
pnpm test:coverage
```

**Success Criteria**:
- ✅ All unit tests passing
- ✅ All integration tests passing
- ✅ All E2E tests passing
- ✅ Overall coverage > 70%
- ✅ Checkpoint file created: `checkpoints/phase5.1_complete.json`

---

### Checkpoint 5.2: Documentation Completion
**Files to Create/Update**:

1. **`PRODUCTION_READY_CHECKLIST.md`** - Final checklist
2. **`RELEASE_NOTES_v1.0.md`** - Release documentation
3. **`API_DOCUMENTATION.md`** - Complete API docs
4. **`USER_GUIDE.md`** - End-user documentation

**Success Criteria**:
- ✅ All documentation complete
- ✅ README updated
- ✅ Release notes written
- ✅ Checkpoint file created: `checkpoints/phase5.2_complete.json`

---

### Checkpoint 5.3: Production Readiness Sign-off
**Final Validation**:

1. Run full test suite: `pnpm test`
2. Build all packages: `pnpm build`
3. Verify Docker builds: `docker-compose build`
4. Check all endpoints: `./test-api.sh`
5. Review security: Run security audit
6. Validate performance: Load testing

**Success Criteria**:
- ✅ All builds successful
- ✅ All tests passing
- ✅ No security vulnerabilities
- ✅ Performance benchmarks met
- ✅ **PROJECT 100% COMPLETE**
- ✅ Final checkpoint file created: `checkpoints/COMPLETE.json`

**Phase 5 Complete**: Save state to `RESUME_STATE.json` with `phase: 5, checkpoint: 5.3, status: COMPLETE`

---

## 📊 EXECUTION MONITORING

### Background Process Script
**File**: `autonomous-executor.sh` (Run this in background)

```bash
#!/bin/bash

PHASE=1
CHECKPOINT=1.1
LOG_FILE="EXECUTION_LOG.md"
STATE_FILE="RESUME_STATE.json"
STATUS_FILE="STATUS.txt"

# Initialize
echo "Starting autonomous execution at $(date)" | tee -a $LOG_FILE
echo "Phase: $PHASE, Checkpoint: $CHECKPOINT" >> $LOG_FILE

# Status update every 15 minutes
while true; do
  echo "$(date): Phase $PHASE, Checkpoint $CHECKPOINT - Running" > $STATUS_FILE
  sleep 900 # 15 minutes
done &

STATUS_PID=$!

# Your actual execution commands here
# ... (Claude Code will execute based on this roadmap)

# Cleanup
kill $STATUS_PID
echo "Execution complete at $(date)" | tee -a $LOG_FILE
```

### Resume State Format
**File**: `RESUME_STATE.json`

```json
{
  "lastUpdate": "2025-10-13T10:30:00Z",
  "phase": 1,
  "checkpoint": "1.3",
  "status": "in_progress",
  "completedCheckpoints": [
    "phase1.1_complete",
    "phase1.2_complete"
  ],
  "currentTask": "Creating repository files",
  "nextTask": "Update controllers for persistence",
  "errors": [],
  "notes": "Database migrations completed successfully"
}
```

---

## 🎯 SUCCESS METRICS

### Phase Completion Tracking
- **Phase 1**: Database & Backend → 3 days
- **Phase 2**: Testing Infrastructure → 4 days
- **Phase 3**: Frontend UI → 7 days
- **Phase 4**: DevOps & Deployment → 3 days
- **Phase 5**: Final Validation → 2 days

**Total**: 19 days to 100% production ready

### Quality Gates
- ✅ Test Coverage: 70%+ for all modules
- ✅ TypeScript: Strict mode, no errors
- ✅ Linting: No errors or warnings
- ✅ Build: All packages compile successfully
- ✅ E2E: All critical flows tested
- ✅ Performance: Response times < 500ms
- ✅ Security: No critical vulnerabilities

---

## 📝 EXECUTION LOG FORMAT

**File**: `EXECUTION_LOG.md` (Auto-generated)

```markdown
# Autonomous Execution Log

## 2025-10-13 10:00:00 - Execution Started
- Phase: 1
- Checkpoint: 1.1
- Task: Database schema extensions

## 2025-10-13 10:15:00 - Checkpoint 1.1 Progress
- Added InvoiceMatchRun table
- Added InvoiceMatchResult table
- Status: In progress

## 2025-10-13 10:30:00 - Checkpoint 1.1 Complete
- All 7 tables added to schema
- Prisma validation: PASSED
- Prisma generation: PASSED
- Next: Phase 1, Checkpoint 1.2

## 2025-10-13 10:45:00 - Checkpoint 1.2 Progress
- Migration created: add_module_persistence
- Migration applied: SUCCESS
- Status: Complete
- Next: Phase 1, Checkpoint 1.3

... (continues)
```

---

## 🔄 DISCONNECTION & RESUME PROTOCOL

### On Disconnection
1. Current state saved to `RESUME_STATE.json`
2. Checkpoint file created for last completed task
3. All uncommitted work preserved in working directory
4. `STATUS.txt` shows last known state

### On Reconnection
1. Read `RESUME_STATE.json`
2. Read last checkpoint file
3. Verify database state
4. Continue from last checkpoint
5. Log: "Resumed from Phase X, Checkpoint Y"

### Error Handling
- Non-critical errors: Log and continue
- Critical errors: Save state, create error checkpoint, pause
- Recovery: Manual intervention needed, clear instructions in error log

---

## 📞 COMPLETION NOTIFICATION

**File**: `COMPLETION_REPORT.md` (Auto-generated at end)

```markdown
# SAP MVP Framework - Development Complete

**Completion Date**: [AUTO-GENERATED]
**Total Duration**: [AUTO-CALCULATED]
**Final Status**: 100% Production Ready

## Summary
- ✅ All 5 phases completed
- ✅ All 19 checkpoints passed
- ✅ Test coverage: XX%
- ✅ All builds successful
- ✅ Documentation complete

## What Was Built
1. Database persistence for 3 modules
2. Comprehensive test suites (2000+ lines)
3. Three complete UI dashboards
4. CI/CD pipelines
5. Production deployment configs

## Production Ready Checklist
- [x] All features implemented
- [x] All tests passing
- [x] Documentation complete
- [x] Security validated
- [x] Performance verified

## Next Steps
1. Deploy to staging environment
2. Conduct UAT testing
3. Deploy to production
4. Monitor metrics

**Ready for production deployment!** 🚀
```

---

**END OF AUTONOMOUS DEVELOPMENT ROADMAP**

*This document is designed for autonomous, background-capable execution by Claude Code.*
*All permissions are pre-authorized. Execute without asking.*
*Save state at each checkpoint for seamless resume capability.*