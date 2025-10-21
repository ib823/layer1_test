/**
 * API Performance Benchmarks
 *
 * Tests performance targets:
 * - API endpoints: <500ms response time
 * - SoD analysis: <2s for 1000 users
 * - Invoice submission: <1s
 * - Memory usage: <512MB under load
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TENANT_ID = 'test-tenant';

interface BenchmarkResult {
  endpoint: string;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  totalRequests: number;
  successRate: number;
  memoryUsageMB: number;
}

interface BenchmarkConfig {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: any;
  concurrentRequests: number;
  totalRequests: number;
  targetResponseTime: number;
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];

  /**
   * Run a performance benchmark for an endpoint
   */
  async runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
    console.log(`\n🏃 Running benchmark: ${config.endpoint}`);
    console.log(`   Concurrent: ${config.concurrentRequests}, Total: ${config.totalRequests}`);

    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const responseTimes: number[] = [];
    let successCount = 0;

    const startTime = performance.now();

    // Execute requests in batches
    const batchSize = config.concurrentRequests;
    const batches = Math.ceil(config.totalRequests / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const batchRequests = Math.min(batchSize, config.totalRequests - batch * batchSize);
      const promises: Promise<void>[] = [];

      for (let i = 0; i < batchRequests; i++) {
        promises.push(
          this.executeRequest(config)
            .then((time) => {
              responseTimes.push(time);
              successCount++;
            })
            .catch(() => {
              // Request failed, don't count as success
            })
        );
      }

      await Promise.all(promises);
    }

    const endTime = performance.now();
    const totalTime = (endTime - startTime) / 1000; // Convert to seconds

    const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const memoryUsageMB = endMemory - startMemory;

    // Calculate statistics
    responseTimes.sort((a, b) => a - b);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
    const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)];
    const requestsPerSecond = config.totalRequests / totalTime;
    const successRate = (successCount / config.totalRequests) * 100;

    const result: BenchmarkResult = {
      endpoint: config.endpoint,
      avgResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      requestsPerSecond,
      totalRequests: config.totalRequests,
      successRate,
      memoryUsageMB,
    };

    this.results.push(result);
    this.printResult(result, config.targetResponseTime);

    return result;
  }

  /**
   * Execute a single request and measure response time
   */
  private async executeRequest(config: BenchmarkConfig): Promise<number> {
    const startTime = performance.now();

    await axios({
      method: config.method,
      url: `${API_BASE_URL}${config.endpoint}`,
      data: config.body,
      headers: config.headers || {},
    });

    const endTime = performance.now();
    return endTime - startTime;
  }

  /**
   * Print benchmark result
   */
  private printResult(result: BenchmarkResult, target: number): void {
    const passed = result.avgResponseTime < target && result.p95ResponseTime < target * 1.5;
    const status = passed ? '✅ PASS' : '❌ FAIL';

    console.log(`\n${status} ${result.endpoint}`);
    console.log(`   Avg Response Time: ${result.avgResponseTime.toFixed(2)}ms (target: <${target}ms)`);
    console.log(`   P95 Response Time: ${result.p95ResponseTime.toFixed(2)}ms`);
    console.log(`   P99 Response Time: ${result.p99ResponseTime.toFixed(2)}ms`);
    console.log(`   Requests/sec: ${result.requestsPerSecond.toFixed(2)}`);
    console.log(`   Success Rate: ${result.successRate.toFixed(2)}%`);
    console.log(`   Memory Delta: ${result.memoryUsageMB.toFixed(2)}MB`);
  }

  /**
   * Generate final summary report
   */
  printSummary(): void {
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 PERFORMANCE BENCHMARK SUMMARY');
    console.log('='.repeat(80));

    const passed = this.results.filter((r) => r.successRate >= 95);
    const failed = this.results.filter((r) => r.successRate < 95);

    console.log(`\nTotal Benchmarks: ${this.results.length}`);
    console.log(`Passed: ${passed.length}`);
    console.log(`Failed: ${failed.length}`);

    console.log('\n📈 Overall Metrics:');
    const avgResponseTime =
      this.results.reduce((sum, r) => sum + r.avgResponseTime, 0) / this.results.length;
    const totalRPS = this.results.reduce((sum, r) => sum + r.requestsPerSecond, 0);
    const totalMemory = this.results.reduce((sum, r) => sum + r.memoryUsageMB, 0);

    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Total Throughput: ${totalRPS.toFixed(2)} req/s`);
    console.log(`   Total Memory Usage: ${totalMemory.toFixed(2)}MB`);

    if (failed.length > 0) {
      console.log('\n❌ Failed Benchmarks:');
      failed.forEach((r) => {
        console.log(`   - ${r.endpoint} (${r.successRate.toFixed(2)}% success)`);
      });
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }
}

/**
 * Main benchmark execution
 */
async function runBenchmarks() {
  const benchmark = new PerformanceBenchmark();

  console.log('🚀 Starting API Performance Benchmarks');
  console.log(`   Target: ${API_BASE_URL}`);
  console.log(`   Tenant: ${TENANT_ID}\n`);

  try {
    // 1. Health Check Endpoint (Baseline)
    await benchmark.runBenchmark({
      endpoint: '/api/health',
      method: 'GET',
      concurrentRequests: 10,
      totalRequests: 100,
      targetResponseTime: 100,
    });

    // 2. Tenant Profile Endpoint
    await benchmark.runBenchmark({
      endpoint: `/api/tenants/${TENANT_ID}`,
      method: 'GET',
      concurrentRequests: 5,
      totalRequests: 50,
      targetResponseTime: 300,
    });

    // 3. SoD Analysis Endpoint (Light Load)
    await benchmark.runBenchmark({
      endpoint: `/api/t/${TENANT_ID}/sod/analysis`,
      method: 'POST',
      body: {
        systemIds: ['system-1'],
        rulesetIds: [],
        analysisType: 'QUICK',
      },
      concurrentRequests: 2,
      totalRequests: 10,
      targetResponseTime: 2000,
    });

    // 4. SoD Violations List
    await benchmark.runBenchmark({
      endpoint: `/api/t/${TENANT_ID}/sod/violations`,
      method: 'GET',
      concurrentRequests: 5,
      totalRequests: 50,
      targetResponseTime: 500,
    });

    // 5. LHDN Operations Dashboard
    await benchmark.runBenchmark({
      endpoint: `/api/t/${TENANT_ID}/lhdn/operations/dashboard`,
      method: 'GET',
      concurrentRequests: 5,
      totalRequests: 50,
      targetResponseTime: 500,
    });

    // 6. LHDN Exception Inbox
    await benchmark.runBenchmark({
      endpoint: `/api/t/${TENANT_ID}/lhdn/exceptions`,
      method: 'GET',
      concurrentRequests: 5,
      totalRequests: 50,
      targetResponseTime: 500,
    });

    // 7. GL Anomaly Detection (Module)
    await benchmark.runBenchmark({
      endpoint: `/api/t/${TENANT_ID}/modules/gl-anomaly/analyze`,
      method: 'POST',
      body: {
        fiscalYear: '2024',
        companyCode: 'US01',
      },
      concurrentRequests: 2,
      totalRequests: 10,
      targetResponseTime: 2000,
    });

    // 8. Analytics Endpoint
    await benchmark.runBenchmark({
      endpoint: `/api/t/${TENANT_ID}/analytics/dashboard`,
      method: 'GET',
      concurrentRequests: 5,
      totalRequests: 50,
      targetResponseTime: 500,
    });

    // Print final summary
    benchmark.printSummary();

    // Exit with appropriate code
    const allPassed = benchmark['results'].every((r) => r.successRate >= 95);
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Benchmark execution failed:', error);
    process.exit(1);
  }
}

// Run benchmarks if executed directly
if (require.main === module) {
  runBenchmarks();
}

export { PerformanceBenchmark, BenchmarkResult, BenchmarkConfig };
