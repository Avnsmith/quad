#!/usr/bin/env node
/**
 * Quad DEX Local Auto-Test Suite
 * Tests: HTML content, API health, branding checks, env vars, build artifacts
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

const BASE = 'https://localhost:3000';
const API  = 'https://localhost:3000';
const ROOT = process.cwd();

const agent = new https.Agent({ rejectUnauthorized: false });

const results = [];
let passed = 0, failed = 0;

function pass(name, detail = '') {
  results.push({ status: '✅ PASS', name, detail });
  passed++;
}

function fail(name, detail = '') {
  results.push({ status: '❌ FAIL', name, detail });
  failed++;
}

function warn(name, detail = '') {
  results.push({ status: '⚠️  WARN', name, detail });
}

async function get(url, opts = {}) {
  return new Promise((resolve) => {
    const req = https.get(url, { agent, ...opts }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', e => resolve({ status: 0, body: '', error: e.message }));
    req.end();
  });
}

// ─── TESTS ────────────────────────────────────────────────────────────────

async function testApiHealth() {
  const r = await get(`${API}/api/health`);
  if (r.status === 200 && r.body.includes('"ok"')) {
    pass('API /api/health', r.body.trim());
  } else {
    fail('API /api/health', `status=${r.status} body=${r.body.substring(0,100)}`);
  }
}

async function testHtmlTitle() {
  const r = await get(`${BASE}/`);
  if (r.body.includes('<title>Quad</title>')) {
    pass('HTML <title>', 'Shows "Quad"');
  } else {
    const m = r.body.match(/<title>([^<]*)<\/title>/);
    fail('HTML <title>', `Found: ${m ? m[1] : 'none'}`);
  }
}

async function testNoBrandingLeak() {
  const r = await get(`${BASE}/`);
  const leaks = ['SwapARC', 'SWAPARC', 'swaparc', 'SwaparcApp', 'SWPRC'];
  const found = leaks.filter(l => r.body.includes(l));
  if (found.length === 0) {
    pass('No old branding in HTML', 'Clean - no Swaparc references found');
  } else {
    fail('No old branding in HTML', `Found: ${found.join(', ')}`);
  }
}

async function testQuadBranding() {
  const r = await get(`${BASE}/`);
  // Check for quad-logo.svg reference
  if (r.body.includes('quad-logo') || r.body.includes('Quad')) {
    pass('Quad branding in HTML', 'References to "Quad" found');
  } else {
    warn('Quad branding in HTML', 'Could not detect Quad references in initial HTML');
  }
}

async function testPricesApi() {
  const r = await get(`${API}/api/prices/get?symbols=USDC,EURC,QDRC`);
  if (r.status === 200) {
    pass('API /api/prices/get', `Status 200 — ${r.body.substring(0,120)}`);
  } else {
    fail('API /api/prices/get', `status=${r.status}`);
  }
}

async function testLeaderboardApi() {
  const r = await get(`${API}/api/profile/leaderboard`);
  if (r.status === 200 || r.status === 201) {
    pass('API /api/profile/leaderboard', `Status ${r.status}`);
  } else {
    warn('API /api/profile/leaderboard', `status=${r.status} (may need Redis) body=${r.body.substring(0,100)}`);
  }
}

async function testLandingStats() {
  const r = await get(`${API}/api/profile/landing-stats`);
  if (r.status === 200) {
    pass('API /api/profile/landing-stats', 'Status 200');
  } else {
    warn('API /api/profile/landing-stats', `status=${r.status}`);
  }
}

function testEnvVars() {
  const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  const checks = {
    'VITE_ARC_CHAIN_ID=5042002':               'Arc Chain ID set',
    'VITE_PRIVACY_POOL_ADDRESS_USDC=0x72':     'Privacy Pool USDC set',
    'VITE_STEALTH_PAYMENTS_ADDRESS=0xf35':     'Stealth Payments address set',
    'VITE_RECURRING_AUTOMATION_CONTRACT_ADDRESS=0x667': 'Recurring Automation set',
    'VITE_PRIVACY_POOL_FROM_BLOCK=43913934':   'Pool from-block set',
    'ARC_DEPLOYER_PRIVATE_KEY=0x':             'Deployer key present',
    'CIRCLE_API_KEY=TEST_API_KEY':             'Circle API key present',
  };
  for (const [pattern, label] of Object.entries(checks)) {
    if (env.includes(pattern)) {
      pass(`ENV: ${label}`);
    } else {
      fail(`ENV: ${label}`, `Pattern not found: ${pattern}`);
    }
  }
}

function testBuildArtifacts() {
  const distIndex = path.join(ROOT, 'dist', 'index.html');
  if (fs.existsSync(distIndex)) {
    const html = fs.readFileSync(distIndex, 'utf8');
    if (html.includes('<title>Quad</title>')) {
      pass('Build dist/index.html', 'Title is "Quad"');
    } else {
      fail('Build dist/index.html', 'Title mismatch in build output');
    }
    const leaks = ['SwapARC', 'SWAPARC', 'SwaparcApp', 'SWPRC'];
    const found = leaks.filter(l => html.includes(l));
    if (found.length === 0) {
      pass('Build: No old branding', 'dist/index.html is clean');
    } else {
      fail('Build: Old branding found', `Found: ${found.join(', ')}`);
    }
  } else {
    warn('Build dist/index.html', 'No dist/ folder — run npm run build first');
  }
}

function testZkArtifacts() {
  const wasm = path.join(ROOT, 'public/circuits/privpay/privpay_claim.wasm');
  const zkey = path.join(ROOT, 'public/circuits/privpay/privpay_claim_final.zkey');
  if (fs.existsSync(wasm)) {
    const size = (fs.statSync(wasm).size / 1024).toFixed(0);
    pass('ZK wasm artifact', `${size} KB at public/circuits/privpay/privpay_claim.wasm`);
  } else {
    fail('ZK wasm artifact', 'Missing privpay_claim.wasm');
  }
  if (fs.existsSync(zkey)) {
    const size = (fs.statSync(zkey).size / 1024).toFixed(0);
    pass('ZK zkey artifact', `${size} KB at public/circuits/privpay/privpay_claim_final.zkey`);
  } else {
    fail('ZK zkey artifact', 'Missing privpay_claim_final.zkey');
  }
}

function testFileRenaming() {
  const files = {
    'src/QuadApp.jsx':                               'QuadApp.jsx renamed',
    'src/assets/quad-logo.svg':                      'quad-logo.svg created',
    'public/quad-logo.svg':                          'public/quad-logo.svg created',
    'public/badges/early-quadrant.png':              'early-quadrant.png badge',
    'data/badges/earlyQuadrant.frozen.json':         'earlyQuadrant.frozen.json',
    'scripts/countEarlyQuadrants.js':                'countEarlyQuadrants.js script',
    'lib/server/earlyQuadrantFrozen.js':             'earlyQuadrantFrozen.js lib',
    'docs/quad/introduction/what-is-quad.md':        'what-is-quad.md docs',
  };
  for (const [f, label] of Object.entries(files)) {
    if (fs.existsSync(path.join(ROOT, f))) {
      pass(`File: ${label}`, f);
    } else {
      fail(`File: ${label}`, `Missing: ${f}`);
    }
  }
}

async function testSrcBrandingClean() {
  const { execSync } = await import('child_process');
  try {
    const out = execSync(
      `grep -rl "SwapARC\\|SWAPARC\\|SwaparcApp\\|SWPRC" src/ --include="*.jsx" --include="*.js" --include="*.css" 2>/dev/null || true`,
      { cwd: ROOT, encoding: 'utf8' }
    ).trim();
    if (!out) {
      pass('Src branding clean', 'No old branding in src/');
    } else {
      fail('Src branding clean', `Remnants in: ${out.split('\n').join(', ')}`);
    }
  } catch {
    warn('Src branding scan', 'grep scan skipped');
  }
}

// ─── RUN ALL TESTS ────────────────────────────────────────────────────────

console.log('\n🔬 Quad DEX Auto-Test Suite\n' + '='.repeat(50));

await testApiHealth();
await testHtmlTitle();
await testNoBrandingLeak();
await testQuadBranding();
await testPricesApi();
await testLeaderboardApi();
await testLandingStats();
testEnvVars();
testBuildArtifacts();
testZkArtifacts();
testFileRenaming();
await testSrcBrandingClean();

// ─── REPORT ───────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log('QUAD DEX — LOCAL TEST REPORT');
console.log('='.repeat(60));

const nameWidth = 42;
for (const r of results) {
  const name = r.name.padEnd(nameWidth);
  console.log(`${r.status}  ${name} ${r.detail ? `→ ${r.detail}` : ''}`);
}

console.log('\n' + '-'.repeat(60));
console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Warnings: ${results.length - passed - failed}`);
console.log('='.repeat(60) + '\n');

process.exit(failed > 0 ? 1 : 0);
