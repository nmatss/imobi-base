#!/usr/bin/env tsx
/**
 * Test SESSION_SECRET validation in production mode
 *
 * This script tests various scenarios to ensure the fail-fast
 * validation works correctly.
 */

import { spawn } from 'child_process';

interface TestCase {
  name: string;
  env: Record<string, string>;
  shouldFail: boolean;
  expectedError?: string;
}

const testCases: TestCase[] = [
  {
    name: 'No SESSION_SECRET in production',
    env: {
      NODE_ENV: 'production',
    },
    shouldFail: true,
    expectedError: 'SESSION_SECRET environment variable is required',
  },
  {
    name: 'Default SESSION_SECRET in production',
    env: {
      NODE_ENV: 'production',
      SESSION_SECRET: 'imobibase-secret-key-change-in-production',
    },
    shouldFail: true,
    expectedError: 'Default SESSION_SECRET not allowed',
  },
  {
    name: 'Weak SESSION_SECRET (too short) in production',
    env: {
      NODE_ENV: 'production',
      SESSION_SECRET: 'short',
    },
    shouldFail: true,
    expectedError: 'SESSION_SECRET must be at least 32 characters',
  },
  {
    name: 'Valid SESSION_SECRET in production',
    env: {
      NODE_ENV: 'production',
      SESSION_SECRET: 'rzrv9/9miSFmp4APazT/gSj25h8qe1BxDERu8EYTpsfNX5/6dQZVknj2qYo0xHuwwr/0nmOslikwa3PQcyJVJw==',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost/test',
    },
    shouldFail: false,
  },
  {
    name: 'Default SESSION_SECRET in development (should only warn)',
    env: {
      NODE_ENV: 'development',
      SESSION_SECRET: 'imobibase-secret-key-change-in-production',
    },
    shouldFail: false,
  },
];

async function runTest(testCase: TestCase): Promise<boolean> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`TEST: ${testCase.name}`);
  console.log(`${'='.repeat(70)}`);
  console.log('Environment:', JSON.stringify(testCase.env, null, 2));

  return new Promise((resolve) => {
    const child = spawn('tsx', ['server/index.ts'], {
      env: {
        ...process.env,
        ...testCase.env,
      },
      stdio: 'pipe',
    });

    let output = '';
    let errorOutput = '';
    let hasStarted = false;

    const timeout = setTimeout(() => {
      child.kill();
      if (testCase.shouldFail) {
        console.log('❌ FAIL: Process did not exit when it should have');
        resolve(false);
      } else {
        if (hasStarted) {
          console.log('✅ PASS: Server started successfully');
          resolve(true);
        } else {
          console.log('❌ FAIL: Server did not start in time');
          resolve(false);
        }
      }
    }, 5000);

    child.stdout.on('data', (data) => {
      const str = data.toString();
      output += str;

      if (str.includes('Server running') || str.includes('SESSION_SECRET validated')) {
        hasStarted = true;
      }
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('exit', (code) => {
      clearTimeout(timeout);

      const fullOutput = output + errorOutput;

      console.log('\nOutput:', fullOutput.substring(0, 500));

      if (testCase.shouldFail) {
        if (code === 1) {
          if (testCase.expectedError && fullOutput.includes(testCase.expectedError)) {
            console.log('✅ PASS: Process exited with expected error');
            resolve(true);
          } else {
            console.log('⚠️  PARTIAL: Process exited but error message not found');
            console.log('Expected:', testCase.expectedError);
            resolve(false);
          }
        } else {
          console.log('❌ FAIL: Process should have exited with code 1, got:', code);
          resolve(false);
        }
      } else {
        if (code === 0 || hasStarted) {
          console.log('✅ PASS: Process started successfully or exited cleanly');
          resolve(true);
        } else {
          console.log('❌ FAIL: Process exited unexpectedly with code:', code);
          resolve(false);
        }
      }
    });
  });
}

async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('SESSION_SECRET Validation Test Suite');
  console.log('='.repeat(70));

  const results: boolean[] = [];

  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push(result);

    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(70));
  console.log('Test Results Summary');
  console.log('='.repeat(70));

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log(`Passed: ${passed}/${total}`);

  if (passed === total) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
