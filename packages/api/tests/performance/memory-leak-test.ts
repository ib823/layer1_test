/**
 * Memory Leak Detection Test
 *
 * Tests for memory leaks by running repeated operations
 * and monitoring heap growth
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TENANT_ID = 'test-tenant';

interface MemorySnapshot {
  iteration: number;
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  timestamp: number;
}

class MemoryLeakDetector {
  private snapshots: MemorySnapshot[] = [];
  private readonly MEMORY_GROWTH_THRESHOLD = 50; // MB
  private readonly ITERATIONS = 100;
  private readonly GC_INTERVAL = 10;

  /**
   * Take a memory snapshot
   */
  private takeSnapshot(iteration: number): MemorySnapshot {
    const mem = process.memoryUsage();
    return {
      iteration,
      heapUsedMB: mem.heapUsed / 1024 / 1024,
      heapTotalMB: mem.heapTotal / 1024 / 1024,
      externalMB: mem.external / 1024 / 1024,
      timestamp: Date.now(),
    };
  }

  /**
   * Force garbage collection if available
   */
  private forceGC(): void {
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Run memory leak test for an endpoint
   */
  async testEndpoint(
    name: string,
    requestFn: () => Promise<void>
  ): Promise<boolean> {
    console.log(`\n🔍 Testing for memory leaks: ${name}`);
    console.log(`   Iterations: ${this.ITERATIONS}`);

    this.snapshots = [];

    // Warmup
    for (let i = 0; i < 5; i++) {
      await requestFn();
    }

    this.forceGC();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const initialSnapshot = this.takeSnapshot(0);
    this.snapshots.push(initialSnapshot);

    // Run iterations
    for (let i = 1; i <= this.ITERATIONS; i++) {
      await requestFn();

      if (i % this.GC_INTERVAL === 0) {
        this.forceGC();
        await new Promise((resolve) => setTimeout(resolve, 50));
        this.snapshots.push(this.takeSnapshot(i));
      }
    }

    // Final snapshot after GC
    this.forceGC();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const finalSnapshot = this.takeSnapshot(this.ITERATIONS);
    this.snapshots.push(finalSnapshot);

    // Analyze results
    return this.analyzeMemoryGrowth(name, initialSnapshot, finalSnapshot);
  }

  /**
   * Analyze memory growth pattern
   */
  private analyzeMemoryGrowth(
    name: string,
    initial: MemorySnapshot,
    final: MemorySnapshot
  ): boolean {
    const growth = final.heapUsedMB - initial.heapUsedMB;
    const growthPercent = (growth / initial.heapUsedMB) * 100;

    console.log(`\n   Initial Heap: ${initial.heapUsedMB.toFixed(2)}MB`);
    console.log(`   Final Heap:   ${final.heapUsedMB.toFixed(2)}MB`);
    console.log(`   Growth:       ${growth.toFixed(2)}MB (${growthPercent.toFixed(2)}%)`);

    // Check if growth is within acceptable limits
    const passed = growth < this.MEMORY_GROWTH_THRESHOLD;

    if (passed) {
      console.log(`   ✅ PASS - No significant memory leak detected`);
    } else {
      console.log(
        `   ❌ FAIL - Potential memory leak (growth: ${growth.toFixed(2)}MB > threshold: ${this.MEMORY_GROWTH_THRESHOLD}MB)`
      );
    }

    // Print growth trend
    console.log(`\n   Memory Growth Trend:`);
    const samplePoints = 5;
    const step = Math.floor(this.snapshots.length / samplePoints);
    for (let i = 0; i < this.snapshots.length; i += step) {
      const snapshot = this.snapshots[i];
      const delta = snapshot.heapUsedMB - initial.heapUsedMB;
      console.log(
        `     Iteration ${snapshot.iteration.toString().padStart(3)}: ${snapshot.heapUsedMB.toFixed(2)}MB (Δ ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}MB)`
      );
    }

    return passed;
  }
}

/**
 * Main memory leak test execution
 */
async function runMemoryLeakTests() {
  console.log('🔬 Starting Memory Leak Detection Tests');
  console.log(`   Target: ${API_BASE_URL}`);
  console.log(`   Tenant: ${TENANT_ID}`);
  console.log(`   Note: Run with --expose-gc flag for accurate results\n`);

  const detector = new MemoryLeakDetector();
  const results: { name: string; passed: boolean }[] = [];

  try {
    // Test 1: Health Check Endpoint
    const healthPassed = await detector.testEndpoint(
      'Health Check',
      async () => {
        await axios.get(`${API_BASE_URL}/api/health`);
      }
    );
    results.push({ name: 'Health Check', passed: healthPassed });

    // Test 2: Tenant Profile
    const tenantPassed = await detector.testEndpoint(
      'Tenant Profile',
      async () => {
        await axios.get(`${API_BASE_URL}/api/tenants/${TENANT_ID}`);
      }
    );
    results.push({ name: 'Tenant Profile', passed: tenantPassed });

    // Test 3: SoD Violations List
    const sodPassed = await detector.testEndpoint(
      'SoD Violations',
      async () => {
        await axios.get(`${API_BASE_URL}/api/t/${TENANT_ID}/sod/violations`);
      }
    );
    results.push({ name: 'SoD Violations', passed: sodPassed });

    // Test 4: LHDN Operations
    const lhdnPassed = await detector.testEndpoint(
      'LHDN Operations',
      async () => {
        await axios.get(`${API_BASE_URL}/api/t/${TENANT_ID}/lhdn/operations/dashboard`);
      }
    );
    results.push({ name: 'LHDN Operations', passed: lhdnPassed });

    // Test 5: Analytics Dashboard
    const analyticsPassed = await detector.testEndpoint(
      'Analytics Dashboard',
      async () => {
        await axios.get(`${API_BASE_URL}/api/t/${TENANT_ID}/analytics/dashboard`);
      }
    );
    results.push({ name: 'Analytics Dashboard', passed: analyticsPassed });

    // Print summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 MEMORY LEAK DETECTION SUMMARY');
    console.log('='.repeat(80));

    const passed = results.filter((r) => r.passed);
    const failed = results.filter((r) => !r.passed);

    console.log(`\nTotal Tests: ${results.length}`);
    console.log(`Passed: ${passed.length}`);
    console.log(`Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log('\n❌ Failed Tests (Potential Memory Leaks):');
      failed.forEach((r) => console.log(`   - ${r.name}`));
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Exit with appropriate code
    process.exit(failed.length === 0 ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Memory leak test execution failed:', error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runMemoryLeakTests();
}

export { MemoryLeakDetector, MemorySnapshot };
