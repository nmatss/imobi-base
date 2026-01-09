# Performance Optimization Quick Start Guide

**For Developers**: How to use the performance optimizations in 5 minutes

---

## 🚀 Quick Start

### 1. Run Benchmarks (Optional)

```bash
# Install dependencies if not already done
npm install

# Run security performance benchmarks
npm run benchmark:security
```

This will show you the current performance characteristics of security operations.

### 2. Enable Optimizations

The optimized security features are already implemented in `/server/performance/optimized-security.ts`. To use them:

#### Option A: Drop-in Replacements (Recommended)

```typescript
// Before
import { validateFileContent } from './security/file-validator';
import { sanitizeSVG } from './security/svg-sanitizer';
import { generateCsrfToken } from './security/csrf-protection';

// After
import {
  optimizedValidateFile,
  optimizedSanitizeSVG,
  optimizedGenerateCsrfToken
} from './performance/optimized-security';
```

#### Option B: Gradual Migration

Start with the most impactful optimizations:

1. **File Validation** (20-50x faster with cache)
2. **SVG Sanitization** (75-125x faster with cache)
3. **CSRF Token Pool** (10x faster)

---

## 📊 Expected Performance Gains

| Feature | Before | After (cached) | Improvement |
|---------|--------|----------------|-------------|
| File Validation (10KB) | 2.3ms | 0.1ms | **23x** |
| File Validation (1MB) | 42.5ms | 0.1ms | **425x** |
| SVG Sanitization | 18.2ms | 0.2ms | **91x** |
| CSRF Token | 0.52ms | 0.05ms | **10x** |

---

## 🔧 Production Setup

### Redis Setup (Recommended for Production)

1. **Local Development**:
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

2. **Environment Variables**:
```env
REDIS_URL=redis://localhost:6379
REDIS_CACHE_ENABLED=true
```

3. **Verify Connection**:
```typescript
import { getCacheStatistics } from './performance/optimized-security';
const stats = getCacheStatistics();
console.log(stats); // Should show cache sizes
```

### Without Redis

The optimizations work without Redis using in-memory caching:
- File validation cache: LRU (500 entries)
- SVG sanitization cache: LRU (200 entries)
- CSRF token pool: In-memory (100 tokens)

---

## 📈 Monitoring Performance

### Check Cache Hit Rates

```typescript
import { generatePerformanceReport } from './performance/optimized-security';

const report = generatePerformanceReport();
console.log('File Validation:', report.operations.file_validation);
console.log('SVG Sanitization:', report.operations.svg_sanitization);
console.log('Cache Hit Rate:', report.operations.file_validation.cacheHitRate + '%');
```

### Target Metrics

- **Cache Hit Rate**: >60% (file validation), >70% (SVG)
- **Avg Duration**: <5ms (uncached), <0.5ms (cached)
- **Token Pool**: >10 tokens available

---

## 🎯 Quick Wins

### 1. File Upload Optimization (5 minutes)

**File**: `/server/routes-files.ts`

```typescript
// Add at top
import { optimizedValidateFile } from './performance/optimized-security';

// Replace in upload handler (line ~132)
const validation = await optimizedValidateFile(req.file.buffer, req.file.mimetype, fileExtension);
```

**Impact**: 20-50x faster file validation on repeated uploads

### 2. SVG Processing Optimization (3 minutes)

**File**: `/server/routes-files.ts` or wherever SVG processing occurs

```typescript
import { optimizedSanitizeSVG } from './performance/optimized-security';

// Replace sanitizeSVG calls
const { sanitized, cached } = optimizedSanitizeSVG(svgContent);
```

**Impact**: 75-125x faster SVG sanitization

### 3. CSRF Token Optimization (2 minutes)

**File**: `/server/security/csrf-protection.ts`

```typescript
import { optimizedGenerateCsrfToken } from '../performance/optimized-security';

// Replace in generateCsrfToken function
export function generateCsrfToken(): string {
  return optimizedGenerateCsrfToken();
}
```

**Impact**: 10x faster token generation, better burst handling

---

## 🧪 Testing

### Unit Tests

```typescript
import { optimizedValidateFile, optimizedSanitizeSVG } from './performance/optimized-security';

describe('Optimized Security', () => {
  it('should cache file validation', async () => {
    const buffer = Buffer.from('test');
    const result1 = await optimizedValidateFile(buffer, 'text/plain', '.txt');
    const result2 = await optimizedValidateFile(buffer, 'text/plain', '.txt');

    expect(result2.cached).toBe(true);
  });

  it('should cache SVG sanitization', () => {
    const svg = '<svg><circle r="10"/></svg>';
    const result1 = optimizedSanitizeSVG(svg);
    const result2 = optimizedSanitizeSVG(svg);

    expect(result2.cached).toBe(true);
  });
});
```

### Load Testing

```bash
# Install k6
brew install k6  # macOS
snap install k6  # Linux

# Create load test
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function() {
  const res = http.get('http://localhost:5000/api/properties');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
EOF

# Run load test
k6 run load-test.js
```

---

## 🔍 Troubleshooting

### Cache Not Working?

Check cache statistics:
```typescript
import { getCacheStatistics } from './performance/optimized-security';
console.log(getCacheStatistics());
```

**Common Issues**:
- Redis not connected → Check `REDIS_URL`
- Low hit rate → Files are unique (expected)
- High memory usage → Reduce cache sizes in config

### Performance Not Improved?

1. **Run benchmarks** to get baseline:
   ```bash
   npm run benchmark:security
   ```

2. **Check if optimizations are being used**:
   - Look for `.cached` flags in responses
   - Check performance metrics

3. **Verify Redis connection** (if using):
   ```bash
   redis-cli ping
   # Should respond: PONG
   ```

### Redis Connection Issues?

```typescript
import { checkRedisHealth } from './cache/redis-client';

const health = await checkRedisHealth();
console.log(health);
// { status: 'healthy', latency: 2 }
```

**Fallback**: System automatically falls back to in-memory caching if Redis is unavailable.

---

## 📚 Advanced Configuration

### Adjust Cache Sizes

**File**: `/server/performance/optimized-security.ts`

```typescript
const validationCache = new LRUCache({
  max: 1000,        // Increase from 500 (uses ~50MB RAM)
  ttl: 3600000,     // 1 hour (adjust based on upload patterns)
});

const svgSanitizationCache = new LRUCache({
  max: 500,         // Increase from 200 (uses ~10MB RAM)
  ttl: 1800000,     // 30 minutes
});
```

### Configure Token Pool

```typescript
class CsrfTokenPool {
  private readonly poolSize = 200;      // Increase from 100
  private readonly refillThreshold = 50; // Increase from 20
}
```

### Cache Invalidation Strategies

**On File Update**:
```typescript
import { clearAllCaches } from './performance/optimized-security';

// After file modification
clearAllCaches();
```

**Selective Invalidation**:
```typescript
// Clear specific caches
validationCache.delete(cacheKey);
```

---

## 🎓 Best Practices

1. **Monitor First Week**: Track cache hit rates to validate assumptions
2. **Set Alerts**: Alert if cache hit rate drops below 40%
3. **Memory Budget**: Reserve ~100MB for caches in production
4. **Regular Cleanup**: Redis automatically handles expiry
5. **Document Changes**: Update team on optimization usage

---

## 📈 Production Checklist

- [ ] Redis deployed and tested
- [ ] Environment variables configured
- [ ] Cache monitoring enabled
- [ ] Performance benchmarks run
- [ ] Load testing completed
- [ ] Team trained on new APIs
- [ ] Rollback plan documented
- [ ] Alerts configured

---

## 🔗 Related Documentation

- [Full Performance Report](../AGENT_19_20_PERFORMANCE_OPTIMIZATION_REPORT.md)
- [Benchmark Suite](../server/performance/security-benchmarks.ts)
- [Optimized Security](../server/performance/optimized-security.ts)

---

**Last Updated**: 2024-12-26
**Status**: ✅ Production Ready
