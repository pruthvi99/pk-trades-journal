/**
 * Comprehensive Multi-User UAT Script
 * Creates 5 test users with 16 trades, verifies isolation and calculations.
 * Run: node scripts/uat_multi_user.mjs
 */

const BASE_URL = 'http://localhost:9999';

// ─── State ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const issues = [];

function ok(msg) { passed++; console.log(`  ✅ ${msg}`); }
function fail(msg, detail) {
  failed++;
  issues.push(detail ? `${msg}: ${JSON.stringify(detail)}` : msg);
  console.log(`  ❌ ${msg}`);
  if (detail !== undefined) console.log(`     ${JSON.stringify(detail)}`);
}
function section(name) { console.log(`\n${'─'.repeat(60)}\n  ${name}\n${'─'.repeat(60)}`); }
function check(condition, passMsg, failMsg, detail) {
  condition ? ok(passMsg) : fail(failMsg, detail);
}
function near(a, b, tolerance = 0.02) { return Math.abs(a - b) <= tolerance; }

// ─── API helpers ─────────────────────────────────────────────────────────────

async function api(method, path, body, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json, headers: res.headers };
}

async function signup(passcode) {
  const r = await api('POST', '/api/auth/signup', { passcode });
  if (r.status === 409) return { existing: true };   // already exists
  if (r.status === 201) return { created: true, userId: r.body.userId };
  return { error: r.body };
}

async function login(passcode) {
  const r = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: passcode }),
  });
  if (!r.ok) return null;
  const setCookie = r.headers.get('set-cookie') ?? '';
  const match = setCookie.match(/pk_session=[^;]+/);
  return match ? match[0] : null;
}

async function get(path, cookie) { return api('GET', path, null, cookie); }
async function post(path, body, cookie) { return api('POST', path, body, cookie); }
async function patch(path, body, cookie) { return api('PATCH', path, body, cookie); }
async function del(path, cookie) { return api('DELETE', path, null, cookie); }

async function createStrategy(cookie, name, description) {
  const r = await post('/api/strategies', {
    name,
    description: description ?? `${name} strategy`,
  }, cookie);
  if (r.status !== 201) { fail(`Create strategy "${name}" failed`, r.body); return null; }
  return r.body;
}

async function createTag(cookie, label, category) {
  const r = await post('/api/tags', { label, category }, cookie);
  if (r.status !== 201) { fail(`Create tag "${label}" failed`, r.body); return null; }
  return r.body;
}

async function createTrade(cookie, data) {
  const r = await post('/api/trades', data, cookie);
  if (r.status !== 201) { fail(`Create trade ${data.symbol} failed`, r.body); return null; }
  return r.body;
}

async function closeTrade(cookie, tradeId, exitExecution, closedAt) {
  // Add exit execution
  const r1 = await post('/api/executions', { tradeId, kind: 'exit', ...exitExecution }, cookie);
  if (r1.status !== 201) { fail(`Add exit execution failed`, r1.body); return null; }
  // Mark closed
  const r2 = await patch(`/api/trades/${tradeId}`, { status: 'closed', closedAt }, cookie);
  if (r2.status !== 200) { fail(`Close trade failed`, r2.body); return null; }
  return r2.body;
}

// ─── Test users ───────────────────────────────────────────────────────────────

const USERS = {
  alpha: { passcode: '281947', label: 'Alpha Trader' },
  beta:  { passcode: '539016', label: 'Beta Trader' },
  gamma: { passcode: '674831', label: 'Gamma Trader' },
  delta: { passcode: '492058', label: 'Delta Trader' },
  echo:  { passcode: '715630', label: 'Echo Trader (no trades)' },
};

// ─── PHASE 1: Sign up all users ──────────────────────────────────────────────

section('PHASE 1 — User Sign-Up');

const cookies = {};
const userIds = {};

for (const [key, u] of Object.entries(USERS)) {
  const r = await signup(u.passcode);
  if (r.error) { fail(`Signup ${u.label}`, r.error); }
  else { ok(`Signup ${u.label} (${r.existing ? 'already existed' : 'created'})`); }

  const cookie = await login(u.passcode);
  if (!cookie) { fail(`Login ${u.label}`); continue; }
  cookies[key] = cookie;
  ok(`Login ${u.label}`);
}

// ─── PHASE 2: Signup validation rules ────────────────────────────────────────

section('PHASE 2 — Signup Validation Rules');

async function testSignupRule(passcode, expectCode, desc) {
  const r = await api('POST', '/api/auth/signup', { passcode });
  check(r.status === expectCode,
    `Signup "${passcode}" → ${expectCode} (${desc})`,
    `Signup "${passcode}" expected ${expectCode}, got ${r.status} (${desc})`, r.body);
}

await testSignupRule('111111', 400, 'all-same digit');
await testSignupRule('999999', 400, 'all-same digit');
await testSignupRule('123456', 400, 'sequential ascending');
await testSignupRule('654321', 400, 'sequential descending');
await testSignupRule('12345',  400, 'too short (5 digits)');
await testSignupRule('1234567', 400, 'too long (7 digits)');
await testSignupRule('abc123', 400, 'contains letters');
await testSignupRule('090909', 409, 'admin passcode already taken');
await testSignupRule('281947', 409, 'alpha passcode already taken');

// ─── PHASE 3: Create strategies and tags per user ─────────────────────────────

section('PHASE 3 — Create Strategies & Tags Per User');

const strategies = {};
const tags = {};

// Alpha
strategies.alpha = {};
strategies.alpha.momentum = await createStrategy(cookies.alpha, 'Momentum', 'Trend following');
strategies.alpha.breakout  = await createStrategy(cookies.alpha, 'Breakout Alpha', 'Range breakout');
tags.alpha = {};
tags.alpha.setup    = await createTag(cookies.alpha, 'alpha-vwap-reclaim', 'setup');
tags.alpha.psych    = await createTag(cookies.alpha, 'alpha-fomo-entry',   'psychology');
tags.alpha.mistake  = await createTag(cookies.alpha, 'alpha-late-entry',   'mistake');

// Beta
strategies.beta = {};
strategies.beta.swing    = await createStrategy(cookies.beta, 'Swing Beta', 'Multi-day holds');
strategies.beta.reversal = await createStrategy(cookies.beta, 'Reversal Beta', 'Counter-trend');
tags.beta = {};
tags.beta.setup   = await createTag(cookies.beta, 'beta-support-hold', 'setup');
tags.beta.context = await createTag(cookies.beta, 'beta-earnings-play', 'context');

// Gamma
strategies.gamma = {};
strategies.gamma.counter = await createStrategy(cookies.gamma, 'Counter Gamma', 'Counter-trend');
tags.gamma = {};
tags.gamma.mistake = await createTag(cookies.gamma, 'gamma-held-loser', 'mistake');
tags.gamma.psych   = await createTag(cookies.gamma, 'gamma-revenge-trade', 'psychology');

// Delta
strategies.delta = {};
strategies.delta.scalp = await createStrategy(cookies.delta, 'Scalp Delta', 'Intraday scalp');
tags.delta = {};
tags.delta.setup = await createTag(cookies.delta, 'delta-opening-range', 'setup');

// Verify isolation: alpha cannot see beta's strategies
const alphaStrats = (await get('/api/strategies', cookies.alpha)).body;
const betaStrats  = (await get('/api/strategies', cookies.beta)).body;
check(!alphaStrats.some(s => s.name === 'Swing Beta'),   "Alpha cannot see Beta's strategies",  "Alpha sees Beta's strategies");
check(!betaStrats.some(s => s.name === 'Momentum'),      "Beta cannot see Alpha's strategies",   "Beta sees Alpha's strategies");
check(alphaStrats.some(s => s.name === 'Momentum'),      "Alpha sees own Momentum strategy",     "Alpha missing own strategy");
ok(`Alpha has ${alphaStrats.length} strategies, Beta has ${betaStrats.length}`);

const alphaTags = (await get('/api/tags', cookies.alpha)).body;
const betaTags  = (await get('/api/tags', cookies.beta)).body;
check(!alphaTags.some(t => t.label === 'beta-support-hold'), "Alpha cannot see Beta's tags", "Alpha sees Beta's tags");
check(alphaTags.some(t => t.label === 'alpha-vwap-reclaim'),  "Alpha sees own tags",          "Alpha missing own tags");

// ─── PHASE 4: Create trades ─────────────────────────────────────────────────

section('PHASE 4 — Create Trades');

// Helper: ISO timestamp from date string
function ts(date, time = 'T09:30:00.000Z') { return `${date}${time}`; }

const tradeIds = { alpha: {}, beta: {}, gamma: {}, delta: {} };

// ── ALPHA TRADES ─────────────────────────────────────────────────────────────
// Trade A1: AAPL long stock, closed — Win
// Entry: BUY 100 @ $170.00, fees $0.50
// Exit:  SELL 100 @ $178.00, fees $0.50
// Gross P&L = (178-170)*100 = $800, total fees = $1.00, net = $799.00
{
  const t = await createTrade(cookies.alpha, {
    symbol: 'AAPL', instrument: 'stock', direction: 'long',
    strategyId: strategies.alpha.momentum?.id,
    plannedEntry: 170, plannedStop: 165, plannedTarget: 180,
    plannedRiskUsd: 500,
    openedAt: ts('2026-03-15'),
    notesMd: 'Clean VWAP reclaim on daily chart',
    preConfidence: 8, preMood: 'focused', preFollowingPlan: true,
    postSatisfaction: 9, postWouldRetake: true,
    tagIds: [tags.alpha.setup?.id].filter(Boolean),
    execution: { kind: 'entry', executedAt: ts('2026-03-15'), feesUsd: 0.50,
      legs: [{ side: 'buy', shares: 100, price: 170.00, multiplier: 1 }] }
  });
  tradeIds.alpha.aapl = t?.id;
  if (t) {
    await closeTrade(cookies.alpha, t.id,
      { executedAt: ts('2026-03-18'), feesUsd: 0.50,
        legs: [{ side: 'sell', shares: 100, price: 178.00, multiplier: 1 }] },
      ts('2026-03-18'));
    ok('Alpha A1: AAPL closed +$799');
  }
}

// Trade A2: SPY credit spread (option_spread), short/neutral, closed — Win
// Entry: SELL 2@$5.00, BUY 2@$3.50, fees $2.60 → credit $300
// Exit:  BUY 2@$1.00, SELL 2@$0.50, fees $2.60 → debit $100
// Net P&L = $300 - $100 - $5.20 = $194.80
{
  const t = await createTrade(cookies.alpha, {
    symbol: 'SPY', instrument: 'option_spread', direction: 'neutral',
    strategyId: strategies.alpha.momentum?.id,
    plannedRiskUsd: 300,
    openedAt: ts('2026-03-22'),
    notesMd: 'Selling premium into resistance',
    preConfidence: 7, preMood: 'calm',
    execution: { kind: 'entry', executedAt: ts('2026-03-22'), feesUsd: 2.60,
      legs: [
        { side: 'sell', contracts: 2, optionType: 'put', strike: 560, expiration: '2026-04-18', price: 5.00, multiplier: 100 },
        { side: 'buy',  contracts: 2, optionType: 'put', strike: 555, expiration: '2026-04-18', price: 3.50, multiplier: 100 },
      ] }
  });
  tradeIds.alpha.spy = t?.id;
  if (t) {
    await closeTrade(cookies.alpha, t.id,
      { executedAt: ts('2026-04-05'), feesUsd: 2.60,
        legs: [
          { side: 'buy',  contracts: 2, optionType: 'put', strike: 560, expiration: '2026-04-18', price: 1.00, multiplier: 100 },
          { side: 'sell', contracts: 2, optionType: 'put', strike: 555, expiration: '2026-04-18', price: 0.50, multiplier: 100 },
        ] },
      ts('2026-04-05'));
    ok('Alpha A2: SPY spread closed +$194.80');
  }
}

// Trade A3: TSLA long stock, closed — Win
// Entry: BUY 50 @ $280.00, fees $0.25
// Exit:  SELL 50 @ $310.00, fees $0.25
// Net P&L = (310-280)*50 - $0.50 = $1499.50
{
  const t = await createTrade(cookies.alpha, {
    symbol: 'TSLA', instrument: 'stock', direction: 'long',
    strategyId: strategies.alpha.breakout?.id,
    plannedRiskUsd: 700,
    openedAt: ts('2026-04-08'),
    execution: { kind: 'entry', executedAt: ts('2026-04-08'), feesUsd: 0.25,
      legs: [{ side: 'buy', shares: 50, price: 280.00, multiplier: 1 }] }
  });
  tradeIds.alpha.tsla = t?.id;
  if (t) {
    await closeTrade(cookies.alpha, t.id,
      { executedAt: ts('2026-04-12'), feesUsd: 0.25,
        legs: [{ side: 'sell', shares: 50, price: 310.00, multiplier: 1 }] },
      ts('2026-04-12'));
    ok('Alpha A3: TSLA closed +$1499.50');
  }
}

// Trade A4: NVDA long stock, closed — Loss
// Entry: BUY 30 @ $450.00, fees $0.15
// Exit:  SELL 30 @ $420.00, fees $0.15
// Net P&L = (420-450)*30 - $0.30 = -$900.30
{
  const t = await createTrade(cookies.alpha, {
    symbol: 'NVDA', instrument: 'stock', direction: 'long',
    strategyId: strategies.alpha.momentum?.id,
    plannedRiskUsd: 400,
    openedAt: ts('2026-04-20'),
    preMood: 'fomo', preConfidence: 5, preFollowingPlan: false,
    postMistakes: 'Chased breakout too late',
    tagIds: [tags.alpha.psych?.id, tags.alpha.mistake?.id].filter(Boolean),
    execution: { kind: 'entry', executedAt: ts('2026-04-20'), feesUsd: 0.15,
      legs: [{ side: 'buy', shares: 30, price: 450.00, multiplier: 1 }] }
  });
  tradeIds.alpha.nvda = t?.id;
  if (t) {
    await closeTrade(cookies.alpha, t.id,
      { executedAt: ts('2026-04-22'), feesUsd: 0.15,
        legs: [{ side: 'sell', shares: 30, price: 420.00, multiplier: 1 }] },
      ts('2026-04-22'));
    ok('Alpha A4: NVDA closed -$900.30');
  }
}

// Trade A5: QQQ long stock, OPEN
// Entry: BUY 50 @ $440.00, fees $0.25
{
  const t = await createTrade(cookies.alpha, {
    symbol: 'QQQ', instrument: 'stock', direction: 'long',
    strategyId: strategies.alpha.breakout?.id,
    plannedRiskUsd: 600,
    openedAt: ts('2026-05-10'),
    execution: { kind: 'entry', executedAt: ts('2026-05-10'), feesUsd: 0.25,
      legs: [{ side: 'buy', shares: 50, price: 440.00, multiplier: 1 }] }
  });
  tradeIds.alpha.qqq = t?.id;
  if (t) ok('Alpha A5: QQQ open');
}

// ── BETA TRADES ──────────────────────────────────────────────────────────────
// Trade B1: MSFT long stock, closed — Win
// Entry: BUY 100 @ $420.00, fees $0.50 / Exit: SELL 100 @ $435.00, fees $0.50
// Net P&L = (435-420)*100 - $1.00 = $1499.00
{
  const t = await createTrade(cookies.beta, {
    symbol: 'MSFT', instrument: 'stock', direction: 'long',
    strategyId: strategies.beta.swing?.id,
    plannedRiskUsd: 800,
    openedAt: ts('2026-03-10'),
    tagIds: [tags.beta.setup?.id].filter(Boolean),
    execution: { kind: 'entry', executedAt: ts('2026-03-10'), feesUsd: 0.50,
      legs: [{ side: 'buy', shares: 100, price: 420.00, multiplier: 1 }] }
  });
  tradeIds.beta.msft = t?.id;
  if (t) {
    await closeTrade(cookies.beta, t.id,
      { executedAt: ts('2026-03-17'), feesUsd: 0.50,
        legs: [{ side: 'sell', shares: 100, price: 435.00, multiplier: 1 }] },
      ts('2026-03-17'));
    ok('Beta B1: MSFT closed +$1499');
  }
}

// Trade B2: GOOG long stock, closed — Loss
// Entry: BUY 20 @ $180.00, fees $0.10 / Exit: SELL 20 @ $165.00, fees $0.10
// Net P&L = (165-180)*20 - $0.20 = -$300.20
{
  const t = await createTrade(cookies.beta, {
    symbol: 'GOOG', instrument: 'stock', direction: 'long',
    strategyId: strategies.beta.swing?.id,
    plannedRiskUsd: 400,
    openedAt: ts('2026-04-01'),
    tagIds: [tags.beta.context?.id].filter(Boolean),
    execution: { kind: 'entry', executedAt: ts('2026-04-01'), feesUsd: 0.10,
      legs: [{ side: 'buy', shares: 20, price: 180.00, multiplier: 1 }] }
  });
  tradeIds.beta.goog = t?.id;
  if (t) {
    await closeTrade(cookies.beta, t.id,
      { executedAt: ts('2026-04-07'), feesUsd: 0.10,
        legs: [{ side: 'sell', shares: 20, price: 165.00, multiplier: 1 }] },
      ts('2026-04-07'));
    ok('Beta B2: GOOG closed -$300.20');
  }
}

// Trade B3: META long stock, closed — Win
// Entry: BUY 40 @ $500.00, fees $0.20 / Exit: SELL 40 @ $520.00, fees $0.20
// Net P&L = (520-500)*40 - $0.40 = $799.60
{
  const t = await createTrade(cookies.beta, {
    symbol: 'META', instrument: 'stock', direction: 'long',
    strategyId: strategies.beta.swing?.id,
    plannedRiskUsd: 500,
    openedAt: ts('2026-04-15'),
    execution: { kind: 'entry', executedAt: ts('2026-04-15'), feesUsd: 0.20,
      legs: [{ side: 'buy', shares: 40, price: 500.00, multiplier: 1 }] }
  });
  tradeIds.beta.meta = t?.id;
  if (t) {
    await closeTrade(cookies.beta, t.id,
      { executedAt: ts('2026-04-20'), feesUsd: 0.20,
        legs: [{ side: 'sell', shares: 40, price: 520.00, multiplier: 1 }] },
      ts('2026-04-20'));
    ok('Beta B3: META closed +$799.60');
  }
}

// Trade B4: AMZN long stock, OPEN
{
  const t = await createTrade(cookies.beta, {
    symbol: 'AMZN', instrument: 'stock', direction: 'long',
    strategyId: strategies.beta.swing?.id,
    plannedRiskUsd: 600,
    openedAt: ts('2026-05-05'),
    execution: { kind: 'entry', executedAt: ts('2026-05-05'), feesUsd: 0.15,
      legs: [{ side: 'buy', shares: 30, price: 200.00, multiplier: 1 }] }
  });
  tradeIds.beta.amzn = t?.id;
  if (t) ok('Beta B4: AMZN open');
}

// ── GAMMA TRADES ─────────────────────────────────────────────────────────────
// Trade G1: SPX credit spread, closed — Loss
// Entry: SELL 5@$10.00, BUY 5@$8.00, fees $6.50 → credit $1000
// Exit:  BUY 5@$12.00, SELL 5@$9.00, fees $6.50 → debit $1500
// Net P&L = $1000 - $1500 - $13.00 = -$513.00
{
  const t = await createTrade(cookies.gamma, {
    symbol: 'SPX', instrument: 'option_spread', direction: 'neutral',
    strategyId: strategies.gamma.counter?.id,
    plannedRiskUsd: 1000,
    openedAt: ts('2026-03-05'),
    preMood: 'calm', preConfidence: 6,
    tagIds: [tags.gamma.mistake?.id].filter(Boolean),
    execution: { kind: 'entry', executedAt: ts('2026-03-05'), feesUsd: 6.50,
      legs: [
        { side: 'sell', contracts: 5, optionType: 'put', strike: 5400, expiration: '2026-03-21', price: 10.00, multiplier: 100 },
        { side: 'buy',  contracts: 5, optionType: 'put', strike: 5350, expiration: '2026-03-21', price:  8.00, multiplier: 100 },
      ] }
  });
  tradeIds.gamma.spx = t?.id;
  if (t) {
    await closeTrade(cookies.gamma, t.id,
      { executedAt: ts('2026-03-18'), feesUsd: 6.50,
        legs: [
          { side: 'buy',  contracts: 5, optionType: 'put', strike: 5400, expiration: '2026-03-21', price: 12.00, multiplier: 100 },
          { side: 'sell', contracts: 5, optionType: 'put', strike: 5350, expiration: '2026-03-21', price:  9.00, multiplier: 100 },
        ] },
      ts('2026-03-18'));
    ok('Gamma G1: SPX spread closed -$513');
  }
}

// Trade G2: TSLA short stock, closed — Loss
// Entry: SELL 50 @ $280.00, fees $0.25 / Exit: BUY 50 @ $310.00, fees $0.25
// Net P&L = (280-310)*50 - $0.50 = -$1500.50
{
  const t = await createTrade(cookies.gamma, {
    symbol: 'TSLA', instrument: 'stock', direction: 'short',
    strategyId: strategies.gamma.counter?.id,
    plannedRiskUsd: 1000,
    openedAt: ts('2026-04-12'),
    preMood: 'revenge', preConfidence: 4,
    tagIds: [tags.gamma.psych?.id].filter(Boolean),
    execution: { kind: 'entry', executedAt: ts('2026-04-12'), feesUsd: 0.25,
      legs: [{ side: 'sell', shares: 50, price: 280.00, multiplier: 1 }] }
  });
  tradeIds.gamma.tsla = t?.id;
  if (t) {
    await closeTrade(cookies.gamma, t.id,
      { executedAt: ts('2026-04-16'), feesUsd: 0.25,
        legs: [{ side: 'buy', shares: 50, price: 310.00, multiplier: 1 }] },
      ts('2026-04-16'));
    ok('Gamma G2: TSLA short closed -$1500.50');
  }
}

// Trade G3: AAPL long stock, closed — Win (lone win)
// Entry: BUY 100 @ $175.00, fees $0.50 / Exit: SELL 100 @ $180.00, fees $0.50
// Net P&L = (180-175)*100 - $1.00 = $499.00
{
  const t = await createTrade(cookies.gamma, {
    symbol: 'AAPL', instrument: 'stock', direction: 'long',
    strategyId: strategies.gamma.counter?.id,
    plannedRiskUsd: 500,
    openedAt: ts('2026-04-25'),
    execution: { kind: 'entry', executedAt: ts('2026-04-25'), feesUsd: 0.50,
      legs: [{ side: 'buy', shares: 100, price: 175.00, multiplier: 1 }] }
  });
  tradeIds.gamma.aapl = t?.id;
  if (t) {
    await closeTrade(cookies.gamma, t.id,
      { executedAt: ts('2026-04-28'), feesUsd: 0.50,
        legs: [{ side: 'sell', shares: 100, price: 180.00, multiplier: 1 }] },
      ts('2026-04-28'));
    ok('Gamma G3: AAPL closed +$499');
  }
}

// Trade G4: QQQ long option spread, closed — Loss
// Entry: BUY 2@$5.00, fees $1.30 → debit -$1000
// Exit:  SELL 2@$3.00, fees $1.30 → credit +$600
// Net P&L = -$1000 + $600 - $2.60 = -$402.60
{
  const t = await createTrade(cookies.gamma, {
    symbol: 'QQQ', instrument: 'option_spread', direction: 'long',
    strategyId: strategies.gamma.counter?.id,
    plannedRiskUsd: 400,
    openedAt: ts('2026-05-08'),
    execution: { kind: 'entry', executedAt: ts('2026-05-08'), feesUsd: 1.30,
      legs: [
        { side: 'buy',  contracts: 2, optionType: 'call', strike: 480, expiration: '2026-05-30', price: 5.00, multiplier: 100 },
      ] }
  });
  tradeIds.gamma.qqq = t?.id;
  if (t) {
    await closeTrade(cookies.gamma, t.id,
      { executedAt: ts('2026-05-14'), feesUsd: 1.30,
        legs: [
          { side: 'sell', contracts: 2, optionType: 'call', strike: 480, expiration: '2026-05-30', price: 3.00, multiplier: 100 },
        ] },
      ts('2026-05-14'));
    ok('Gamma G4: QQQ calls closed -$402.60');
  }
}

// ── DELTA TRADES ─────────────────────────────────────────────────────────────
// Trade D1: SPY stock long, closed — Win
// Entry: BUY 200 @ $565.00, fees $1.00 / Exit: SELL 200 @ $570.00, fees $1.00
// Net P&L = (570-565)*200 - $2.00 = $998.00
{
  const t = await createTrade(cookies.delta, {
    symbol: 'SPY', instrument: 'stock', direction: 'long',
    strategyId: strategies.delta.scalp?.id,
    plannedRiskUsd: 400,
    openedAt: ts('2026-05-15'),
    tagIds: [tags.delta.setup?.id].filter(Boolean),
    execution: { kind: 'entry', executedAt: ts('2026-05-15'), feesUsd: 1.00,
      legs: [{ side: 'buy', shares: 200, price: 565.00, multiplier: 1 }] }
  });
  tradeIds.delta.spy = t?.id;
  if (t) {
    await closeTrade(cookies.delta, t.id,
      { executedAt: ts('2026-05-15', 'T14:30:00.000Z'), feesUsd: 1.00,
        legs: [{ side: 'sell', shares: 200, price: 570.00, multiplier: 1 }] },
      ts('2026-05-15', 'T14:30:00.000Z'));
    ok('Delta D1: SPY closed +$998');
  }
}

// Trade D2: IWM long stock, OPEN
{
  const t = await createTrade(cookies.delta, {
    symbol: 'IWM', instrument: 'stock', direction: 'long',
    strategyId: strategies.delta.scalp?.id,
    plannedRiskUsd: 300,
    openedAt: ts('2026-05-20'),
    execution: { kind: 'entry', executedAt: ts('2026-05-20'), feesUsd: 0.50,
      legs: [{ side: 'buy', shares: 100, price: 200.00, multiplier: 1 }] }
  });
  tradeIds.delta.iwm = t?.id;
  if (t) ok('Delta D2: IWM open');
}

// Trade D3: GLD neutral option spread, OPEN (credit spread)
// Entry: SELL 3@$2.00, BUY 3@$1.00, fees $3.90
{
  const t = await createTrade(cookies.delta, {
    symbol: 'GLD', instrument: 'option_spread', direction: 'neutral',
    strategyId: strategies.delta.scalp?.id,
    plannedRiskUsd: 300,
    openedAt: ts('2026-05-22'),
    execution: { kind: 'entry', executedAt: ts('2026-05-22'), feesUsd: 3.90,
      legs: [
        { side: 'sell', contracts: 3, optionType: 'call', strike: 245, expiration: '2026-06-20', price: 2.00, multiplier: 100 },
        { side: 'buy',  contracts: 3, optionType: 'call', strike: 250, expiration: '2026-06-20', price: 1.00, multiplier: 100 },
      ] }
  });
  tradeIds.delta.gld = t?.id;
  if (t) ok('Delta D3: GLD spread open');
}

// ─── PHASE 5: Update per-user settings ───────────────────────────────────────

section('PHASE 5 — Per-User Settings');

await patch('/api/settings', { startingBalance: '30000', timezone: 'America/New_York' }, cookies.alpha);
await patch('/api/settings', { startingBalance: '50000', timezone: 'America/Los_Angeles' }, cookies.beta);
await patch('/api/settings', { startingBalance: '10000' }, cookies.gamma);

const alphaSettings = (await get('/api/settings', cookies.alpha)).body;
const betaSettings  = (await get('/api/settings', cookies.beta)).body;
const gammaSettings = (await get('/api/settings', cookies.gamma)).body;
const echoSettings  = (await get('/api/settings', cookies.echo)).body;

check(alphaSettings.startingBalance === '30000', 'Alpha startingBalance=30000', `Alpha balance wrong: ${alphaSettings.startingBalance}`);
check(alphaSettings.timezone === 'America/New_York', 'Alpha timezone=NY', `Alpha TZ wrong: ${alphaSettings.timezone}`);
check(betaSettings.startingBalance === '50000', 'Beta startingBalance=50000', `Beta balance wrong: ${betaSettings.startingBalance}`);
check(gammaSettings.startingBalance === '10000', 'Gamma startingBalance=10000', `Gamma balance wrong: ${gammaSettings.startingBalance}`);
check(echoSettings.startingBalance === '25000', 'Echo gets default startingBalance=25000', `Echo balance wrong: ${echoSettings.startingBalance}`);
check(betaSettings.startingBalance !== alphaSettings.startingBalance, 'Alpha and Beta have different settings', 'Settings not isolated');

// ─── PHASE 6: Verify trade counts & isolation ─────────────────────────────────

section('PHASE 6 — Trade Counts & Isolation');

const alphaTrades = (await get('/api/trades', cookies.alpha)).body;
const betaTrades  = (await get('/api/trades', cookies.beta)).body;
const gammaTrades = (await get('/api/trades', cookies.gamma)).body;
const deltaTrades = (await get('/api/trades', cookies.delta)).body;
const echoTrades  = (await get('/api/trades', cookies.echo)).body;

check(alphaTrades.total === 5, `Alpha has 5 trades (got ${alphaTrades.total})`, `Alpha trade count wrong: ${alphaTrades.total}`);
check(betaTrades.total === 4,  `Beta has 4 trades (got ${betaTrades.total})`,   `Beta trade count wrong: ${betaTrades.total}`);
check(gammaTrades.total === 4, `Gamma has 4 trades (got ${gammaTrades.total})`, `Gamma trade count wrong: ${gammaTrades.total}`);
check(deltaTrades.total === 3, `Delta has 3 trades (got ${deltaTrades.total})`, `Delta trade count wrong: ${deltaTrades.total}`);
check(echoTrades.total === 0,  `Echo has 0 trades (got ${echoTrades.total})`,   `Echo trade count wrong: ${echoTrades.total}`);

// Cross-user isolation check — Alpha cannot see Beta's trades
const alphaSymbols = alphaTrades.trades.map(t => t.symbol);
const betaSymbols  = betaTrades.trades.map(t => t.symbol);
check(!alphaSymbols.includes('MSFT'), "Alpha cannot see MSFT (Beta's)", "ISOLATION FAIL: Alpha sees MSFT");
check(!betaSymbols.includes('AAPL'),  "Beta cannot see AAPL (Alpha's)",  "ISOLATION FAIL: Beta sees AAPL");
check(alphaSymbols.includes('AAPL'),  "Alpha sees own AAPL trade",        "Alpha missing AAPL");

// Open/closed counts
const alphaOpen   = alphaTrades.trades.filter(t => t.status === 'open').length;
const alphaClosed = alphaTrades.trades.filter(t => t.status === 'closed').length;
check(alphaOpen === 1,   `Alpha has 1 open trade`,   `Alpha open count wrong: ${alphaOpen}`);
check(alphaClosed === 4, `Alpha has 4 closed trades`, `Alpha closed count wrong: ${alphaClosed}`);

const deltaOpen = deltaTrades.trades.filter(t => t.status === 'open').length;
check(deltaOpen === 2, `Delta has 2 open trades`, `Delta open count wrong: ${deltaOpen}`);

// ─── PHASE 7: Verify P&L calculations ────────────────────────────────────────

section('PHASE 7 — P&L Calculations');

async function getTradeById(cookie, id) {
  if (!id) return null;
  const r = await get(`/api/trades/${id}`, cookie);
  return r.status === 200 ? r.body : null;
}

// Alpha P&L verifications
const a_aapl = await getTradeById(cookies.alpha, tradeIds.alpha.aapl);
const a_spy  = await getTradeById(cookies.alpha, tradeIds.alpha.spy);
const a_tsla = await getTradeById(cookies.alpha, tradeIds.alpha.tsla);
const a_nvda = await getTradeById(cookies.alpha, tradeIds.alpha.nvda);
const a_qqq  = await getTradeById(cookies.alpha, tradeIds.alpha.qqq);

if (a_aapl) check(near(a_aapl.realizedPnlUsd, 799), `AAPL P&L ≈ $799 (got ${a_aapl.realizedPnlUsd?.toFixed(2)})`, `AAPL P&L wrong: ${a_aapl.realizedPnlUsd}`);
if (a_spy)  check(near(a_spy.realizedPnlUsd, 194.80), `SPY spread P&L ≈ $194.80 (got ${a_spy.realizedPnlUsd?.toFixed(2)})`, `SPY P&L wrong: ${a_spy.realizedPnlUsd}`);
if (a_tsla) check(near(a_tsla.realizedPnlUsd, 1499.50), `TSLA P&L ≈ $1499.50 (got ${a_tsla.realizedPnlUsd?.toFixed(2)})`, `TSLA P&L wrong: ${a_tsla.realizedPnlUsd}`);
if (a_nvda) check(near(a_nvda.realizedPnlUsd, -900.30), `NVDA P&L ≈ -$900.30 (got ${a_nvda.realizedPnlUsd?.toFixed(2)})`, `NVDA P&L wrong: ${a_nvda.realizedPnlUsd}`);
if (a_qqq)  check(a_qqq.status === 'open' && a_qqq.realizedPnlUsd === null, `QQQ (open) has null P&L`, `QQQ open P&L not null: ${a_qqq.realizedPnlUsd}`);

// R-multiples
if (a_aapl) { const expR = 799/500; check(near(a_aapl.realizedPnlR, expR, 0.05), `AAPL R ≈ ${expR.toFixed(2)} (got ${a_aapl.realizedPnlR?.toFixed(2)})`, `AAPL R wrong: ${a_aapl.realizedPnlR}`); }
if (a_nvda) { const expR = -900.30/400; check(near(a_nvda.realizedPnlR, expR, 0.05), `NVDA R ≈ ${expR.toFixed(2)} (got ${a_nvda.realizedPnlR?.toFixed(2)})`, `NVDA R wrong: ${a_nvda.realizedPnlR}`); }

// Beta P&L
const b_msft = await getTradeById(cookies.beta, tradeIds.beta.msft);
const b_goog = await getTradeById(cookies.beta, tradeIds.beta.goog);
const b_meta = await getTradeById(cookies.beta, tradeIds.beta.meta);
if (b_msft) check(near(b_msft.realizedPnlUsd, 1499), `MSFT P&L ≈ $1499 (got ${b_msft.realizedPnlUsd?.toFixed(2)})`, `MSFT P&L wrong: ${b_msft.realizedPnlUsd}`);
if (b_goog) check(near(b_goog.realizedPnlUsd, -300.20), `GOOG P&L ≈ -$300.20 (got ${b_goog.realizedPnlUsd?.toFixed(2)})`, `GOOG P&L wrong: ${b_goog.realizedPnlUsd}`);
if (b_meta) check(near(b_meta.realizedPnlUsd, 799.60), `META P&L ≈ $799.60 (got ${b_meta.realizedPnlUsd?.toFixed(2)})`, `META P&L wrong: ${b_meta.realizedPnlUsd}`);

// Gamma P&L
const g_spx  = await getTradeById(cookies.gamma, tradeIds.gamma.spx);
const g_tsla = await getTradeById(cookies.gamma, tradeIds.gamma.tsla);
const g_aapl = await getTradeById(cookies.gamma, tradeIds.gamma.aapl);
const g_qqq  = await getTradeById(cookies.gamma, tradeIds.gamma.qqq);
if (g_spx)  check(near(g_spx.realizedPnlUsd, -513), `SPX spread P&L ≈ -$513 (got ${g_spx.realizedPnlUsd?.toFixed(2)})`, `SPX P&L wrong: ${g_spx.realizedPnlUsd}`);
if (g_tsla) check(near(g_tsla.realizedPnlUsd, -1500.50), `TSLA short P&L ≈ -$1500.50 (got ${g_tsla.realizedPnlUsd?.toFixed(2)})`, `TSLA short P&L wrong: ${g_tsla.realizedPnlUsd}`);
if (g_aapl) check(near(g_aapl.realizedPnlUsd, 499), `AAPL P&L ≈ $499 (got ${g_aapl.realizedPnlUsd?.toFixed(2)})`, `AAPL Gamma P&L wrong: ${g_aapl.realizedPnlUsd}`);
if (g_qqq)  check(near(g_qqq.realizedPnlUsd, -402.60), `QQQ calls P&L ≈ -$402.60 (got ${g_qqq.realizedPnlUsd?.toFixed(2)})`, `QQQ Gamma P&L wrong: ${g_qqq.realizedPnlUsd}`);

// Delta P&L
const d_spy = await getTradeById(cookies.delta, tradeIds.delta.spy);
if (d_spy) check(near(d_spy.realizedPnlUsd, 998), `Delta SPY P&L ≈ $998 (got ${d_spy.realizedPnlUsd?.toFixed(2)})`, `Delta SPY P&L wrong: ${d_spy.realizedPnlUsd}`);

// ─── PHASE 8: Verify metrics ─────────────────────────────────────────────────

section('PHASE 8 — Metrics Verification');

const alphaMet = (await get('/api/metrics?startingBalance=30000', cookies.alpha)).body;
const betaMet  = (await get('/api/metrics?startingBalance=50000', cookies.beta)).body;
const gammaMet = (await get('/api/metrics?startingBalance=10000', cookies.gamma)).body;
const deltaMet = (await get('/api/metrics', cookies.delta)).body;
const echoMet  = (await get('/api/metrics', cookies.echo)).body;

// Alpha metrics
// Closed: AAPL($799), SPY($194.80), TSLA($1499.50), NVDA(-$900.30)
// Expected total P&L = 799 + 194.80 + 1499.50 - 900.30 = 1593.00
// Expected win rate = 3/4 = 75 (API returns 0-100 percentage)
const alphaExpPnl = 799 + 194.80 + 1499.50 - 900.30; // 1593.00
check(near(alphaMet.headline?.totalPnlUsd ?? 0, alphaExpPnl, 1), `Alpha total P&L ≈ $${alphaExpPnl.toFixed(2)} (got $${(alphaMet.headline?.totalPnlUsd ?? 0).toFixed(2)})`, `Alpha P&L wrong: ${alphaMet.headline?.totalPnlUsd}`);
check(near(alphaMet.headline?.winRate ?? 0, 75, 0.5), `Alpha win rate = 75% (got ${(alphaMet.headline?.winRate ?? 0).toFixed(1)}%)`, `Alpha win rate wrong: ${alphaMet.headline?.winRate}`);
check(alphaMet.summary?.totalTrades === 5, `Alpha totalTrades=5`, `Alpha totalTrades wrong: ${alphaMet.summary?.totalTrades}`);
check(alphaMet.summary?.openTrades === 1, `Alpha openTrades=1`, `Alpha openTrades wrong: ${alphaMet.summary?.openTrades}`);
check(alphaMet.summary?.closedTrades === 4, `Alpha closedTrades=4`, `Alpha closedTrades wrong: ${alphaMet.summary?.closedTrades}`);

// Expected profit factor = gross profit / |gross loss| = (799+194.80+1499.50) / 900.30 = 2.77
const grossProfit = 799 + 194.80 + 1499.50;
const grossLoss = 900.30;
const expPF = grossProfit / grossLoss;
check(near(alphaMet.headline?.profitFactor ?? 0, expPF, 0.1), `Alpha profit factor ≈ ${expPF.toFixed(2)} (got ${(alphaMet.headline?.profitFactor ?? 0).toFixed(2)})`, `Alpha PF wrong: ${alphaMet.headline?.profitFactor}`);

// Beta metrics
// Closed: MSFT($1499), GOOG(-$300.20), META($799.60)
// Expected total P&L = 1499 - 300.20 + 799.60 = 1998.40
// Expected win rate = 2/3 = 66.67 (API returns 0-100 percentage)
const betaExpPnl = 1499 - 300.20 + 799.60; // 1998.40
check(near(betaMet.headline?.totalPnlUsd ?? 0, betaExpPnl, 1), `Beta total P&L ≈ $${betaExpPnl.toFixed(2)} (got $${(betaMet.headline?.totalPnlUsd ?? 0).toFixed(2)})`, `Beta P&L wrong: ${betaMet.headline?.totalPnlUsd}`);
check(near(betaMet.headline?.winRate ?? 0, 66.67, 0.5), `Beta win rate ≈ 66.7% (got ${(betaMet.headline?.winRate ?? 0).toFixed(1)}%)`, `Beta win rate wrong: ${betaMet.headline?.winRate}`);

// Gamma metrics
// Closed: SPX(-$513), TSLA(-$1500.50), AAPL($499), QQQ(-$402.60)
// Expected total P&L = -513 - 1500.50 + 499 - 402.60 = -1917.10
// Expected win rate = 1/4 = 25 (API returns 0-100 percentage)
const gammaExpPnl = -513 - 1500.50 + 499 - 402.60;
check(near(gammaMet.headline?.totalPnlUsd ?? 0, gammaExpPnl, 2), `Gamma total P&L ≈ $${gammaExpPnl.toFixed(2)} (got $${(gammaMet.headline?.totalPnlUsd ?? 0).toFixed(2)})`, `Gamma P&L wrong: ${gammaMet.headline?.totalPnlUsd}`);
check(near(gammaMet.headline?.winRate ?? 0, 25, 0.5), `Gamma win rate = 25% (got ${(gammaMet.headline?.winRate ?? 0).toFixed(1)}%)`, `Gamma win rate wrong: ${gammaMet.headline?.winRate}`);

// Delta metrics — 1 closed trade, win
// Expected win rate = 1/1 = 100 (API returns 0-100 percentage)
check(near(deltaMet.headline?.totalPnlUsd ?? 0, 998, 1), `Delta total P&L ≈ $998 (got ${(deltaMet.headline?.totalPnlUsd ?? 0).toFixed(2)})`, `Delta P&L wrong: ${deltaMet.headline?.totalPnlUsd}`);
check(near(deltaMet.headline?.winRate ?? 0, 100, 0.5), `Delta win rate = 100%`, `Delta win rate wrong: ${deltaMet.headline?.winRate}`);

// Echo — no trades
check(echoMet.summary?.totalTrades === 0, `Echo totalTrades=0`, `Echo totalTrades wrong: ${echoMet.summary?.totalTrades}`);
check(echoMet.headline?.totalPnlUsd === 0, `Echo totalPnlUsd=0`, `Echo P&L wrong: ${echoMet.headline?.totalPnlUsd}`);
check(echoMet.headline?.winRate === 0, `Echo winRate=0 (no trades)`, `Echo winRate wrong: ${echoMet.headline?.winRate}`);

// Cross-user isolation: alpha's metrics should NOT include beta's MSFT trade
// (already verified by trade count, but double-check)
check(alphaMet.summary?.closedTrades !== 7, `Alpha metrics excludes Beta's trades (closedTrades=4, not 7)`, `Alpha metrics shows too many closed: ${alphaMet.summary?.closedTrades}`);

// ─── PHASE 9: Calendar verification ──────────────────────────────────────────

section('PHASE 9 — Calendar Data');

// Alpha March 2026: AAPL closed 2026-03-18 (+$799)
// Note: SPY opened 2026-03-22 but CLOSED 2026-04-05 — calendar uses closedAt for closed
// trades, so SPY appears in April, not March.
const alphaMarch = (await get('/api/calendar?year=2026&month=3', cookies.alpha)).body;
const alphaApril = (await get('/api/calendar?year=2026&month=4', cookies.alpha)).body;
const betaMarch  = (await get('/api/calendar?year=2026&month=3', cookies.beta)).body;
const echoMarch  = (await get('/api/calendar?year=2026&month=3', cookies.echo)).body;

check(Array.isArray(alphaMarch), `Alpha March calendar returns array`, `Alpha calendar not array`);
check(echoMarch.length === 0, `Echo March calendar is empty`, `Echo calendar not empty: ${echoMarch.length}`);

// Alpha March: AAPL closed on Mar18
const alphaMar18 = alphaMarch.find(d => d.date === '2026-03-18');
check(!!alphaMar18, `Alpha has calendar entry for 2026-03-18 (AAPL close)`, `Alpha missing Mar18`);
if (alphaMar18) check(near(alphaMar18.pnlUsd, 799, 1), `Alpha Mar18 P&L ≈ $799 (got ${alphaMar18.pnlUsd?.toFixed(2)})`, `Alpha Mar18 P&L wrong: ${alphaMar18.pnlUsd}`);
// Alpha April: SPY closed on Apr05 (+$194.80)
const alphaApr05 = alphaApril.find(d => d.date === '2026-04-05');
check(!!alphaApr05, `Alpha has calendar entry for 2026-04-05 (SPY close)`, `Alpha missing Apr05`);

// Beta March: MSFT closed Mar17 (+$1499)
const betaMar17 = betaMarch.find(d => d.date === '2026-03-17');
check(!!betaMar17, `Beta has calendar entry for 2026-03-17 (MSFT close)`, `Beta missing Mar17`);
if (betaMar17) check(near(betaMar17.pnlUsd, 1499, 1), `Beta Mar17 P&L ≈ $1499 (got ${betaMar17.pnlUsd?.toFixed(2)})`, `Beta Mar17 P&L wrong: ${betaMar17.pnlUsd}`);

// Isolation: Alpha's March calendar should NOT include MSFT
const alphaSymbolsMarch = alphaMarch.flatMap(d => []);
check(!betaMarch.find(d => d.date === '2026-03-18'), `Beta March has no entry on Mar18 (only Alpha does)`, `ISOLATION: Beta sees Alpha Mar18`);

// ─── PHASE 10: Trade filtering ────────────────────────────────────────────────

section('PHASE 10 — Trade Filtering');

// Filter by symbol
const alphaAAPL = (await get('/api/trades?symbol=AAPL', cookies.alpha)).body;
check(alphaAAPL.total === 1, `Alpha filter by symbol=AAPL returns 1 (got ${alphaAAPL.total})`, `Alpha AAPL filter wrong: ${alphaAAPL.total}`);

// Filter by status
const alphaOpen2 = (await get('/api/trades?status=open', cookies.alpha)).body;
const alphaClosed2 = (await get('/api/trades?status=closed', cookies.alpha)).body;
check(alphaOpen2.total === 1, `Alpha filter status=open returns 1 (got ${alphaOpen2.total})`, `Alpha open filter wrong: ${alphaOpen2.total}`);
check(alphaClosed2.total === 4, `Alpha filter status=closed returns 4 (got ${alphaClosed2.total})`, `Alpha closed filter wrong: ${alphaClosed2.total}`);

// Filter by instrument
const alphaOptions = (await get('/api/trades?instrument=option_spread', cookies.alpha)).body;
check(alphaOptions.total === 1, `Alpha filter instrument=option_spread returns 1 (got ${alphaOptions.total})`, `Alpha options filter wrong: ${alphaOptions.total}`);

const alphaStocks = (await get('/api/trades?instrument=stock', cookies.alpha)).body;
check(alphaStocks.total === 4, `Alpha filter instrument=stock returns 4 (got ${alphaStocks.total})`, `Alpha stocks filter wrong: ${alphaStocks.total}`);

// ─── PHASE 11: Authorization checks ──────────────────────────────────────────

section('PHASE 11 — Authorization & Ownership');

// Try to access Alpha's AAPL trade as Beta → should 404
if (tradeIds.alpha.aapl) {
  const r = await get(`/api/trades/${tradeIds.alpha.aapl}`, cookies.beta);
  check(r.status === 404, `Beta cannot access Alpha's AAPL trade (got ${r.status})`, `Auth fail: Beta accessed Alpha's trade (${r.status})`);
}

// Try to delete Alpha's NVDA trade as Gamma → should 404
if (tradeIds.alpha.nvda) {
  const r = await del(`/api/trades/${tradeIds.alpha.nvda}`, cookies.gamma);
  check(r.status === 404, `Gamma cannot delete Alpha's NVDA trade (got ${r.status})`, `Auth fail: Gamma deleted Alpha's trade (${r.status})`);
}

// Unauthenticated access → should redirect (307/302)
const unauthedR = await fetch(`${BASE_URL}/api/trades`, { redirect: 'manual' });
check(unauthedR.status === 307 || unauthedR.status === 302, `Unauthenticated /api/trades returns redirect`, `Unauthenticated access returned ${unauthedR.status}`);

// Login with wrong passcode → 401
const wrongLogin = await api('POST', '/api/auth/login', { password: '999998' });
check(wrongLogin.status === 401, `Invalid passcode returns 401`, `Wrong passcode returned ${wrongLogin.status}`);

// ─── PHASE 12: Symbols autocomplete ─────────────────────────────────────────

section('PHASE 12 — Symbols Autocomplete');

const alphaSyms = (await get('/api/trades/symbols', cookies.alpha)).body;
const betaSyms  = (await get('/api/trades/symbols', cookies.beta)).body;

check(Array.isArray(alphaSyms), `Alpha symbols returns array`, `Alpha symbols not array`);
check(alphaSyms.includes('AAPL'), `Alpha symbols includes AAPL`, `Alpha missing AAPL in symbols`);
check(alphaSyms.includes('QQQ'),  `Alpha symbols includes QQQ`,  `Alpha missing QQQ in symbols`);
check(!alphaSyms.includes('MSFT'), `Alpha symbols doesn't include MSFT (Beta's)`, `Alpha sees MSFT in symbols`);
check(betaSyms.includes('MSFT'),   `Beta symbols includes MSFT`,  `Beta missing MSFT`);
check(!betaSyms.includes('AAPL'),  `Beta symbols doesn't include AAPL (Alpha's)`, `Beta sees AAPL in symbols`);

// ─── PHASE 13: Analytics (basic smoke test) ──────────────────────────────────

section('PHASE 13 — Analytics Smoke Test');

const alphaAnalytics = (await get('/api/analytics', cookies.alpha)).body;
const echoAnalytics  = (await get('/api/analytics', cookies.echo)).body;

check(!!alphaAnalytics.timeAnalysis, `Alpha analytics has timeAnalysis`, `Alpha analytics missing timeAnalysis`);
check(!!alphaAnalytics.advancedRisk, `Alpha analytics has advancedRisk`, `Alpha analytics missing advancedRisk`);
check(!!alphaAnalytics.behavioral,   `Alpha analytics has behavioral`,   `Alpha analytics missing behavioral`);
check(!!alphaAnalytics.edgeExtended, `Alpha analytics has edgeExtended`, `Alpha analytics missing edgeExtended`);

// Echo analytics should return zeros/empty arrays
check(echoAnalytics.timeAnalysis?.monthlyPnl?.length === 0, `Echo analytics monthlyPnl empty`, `Echo monthlyPnl not empty: ${echoAnalytics.timeAnalysis?.monthlyPnl?.length}`);
check(echoAnalytics.advancedRisk?.sharpeRatio === 0, `Echo sharpeRatio = 0`, `Echo sharpeRatio: ${echoAnalytics.advancedRisk?.sharpeRatio}`);

// Alpha monthly P&L should have entries
const alphaMonthly = alphaAnalytics.timeAnalysis?.monthlyPnl ?? [];
check(alphaMonthly.length >= 2, `Alpha has monthly P&L data in ≥2 months (got ${alphaMonthly.length})`, `Alpha missing monthly P&L data`);

// ─── PHASE 14: CRUD operations ───────────────────────────────────────────────

section('PHASE 14 — Trade CRUD');

// Update trade notes
if (tradeIds.alpha.aapl) {
  const updated = await patch(`/api/trades/${tradeIds.alpha.aapl}`, { notesMd: 'Updated notes via UAT test' }, cookies.alpha);
  check(updated.status === 200, `Alpha can update own trade`, `Alpha update trade failed: ${updated.status}`);
  check(updated.body?.notesMd === 'Updated notes via UAT test', `Trade notes updated correctly`, `Notes not updated: ${updated.body?.notesMd}`);
}

// Create and delete a temporary trade
const tmpTrade = await createTrade(cookies.echo, {
  symbol: 'TMP', instrument: 'stock', direction: 'long',
  openedAt: ts('2026-05-01'),
  execution: { kind: 'entry', executedAt: ts('2026-05-01'), feesUsd: 0,
    legs: [{ side: 'buy', shares: 1, price: 100, multiplier: 1 }] }
});
if (tmpTrade) {
  ok(`Echo can create a trade`);
  const del1 = await del(`/api/trades/${tmpTrade.id}`, cookies.echo);
  check(del1.status === 200, `Echo can delete own trade`, `Echo delete failed: ${del1.status}`);
  const echoTradesAfter = (await get('/api/trades', cookies.echo)).body;
  check(echoTradesAfter.total === 0, `Echo trade count back to 0 after delete`, `Echo trade count: ${echoTradesAfter.total}`);
}

// ─── PHASE 15: Login page and signup page accessible ─────────────────────────

section('PHASE 15 — Public Pages');

const loginPage  = await fetch(`${BASE_URL}/login`);
const signupPage = await fetch(`${BASE_URL}/signup`);
check(loginPage.ok,  `Login page accessible (${loginPage.status})`,  `Login page failed: ${loginPage.status}`);
check(signupPage.ok, `Signup page accessible (${signupPage.status})`, `Signup page failed: ${signupPage.status}`);

// Auth-protected pages redirect when unauthenticated
const journalR = await fetch(`${BASE_URL}/journal`, { redirect: 'manual' });
check(journalR.status === 307 || journalR.status === 302, `Journal page redirects unauthenticated (${journalR.status})`, `Journal no redirect: ${journalR.status}`);

// ─── FINAL SUMMARY ───────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60));
console.log('  UAT RESULTS');
console.log('═'.repeat(60));
console.log(`  Total:  ${passed + failed}`);
console.log(`  Passed: ${passed} ✅`);
console.log(`  Failed: ${failed} ❌`);

if (issues.length > 0) {
  console.log('\n  ISSUES FOUND:');
  issues.forEach((i, n) => console.log(`  ${n+1}. ${i}`));
}

console.log('\n  TEST USERS CREATED:');
for (const [key, u] of Object.entries(USERS)) {
  console.log(`  ${u.label.padEnd(28)} passcode: ${u.passcode}`);
}
console.log('\n  TRADE SUMMARY:');
console.log('  Alpha (281947): 5 trades — AAPL,SPY,TSLA,NVDA(closed), QQQ(open)');
console.log('  Beta  (539016): 4 trades — MSFT,GOOG,META(closed), AMZN(open)');
console.log('  Gamma (674831): 4 trades — SPX,TSLA,AAPL,QQQ (all closed)');
console.log('  Delta (492058): 3 trades — SPY(closed), IWM,GLD(open)');
console.log('  Echo  (715630): 0 trades');
console.log('');

if (failed > 0) process.exit(1);
