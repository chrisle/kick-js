#!/usr/bin/env node

/**
 * Test runner script for kick-js
 * Allows running tests with different configurations
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const args = process.argv.slice(2);
const command = args[0] || 'help';

const configs = {
  'mock': {
    env: { TEST_WITH_TOKENS: 'false' },
    description: 'Run mock tests only (no real API calls)'
  },
  'tokens': {
    env: { TEST_WITH_TOKENS: 'true' },
    description: 'Run integration tests with real tokens (requires env vars)'
  },
  'all': {
    env: {},
    description: 'Run all tests (both mock and token-based)'
  }
};

function runTests(config) {
  const env = { ...process.env, ...config.env };
  
  console.log(`🧪 Running tests: ${config.description}`);
  console.log(`Environment: TEST_WITH_TOKENS=${env.TEST_WITH_TOKENS || 'not set'}\n`);
  
  const child = spawn('npm', ['test', ...args.slice(1)], {
    env,
    cwd: rootDir,
    stdio: 'inherit'
  });
  
  child.on('close', (code) => {
    process.exit(code);
  });
}

function showHelp() {
  console.log('🚀 kick-js Test Runner\n');
  console.log('Usage: npm run test:script <command> [vitest-args]\n');
  console.log('Commands:');
  
  Object.entries(configs).forEach(([name, config]) => {
    console.log(`  ${name.padEnd(8)} - ${config.description}`);
  });
  
  console.log('\nExamples:');
  console.log('  npm run test:script mock              # Run mock tests only');
  console.log('  npm run test:script tokens            # Run token-based tests');
  console.log('  npm run test:script all               # Run all tests');
  console.log('  npm run test:script mock client.test  # Run specific mock test file');
  console.log('\nFor token-based tests, set these environment variables:');
  console.log('  KICK_BEARER_TOKEN, KICK_XSRF_TOKEN, KICK_COOKIES, KICK_CHANNEL');
}

if (command === 'help' || !configs[command]) {
  showHelp();
  process.exit(0);
}

runTests(configs[command]);