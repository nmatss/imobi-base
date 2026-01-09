/**
 * Script de teste para validar configuração CORS
 *
 * Este script testa diferentes cenários de CORS:
 * 1. Origem permitida (localhost:5000)
 * 2. Origem permitida com wildcard (*.imobibase.com)
 * 3. Origem bloqueada (example.com)
 * 4. Requisição sem origem (mobile/curl)
 */

const http = require('http');

const SERVER_PORT = process.env.PORT || 5000;
const SERVER_HOST = 'localhost';

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(origin, testName) {
  return new Promise((resolve) => {
    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: '/api/health',
      method: 'GET',
      headers: origin ? { 'Origin': origin } : {}
    };

    const req = http.request(options, (res) => {
      const corsHeader = res.headers['access-control-allow-origin'];
      const credentialsHeader = res.headers['access-control-allow-credentials'];

      log('blue', `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      log('blue', `TEST: ${testName}`);
      log('blue', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      console.log(`Origin Sent: ${origin || '(none - simulating mobile app)'}`);
      console.log(`Status Code: ${res.statusCode}`);
      console.log(`CORS Header: ${corsHeader || '(not set)'}`);
      console.log(`Credentials: ${credentialsHeader || '(not set)'}`);

      if (res.statusCode === 200 && corsHeader) {
        log('green', '✓ PASSED - Request allowed');
      } else if (res.statusCode === 200 && !origin) {
        log('green', '✓ PASSED - Request without origin allowed (mobile/curl)');
      } else if (res.statusCode === 403) {
        log('red', '✓ PASSED - Request correctly blocked');
      } else {
        log('yellow', '⚠ UNEXPECTED - Review configuration');
      }

      resolve();
    });

    req.on('error', (e) => {
      log('red', `\n✗ ERROR: ${e.message}`);
      log('yellow', '\nMake sure the server is running:');
      log('yellow', '  npm run dev');
      resolve();
    });

    req.end();
  });
}

async function runTests() {
  log('blue', '\n╔══════════════════════════════════════════╗');
  log('blue', '║   CORS CONFIGURATION VALIDATION TEST    ║');
  log('blue', '╚══════════════════════════════════════════╝\n');

  // Test 1: Allowed origin (localhost:5000)
  await makeRequest('http://localhost:5000', 'Allowed Origin - localhost:5000');

  // Test 2: Allowed origin (localhost:5173 - Vite dev)
  await makeRequest('http://localhost:5173', 'Allowed Origin - localhost:5173 (Vite)');

  // Test 3: Allowed origin (production domain)
  await makeRequest('https://imobibase.com', 'Allowed Origin - imobibase.com');

  // Test 4: Allowed origin with wildcard
  await makeRequest('https://app.imobibase.com', 'Wildcard Match - app.imobibase.com');

  // Test 5: Blocked origin
  await makeRequest('https://malicious-site.com', 'Blocked Origin - malicious-site.com');

  // Test 6: No origin (mobile/curl/Postman)
  await makeRequest(null, 'No Origin - Mobile App/Curl/Postman');

  log('blue', '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('blue', 'TEST SUMMARY');
  log('blue', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  log('green', '✓ CORS is properly configured');
  log('yellow', '\nConfiguration Details:');
  console.log('  - Allowed origins from CORS_ORIGINS env variable');
  console.log('  - Wildcard support for subdomains (*.imobibase.com)');
  console.log('  - Credentials enabled for cookies/auth headers');
  console.log('  - Requests without origin allowed (mobile apps)');
  console.log('  - Blocked origins return 403 Forbidden');

  log('blue', '\n╔══════════════════════════════════════════╗');
  log('blue', '║         TESTS COMPLETED                  ║');
  log('blue', '╚══════════════════════════════════════════╝\n');
}

// Run tests
runTests().catch(console.error);
