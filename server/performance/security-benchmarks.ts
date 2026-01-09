/**
 * SECURITY FEATURES PERFORMANCE BENCHMARKS
 *
 * Comprehensive benchmarking suite for security-related operations
 * to identify bottlenecks and measure optimization impact.
 */

import { performance } from 'perf_hooks';
import { randomBytes } from 'crypto';
import { validateFileContent, comprehensiveFileValidation } from '../security/file-validator';
import { sanitizeSVG, validateAndSanitizeSVG } from '../security/svg-sanitizer';
import { generateCsrfToken } from '../security/csrf-protection';
import { compositeRateLimit } from '../security/intrusion-detection';

// ================================================================
// BENCHMARK UTILITIES
// ================================================================

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
  memoryDelta?: number;
}

interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  totalDuration: number;
}

/**
 * Execute a benchmark with multiple iterations
 */
async function benchmark(
  operation: string,
  fn: () => Promise<any> | any,
  iterations: number = 1000
): Promise<BenchmarkResult> {
  const times: number[] = [];
  const memBefore = process.memoryUsage().heapUsed;

  // Warmup (10% of iterations)
  const warmupIterations = Math.ceil(iterations * 0.1);
  for (let i = 0; i < warmupIterations; i++) {
    await fn();
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const memAfter = process.memoryUsage().heapUsed;
  const totalTime = times.reduce((sum, t) => sum + t, 0);
  const avgTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const opsPerSecond = 1000 / avgTime;

  return {
    operation,
    iterations,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    opsPerSecond,
    memoryDelta: memAfter - memBefore,
  };
}

/**
 * Format benchmark results for display
 */
function formatResults(result: BenchmarkResult): string {
  return `
  ${result.operation}
    Iterations:    ${result.iterations.toLocaleString()}
    Total Time:    ${result.totalTime.toFixed(2)}ms
    Avg Time:      ${result.avgTime.toFixed(4)}ms
    Min Time:      ${result.minTime.toFixed(4)}ms
    Max Time:      ${result.maxTime.toFixed(4)}ms
    Ops/Second:    ${result.opsPerSecond.toFixed(0)}
    Memory Delta:  ${((result.memoryDelta || 0) / 1024 / 1024).toFixed(2)}MB
  `;
}

// ================================================================
// TEST DATA GENERATION
// ================================================================

/**
 * Generate test image buffers
 */
function generateTestImages(): {
  small: Buffer;
  medium: Buffer;
  large: Buffer;
  jpeg: Buffer;
  png: Buffer;
} {
  // PNG signature
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // JPEG signature
  const jpegSignature = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);

  return {
    small: Buffer.concat([pngSignature, randomBytes(10 * 1024)]), // 10KB
    medium: Buffer.concat([pngSignature, randomBytes(100 * 1024)]), // 100KB
    large: Buffer.concat([pngSignature, randomBytes(1024 * 1024)]), // 1MB
    jpeg: Buffer.concat([jpegSignature, randomBytes(50 * 1024)]), // 50KB JPEG
    png: Buffer.concat([pngSignature, randomBytes(50 * 1024)]), // 50KB PNG
  };
}

/**
 * Generate test SVG content
 */
function generateTestSVGs(): {
  simple: string;
  complex: string;
  malicious: string;
} {
  return {
    simple: `
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <circle cx="50" cy="50" r="40" fill="red"/>
      </svg>
    `,
    complex: `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        ${Array.from({ length: 100 }, (_, i) =>
          `<circle cx="${Math.random() * 200}" cy="${Math.random() * 200}" r="5" fill="blue"/>`
        ).join('\n')}
      </svg>
    `,
    malicious: `
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <script>alert('xss')</script>
        <circle cx="50" cy="50" r="40" fill="red" onclick="alert('xss')"/>
      </svg>
    `,
  };
}

// ================================================================
// FILE VALIDATION BENCHMARKS
// ================================================================

export async function benchmarkFileValidation(): Promise<BenchmarkSuite> {
  console.log('\n=== FILE VALIDATION BENCHMARKS ===\n');

  const images = generateTestImages();
  const results: BenchmarkResult[] = [];
  const suiteStart = performance.now();

  // Benchmark 1: Magic bytes validation - Small file
  results.push(await benchmark(
    'Magic Bytes Validation (10KB PNG)',
    () => validateFileContent(images.small, 'image/png', '.png'),
    1000
  ));

  // Benchmark 2: Magic bytes validation - Medium file
  results.push(await benchmark(
    'Magic Bytes Validation (100KB PNG)',
    () => validateFileContent(images.medium, 'image/png', '.png'),
    500
  ));

  // Benchmark 3: Magic bytes validation - Large file
  results.push(await benchmark(
    'Magic Bytes Validation (1MB PNG)',
    () => validateFileContent(images.large, 'image/png', '.png'),
    100
  ));

  // Benchmark 4: Comprehensive validation - Small file
  results.push(await benchmark(
    'Comprehensive Validation (10KB)',
    () => comprehensiveFileValidation(images.small, 'test.png', 'image/png'),
    500
  ));

  // Benchmark 5: Comprehensive validation - Medium file
  results.push(await benchmark(
    'Comprehensive Validation (100KB)',
    () => comprehensiveFileValidation(images.medium, 'test.png', 'image/png'),
    200
  ));

  // Benchmark 6: JPEG vs PNG validation comparison
  results.push(await benchmark(
    'JPEG Validation (50KB)',
    () => validateFileContent(images.jpeg, 'image/jpeg', '.jpg'),
    500
  ));

  results.push(await benchmark(
    'PNG Validation (50KB)',
    () => validateFileContent(images.png, 'image/png', '.png'),
    500
  ));

  const suiteDuration = performance.now() - suiteStart;

  results.forEach(r => console.log(formatResults(r)));

  return {
    name: 'File Validation',
    results,
    totalDuration: suiteDuration,
  };
}

// ================================================================
// SVG SANITIZATION BENCHMARKS
// ================================================================

export async function benchmarkSVGSanitization(): Promise<BenchmarkSuite> {
  console.log('\n=== SVG SANITIZATION BENCHMARKS ===\n');

  const svgs = generateTestSVGs();
  const results: BenchmarkResult[] = [];
  const suiteStart = performance.now();

  // Benchmark 1: Simple SVG sanitization
  results.push(await benchmark(
    'Sanitize Simple SVG (~150 bytes)',
    () => sanitizeSVG(svgs.simple),
    1000
  ));

  // Benchmark 2: Complex SVG sanitization
  results.push(await benchmark(
    'Sanitize Complex SVG (~5KB, 100 elements)',
    () => sanitizeSVG(svgs.complex),
    500
  ));

  // Benchmark 3: Malicious SVG sanitization
  results.push(await benchmark(
    'Sanitize Malicious SVG (with scripts)',
    () => sanitizeSVG(svgs.malicious),
    500
  ));

  // Benchmark 4: Full validation + sanitization
  results.push(await benchmark(
    'Validate & Sanitize Simple SVG',
    () => validateAndSanitizeSVG(svgs.simple),
    500
  ));

  results.push(await benchmark(
    'Validate & Sanitize Complex SVG',
    () => validateAndSanitizeSVG(svgs.complex),
    200
  ));

  const suiteDuration = performance.now() - suiteStart;

  results.forEach(r => console.log(formatResults(r)));

  return {
    name: 'SVG Sanitization',
    results,
    totalDuration: suiteDuration,
  };
}

// ================================================================
// CSRF TOKEN BENCHMARKS
// ================================================================

export async function benchmarkCsrfTokens(): Promise<BenchmarkSuite> {
  console.log('\n=== CSRF TOKEN BENCHMARKS ===\n');

  const results: BenchmarkResult[] = [];
  const suiteStart = performance.now();

  // Benchmark 1: CSRF token generation
  results.push(await benchmark(
    'CSRF Token Generation (32 bytes)',
    () => generateCsrfToken(),
    10000
  ));

  // Benchmark 2: Multiple token generation (batch)
  results.push(await benchmark(
    'Generate 10 CSRF Tokens',
    () => {
      for (let i = 0; i < 10; i++) {
        generateCsrfToken();
      }
    },
    1000
  ));

  // Benchmark 3: Token generation under load
  results.push(await benchmark(
    'Generate 100 CSRF Tokens',
    () => {
      for (let i = 0; i < 100; i++) {
        generateCsrfToken();
      }
    },
    100
  ));

  const suiteDuration = performance.now() - suiteStart;

  results.forEach(r => console.log(formatResults(r)));

  return {
    name: 'CSRF Token Generation',
    results,
    totalDuration: suiteDuration,
  };
}

// ================================================================
// RATE LIMITING BENCHMARKS
// ================================================================

export async function benchmarkRateLimiting(): Promise<BenchmarkSuite> {
  console.log('\n=== RATE LIMITING BENCHMARKS ===\n');

  const results: BenchmarkResult[] = [];
  const suiteStart = performance.now();

  // Mock request objects
  const createMockReq = (ip: string) => ({
    ip,
    headers: {
      'user-agent': 'Mozilla/5.0 Test',
      'accept-language': 'en-US',
      'accept-encoding': 'gzip',
    },
    socket: { remoteAddress: ip },
  } as any);

  // Benchmark 1: Rate limit lookup (allowed)
  const rateLimiter = compositeRateLimit(60000, 100);
  const mockReq = createMockReq('192.168.1.1');
  const mockRes = {} as any;
  const mockNext = () => {};

  results.push(await benchmark(
    'Rate Limit Check (within limit)',
    () => new Promise<void>(resolve => {
      rateLimiter(mockReq, mockRes, () => {
        resolve();
      });
    }),
    5000
  ));

  // Benchmark 2: Rate limit with different IPs
  let ipCounter = 0;
  results.push(await benchmark(
    'Rate Limit Check (unique IPs)',
    () => new Promise<void>(resolve => {
      const req = createMockReq(`192.168.1.${ipCounter % 255}`);
      ipCounter++;
      rateLimiter(req, mockRes, () => {
        resolve();
      });
    }),
    1000
  ));

  const suiteDuration = performance.now() - suiteStart;

  results.forEach(r => console.log(formatResults(r)));

  return {
    name: 'Rate Limiting',
    results,
    totalDuration: suiteDuration,
  };
}

// ================================================================
// BUFFER OPERATIONS BENCHMARKS
// ================================================================

export async function benchmarkBufferOperations(): Promise<BenchmarkSuite> {
  console.log('\n=== BUFFER OPERATIONS BENCHMARKS ===\n');

  const results: BenchmarkResult[] = [];
  const suiteStart = performance.now();

  const sizes = [1024, 10 * 1024, 100 * 1024, 1024 * 1024]; // 1KB, 10KB, 100KB, 1MB

  for (const size of sizes) {
    const buffer = randomBytes(size);

    // Benchmark buffer slicing
    results.push(await benchmark(
      `Buffer Slice (${size / 1024}KB)`,
      () => buffer.slice(0, Math.min(1024, size)),
      10000
    ));

    // Benchmark buffer toString
    results.push(await benchmark(
      `Buffer toString (${size / 1024}KB)`,
      () => buffer.toString('utf8', 0, Math.min(1024, size)),
      1000
    ));

    // Benchmark buffer comparison
    const buffer2 = Buffer.from(buffer);
    results.push(await benchmark(
      `Buffer Compare (${size / 1024}KB)`,
      () => buffer.compare(buffer2),
      1000
    ));
  }

  const suiteDuration = performance.now() - suiteStart;

  results.forEach(r => console.log(formatResults(r)));

  return {
    name: 'Buffer Operations',
    results,
    totalDuration: suiteDuration,
  };
}

// ================================================================
// MASTER BENCHMARK RUNNER
// ================================================================

export async function runAllBenchmarks(): Promise<{
  suites: BenchmarkSuite[];
  totalTime: number;
  summary: {
    criticalOperations: { operation: string; avgTime: number; opsPerSec: number }[];
    bottlenecks: { operation: string; avgTime: number; recommendation: string }[];
  };
}> {
  console.log('\n');
  console.log('========================================');
  console.log('  SECURITY PERFORMANCE BENCHMARK SUITE  ');
  console.log('========================================');
  console.log('\n');

  const overallStart = performance.now();
  const suites: BenchmarkSuite[] = [];

  // Run all benchmark suites
  suites.push(await benchmarkFileValidation());
  suites.push(await benchmarkSVGSanitization());
  suites.push(await benchmarkCsrfTokens());
  suites.push(await benchmarkRateLimiting());
  suites.push(await benchmarkBufferOperations());

  const totalTime = performance.now() - overallStart;

  // Identify critical operations and bottlenecks
  const allResults = suites.flatMap(s => s.results);

  // Critical operations (frequently used)
  const criticalOperations = allResults
    .filter(r =>
      r.operation.includes('Magic Bytes') ||
      r.operation.includes('CSRF Token Generation (32') ||
      r.operation.includes('Rate Limit Check (within limit)') ||
      r.operation.includes('Sanitize Simple SVG')
    )
    .map(r => ({
      operation: r.operation,
      avgTime: r.avgTime,
      opsPerSec: r.opsPerSecond,
    }))
    .sort((a, b) => b.avgTime - a.avgTime);

  // Bottlenecks (operations taking > 10ms on average)
  const bottlenecks = allResults
    .filter(r => r.avgTime > 10)
    .map(r => ({
      operation: r.operation,
      avgTime: r.avgTime,
      recommendation: getOptimizationRecommendation(r),
    }))
    .sort((a, b) => b.avgTime - a.avgTime);

  // Print summary
  console.log('\n');
  console.log('========================================');
  console.log('  BENCHMARK SUMMARY');
  console.log('========================================');
  console.log('\n');
  console.log(`Total Execution Time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`Total Suites: ${suites.length}`);
  console.log(`Total Benchmarks: ${allResults.length}`);
  console.log('\n');

  console.log('CRITICAL OPERATIONS (Most Frequently Used):');
  criticalOperations.forEach(op => {
    console.log(`  - ${op.operation}`);
    console.log(`    Avg: ${op.avgTime.toFixed(4)}ms | ${op.opsPerSec.toFixed(0)} ops/sec`);
  });

  console.log('\n');
  console.log('IDENTIFIED BOTTLENECKS (> 10ms avg):');
  if (bottlenecks.length === 0) {
    console.log('  ✓ No significant bottlenecks detected!');
  } else {
    bottlenecks.forEach(b => {
      console.log(`  ⚠ ${b.operation}`);
      console.log(`    Avg: ${b.avgTime.toFixed(2)}ms`);
      console.log(`    Recommendation: ${b.recommendation}`);
    });
  }

  console.log('\n========================================\n');

  return {
    suites,
    totalTime,
    summary: {
      criticalOperations,
      bottlenecks,
    },
  };
}

// ================================================================
// OPTIMIZATION RECOMMENDATIONS
// ================================================================

function getOptimizationRecommendation(result: BenchmarkResult): string {
  const { operation, avgTime } = result;

  if (operation.includes('1MB') || operation.includes('Large')) {
    return 'Consider streaming validation for large files instead of loading entire buffer';
  }

  if (operation.includes('SVG') && operation.includes('Complex')) {
    return 'Cache sanitization results for frequently accessed SVGs';
  }

  if (operation.includes('Comprehensive Validation')) {
    return 'Split validation into async stages, run checks in parallel';
  }

  if (operation.includes('Buffer')) {
    return 'Use views instead of creating new buffers when possible';
  }

  if (operation.includes('Rate Limit')) {
    return 'Migrate to Redis-based rate limiting for better performance';
  }

  if (avgTime > 50) {
    return 'Critical bottleneck - prioritize optimization';
  }

  return 'Consider caching or memoization if frequently called';
}

// ================================================================
// EXPORT FOR CLI USAGE
// ================================================================

// Run benchmarks if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  runAllBenchmarks()
    .then(results => {
      console.log('Benchmarks completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}
