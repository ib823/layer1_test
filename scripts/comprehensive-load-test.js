#!/usr/bin/env node

/**
 * Comprehensive Load Testing Script
 * Simulates 100 concurrent users testing all major endpoints and user flows
 */

const http = require('http');
const https = require('https');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const WEB_BASE_URL = process.env.WEB_BASE_URL || 'http://localhost:3001';
const NUM_USERS = parseInt(process.env.NUM_USERS || '100', 10);
const TEST_DURATION_MINUTES = parseInt(process.env.TEST_DURATION_MINUTES || '5', 10);

// Test statistics
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalResponseTime: 0,
  minResponseTime: Infinity,
  maxResponseTime: 0,
  requestsByEndpoint: {},
  errorsByType: {},
  userFlows: {
    completed: 0,
    failed: 0,
  },
};

// User scenarios
const scenarios = [
  {
    name: 'Tenant Management Flow',
    weight: 15,
    steps: [
      { method: 'GET', path: '/api/health' },
      { method: 'POST', path: '/api/tenants', body: (userId) => ({
        name: `LoadTest-Tenant-${userId}-${Date.now()}`,
        sapConnections: []
      }) },
      { method: 'GET', path: '/api/tenants' },
    ],
  },
  {
    name: 'SoD Analysis Flow',
    weight: 25,
    steps: [
      { method: 'GET', path: '/api/modules/sod/rules' },
      { method: 'POST', path: '/api/modules/sod/analyze', body: (userId) => ({
        tenantId: `test-tenant-${userId}`,
        ruleIds: ['rule1', 'rule2'],
        userAssignments: [],
      }) },
      { method: 'GET', path: '/api/modules/sod/violations' },
    ],
  },
  {
    name: 'Invoice Matching Flow',
    weight: 20,
    steps: [
      { method: 'GET', path: '/api/modules/matching/invoice-status' },
      { method: 'POST', path: '/api/modules/matching/match', body: (userId) => ({
        invoiceId: `INV-${userId}-${Date.now()}`,
        poId: `PO-${userId}`,
        grId: `GR-${userId}`,
      }) },
    ],
  },
  {
    name: 'GL Anomaly Detection Flow',
    weight: 20,
    steps: [
      { method: 'POST', path: '/api/modules/gl-anomaly/analyze', body: (userId) => ({
        tenantId: `test-tenant-${userId}`,
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
      }) },
      { method: 'GET', path: '/api/modules/gl-anomaly/anomalies' },
    ],
  },
  {
    name: 'Vendor Data Quality Flow',
    weight: 15,
    steps: [
      { method: 'POST', path: '/api/modules/vendor-quality/analyze', body: (userId) => ({
        tenantId: `test-tenant-${userId}`,
        vendorIds: [`V${userId}001`, `V${userId}002`],
      }) },
      { method: 'GET', path: '/api/modules/vendor-quality/issues' },
    ],
  },
  {
    name: 'LHDN e-Invoice Flow',
    weight: 5,
    steps: [
      { method: 'POST', path: '/api/modules/lhdn/submit', body: (userId) => ({
        invoiceNumber: `LHDN-${userId}-${Date.now()}`,
        amount: 1000.00,
        taxAmount: 60.00,
      }) },
      { method: 'GET', path: '/api/modules/lhdn/status' },
    ],
  },
];

// Calculate cumulative weights for scenario selection
const cumulativeWeights = scenarios.reduce((acc, scenario, idx) => {
  const prevWeight = idx === 0 ? 0 : acc[idx - 1];
  acc.push(prevWeight + scenario.weight);
  return acc;
}, []);

const totalWeight = cumulativeWeights[cumulativeWeights.length - 1];

/**
 * Select a random scenario based on weights
 */
function selectScenario() {
  const random = Math.random() * totalWeight;
  const idx = cumulativeWeights.findIndex((weight) => random < weight);
  return scenarios[idx];
}

/**
 * Make HTTP request
 */
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LoadTest/1.0',
      },
    };

    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const startTime = Date.now();
    const req = lib.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        const success = res.statusCode >= 200 && res.statusCode < 400;

        // Update stats
        stats.totalRequests++;
        if (success) {
          stats.successfulRequests++;
        } else {
          stats.failedRequests++;
          const errorType = `HTTP_${res.statusCode}`;
          stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;
        }

        stats.totalResponseTime += responseTime;
        stats.minResponseTime = Math.min(stats.minResponseTime, responseTime);
        stats.maxResponseTime = Math.max(stats.maxResponseTime, responseTime);

        const endpoint = `${method} ${path}`;
        if (!stats.requestsByEndpoint[endpoint]) {
          stats.requestsByEndpoint[endpoint] = {
            count: 0,
            successCount: 0,
            failCount: 0,
            totalTime: 0,
          };
        }
        stats.requestsByEndpoint[endpoint].count++;
        stats.requestsByEndpoint[endpoint].totalTime += responseTime;
        if (success) {
          stats.requestsByEndpoint[endpoint].successCount++;
        } else {
          stats.requestsByEndpoint[endpoint].failCount++;
        }

        resolve({ success, statusCode: res.statusCode, responseTime, data });
      });
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      stats.totalRequests++;
      stats.failedRequests++;
      stats.totalResponseTime += responseTime;

      const errorType = error.code || 'UNKNOWN';
      stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;

      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      const error = new Error('Request timeout');
      error.code = 'TIMEOUT';
      reject(error);
    });

    req.setTimeout(30000); // 30 second timeout

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Simulate a single user executing scenarios
 */
async function simulateUser(userId) {
  const userStats = {
    scenariosCompleted: 0,
    scenariosFailed: 0,
    requestsMade: 0,
  };

  const endTime = Date.now() + TEST_DURATION_MINUTES * 60 * 1000;

  try {
    while (Date.now() < endTime) {
      // Select a random scenario
      const scenario = selectScenario();

      try {
        // Execute all steps in the scenario
        for (const step of scenario.steps) {
          const body = typeof step.body === 'function' ? step.body(userId) : step.body;
          await makeRequest(step.method, step.path, body);
          userStats.requestsMade++;

          // Random delay between requests (100-500ms)
          await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 400));
        }

        userStats.scenariosCompleted++;
        stats.userFlows.completed++;
      } catch (error) {
        userStats.scenariosFailed++;
        stats.userFlows.failed++;
        // Continue to next scenario on error
      }

      // Random delay between scenarios (500-2000ms)
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1500));
    }
  } catch (error) {
    console.error(`User ${userId} encountered critical error:`, error.message);
  }

  return userStats;
}

/**
 * Print real-time statistics
 */
function printStats() {
  console.clear();
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('         COMPREHENSIVE LOAD TEST - REAL-TIME STATISTICS        ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const avgResponseTime = stats.totalRequests > 0
    ? (stats.totalResponseTime / stats.totalRequests).toFixed(2)
    : 0;
  const successRate = stats.totalRequests > 0
    ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2)
    : 0;

  console.log('Overall Statistics:');
  console.log(`  Total Requests:       ${stats.totalRequests}`);
  console.log(`  Successful:           ${stats.successfulRequests} (${successRate}%)`);
  console.log(`  Failed:               ${stats.failedRequests}`);
  console.log(`  User Flows Completed: ${stats.userFlows.completed}`);
  console.log(`  User Flows Failed:    ${stats.userFlows.failed}`);
  console.log();

  console.log('Response Time:');
  console.log(`  Average:              ${avgResponseTime} ms`);
  console.log(`  Min:                  ${stats.minResponseTime === Infinity ? 0 : stats.minResponseTime} ms`);
  console.log(`  Max:                  ${stats.maxResponseTime} ms`);
  console.log();

  if (Object.keys(stats.errorsByType).length > 0) {
    console.log('Errors by Type:');
    Object.entries(stats.errorsByType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([type, count]) => {
        console.log(`  ${type.padEnd(20)} ${count}`);
      });
    console.log();
  }

  console.log('Top Endpoints by Request Count:');
  Object.entries(stats.requestsByEndpoint)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .forEach(([endpoint, endpointStats]) => {
      const avgTime = (endpointStats.totalTime / endpointStats.count).toFixed(2);
      const successRate = ((endpointStats.successCount / endpointStats.count) * 100).toFixed(1);
      console.log(`  ${endpoint}`);
      console.log(`    Count: ${endpointStats.count}, Avg Time: ${avgTime}ms, Success: ${successRate}%`);
    });

  console.log('\n═══════════════════════════════════════════════════════════════');
}

/**
 * Main function
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('         COMPREHENSIVE LOAD TEST - INITIALIZING                ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`API Base URL:         ${API_BASE_URL}`);
  console.log(`Number of Users:      ${NUM_USERS}`);
  console.log(`Test Duration:        ${TEST_DURATION_MINUTES} minutes`);
  console.log(`Scenarios:            ${scenarios.length}`);
  console.log();
  console.log('Starting load test in 3 seconds...\n');

  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Start real-time statistics display
  const statsInterval = setInterval(printStats, 2000);

  // Launch all user simulations
  const startTime = Date.now();
  const userPromises = [];
  for (let i = 0; i < NUM_USERS; i++) {
    userPromises.push(simulateUser(i));
    // Stagger user starts (10ms apart)
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // Wait for all users to complete
  const userResults = await Promise.all(userPromises);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Stop statistics display
  clearInterval(statsInterval);

  // Print final report
  console.clear();
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('         COMPREHENSIVE LOAD TEST - FINAL REPORT                ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('Test Configuration:');
  console.log(`  API Base URL:         ${API_BASE_URL}`);
  console.log(`  Concurrent Users:     ${NUM_USERS}`);
  console.log(`  Planned Duration:     ${TEST_DURATION_MINUTES} minutes`);
  console.log(`  Actual Duration:      ${duration} seconds`);
  console.log();

  const avgResponseTime = stats.totalRequests > 0
    ? (stats.totalResponseTime / stats.totalRequests).toFixed(2)
    : 0;
  const successRate = stats.totalRequests > 0
    ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2)
    : 0;
  const requestsPerSecond = (stats.totalRequests / parseFloat(duration)).toFixed(2);

  console.log('Overall Performance:');
  console.log(`  Total Requests:       ${stats.totalRequests}`);
  console.log(`  Requests/Second:      ${requestsPerSecond}`);
  console.log(`  Successful Requests:  ${stats.successfulRequests} (${successRate}%)`);
  console.log(`  Failed Requests:      ${stats.failedRequests}`);
  console.log(`  User Flows Completed: ${stats.userFlows.completed}`);
  console.log(`  User Flows Failed:    ${stats.userFlows.failed}`);
  console.log();

  console.log('Response Time Statistics:');
  console.log(`  Average:              ${avgResponseTime} ms`);
  console.log(`  Minimum:              ${stats.minResponseTime === Infinity ? 0 : stats.minResponseTime} ms`);
  console.log(`  Maximum:              ${stats.maxResponseTime} ms`);
  console.log();

  if (Object.keys(stats.errorsByType).length > 0) {
    console.log('Errors by Type:');
    Object.entries(stats.errorsByType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type.padEnd(25)} ${count}`);
      });
    console.log();
  }

  console.log('Endpoint Statistics:');
  Object.entries(stats.requestsByEndpoint)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([endpoint, endpointStats]) => {
      const avgTime = (endpointStats.totalTime / endpointStats.count).toFixed(2);
      const epSuccessRate = ((endpointStats.successCount / endpointStats.count) * 100).toFixed(1);
      console.log(`\n  ${endpoint}`);
      console.log(`    Total Requests:   ${endpointStats.count}`);
      console.log(`    Success Rate:     ${epSuccessRate}%`);
      console.log(`    Avg Response Time: ${avgTime}ms`);
      console.log(`    Successes:        ${endpointStats.successCount}`);
      console.log(`    Failures:         ${endpointStats.failCount}`);
    });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    TEST COMPLETE                              ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Exit with appropriate code
  process.exit(stats.failedRequests > stats.successfulRequests ? 1 : 0);
}

// Run the load test
main().catch((error) => {
  console.error('Load test failed:', error);
  process.exit(1);
});
