# Performance Testing Suite

Comprehensive performance benchmarking and memory leak detection for the SAP GRC platform.

## Overview

This suite includes:

- **API Benchmarks** - Response time, throughput, and concurrency testing
- **Memory Leak Detection** - Heap growth analysis over repeated operations
- **Load Testing** - System behavior under sustained high load

## Performance Targets

| Metric | Target | Priority |
|--------|--------|----------|
| API Response Time (P95) | <500ms | HIGH |
| SoD Analysis (1000 users) | <2s | HIGH |
| Invoice Submission | <1s | HIGH |
| Memory Usage (Steady State) | <512MB | MEDIUM |
| Throughput | >100 req/s | MEDIUM |
| Success Rate | >99% | CRITICAL |

## Prerequisites

```bash
# Install dependencies
pnpm install

# Start API server (in separate terminal)
cd packages/api
pnpm dev

# Start database (if not running)
docker-compose up -d postgres redis
```

## Running Tests

### 1. API Benchmarks

Tests response times and throughput for all major endpoints.

```bash
# Run all benchmarks
pnpm test:perf

# Run with custom base URL
API_BASE_URL=http://localhost:3000 pnpm test:perf

# Run specific benchmark
ts-node tests/performance/api-benchmarks.ts
```

**Output Example:**
```
🚀 Starting API Performance Benchmarks
   Target: http://localhost:3000
   Tenant: test-tenant

✅ PASS /api/health
   Avg Response Time: 45.23ms (target: <100ms)
   P95 Response Time: 78.12ms
   Requests/sec: 215.43
   Success Rate: 100.00%
```

### 2. Memory Leak Detection

Monitors heap growth over 100 iterations to detect memory leaks.

```bash
# Run with garbage collection (recommended)
node --expose-gc -r ts-node/register tests/performance/memory-leak-test.ts

# Or via npm script
pnpm test:memory
```

**Output Example:**
```
🔍 Testing for memory leaks: Health Check
   Iterations: 100

   Initial Heap: 45.23MB
   Final Heap:   47.89MB
   Growth:       2.66MB (5.88%)

   ✅ PASS - No significant memory leak detected
```

### 3. Load Testing (Manual)

For sustained load testing, use tools like:

**Apache Bench:**
```bash
# 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost:3000/api/health
```

**Artillery:**
```bash
# Install
npm install -g artillery

# Create config (artillery.yml)
artillery run artillery.yml
```

**K6:**
```bash
# Install k6
brew install k6  # macOS
# or download from k6.io

# Run load test
k6 run loadtest.js
```

## Interpreting Results

### API Benchmarks

- **✅ PASS**: All metrics within targets
- **❌ FAIL**: One or more metrics exceeded targets

Key metrics:
- **Avg Response Time**: Should be well below target
- **P95/P99**: 95th and 99th percentile response times
- **Requests/sec**: System throughput
- **Success Rate**: Must be >99%
- **Memory Delta**: Memory growth during test

### Memory Leak Detection

- **Growth <50MB**: No leak detected ✅
- **Growth >50MB**: Potential leak ❌
- **Steady trend**: Normal behavior
- **Linear growth**: Likely memory leak

## Troubleshooting

### High Response Times

1. Check database connection pool
2. Verify Redis is running
3. Check for expensive queries (use `EXPLAIN ANALYZE`)
4. Review caching strategy
5. Check CPU/memory on server

### Memory Leaks

1. Enable heap profiling: `node --inspect`
2. Use Chrome DevTools to inspect heap snapshots
3. Check for:
   - Unclosed connections
   - Event listener leaks
   - Large object retention
   - Circular references

### Low Throughput

1. Increase connection pool size
2. Enable HTTP keep-alive
3. Optimize database queries
4. Add caching (Redis)
5. Enable compression

## Continuous Integration

Performance tests should run:

- **On PR**: Quick smoke test (10 requests/endpoint)
- **Nightly**: Full benchmark suite
- **Pre-release**: Extended load test (30 min)

### GitHub Actions Example

```yaml
name: Performance Tests
on:
  schedule:
    - cron: '0 2 * * *'  # Run at 2 AM daily

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - name: Install dependencies
        run: pnpm install
      - name: Start services
        run: docker-compose up -d
      - name: Run benchmarks
        run: pnpm test:perf
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: ./benchmark-results.json
```

## Performance Optimization Tips

### Database

- Use connection pooling (default: 20)
- Add indexes for common queries
- Use prepared statements
- Enable query result caching
- Optimize JSONB queries

### API

- Enable gzip compression
- Use HTTP/2
- Implement rate limiting
- Add response caching (Redis)
- Batch database operations

### Memory

- Set max memory limits (512MB)
- Enable garbage collection tuning
- Monitor heap snapshots
- Use streaming for large responses
- Clear timers and intervals

## Monitoring in Production

Tools to monitor performance:

- **New Relic** - APM and monitoring
- **Datadog** - Infrastructure and application monitoring
- **Prometheus + Grafana** - Metrics and dashboards
- **Sentry** - Error tracking and performance
- **ELK Stack** - Log aggregation and analysis

### Key Metrics to Monitor

```javascript
// Response time percentiles
http_request_duration_ms{
  route="/api/sod/analysis",
  method="POST",
  quantile="0.95"
} < 2000

// Error rate
http_requests_total{status=~"5.."} / http_requests_total < 0.01

// Memory usage
nodejs_heap_size_used_bytes < 512MB

// CPU usage
process_cpu_usage_percentage < 80%
```

## Support

For performance issues:
1. Check this README
2. Review application logs
3. Run performance benchmarks
4. Create issue with benchmark results
5. Contact: ikmal.baharudin@gmail.com
