#!/usr/bin/env tsx
/**
 * Penetration Testing Script
 * Automated security tests for common vulnerabilities
 */

import { randomBytes } from 'crypto';

interface TestResult {
  test: string;
  passed: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
}

const results: TestResult[] = [];
const BASE_URL = process.env.TEST_URL || 'http://localhost:5000';

/**
 * HTTP request helper
 */
async function request(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${BASE_URL}${path}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    return response;
  } catch (error) {
    throw new Error(`Request failed: ${error}`);
  }
}

/**
 * Test: SQL Injection in Login
 */
async function testSqlInjectionLogin(): Promise<void> {
  console.log('\n[TEST] SQL Injection - Login Form');

  const sqlPayloads = [
    "admin' OR '1'='1",
    "admin'--",
    "admin' OR 1=1--",
    "' UNION SELECT NULL, NULL, NULL--",
  ];

  for (const payload of sqlPayloads) {
    const response = await request('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        email: payload,
        password: 'test123',
      }),
    });

    const passed = response.status !== 200;
    results.push({
      test: 'SQL Injection - Login',
      passed,
      severity: 'critical',
      message: passed
        ? `SQL injection blocked: ${payload}`
        : `VULNERABILITY: SQL injection succeeded with: ${payload}`,
      details: { payload, status: response.status },
    });
  }
}

/**
 * Test: XSS in input fields
 */
async function testXssInjection(): Promise<void> {
  console.log('\n[TEST] XSS Injection');

  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(\'XSS\')">',
  ];

  for (const payload of xssPayloads) {
    const response = await request('/api/public/newsletter', {
      method: 'POST',
      body: JSON.stringify({
        email: `test+${Date.now()}@example.com`,
        name: payload,
      }),
    });

    // Check if payload was sanitized
    const data = await response.json().catch(() => ({}));
    const passed = !JSON.stringify(data).includes('<script>') &&
                   !JSON.stringify(data).includes('javascript:');

    results.push({
      test: 'XSS Injection',
      passed,
      severity: 'high',
      message: passed
        ? 'XSS payload sanitized'
        : `VULNERABILITY: XSS payload not sanitized: ${payload}`,
      details: { payload, response: data },
    });
  }
}

/**
 * Test: CSRF Protection
 */
async function testCsrfProtection(): Promise<void> {
  console.log('\n[TEST] CSRF Protection');

  // Try to make a state-changing request without CSRF token
  const response = await request('/api/properties', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Test Property',
      description: 'CSRF Test',
    }),
  });

  const passed = response.status === 403 || response.status === 401;
  results.push({
    test: 'CSRF Protection',
    passed,
    severity: 'high',
    message: passed
      ? 'CSRF protection working (request blocked)'
      : 'VULNERABILITY: CSRF protection not enforced',
    details: { status: response.status },
  });
}

/**
 * Test: Authentication Bypass
 */
async function testAuthBypass(): Promise<void> {
  console.log('\n[TEST] Authentication Bypass');

  const protectedEndpoints = [
    '/api/properties',
    '/api/users',
    '/api/leads',
    '/api/settings',
  ];

  for (const endpoint of protectedEndpoints) {
    const response = await request(endpoint, {
      method: 'GET',
    });

    const passed = response.status === 401;
    results.push({
      test: 'Authentication Bypass',
      passed,
      severity: 'critical',
      message: passed
        ? `Protected endpoint secured: ${endpoint}`
        : `VULNERABILITY: Endpoint accessible without auth: ${endpoint}`,
      details: { endpoint, status: response.status },
    });
  }
}

/**
 * Test: Path Traversal
 */
async function testPathTraversal(): Promise<void> {
  console.log('\n[TEST] Path Traversal');

  const payloads = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  ];

  for (const payload of payloads) {
    const response = await request(`/api/files/${encodeURIComponent(payload)}`, {
      method: 'GET',
    });

    const passed = response.status !== 200 || !(await response.text()).includes('root:');
    results.push({
      test: 'Path Traversal',
      passed,
      severity: 'critical',
      message: passed
        ? 'Path traversal blocked'
        : `VULNERABILITY: Path traversal succeeded with: ${payload}`,
      details: { payload, status: response.status },
    });
  }
}

/**
 * Test: Brute Force Protection
 */
async function testBruteForceProtection(): Promise<void> {
  console.log('\n[TEST] Brute Force Protection');

  const email = `bruteforce-${Date.now()}@example.com`;
  let blocked = false;

  // Try multiple failed login attempts
  for (let i = 0; i < 10; i++) {
    const response = await request('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: `wrong-password-${i}`,
      }),
    });

    if (response.status === 429 || response.status === 403) {
      blocked = true;
      break;
    }

    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  results.push({
    test: 'Brute Force Protection',
    passed: blocked,
    severity: 'high',
    message: blocked
      ? 'Brute force protection working (account locked/rate limited)'
      : 'WARNING: No brute force protection detected',
    details: { email, attempts: 10 },
  });
}

/**
 * Test: Security Headers
 */
async function testSecurityHeaders(): Promise<void> {
  console.log('\n[TEST] Security Headers');

  const response = await request('/');

  const requiredHeaders = {
    'x-frame-options': 'SAMEORIGIN',
    'x-content-type-options': 'nosniff',
    'strict-transport-security': 'max-age=',
  };

  for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
    const value = response.headers.get(header);
    const passed = value?.includes(expectedValue) || false;

    results.push({
      test: `Security Header: ${header}`,
      passed,
      severity: 'medium',
      message: passed
        ? `Header present: ${header}`
        : `WARNING: Missing or incorrect header: ${header}`,
      details: { header, value, expected: expectedValue },
    });
  }
}

/**
 * Test: Session Security
 */
async function testSessionSecurity(): Promise<void> {
  console.log('\n[TEST] Session Security');

  const response = await request('/');
  const setCookie = response.headers.get('set-cookie');

  if (setCookie) {
    const hasHttpOnly = setCookie.includes('HttpOnly');
    const hasSecure = setCookie.includes('Secure') ||
                     process.env.NODE_ENV !== 'production';
    const hasSameSite = setCookie.includes('SameSite');

    results.push({
      test: 'Session Cookie - HttpOnly',
      passed: hasHttpOnly,
      severity: 'high',
      message: hasHttpOnly
        ? 'HttpOnly flag set'
        : 'WARNING: HttpOnly flag missing',
      details: { setCookie },
    });

    results.push({
      test: 'Session Cookie - Secure',
      passed: hasSecure,
      severity: 'medium',
      message: hasSecure
        ? 'Secure flag set (or dev environment)'
        : 'WARNING: Secure flag missing in production',
      details: { setCookie },
    });

    results.push({
      test: 'Session Cookie - SameSite',
      passed: hasSameSite,
      severity: 'medium',
      message: hasSameSite
        ? 'SameSite attribute set'
        : 'WARNING: SameSite attribute missing',
      details: { setCookie },
    });
  }
}

/**
 * Test: Sensitive Data Exposure
 */
async function testSensitiveDataExposure(): Promise<void> {
  console.log('\n[TEST] Sensitive Data Exposure');

  const response = await request('/api/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'invalid@example.com',
      password: 'wrong',
    }),
  });

  const text = await response.text();
  const exposesSensitiveInfo = text.includes('password') ||
                               text.includes('hash') ||
                               text.includes('salt') ||
                               text.includes('/home/') ||
                               text.includes('/var/') ||
                               text.includes('at Error');

  results.push({
    test: 'Sensitive Data Exposure',
    passed: !exposesSensitiveInfo,
    severity: 'medium',
    message: exposesSensitiveInfo
      ? 'WARNING: Error messages may expose sensitive information'
      : 'Error messages do not expose sensitive data',
    details: { hasStackTrace: text.includes('at Error') },
  });
}

/**
 * Test: Rate Limiting
 */
async function testRateLimiting(): Promise<void> {
  console.log('\n[TEST] Rate Limiting');

  let rateLimited = false;

  // Make many requests quickly
  for (let i = 0; i < 100; i++) {
    const response = await request('/api/public/properties', {
      method: 'GET',
    });

    if (response.status === 429) {
      rateLimited = true;
      break;
    }
  }

  results.push({
    test: 'Rate Limiting',
    passed: rateLimited,
    severity: 'medium',
    message: rateLimited
      ? 'Rate limiting working'
      : 'WARNING: No rate limiting detected',
    details: { requests: 100 },
  });
}

/**
 * Test: CORS Configuration
 */
async function testCorsConfiguration(): Promise<void> {
  console.log('\n[TEST] CORS Configuration');

  const response = await request('/api/properties', {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://evil.com',
      'Access-Control-Request-Method': 'POST',
    },
  });

  const allowOrigin = response.headers.get('access-control-allow-origin');
  const passed = allowOrigin !== '*' &&
                 (!allowOrigin || !allowOrigin.includes('evil.com'));

  results.push({
    test: 'CORS Configuration',
    passed,
    severity: 'medium',
    message: passed
      ? 'CORS properly configured (not allowing all origins)'
      : 'WARNING: Overly permissive CORS configuration',
    details: { allowOrigin },
  });
}

/**
 * Generate report
 */
function generateReport(): void {
  console.log('\n' + '='.repeat(80));
  console.log('PENETRATION TEST REPORT');
  console.log('='.repeat(80));

  const summary = {
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    critical: results.filter(r => !r.passed && r.severity === 'critical').length,
    high: results.filter(r => !r.passed && r.severity === 'high').length,
    medium: results.filter(r => !r.passed && r.severity === 'medium').length,
    low: results.filter(r => !r.passed && r.severity === 'low').length,
  };

  console.log(`\nTotal Tests: ${summary.total}`);
  console.log(`Passed: ${summary.passed} (${Math.round(summary.passed / summary.total * 100)}%)`);
  console.log(`Failed: ${summary.failed} (${Math.round(summary.failed / summary.total * 100)}%)`);
  console.log(`\nVulnerabilities by Severity:`);
  console.log(`  Critical: ${summary.critical}`);
  console.log(`  High: ${summary.high}`);
  console.log(`  Medium: ${summary.medium}`);
  console.log(`  Low: ${summary.low}`);

  console.log('\n' + '='.repeat(80));
  console.log('FAILED TESTS');
  console.log('='.repeat(80));

  const failedTests = results.filter(r => !r.passed);
  if (failedTests.length === 0) {
    console.log('\nNo vulnerabilities found! 🎉');
  } else {
    failedTests.forEach(test => {
      console.log(`\n[${test.severity.toUpperCase()}] ${test.test}`);
      console.log(`  ${test.message}`);
      if (test.details) {
        console.log(`  Details: ${JSON.stringify(test.details, null, 2)}`);
      }
    });
  }

  console.log('\n' + '='.repeat(80));

  // Exit with error code if critical or high vulnerabilities found
  if (summary.critical > 0 || summary.high > 0) {
    process.exit(1);
  }
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  console.log('Starting Penetration Tests...');
  console.log(`Target: ${BASE_URL}`);

  try {
    await testAuthBypass();
    await testSqlInjectionLogin();
    await testXssInjection();
    await testCsrfProtection();
    await testPathTraversal();
    await testBruteForceProtection();
    await testSecurityHeaders();
    await testSessionSecurity();
    await testSensitiveDataExposure();
    await testRateLimiting();
    await testCorsConfiguration();

    generateReport();
  } catch (error) {
    console.error('\nError running tests:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
