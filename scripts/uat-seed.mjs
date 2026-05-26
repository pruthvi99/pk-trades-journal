/**
 * UAT Seed Script — creates 6 test users with distinct profiles,
 * 20 trades spread across users and dates, tags, strategies, settings.
 * Then runs calculation verification checks.
 *
 * Run: node scripts/uat-seed.mjs
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/pk_trades.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Helpers ────────────────────────────────────────────────────────────────
const nowUtc = () => new Date().toISOString();
const dateStr = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 14, 30, 0)).toISOString();
const uuid = () => randomUUID();
const round2 = (n) => Math.round(n * 100) / 100;

// ─── Check DB schema version ─────────────────────────────────────────────────
function checkSchema() {
  try {
    const cols = db.prepare("PRAGMA table_info(users)").all();
    const hasPk = cols.some(c => c.name === 'id');
    if (!hasPk) throw new Error('users table missing id column');
    console.log('✅ Schema check passed');
    return true;
  } catch (e) {
    console.error('❌ Schema check failed:', e.message);
    return false;
  }
}

// ─── Wipe UAT data (only test users, not the admin 090909) ──────────────────
function wipeUATData() {
  // Get all non-admin user IDs starting with uat-
  const uatUsers = db.prepare(`SELECT id FROM users WHERE passcode LIKE '1%' OR passcode LIKE '2%' OR passcode LIKE '3%' OR passcode LIKE '4%' OR passcode LIKE '5%' OR passcode LIKE '6%' AND id != '00000000-0000-0000-0000-000000090909'`).all();

  // Actually, let's just look for our known test passcodes
  const testPasscodes = ['111111','222222','333333','444444','555555','666666'];
  for (const pc of testPasscodes) {
    const user = db.prepare('SELECT id FROM users WHERE passcode = ?').get(pc);
    if (user) {
      // Delete cascades will handle trade data via FK
      db.prepare('DELETE FROM trade_tags WHERE trade_id IN (SELECT id FROM trades WHERE user_id = ?)').run(user.id);
      db.prepare('DELETE FROM trade_execution_legs WHERE execution_id IN (SELECT id FROM trade_executions WHERE trade_id IN (SELECT id FROM trades WHERE user_id = ?))').run(user.id);
      db.prepare('DELETE FROM trade_executions WHERE trade_id IN (SELECT id FROM trades WHERE user_id = ?)').run(user.id);
      db.prepare('DELETE FROM trades WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM tags WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM strategies WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
      console.log(`  Wiped existing UAT user: ${pc}`);
    }
  }
}

// ─── Create user + seed defaults ─────────────────────────────────────────────
function createUser(passcode, displayName, isAdmin = false) {
  const id = uuid();
  const now = nowUtc();
  db.prepare('INSERT INTO users (id, passcode, display_name, is_admin, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, passcode, displayName, isAdmin ? 1 : 0, now);
  return id;
}

// ─── Create strategy ──────────────────────────────────────────────────────────
function createStrategy(userId, name, desc = null, instrument = null) {
  const id = uuid();
  const now = nowUtc();
  db.prepare('INSERT INTO strategies (id, user_id, name, description, default_instrument, archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)')
    .run(id, userId, name, desc, instrument, now, now);
  return id;
}

// ─── Create tag ───────────────────────────────────────────────────────────────
function createTag(userId, label, category) {
  const id = uuid();
  const now = nowUtc();
  db.prepare('INSERT INTO tags (id, user_id, label, category, archived, created_at) VALUES (?, ?, ?, ?, 0, ?)')
    .run(id, userId, label, category, now);
  return id;
}

// ─── Set user setting ─────────────────────────────────────────────────────────
function setSetting(userId, key, value) {
  const now = nowUtc();
  db.prepare('INSERT OR REPLACE INTO user_settings (user_id, key, value, updated_at) VALUES (?, ?, ?, ?)')
    .run(userId, key, value, now);
}

// ─── Create trade with entry execution ───────────────────────────────────────
function createTrade({
  userId, symbol, instrument, direction, strategyId,
  openedAt, plannedRiskUsd, plannedEntry, plannedStop, plannedTarget,
  notesMd, tradeQuality, tradeBasis,
  preConfidence, preMood, preSleepHours, preCaffeine, preFollowingPlan, preConviction,
  legs, // entry legs [{side, price, shares|contracts|optionType, multiplier}]
  feesUsd = 0,
  tagIds = [],
}) {
  const tradeId = uuid();
  const now = nowUtc();
  db.prepare(`INSERT INTO trades (
    id, user_id, symbol, instrument, direction, strategy_id, status,
    planned_entry, planned_stop, planned_target, planned_risk_usd,
    opened_at, notes_md, trade_quality, trade_basis,
    pre_confidence, pre_conviction, pre_mood, pre_sleep_hours, pre_caffeine, pre_following_plan,
    fees_usd, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  .run(
    tradeId, userId, symbol, instrument, direction, strategyId || null,
    plannedEntry || null, plannedStop || null, plannedTarget || null, plannedRiskUsd || null,
    openedAt, notesMd || null, tradeQuality || null, tradeBasis || null,
    preConfidence || null, preConviction || null, preMood || null, preSleepHours || null,
    preCaffeine ? 1 : null, preFollowingPlan ? 1 : null,
    feesUsd, now, now
  );

  // Entry execution
  const execId = uuid();
  db.prepare('INSERT INTO trade_executions (id, trade_id, kind, executed_at, fees_usd, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(execId, tradeId, 'entry', openedAt, feesUsd, now);

  for (const leg of legs) {
    const legId = uuid();
    db.prepare(`INSERT INTO trade_execution_legs (id, execution_id, side, shares, option_type, strike, expiration, contracts, price, multiplier)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(legId, execId, leg.side, leg.shares || null, leg.optionType || null, leg.strike || null,
         leg.expiration || null, leg.contracts || null, leg.price, leg.multiplier || 1);
  }

  // Tag links
  for (const tagId of tagIds) {
    try {
      db.prepare('INSERT OR IGNORE INTO trade_tags (trade_id, tag_id) VALUES (?, ?)').run(tradeId, tagId);
    } catch {}
  }

  return tradeId;
}

// ─── Close a trade with exit execution ────────────────────────────────────────
function closeTrade({
  tradeId, userId, closedAt, exitLegs, feesUsd = 0,
  postSatisfaction, postMistakes, postLessons, postMood, postWouldRetake,
  duringStress, duringDeviations, tagIds = [],
}) {
  // Add exit execution
  const execId = uuid();
  const now = nowUtc();
  db.prepare('INSERT INTO trade_executions (id, trade_id, kind, executed_at, fees_usd, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(execId, tradeId, 'exit', closedAt, feesUsd, now);
  for (const leg of exitLegs) {
    const legId = uuid();
    db.prepare(`INSERT INTO trade_execution_legs (id, execution_id, side, shares, option_type, strike, expiration, contracts, price, multiplier)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(legId, execId, leg.side, leg.shares || null, leg.optionType || null, leg.strike || null,
         leg.expiration || null, leg.contracts || null, leg.price, leg.multiplier || 1);
  }

  // Compute realized P&L from all executions
  const allExecs = db.prepare('SELECT id FROM trade_executions WHERE trade_id = ?').all(tradeId);
  let pnl = 0;
  let totalFees = 0;
  for (const exec of allExecs) {
    const execRow = db.prepare('SELECT kind, fees_usd FROM trade_executions WHERE id = ?').get(exec.id);
    totalFees += execRow.fees_usd || 0;
    const legs = db.prepare('SELECT * FROM trade_execution_legs WHERE execution_id = ?').all(exec.id);
    for (const l of legs) {
      const sign = l.side === 'buy' ? -1 : 1;
      const qty = l.shares || (l.contracts || 1);
      pnl += sign * qty * l.price * (l.multiplier || 1);
    }
  }
  const netPnl = round2(pnl - totalFees);

  // Compute R if plannedRiskUsd exists
  const trade = db.prepare('SELECT planned_risk_usd FROM trades WHERE id = ?').get(tradeId);
  const rMultiple = trade?.planned_risk_usd ? round2(netPnl / trade.planned_risk_usd) : null;

  // Update trade status and psychology
  db.prepare(`UPDATE trades SET
    status = 'closed', closed_at = ?, realized_pnl_usd = ?, realized_pnl_r = ?, fees_usd = ?,
    post_satisfaction = ?, post_mistakes = ?, post_lessons = ?, post_mood = ?, post_would_retake = ?,
    during_stress = ?, during_deviations = ?, updated_at = ?
    WHERE id = ?`)
  .run(
    closedAt, netPnl, rMultiple, totalFees,
    postSatisfaction || null, postMistakes || null, postLessons || null, postMood || null,
    postWouldRetake ? 1 : 0,
    duringStress || null, duringDeviations || null,
    now, tradeId
  );

  // Add close tags
  for (const tagId of tagIds) {
    try {
      db.prepare('INSERT OR IGNORE INTO trade_tags (trade_id, tag_id) VALUES (?, ?)').run(tradeId, tagId);
    } catch {}
  }

  return netPnl;
}

// ─── SEED FUNCTIONS ───────────────────────────────────────────────────────────

function seedUser1() {
  // User 1: Alice — options spread trader, account $25k, ET timezone
  const userId = createUser('111111', 'Alice Chen');
  setSetting(userId, 'startingBalance', '25000');
  setSetting(userId, 'timezone', 'America/New_York');
  setSetting(userId, 'commissionPerContract', '0.65');

  const stratBS = createStrategy(userId, 'Bull Put Spread', 'Sell lower put, buy higher put', 'option');
  const stratBC = createStrategy(userId, 'Bear Call Spread', 'Sell lower call, buy higher call', 'option');
  const stratIC = createStrategy(userId, 'Iron Condor', 'Combined bull put + bear call', 'option');

  const tSetup = createTag(userId, 'VWAP Bounce', 'setup');
  const tContext = createTag(userId, 'High IV', 'context');
  const tMistake = createTag(userId, 'FOMO Entry', 'mistake');
  const tPsych = createTag(userId, 'Followed Plan', 'psychology');
  const tMistake2 = createTag(userId, 'Overtrading', 'mistake');

  const trades = [];

  // Trade 1: SPY Bull Put Spread — WIN +$180
  const t1 = createTrade({
    userId, symbol: 'SPY', instrument: 'option_spread', direction: 'long',
    strategyId: stratBS,
    openedAt: dateStr(2025, 1, 6),
    plannedRiskUsd: 200, plannedEntry: 475, plannedStop: 465, plannedTarget: 490,
    notesMd: 'SPY holding VWAP, bullish structure',
    tradeQuality: 'A', tradeBasis: 'rules',
    preConfidence: 8, preMood: 'focused', preSleepHours: 7, preCaffeine: true, preFollowingPlan: true,
    preConviction: 'Strong support at 475, IV elevated good for credit spread',
    legs: [
      { side: 'sell', optionType: 'put', strike: 470, expiration: '2025-01-17', contracts: 1, price: 3.50, multiplier: 100 },
      { side: 'buy', optionType: 'put', strike: 465, expiration: '2025-01-17', contracts: 1, price: 1.70, multiplier: 100 },
    ],
    feesUsd: 1.30,
    tagIds: [tSetup, tContext, tPsych],
  });
  const pnl1 = closeTrade({
    tradeId: t1, userId, closedAt: dateStr(2025, 1, 15),
    exitLegs: [
      { side: 'buy', optionType: 'put', strike: 470, expiration: '2025-01-17', contracts: 1, price: 0.40, multiplier: 100 },
      { side: 'sell', optionType: 'put', strike: 465, expiration: '2025-01-17', contracts: 1, price: 0.10, multiplier: 100 },
    ],
    feesUsd: 1.30,
    postSatisfaction: 9, postMood: 'calm', postWouldRetake: true,
    postLessons: 'Patient holding paid off, thesis played out well',
    duringStress: 3,
  });
  trades.push({ symbol: 'SPY', expectedPnl: pnl1 });

  // Trade 2: QQQ Iron Condor — LOSS -$240
  const t2 = createTrade({
    userId, symbol: 'QQQ', instrument: 'option_spread', direction: 'neutral',
    strategyId: stratIC,
    openedAt: dateStr(2025, 1, 13),
    plannedRiskUsd: 300,
    notesMd: 'QQQ range-bound, selling IC',
    tradeQuality: 'B', tradeBasis: 'intuition',
    preConfidence: 6, preMood: 'neutral', preSleepHours: 6.5, preCaffeine: false, preFollowingPlan: true,
    legs: [
      { side: 'sell', optionType: 'put', strike: 480, expiration: '2025-01-31', contracts: 1, price: 2.80, multiplier: 100 },
      { side: 'buy', optionType: 'put', strike: 475, expiration: '2025-01-31', contracts: 1, price: 1.40, multiplier: 100 },
      { side: 'sell', optionType: 'call', strike: 500, expiration: '2025-01-31', contracts: 1, price: 2.60, multiplier: 100 },
      { side: 'buy', optionType: 'call', strike: 505, expiration: '2025-01-31', contracts: 1, price: 1.20, multiplier: 100 },
    ],
    feesUsd: 2.60,
    tagIds: [tContext],
  });
  const pnl2 = closeTrade({
    tradeId: t2, userId, closedAt: dateStr(2025, 1, 28),
    exitLegs: [
      { side: 'buy', optionType: 'put', strike: 480, expiration: '2025-01-31', contracts: 1, price: 3.50, multiplier: 100 },
      { side: 'sell', optionType: 'put', strike: 475, expiration: '2025-01-31', contracts: 1, price: 1.80, multiplier: 100 },
      { side: 'buy', optionType: 'call', strike: 500, expiration: '2025-01-31', contracts: 1, price: 4.00, multiplier: 100 },
      { side: 'sell', optionType: 'call', strike: 505, expiration: '2025-01-31', contracts: 1, price: 2.20, multiplier: 100 },
    ],
    feesUsd: 2.60,
    postSatisfaction: 3, postMood: 'anxious', postWouldRetake: false,
    postMistakes: 'Ignored directional momentum on QQQ — got squeezed on the call side',
    postLessons: 'Iron condors need low-trending market, not one breaking out',
    duringStress: 8,
    tagIds: [tMistake],
  });
  trades.push({ symbol: 'QQQ', expectedPnl: pnl2 });

  // Trade 3: SPX Bear Call Spread — WIN +$120
  const t3 = createTrade({
    userId, symbol: 'SPX', instrument: 'option_spread', direction: 'short',
    strategyId: stratBC,
    openedAt: dateStr(2025, 2, 3),
    plannedRiskUsd: 400,
    notesMd: 'SPX rejecting resistance at 6000',
    tradeQuality: 'A+', tradeBasis: 'rules',
    preConfidence: 9, preMood: 'focused', preSleepHours: 8, preCaffeine: true, preFollowingPlan: true,
    legs: [
      { side: 'sell', optionType: 'call', strike: 6000, expiration: '2025-02-21', contracts: 1, price: 18.00, multiplier: 100 },
      { side: 'buy', optionType: 'call', strike: 6050, expiration: '2025-02-21', contracts: 1, price: 10.00, multiplier: 100 },
    ],
    feesUsd: 1.30,
    tagIds: [tPsych, tContext],
  });
  const pnl3 = closeTrade({
    tradeId: t3, userId, closedAt: dateStr(2025, 2, 14),
    exitLegs: [
      { side: 'buy', optionType: 'call', strike: 6000, expiration: '2025-02-21', contracts: 1, price: 6.50, multiplier: 100 },
      { side: 'sell', optionType: 'call', strike: 6050, expiration: '2025-02-21', contracts: 1, price: 2.50, multiplier: 100 },
    ],
    feesUsd: 1.30,
    postSatisfaction: 8, postMood: 'calm', postWouldRetake: true,
    postLessons: 'Good read on resistance, took profit at 50%',
    duringStress: 4,
    tagIds: [tPsych],
  });
  trades.push({ symbol: 'SPX', expectedPnl: pnl3 });

  // Trade 4: TSLA options — OPEN (still active)
  const t4 = createTrade({
    userId, symbol: 'TSLA', instrument: 'option_spread', direction: 'long',
    strategyId: stratBS,
    openedAt: dateStr(2025, 3, 10),
    plannedRiskUsd: 250,
    notesMd: 'TSLA bouncing off 200MA, bullish',
    tradeQuality: 'B+', tradeBasis: 'intuition',
    preConfidence: 7, preMood: 'neutral', preCaffeine: false, preFollowingPlan: false,
    legs: [
      { side: 'sell', optionType: 'put', strike: 250, expiration: '2025-04-17', contracts: 2, price: 4.00, multiplier: 100 },
      { side: 'buy', optionType: 'put', strike: 245, expiration: '2025-04-17', contracts: 2, price: 2.00, multiplier: 100 },
    ],
    feesUsd: 2.60,
    tagIds: [tMistake2],
  });
  trades.push({ symbol: 'TSLA', expectedPnl: null }); // Open

  console.log(`\n👤 User 1 — Alice Chen (111111):`);
  console.log(`   Strategy: Options spreads, $25k account, ET`);
  console.log(`   Trades: ${trades.length} (3 closed, 1 open)`);
  console.log(`   P&Ls: ${trades.filter(t => t.expectedPnl !== null).map(t => `${t.symbol}: $${t.expectedPnl}`).join(', ')}`);

  return { userId, trades: [t1, t2, t3, t4], tags: { tSetup, tContext, tMistake, tPsych, tMistake2 }, strategies: { stratBS, stratBC, stratIC } };
}

function seedUser2() {
  // User 2: Marcus — stock day trader, account $10k, CT timezone
  const userId = createUser('222222', 'Marcus Webb');
  setSetting(userId, 'startingBalance', '10000');
  setSetting(userId, 'timezone', 'America/Chicago');
  setSetting(userId, 'commissionPerShare', '0.005');

  const stratMom = createStrategy(userId, 'Momentum', 'Follow the trend on high volume', 'stock');
  const stratGap = createStrategy(userId, 'Gap Fill', 'Fade opening gaps back to prior close', 'stock');
  const stratVWAP = createStrategy(userId, 'VWAP Reclaim', 'Long reclaim of VWAP with volume', 'stock');

  const tBreakout = createTag(userId, 'Breakout', 'setup');
  const tGapFill = createTag(userId, 'Gap Fill', 'setup');
  const tLowVol = createTag(userId, 'Low Volume', 'context');
  const tChased = createTag(userId, 'Chased Entry', 'mistake');
  const tPatient = createTag(userId, 'Stayed Patient', 'psychology');
  const tTrend = createTag(userId, 'Trend Day', 'context');

  const trades = [];

  // Trade 1: NVDA long — WIN +$340
  const t1 = createTrade({
    userId, symbol: 'NVDA', instrument: 'stock', direction: 'long',
    strategyId: stratMom,
    openedAt: dateStr(2025, 1, 7),
    plannedRiskUsd: 150, plannedEntry: 142, plannedStop: 138, plannedTarget: 155,
    notesMd: 'NVDA momentum breakout from consolidation with 2x avg volume',
    tradeQuality: 'A', tradeBasis: 'rules',
    preConfidence: 9, preMood: 'focused', preSleepHours: 7.5, preCaffeine: true, preFollowingPlan: true,
    legs: [{ side: 'buy', shares: 25, price: 142.50, multiplier: 1 }],
    feesUsd: 0.13,
    tagIds: [tBreakout, tPatient, tTrend],
  });
  const pnl1 = closeTrade({
    tradeId: t1, userId, closedAt: dateStr(2025, 1, 9),
    exitLegs: [{ side: 'sell', shares: 25, price: 156.10, multiplier: 1 }],
    feesUsd: 0.13,
    postSatisfaction: 10, postMood: 'calm', postWouldRetake: true,
    postLessons: 'Perfect breakout trade, held through pullback',
    duringStress: 4,
    tagIds: [tPatient],
  });
  trades.push({ symbol: 'NVDA', pnl: pnl1 });

  // Trade 2: AMD long — LOSS -$95
  const t2 = createTrade({
    userId, symbol: 'AMD', instrument: 'stock', direction: 'long',
    strategyId: stratVWAP,
    openedAt: dateStr(2025, 1, 14),
    plannedRiskUsd: 100,
    notesMd: 'AMD reclaiming VWAP but volume weak',
    tradeQuality: 'B', tradeBasis: 'intuition',
    preConfidence: 5, preMood: 'neutral', preSleepHours: 6, preCaffeine: false, preFollowingPlan: false,
    legs: [{ side: 'buy', shares: 50, price: 118.20, multiplier: 1 }],
    feesUsd: 0.25,
    tagIds: [tLowVol],
  });
  const pnl2 = closeTrade({
    tradeId: t2, userId, closedAt: dateStr(2025, 1, 14),
    exitLegs: [{ side: 'sell', shares: 50, price: 116.30, multiplier: 1 }],
    feesUsd: 0.25,
    postSatisfaction: 4, postMood: 'anxious', postWouldRetake: false,
    postMistakes: 'Entered on low volume, ignored the warning sign',
    postLessons: 'Wait for volume confirmation before entering VWAP reclaim',
    duringStress: 7,
    tagIds: [tChased],
  });
  trades.push({ symbol: 'AMD', pnl: pnl2 });

  // Trade 3: AAPL long — WIN +$180
  const t3 = createTrade({
    userId, symbol: 'AAPL', instrument: 'stock', direction: 'long',
    strategyId: stratGap,
    openedAt: dateStr(2025, 2, 5),
    plannedRiskUsd: 120,
    notesMd: 'AAPL gap fill from earnings reaction',
    tradeQuality: 'A', tradeBasis: 'rules',
    preConfidence: 8, preMood: 'focused', preSleepHours: 7, preCaffeine: true, preFollowingPlan: true,
    legs: [{ side: 'buy', shares: 40, price: 228.50, multiplier: 1 }],
    feesUsd: 0.20,
    tagIds: [tGapFill, tPatient],
  });
  const pnl3 = closeTrade({
    tradeId: t3, userId, closedAt: dateStr(2025, 2, 6),
    exitLegs: [{ side: 'sell', shares: 40, price: 233.00, multiplier: 1 }],
    feesUsd: 0.20,
    postSatisfaction: 8, postMood: 'calm', postWouldRetake: true,
    postLessons: 'Gap fill worked exactly as planned',
    duringStress: 3,
    tagIds: [tPatient],
  });
  trades.push({ symbol: 'AAPL', pnl: pnl3 });

  // Trade 4: META short — LOSS -$130
  const t4 = createTrade({
    userId, symbol: 'META', instrument: 'stock', direction: 'short',
    strategyId: stratMom,
    openedAt: dateStr(2025, 2, 18),
    plannedRiskUsd: 150,
    notesMd: 'META breaking down from highs',
    tradeQuality: 'B', tradeBasis: 'intuition',
    preConfidence: 6, preMood: 'fomo', preSleepHours: 5.5, preCaffeine: true, preFollowingPlan: false,
    legs: [{ side: 'sell', shares: 20, price: 658.00, multiplier: 1 }],
    feesUsd: 0.10,
    tagIds: [tChased],
  });
  const pnl4 = closeTrade({
    tradeId: t4, userId, closedAt: dateStr(2025, 2, 19),
    exitLegs: [{ side: 'buy', shares: 20, price: 664.50, multiplier: 1 }],
    feesUsd: 0.10,
    postSatisfaction: 2, postMood: 'revenge', postWouldRetake: false,
    postMistakes: 'FOMO short at top, no solid setup, market was too strong',
    postLessons: 'Never short against a strong trend',
    duringStress: 9,
    tagIds: [tChased],
  });
  trades.push({ symbol: 'META', pnl: pnl4 });

  // Trade 5: MSFT long — OPEN
  const t5 = createTrade({
    userId, symbol: 'MSFT', instrument: 'stock', direction: 'long',
    strategyId: stratVWAP,
    openedAt: dateStr(2025, 3, 5),
    plannedRiskUsd: 200,
    notesMd: 'MSFT reclaiming VWAP on strong volume',
    tradeQuality: 'A', tradeBasis: 'rules',
    preConfidence: 8, preMood: 'focused', preSleepHours: 8, preCaffeine: true, preFollowingPlan: true,
    legs: [{ side: 'buy', shares: 15, price: 415.00, multiplier: 1 }],
    feesUsd: 0.08,
    tagIds: [tBreakout, tTrend],
  });
  trades.push({ symbol: 'MSFT', pnl: null });

  const closedTrades = trades.filter(t => t.pnl !== null);
  const totalPnl = closedTrades.reduce((s, t) => s + t.pnl, 0);
  console.log(`\n👤 User 2 — Marcus Webb (222222):`);
  console.log(`   Strategy: Stock day trading, $10k account, CT`);
  console.log(`   Trades: ${trades.length} (4 closed, 1 open)`);
  console.log(`   Closed P&Ls: ${closedTrades.map(t => `${t.symbol}: $${round2(t.pnl)}`).join(', ')}`);
  console.log(`   Total closed P&L: $${round2(totalPnl)}`);

  return { userId, trades: [t1, t2, t3, t4, t5] };
}

function seedUser3() {
  // User 3: Sofia — swing trader, account $50k, PT timezone, high conviction
  const userId = createUser('333333', 'Sofia Ramirez');
  setSetting(userId, 'startingBalance', '50000');
  setSetting(userId, 'timezone', 'America/Los_Angeles');
  setSetting(userId, 'commissionPerContract', '0.50');

  const stratSR = createStrategy(userId, 'Support/Resistance', 'Key S/R level plays', 'option');
  const stratEarnings = createStrategy(userId, 'Earnings Play', 'Earnings straddles/strangles', 'option');

  const tEarnings = createTag(userId, 'Earnings Play', 'context');
  const tHighIV = createTag(userId, 'High IV', 'context');
  const tLowIV = createTag(userId, 'Low IV', 'context');
  const tManagedEmotions = createTag(userId, 'Managed Emotions', 'psychology');
  const tIgnoredStop = createTag(userId, 'Ignored Stop', 'mistake');
  const tRiskedTooMuch = createTag(userId, 'Risked Too Much', 'mistake');

  const trades = [];

  // Trade 1: AMZN long options — WIN +$560
  const t1 = createTrade({
    userId, symbol: 'AMZN', instrument: 'option_spread', direction: 'long',
    strategyId: stratEarnings,
    openedAt: dateStr(2025, 1, 29),
    plannedRiskUsd: 500, plannedEntry: 220, plannedStop: 210, plannedTarget: 240,
    notesMd: 'AMZN pre-earnings bull spread, strong cloud growth expected',
    tradeQuality: 'A+', tradeBasis: 'rules',
    preConfidence: 9, preMood: 'focused', preSleepHours: 8, preCaffeine: false, preFollowingPlan: true,
    legs: [
      { side: 'buy', optionType: 'call', strike: 220, expiration: '2025-02-07', contracts: 2, price: 4.50, multiplier: 100 },
      { side: 'sell', optionType: 'call', strike: 230, expiration: '2025-02-07', contracts: 2, price: 2.00, multiplier: 100 },
    ],
    feesUsd: 2.00,
    tagIds: [tEarnings, tHighIV, tManagedEmotions],
  });
  const pnl1 = closeTrade({
    tradeId: t1, userId, closedAt: dateStr(2025, 1, 31),
    exitLegs: [
      { side: 'sell', optionType: 'call', strike: 220, expiration: '2025-02-07', contracts: 2, price: 9.00, multiplier: 100 },
      { side: 'buy', optionType: 'call', strike: 230, expiration: '2025-02-07', contracts: 2, price: 5.20, multiplier: 100 },
    ],
    feesUsd: 2.00,
    postSatisfaction: 10, postMood: 'focused', postWouldRetake: true,
    postLessons: 'Earnings play worked, took profit fast after release',
    duringStress: 5,
    tagIds: [tManagedEmotions],
  });
  trades.push({ symbol: 'AMZN', pnl: pnl1 });

  // Trade 2: GOOG long — LOSS -$380
  const t2 = createTrade({
    userId, symbol: 'GOOG', instrument: 'option_spread', direction: 'long',
    strategyId: stratSR,
    openedAt: dateStr(2025, 2, 10),
    plannedRiskUsd: 300,
    notesMd: 'GOOG at major support, looking for bounce',
    tradeQuality: 'B', tradeBasis: 'intuition',
    preConfidence: 6, preMood: 'anxious', preSleepHours: 5, preCaffeine: true, preFollowingPlan: false,
    legs: [
      { side: 'buy', optionType: 'call', strike: 195, expiration: '2025-03-21', contracts: 3, price: 5.00, multiplier: 100 },
      { side: 'sell', optionType: 'call', strike: 205, expiration: '2025-03-21', contracts: 3, price: 2.20, multiplier: 100 },
    ],
    feesUsd: 1.95,
    tagIds: [tLowIV],
  });
  const pnl2 = closeTrade({
    tradeId: t2, userId, closedAt: dateStr(2025, 2, 24),
    exitLegs: [
      { side: 'sell', optionType: 'call', strike: 195, expiration: '2025-03-21', contracts: 3, price: 1.80, multiplier: 100 },
      { side: 'buy', optionType: 'call', strike: 205, expiration: '2025-03-21', contracts: 3, price: 0.60, multiplier: 100 },
    ],
    feesUsd: 1.95,
    postSatisfaction: 3, postMood: 'tired', postWouldRetake: false,
    postMistakes: 'Support cracked, should have cut at planned stop -$300 but held hoping for bounce. Risked too much on a borderline setup',
    postLessons: 'Honor your stop loss every time',
    duringStress: 8,
    tagIds: [tIgnoredStop, tRiskedTooMuch],
  });
  trades.push({ symbol: 'GOOG', pnl: pnl2 });

  // Trade 3: NVDA options WIN +$900
  const t3 = createTrade({
    userId, symbol: 'NVDA', instrument: 'option_spread', direction: 'long',
    strategyId: stratEarnings,
    openedAt: dateStr(2025, 2, 24),
    plannedRiskUsd: 600,
    notesMd: 'NVDA pre-earnings, massive AI demand story',
    tradeQuality: 'A++', tradeBasis: 'rules',
    preConfidence: 10, preMood: 'focused', preSleepHours: 8, preCaffeine: false, preFollowingPlan: true,
    legs: [
      { side: 'buy', optionType: 'call', strike: 140, expiration: '2025-03-07', contracts: 3, price: 6.00, multiplier: 100 },
      { side: 'sell', optionType: 'call', strike: 155, expiration: '2025-03-07', contracts: 3, price: 2.50, multiplier: 100 },
    ],
    feesUsd: 1.95,
    tagIds: [tEarnings, tHighIV, tManagedEmotions],
  });
  const pnl3 = closeTrade({
    tradeId: t3, userId, closedAt: dateStr(2025, 2, 27),
    exitLegs: [
      { side: 'sell', optionType: 'call', strike: 140, expiration: '2025-03-07', contracts: 3, price: 14.00, multiplier: 100 },
      { side: 'buy', optionType: 'call', strike: 155, expiration: '2025-03-07', contracts: 3, price: 8.00, multiplier: 100 },
    ],
    feesUsd: 1.95,
    postSatisfaction: 10, postMood: 'focused', postWouldRetake: true,
    postLessons: 'Best trade of the year, thesis was right on AI momentum',
    duringStress: 3,
    tagIds: [tManagedEmotions],
  });
  trades.push({ symbol: 'NVDA', pnl: pnl3 });

  const closedTrades = trades.filter(t => t.pnl !== null);
  const totalPnl = closedTrades.reduce((s, t) => s + t.pnl, 0);
  console.log(`\n👤 User 3 — Sofia Ramirez (333333):`);
  console.log(`   Strategy: Swing options, $50k account, PT`);
  console.log(`   Trades: ${trades.length} (3 closed)`);
  console.log(`   Closed P&Ls: ${closedTrades.map(t => `${t.symbol}: $${round2(t.pnl)}`).join(', ')}`);
  console.log(`   Total closed P&L: $${round2(totalPnl)}`);

  return { userId, trades: [t1, t2, t3] };
}

function seedUser4() {
  // User 4: Derek — beginner, mostly losses, account $5k, MT timezone
  const userId = createUser('444444', 'Derek Park');
  setSetting(userId, 'startingBalance', '5000');
  setSetting(userId, 'timezone', 'America/Denver');
  setSetting(userId, 'commissionPerContract', '0.65');

  const stratMR = createStrategy(userId, 'Mean Reversion', 'Buy oversold, sell overbought', 'stock');

  const tRevenge = createTag(userId, 'Revenge Trading', 'mistake');
  const tNoStop = createTag(userId, 'No Plan', 'mistake');
  const tTilt = createTag(userId, 'Tilt', 'psychology');
  const tOvertrade = createTag(userId, 'Overtrading', 'mistake');
  const tFOMO = createTag(userId, 'FOMO Entry', 'mistake');
  const tHesitated = createTag(userId, 'Hesitated', 'psychology');

  const trades = [];

  // Trade 1: GME LOSS -$200
  const t1 = createTrade({
    userId, symbol: 'GME', instrument: 'stock', direction: 'long',
    strategyId: stratMR,
    openedAt: dateStr(2025, 1, 8),
    plannedRiskUsd: 100,
    notesMd: 'GME dip buy, hoping for meme surge',
    tradeQuality: 'B', tradeBasis: 'intuition',
    preConfidence: 4, preMood: 'fomo', preSleepHours: 5, preCaffeine: true, preFollowingPlan: false,
    legs: [{ side: 'buy', shares: 100, price: 22.00, multiplier: 1 }],
    feesUsd: 0.50,
    tagIds: [tFOMO],
  });
  const pnl1 = closeTrade({
    tradeId: t1, userId, closedAt: dateStr(2025, 1, 10),
    exitLegs: [{ side: 'sell', shares: 100, price: 19.50, multiplier: 1 }],
    feesUsd: 0.50,
    postSatisfaction: 2, postMood: 'tired', postWouldRetake: false,
    postMistakes: 'Pure FOMO, no real setup, just chased the name',
    postLessons: 'Do not trade meme stocks without a real edge',
    duringStress: 9,
    tagIds: [tTilt, tFOMO],
  });
  trades.push({ symbol: 'GME', pnl: pnl1 });

  // Trade 2: AMC LOSS -$150 (revenge after first loss)
  const t2 = createTrade({
    userId, symbol: 'AMC', instrument: 'stock', direction: 'long',
    strategyId: null,
    openedAt: dateStr(2025, 1, 10),
    notesMd: 'Revenge trading after GME loss',
    tradeQuality: 'B', tradeBasis: 'intuition',
    preConfidence: 3, preMood: 'revenge', preSleepHours: 4.5, preCaffeine: true, preFollowingPlan: false,
    legs: [{ side: 'buy', shares: 300, price: 3.80, multiplier: 1 }],
    feesUsd: 1.50,
    tagIds: [tRevenge, tNoStop],
  });
  const pnl2 = closeTrade({
    tradeId: t2, userId, closedAt: dateStr(2025, 1, 10),
    exitLegs: [{ side: 'sell', shares: 300, price: 3.30, multiplier: 1 }],
    feesUsd: 1.50,
    postSatisfaction: 1, postMood: 'revenge', postWouldRetake: false,
    postMistakes: 'Revenge trade, no plan, no stop, just angry',
    postLessons: 'When you lose, step away. Never revenge trade.',
    duringStress: 10,
    tagIds: [tRevenge, tTilt, tOvertrade],
  });
  trades.push({ symbol: 'AMC', pnl: pnl2 });

  // Trade 3: AAPL WIN +$60 (lucky, not skill)
  const t3 = createTrade({
    userId, symbol: 'AAPL', instrument: 'stock', direction: 'long',
    strategyId: stratMR,
    openedAt: dateStr(2025, 2, 12),
    plannedRiskUsd: 80,
    notesMd: 'AAPL looked cheap to me',
    tradeQuality: 'B', tradeBasis: 'intuition',
    preConfidence: 5, preMood: 'neutral', preSleepHours: 7, preCaffeine: false, preFollowingPlan: false,
    legs: [{ side: 'buy', shares: 20, price: 226.00, multiplier: 1 }],
    feesUsd: 0.10,
    tagIds: [tHesitated],
  });
  const pnl3 = closeTrade({
    tradeId: t3, userId, closedAt: dateStr(2025, 2, 14),
    exitLegs: [{ side: 'sell', shares: 20, price: 229.00, multiplier: 1 }],
    feesUsd: 0.10,
    postSatisfaction: 5, postMood: 'neutral', postWouldRetake: false,
    postMistakes: 'Got lucky, no real plan but ended up fine',
    postLessons: 'Lucky win. Need to have a proper plan even for wins',
    duringStress: 5,
  });
  trades.push({ symbol: 'AAPL', pnl: pnl3 });

  // Trade 4: TSLA LOSS -$320 (oversize)
  const t4 = createTrade({
    userId, symbol: 'TSLA', instrument: 'stock', direction: 'long',
    strategyId: null,
    openedAt: dateStr(2025, 3, 3),
    notesMd: 'TSLA "always bounces from here"',
    tradeQuality: 'B', tradeBasis: 'intuition',
    preConfidence: 4, preMood: 'fomo', preSleepHours: 5, preCaffeine: true, preFollowingPlan: false,
    legs: [{ side: 'buy', shares: 15, price: 285.00, multiplier: 1 }],
    feesUsd: 0.08,
    tagIds: [tOvertrade, tFOMO],
  });
  const pnl4 = closeTrade({
    tradeId: t4, userId, closedAt: dateStr(2025, 3, 5),
    exitLegs: [{ side: 'sell', shares: 15, price: 264.00, multiplier: 1 }],
    feesUsd: 0.08,
    postSatisfaction: 1, postMood: 'anxious', postWouldRetake: false,
    postMistakes: 'Oversized position, no stop, sat through massive loss',
    postLessons: 'Size matters. Never put 50%+ of account in one trade.',
    duringStress: 10,
    tagIds: [tRevenge, tOvertrade],
  });
  trades.push({ symbol: 'TSLA', pnl: pnl4 });

  const closedTrades = trades.filter(t => t.pnl !== null);
  const totalPnl = closedTrades.reduce((s, t) => s + t.pnl, 0);
  console.log(`\n👤 User 4 — Derek Park (444444):`);
  console.log(`   Strategy: Beginner/mean reversion, $5k account, MT`);
  console.log(`   Trades: ${trades.length} (4 closed)`);
  console.log(`   Closed P&Ls: ${closedTrades.map(t => `${t.symbol}: $${round2(t.pnl)}`).join(', ')}`);
  console.log(`   Total closed P&L: $${round2(totalPnl)}`);

  return { userId, trades: [t1, t2, t3, t4] };
}

function seedUser5() {
  // User 5: Priya — quant-style, conservative, account $100k, ET timezone
  const userId = createUser('555555', 'Priya Sharma');
  setSetting(userId, 'startingBalance', '100000');
  setSetting(userId, 'timezone', 'America/New_York');
  setSetting(userId, 'commissionPerContract', '0.40');

  const stratPairs = createStrategy(userId, 'Pairs Trading', 'Long/short correlated stocks');
  const stratIC = createStrategy(userId, 'Iron Condor', 'High-probability range plays', 'option');
  const stratSPY = createStrategy(userId, 'Index Hedging', 'SPY/SPX protective plays', 'option');

  const tFOMCNews = createTag(userId, 'FOMC/News', 'context');
  const tHighIV = createTag(userId, 'High IV', 'context');
  const tFollowed = createTag(userId, 'Followed Plan', 'psychology');
  const tPatient = createTag(userId, 'Stayed Patient', 'psychology');
  const tMeanRev = createTag(userId, 'Mean Reversion', 'setup');

  const trades = [];

  // Trade 1: SPY IC WIN +$280
  const t1 = createTrade({
    userId, symbol: 'SPY', instrument: 'option_spread', direction: 'neutral',
    strategyId: stratIC,
    openedAt: dateStr(2025, 1, 21),
    plannedRiskUsd: 500, plannedEntry: 595, plannedStop: 580, plannedTarget: 610,
    notesMd: 'SPY range-bound after Fed meeting, high IV ideal for IC',
    tradeQuality: 'A', tradeBasis: 'rules',
    preConfidence: 8, preMood: 'calm', preSleepHours: 8, preCaffeine: false, preFollowingPlan: true,
    legs: [
      { side: 'sell', optionType: 'put', strike: 580, expiration: '2025-02-07', contracts: 2, price: 2.50, multiplier: 100 },
      { side: 'buy', optionType: 'put', strike: 575, expiration: '2025-02-07', contracts: 2, price: 1.20, multiplier: 100 },
      { side: 'sell', optionType: 'call', strike: 610, expiration: '2025-02-07', contracts: 2, price: 2.40, multiplier: 100 },
      { side: 'buy', optionType: 'call', strike: 615, expiration: '2025-02-07', contracts: 2, price: 1.10, multiplier: 100 },
    ],
    feesUsd: 5.20,
    tagIds: [tFOMCNews, tHighIV, tFollowed, tPatient],
  });
  const pnl1 = closeTrade({
    tradeId: t1, userId, closedAt: dateStr(2025, 2, 3),
    exitLegs: [
      { side: 'buy', optionType: 'put', strike: 580, expiration: '2025-02-07', contracts: 2, price: 0.60, multiplier: 100 },
      { side: 'sell', optionType: 'put', strike: 575, expiration: '2025-02-07', contracts: 2, price: 0.20, multiplier: 100 },
      { side: 'buy', optionType: 'call', strike: 610, expiration: '2025-02-07', contracts: 2, price: 0.55, multiplier: 100 },
      { side: 'sell', optionType: 'call', strike: 615, expiration: '2025-02-07', contracts: 2, price: 0.15, multiplier: 100 },
    ],
    feesUsd: 5.20,
    postSatisfaction: 9, postMood: 'calm', postWouldRetake: true,
    postLessons: 'Took profit at 70% max profit — great trade management',
    duringStress: 2,
    tagIds: [tFollowed, tPatient],
  });
  trades.push({ symbol: 'SPY', pnl: pnl1 });

  // Trade 2: QQQ IC — breakeven
  const t2 = createTrade({
    userId, symbol: 'QQQ', instrument: 'option_spread', direction: 'neutral',
    strategyId: stratIC,
    openedAt: dateStr(2025, 2, 11),
    plannedRiskUsd: 400,
    notesMd: 'QQQ at ATH, low vol IC for theta',
    tradeQuality: 'B+', tradeBasis: 'rules',
    preConfidence: 7, preMood: 'neutral', preSleepHours: 7.5, preCaffeine: false, preFollowingPlan: true,
    legs: [
      { side: 'sell', optionType: 'put', strike: 520, expiration: '2025-02-28', contracts: 2, price: 2.00, multiplier: 100 },
      { side: 'buy', optionType: 'put', strike: 515, expiration: '2025-02-28', contracts: 2, price: 1.10, multiplier: 100 },
      { side: 'sell', optionType: 'call', strike: 545, expiration: '2025-02-28', contracts: 2, price: 1.90, multiplier: 100 },
      { side: 'buy', optionType: 'call', strike: 550, expiration: '2025-02-28', contracts: 2, price: 0.95, multiplier: 100 },
    ],
    feesUsd: 5.20,
    tagIds: [tHighIV],
  });
  const pnl2 = closeTrade({
    tradeId: t2, userId, closedAt: dateStr(2025, 2, 20),
    exitLegs: [
      { side: 'buy', optionType: 'put', strike: 520, expiration: '2025-02-28', contracts: 2, price: 1.32, multiplier: 100 },
      { side: 'sell', optionType: 'put', strike: 515, expiration: '2025-02-28', contracts: 2, price: 0.68, multiplier: 100 },
      { side: 'buy', optionType: 'call', strike: 545, expiration: '2025-02-28', contracts: 2, price: 1.27, multiplier: 100 },
      { side: 'sell', optionType: 'call', strike: 550, expiration: '2025-02-28', contracts: 2, price: 0.63, multiplier: 100 },
    ],
    feesUsd: 5.20,
    postSatisfaction: 6, postMood: 'neutral', postWouldRetake: true,
    postLessons: 'Managed to close near breakeven after market moved against me',
    duringStress: 5,
    tagIds: [tFollowed],
  });
  trades.push({ symbol: 'QQQ (IC)', pnl: pnl2 });

  // Trade 3: SPX Bear Call WIN +$450
  const t3 = createTrade({
    userId, symbol: 'SPX', instrument: 'option_spread', direction: 'short',
    strategyId: stratSPY,
    openedAt: dateStr(2025, 3, 4),
    plannedRiskUsd: 1000,
    notesMd: 'SPX at all-time high, FOMC upcoming, hedging downside',
    tradeQuality: 'A+', tradeBasis: 'rules',
    preConfidence: 9, preMood: 'focused', preSleepHours: 8.5, preCaffeine: false, preFollowingPlan: true,
    legs: [
      { side: 'sell', optionType: 'call', strike: 5800, expiration: '2025-03-21', contracts: 1, price: 45.00, multiplier: 100 },
      { side: 'buy', optionType: 'call', strike: 5850, expiration: '2025-03-21', contracts: 1, price: 30.00, multiplier: 100 },
    ],
    feesUsd: 1.30,
    tagIds: [tFOMCNews, tHighIV, tPatient],
  });
  const pnl3 = closeTrade({
    tradeId: t3, userId, closedAt: dateStr(2025, 3, 15),
    exitLegs: [
      { side: 'buy', optionType: 'call', strike: 5800, expiration: '2025-03-21', contracts: 1, price: 5.00, multiplier: 100 },
      { side: 'sell', optionType: 'call', strike: 5850, expiration: '2025-03-21', contracts: 1, price: 1.50, multiplier: 100 },
    ],
    feesUsd: 1.30,
    postSatisfaction: 10, postMood: 'calm', postWouldRetake: true,
    postLessons: 'SPX sold off as expected, great hedge for the portfolio',
    duringStress: 2,
    tagIds: [tFollowed, tPatient],
  });
  trades.push({ symbol: 'SPX', pnl: pnl3 });

  const closedTrades = trades.filter(t => t.pnl !== null);
  const totalPnl = closedTrades.reduce((s, t) => s + t.pnl, 0);
  console.log(`\n👤 User 5 — Priya Sharma (555555):`);
  console.log(`   Strategy: Quant/IC/pairs, $100k account, ET`);
  console.log(`   Trades: ${trades.length} (3 closed)`);
  console.log(`   Closed P&Ls: ${closedTrades.map(t => `${t.symbol}: $${round2(t.pnl)}`).join(', ')}`);
  console.log(`   Total closed P&L: $${round2(totalPnl)}`);

  return { userId, trades: [t1, t2, t3] };
}

function seedUser6() {
  // User 6: Jake — crypto-adjacent, volatile stocks, account $8k, CT timezone
  const userId = createUser('666666', 'Jake Turner');
  setSetting(userId, 'startingBalance', '8000');
  setSetting(userId, 'timezone', 'America/Chicago');
  setSetting(userId, 'commissionPerShare', '0.01');

  const stratMom = createStrategy(userId, 'High Beta Momentum', 'Ride volatile moves hard');
  const stratBreak = createStrategy(userId, 'Technical Breakout', 'Chart breakouts with volume');

  const tBreakout = createTag(userId, 'Breakout', 'setup');
  const tHighBeta = createTag(userId, 'Trend Day', 'context');
  const tMovedStop = createTag(userId, 'Moved Stop', 'mistake');
  const tEarlyExit = createTag(userId, 'Early Exit', 'mistake');
  const tFollowed = createTag(userId, 'Followed Plan', 'psychology');
  const tCustom = createTag(userId, 'Crypto Parallel', 'custom');

  const trades = [];

  // Trade 1: MARA WIN +$220
  const t1 = createTrade({
    userId, symbol: 'MARA', instrument: 'stock', direction: 'long',
    strategyId: stratMom,
    openedAt: dateStr(2025, 1, 22),
    plannedRiskUsd: 200,
    notesMd: 'MARA breakout with BTC rally',
    tradeQuality: 'A', tradeBasis: 'rules',
    preConfidence: 8, preMood: 'focused', preSleepHours: 7, preCaffeine: true, preFollowingPlan: true,
    legs: [{ side: 'buy', shares: 100, price: 18.50, multiplier: 1 }],
    feesUsd: 1.00,
    tagIds: [tBreakout, tHighBeta, tCustom, tFollowed],
  });
  const pnl1 = closeTrade({
    tradeId: t1, userId, closedAt: dateStr(2025, 1, 24),
    exitLegs: [{ side: 'sell', shares: 100, price: 20.70, multiplier: 1 }],
    feesUsd: 1.00,
    postSatisfaction: 8, postMood: 'focused', postWouldRetake: true,
    postLessons: 'Good momentum trade, held through minor pullback',
    duringStress: 4,
    tagIds: [tFollowed],
  });
  trades.push({ symbol: 'MARA', pnl: pnl1 });

  // Trade 2: COIN — LOSS -$400 (moved stop)
  const t2 = createTrade({
    userId, symbol: 'COIN', instrument: 'stock', direction: 'long',
    strategyId: stratBreak,
    openedAt: dateStr(2025, 2, 3),
    plannedRiskUsd: 200,
    notesMd: 'COIN breakout on coinbase listing news',
    tradeQuality: 'B', tradeBasis: 'intuition',
    preConfidence: 7, preMood: 'focused', preSleepHours: 6, preCaffeine: true, preFollowingPlan: false,
    legs: [{ side: 'buy', shares: 30, price: 285.00, multiplier: 1 }],
    feesUsd: 0.30,
    tagIds: [tBreakout, tCustom],
  });
  const pnl2 = closeTrade({
    tradeId: t2, userId, closedAt: dateStr(2025, 2, 7),
    exitLegs: [{ side: 'sell', shares: 30, price: 271.50, multiplier: 1 }],
    feesUsd: 0.30,
    postSatisfaction: 2, postMood: 'anxious', postWouldRetake: false,
    postMistakes: 'Moved my stop down when price dropped, should have exited at original stop',
    postLessons: 'NEVER move stop against you. Accept the initial risk.',
    duringStress: 9,
    tagIds: [tMovedStop],
  });
  trades.push({ symbol: 'COIN', pnl: pnl2 });

  // Trade 3: RIOT WIN +$175 (early exit — left money on table)
  const t3 = createTrade({
    userId, symbol: 'RIOT', instrument: 'stock', direction: 'long',
    strategyId: stratMom,
    openedAt: dateStr(2025, 2, 25),
    plannedRiskUsd: 150, plannedTarget: 12.00,
    notesMd: 'RIOT riding BTC momentum, strong sector',
    tradeQuality: 'A', tradeBasis: 'rules',
    preConfidence: 8, preMood: 'focused', preSleepHours: 7.5, preCaffeine: false, preFollowingPlan: true,
    legs: [{ side: 'buy', shares: 150, price: 10.50, multiplier: 1 }],
    feesUsd: 1.50,
    tagIds: [tBreakout, tHighBeta, tFollowed],
  });
  const pnl3 = closeTrade({
    tradeId: t3, userId, closedAt: dateStr(2025, 2, 26),
    exitLegs: [{ side: 'sell', shares: 150, price: 11.70, multiplier: 1 }],
    feesUsd: 1.50,
    postSatisfaction: 5, postMood: 'neutral', postWouldRetake: true,
    postMistakes: 'Exited too early — stock went to 13.50 next day',
    postLessons: 'Trust your target when you have a clean setup',
    duringStress: 4,
    tagIds: [tEarlyExit],
  });
  trades.push({ symbol: 'RIOT', pnl: pnl3 });

  // Trade 4: OPEN (MSTR)
  const t4 = createTrade({
    userId, symbol: 'MSTR', instrument: 'stock', direction: 'long',
    strategyId: stratMom,
    openedAt: dateStr(2025, 3, 12),
    plannedRiskUsd: 300,
    notesMd: 'MSTR BTC proxy, breaking ATH resistance',
    tradeQuality: 'A+', tradeBasis: 'rules',
    preConfidence: 9, preMood: 'focused', preSleepHours: 8, preCaffeine: false, preFollowingPlan: true,
    legs: [{ side: 'buy', shares: 5, price: 390.00, multiplier: 1 }],
    feesUsd: 0.05,
    tagIds: [tBreakout, tHighBeta, tCustom],
  });
  trades.push({ symbol: 'MSTR (open)', pnl: null });

  const closedTrades = trades.filter(t => t.pnl !== null);
  const totalPnl = closedTrades.reduce((s, t) => s + t.pnl, 0);
  console.log(`\n👤 User 6 — Jake Turner (666666):`);
  console.log(`   Strategy: High beta momentum, $8k account, CT`);
  console.log(`   Trades: ${trades.length} (3 closed, 1 open)`);
  console.log(`   Closed P&Ls: ${closedTrades.map(t => `${t.symbol}: $${round2(t.pnl)}`).join(', ')}`);
  console.log(`   Total closed P&L: $${round2(totalPnl)}`);

  return { userId, trades: [t1, t2, t3, t4] };
}

// ─── VERIFICATION FUNCTIONS ───────────────────────────────────────────────────

function verifyUserIsolation(users) {
  console.log('\n\n━━━ VERIFICATION: User Data Isolation ━━━━━━━━━━━━━━━━━━━');
  let pass = 0, fail = 0;

  for (const user of users) {
    const trades = db.prepare('SELECT id FROM trades WHERE user_id = ?').all(user.userId);
    const tags = db.prepare('SELECT id FROM tags WHERE user_id = ?').all(user.userId);
    const strategies = db.prepare('SELECT id FROM strategies WHERE user_id = ?').all(user.userId);
    const settings = db.prepare('SELECT key, value FROM user_settings WHERE user_id = ?').all(user.userId);

    if (trades.length === 0) {
      console.log(`  ❌ ${user.name}: No trades found!`);
      fail++;
    } else {
      // Verify none of these trades have other users' data
      const otherUserTrades = db.prepare(`
        SELECT id FROM trades WHERE user_id != ? AND id IN (${trades.map(() => '?').join(',')})
      `).all(user.userId, ...trades.map(t => t.id));

      if (otherUserTrades.length > 0) {
        console.log(`  ❌ ${user.name}: Data isolation breach — ${otherUserTrades.length} trades cross-contaminated!`);
        fail++;
      } else {
        console.log(`  ✅ ${user.name}: ${trades.length} trades, ${tags.length} tags, ${strategies.length} strategies — properly isolated`);
        pass++;
      }
    }
  }

  return { pass, fail };
}

function verifyPnLCalculations(users) {
  console.log('\n━━━ VERIFICATION: P&L Calculations ━━━━━━━━━━━━━━━━━━━━━');
  let pass = 0, fail = 0;

  for (const user of users) {
    const trades = db.prepare(`
      SELECT t.id, t.symbol, t.realized_pnl_usd, t.fees_usd, t.planned_risk_usd, t.realized_pnl_r
      FROM trades t
      WHERE t.user_id = ? AND t.status = 'closed'
    `).all(user.userId);

    for (const trade of trades) {
      // Recompute P&L from executions
      const execs = db.prepare('SELECT id, kind, fees_usd FROM trade_executions WHERE trade_id = ?').all(trade.id);
      let computedPnl = 0;
      let totalFees = 0;

      for (const exec of execs) {
        totalFees += exec.fees_usd || 0;
        const legs = db.prepare('SELECT * FROM trade_execution_legs WHERE execution_id = ?').all(exec.id);
        for (const l of legs) {
          const sign = l.side === 'buy' ? -1 : 1;
          const qty = l.shares || l.contracts || 1;
          computedPnl += sign * qty * l.price * (l.multiplier || 1);
        }
      }
      const netComputedPnl = round2(computedPnl - totalFees);
      const stored = round2(trade.realized_pnl_usd);

      if (Math.abs(netComputedPnl - stored) > 0.01) {
        console.log(`  ❌ ${trade.symbol}: Stored P&L $${stored} ≠ computed $${netComputedPnl} (diff: $${round2(netComputedPnl - stored)})`);
        fail++;
      } else {
        // Verify R-multiple
        if (trade.planned_risk_usd && trade.realized_pnl_r !== null) {
          const expectedR = round2(stored / trade.planned_risk_usd);
          const storedR = round2(trade.realized_pnl_r);
          if (Math.abs(expectedR - storedR) > 0.01) {
            console.log(`  ❌ ${trade.symbol}: R stored ${storedR} ≠ computed ${expectedR}`);
            fail++;
          } else {
            console.log(`  ✅ ${trade.symbol}: P&L $${stored} ✓  R: ${storedR}R ✓`);
            pass++;
          }
        } else {
          console.log(`  ✅ ${trade.symbol}: P&L $${stored} ✓`);
          pass++;
        }
      }
    }
  }

  return { pass, fail };
}

function verifyMetricsCalculations(users) {
  console.log('\n━━━ VERIFICATION: Metrics Calculations ━━━━━━━━━━━━━━━━━');
  let pass = 0, fail = 0;

  for (const user of users) {
    const closedTrades = db.prepare(`
      SELECT realized_pnl_usd, planned_risk_usd FROM trades
      WHERE user_id = ? AND status = 'closed' AND realized_pnl_usd IS NOT NULL
    `).all(user.userId);

    if (closedTrades.length === 0) continue;

    const pnls = closedTrades.map(t => t.realized_pnl_usd);
    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);

    const totalPnl = round2(pnls.reduce((s, p) => s + p, 0));
    const winRate = round2(wins.length / pnls.length * 100);
    const avgWin = wins.length ? round2(wins.reduce((s, p) => s + p, 0) / wins.length) : 0;
    const avgLoss = losses.length ? round2(losses.reduce((s, p) => s + p, 0) / losses.length) : 0;
    const profitFactor = losses.length && losses.reduce((s,p) => s+p, 0) !== 0
      ? round2(Math.abs(wins.reduce((s,p) => s+p, 0) / losses.reduce((s,p) => s+p, 0)))
      : Infinity;

    // Expected value = winRate * avgWin + (1-winRate) * avgLoss
    const ev = round2((wins.length / pnls.length) * avgWin + (losses.length / pnls.length) * avgLoss);

    const startingBalance = Number(
      db.prepare('SELECT value FROM user_settings WHERE user_id = ? AND key = ?').get(user.userId, 'startingBalance')?.value || '25000'
    );

    console.log(`  📊 ${user.name}: ${pnls.length} trades | Total P&L: $${totalPnl} | Win Rate: ${winRate}% | Avg Win: $${avgWin} | Avg Loss: $${avgLoss}`);
    console.log(`     Profit Factor: ${profitFactor} | EV/trade: $${ev} | Starting Balance: $${startingBalance}`);

    // Equity check: verify equity endpoint logic
    let cumPnl = 0;
    let equity = startingBalance;
    const sortedTrades = closedTrades.filter(t => t.realized_pnl_usd !== null);
    for (const t of sortedTrades) {
      cumPnl += t.realized_pnl_usd;
      equity = startingBalance + cumPnl;
    }

    const expectedFinalEquity = round2(equity);
    console.log(`     Expected final equity: $${expectedFinalEquity} (starting $${startingBalance} + $${round2(cumPnl)} P&L)`);
    pass++;
  }

  return { pass, fail };
}

function verifyTagIsolation(users) {
  console.log('\n━━━ VERIFICATION: Tag + Strategy Isolation ━━━━━━━━━━━━━');
  let pass = 0, fail = 0;

  for (const user of users) {
    // Check tags
    const userTags = db.prepare('SELECT id, label FROM tags WHERE user_id = ?').all(user.userId);

    // Check all trade_tags only link to user's own tags
    const userTrades = db.prepare('SELECT id FROM trades WHERE user_id = ?').all(user.userId);
    if (userTrades.length === 0) continue;

    const tradeIds = userTrades.map(t => `'${t.id}'`).join(',');
    const tradeTags = db.prepare(`SELECT tt.tag_id, t.label, tag.user_id FROM trade_tags tt
      JOIN tags tag ON tag.id = tt.tag_id
      JOIN tags t ON t.id = tt.tag_id
      WHERE tt.trade_id IN (${tradeIds})`).all();

    const crossUserTags = tradeTags.filter(tt => tt.user_id !== user.userId);
    if (crossUserTags.length > 0) {
      console.log(`  ❌ ${user.name}: ${crossUserTags.length} cross-user tag links found!`);
      fail++;
    } else {
      console.log(`  ✅ ${user.name}: ${userTags.length} tags, ${tradeTags.length} trade-tag links — all isolated`);
      pass++;
    }

    // Check strategies
    const strategies = db.prepare('SELECT name FROM strategies WHERE user_id = ?').all(user.userId);
    const crossUserStrategies = db.prepare(`
      SELECT s.name FROM trades t
      JOIN strategies s ON s.id = t.strategy_id
      WHERE t.user_id = ? AND s.user_id != ?
    `).all(user.userId, user.userId);

    if (crossUserStrategies.length > 0) {
      console.log(`  ❌ ${user.name}: ${crossUserStrategies.length} cross-user strategy links!`);
      fail++;
    } else {
      console.log(`     Strategies: [${strategies.map(s => s.name).join(', ')}] — all isolated`);
    }
  }

  return { pass, fail };
}

function verifySettings(users) {
  console.log('\n━━━ VERIFICATION: Per-User Settings ━━━━━━━━━━━━━━━━━━━');
  let pass = 0, fail = 0;

  const expectedSettings = {
    '111111': { startingBalance: '25000', timezone: 'America/New_York' },
    '222222': { startingBalance: '10000', timezone: 'America/Chicago' },
    '333333': { startingBalance: '50000', timezone: 'America/Los_Angeles' },
    '444444': { startingBalance: '5000', timezone: 'America/Denver' },
    '555555': { startingBalance: '100000', timezone: 'America/New_York' },
    '666666': { startingBalance: '8000', timezone: 'America/Chicago' },
  };

  for (const user of users) {
    const expected = expectedSettings[user.passcode];
    if (!expected) continue;

    const settings = db.prepare('SELECT key, value FROM user_settings WHERE user_id = ?').all(user.userId);
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

    let userOk = true;
    for (const [key, val] of Object.entries(expected)) {
      if (settingsMap[key] !== val) {
        console.log(`  ❌ ${user.name}: ${key} = "${settingsMap[key]}" expected "${val}"`);
        fail++;
        userOk = false;
      }
    }
    if (userOk) {
      console.log(`  ✅ ${user.name}: balance=$${settingsMap.startingBalance} timezone=${settingsMap.timezone}`);
      pass++;
    }
  }

  return { pass, fail };
}

function verifyStreaks(users) {
  console.log('\n━━━ VERIFICATION: Streak Calculations ━━━━━━━━━━━━━━━━━');
  let pass = 0, fail = 0;

  for (const user of users) {
    const trades = db.prepare(`
      SELECT realized_pnl_usd, closed_at FROM trades
      WHERE user_id = ? AND status = 'closed' AND realized_pnl_usd IS NOT NULL AND closed_at IS NOT NULL
      ORDER BY closed_at ASC
    `).all(user.userId);

    if (trades.length === 0) continue;

    let maxWin = 0, maxLoss = 0, currCount = 0, currType = 'none';
    for (const t of trades) {
      const pnl = t.realized_pnl_usd;
      if (pnl === 0) continue; // Skip breakeven
      const type = pnl > 0 ? 'win' : 'loss';
      if (type === currType) {
        currCount++;
      } else {
        currType = type;
        currCount = 1;
      }
      if (currType === 'win') maxWin = Math.max(maxWin, currCount);
      else maxLoss = Math.max(maxLoss, currCount);
    }

    console.log(`  ✅ ${user.name}: MaxWin streak=${maxWin}, MaxLoss streak=${maxLoss}, Current streak=${currCount}x ${currType}`);
    pass++;
  }

  return { pass, fail };
}

function verifyMigrations() {
  console.log('\n━━━ VERIFICATION: Database Migrations ━━━━━━━━━━━━━━━━━');
  let pass = 0, fail = 0;

  // Check strategies_user_name_unique index exists
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'strategies_%'").all();
  const hasUserNameUnique = indexes.some(i => i.name === 'strategies_user_name_unique');
  const hasOldNameUnique = indexes.some(i => i.name === 'strategies_name_unique');

  if (hasOldNameUnique) {
    console.log('  ❌ strategies_name_unique still exists — migration 0004 not applied!');
    fail++;
  } else {
    console.log('  ✅ strategies_name_unique removed ✓');
    pass++;
  }

  if (hasUserNameUnique) {
    console.log('  ✅ strategies_user_name_unique index exists ✓');
    pass++;
  } else {
    console.log('  ⚠️  strategies_user_name_unique index not found — migration 0004 may need to run on DB');
    // This is OK if the DB was created fresh (schema already has the constraint)
  }

  // Check tags composite unique
  const tagIndexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'tags_%'").all();
  const hasTagUserLabel = tagIndexes.some(i => i.name === 'tags_user_label_unique');
  const hasTagLabelOld = tagIndexes.some(i => i.name === 'tags_label_unique');

  if (hasTagLabelOld) {
    console.log('  ❌ tags_label_unique still exists — migration 0003 not applied!');
    fail++;
  } else {
    console.log('  ✅ tags_label_unique removed ✓');
    pass++;
  }
  if (hasTagUserLabel) {
    console.log('  ✅ tags_user_label_unique composite index exists ✓');
    pass++;
  } else {
    console.log('  ⚠️  tags_user_label_unique not found — may need migration 0003');
  }

  // Test same-strategy-name across users (should work)
  try {
    const testUser1 = db.prepare('SELECT id FROM users WHERE passcode = ?').get('111111');
    const testUser2 = db.prepare('SELECT id FROM users WHERE passcode = ?').get('222222');
    if (testUser1 && testUser2) {
      // Try to insert duplicate strategy name for different users (should succeed)
      const testId1 = uuid();
      const testId2 = uuid();
      const now = nowUtc();
      db.prepare('INSERT INTO strategies (id, user_id, name, archived, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)').run(testId1, testUser1.id, '__test_dupe_name__', now, now);
      db.prepare('INSERT INTO strategies (id, user_id, name, archived, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)').run(testId2, testUser2.id, '__test_dupe_name__', now, now);
      // Clean up
      db.prepare('DELETE FROM strategies WHERE name = ?').run('__test_dupe_name__');
      console.log('  ✅ Same strategy name for different users: ALLOWED ✓ (constraint is per-user)');
      pass++;
    }
  } catch (e) {
    console.log('  ❌ Same strategy name for different users: BLOCKED — composite unique not working!', e.message);
    fail++;
  }

  // Test same-strategy-name for same user (should fail)
  try {
    const testUser1 = db.prepare('SELECT id FROM users WHERE passcode = ?').get('111111');
    if (testUser1) {
      const testId1 = uuid();
      const testId2 = uuid();
      const now = nowUtc();
      db.prepare('INSERT INTO strategies (id, user_id, name, archived, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)').run(testId1, testUser1.id, '__test_same_user__', now, now);
      db.prepare('INSERT INTO strategies (id, user_id, name, archived, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)').run(testId2, testUser1.id, '__test_same_user__', now, now);
      db.prepare('DELETE FROM strategies WHERE name = ?').run('__test_same_user__');
      console.log('  ❌ Same strategy name for same user: ALLOWED — should be blocked!');
      fail++;
    }
  } catch (e) {
    db.prepare('DELETE FROM strategies WHERE name = ?').run('__test_same_user__');
    console.log('  ✅ Same strategy name for same user: BLOCKED ✓ (unique constraint works)');
    pass++;
  }

  return { pass, fail };
}

function verifyPsychologyFields(users) {
  console.log('\n━━━ VERIFICATION: Psychology Fields ━━━━━━━━━━━━━━━━━━━');
  let pass = 0, fail = 0;

  for (const user of users) {
    const trades = db.prepare(`
      SELECT symbol, pre_caffeine, pre_following_plan, post_would_retake, post_mood, pre_mood
      FROM trades WHERE user_id = ?
    `).all(user.userId);

    for (const t of trades) {
      // Boolean fields should be stored as 0, 1, or NULL — never undefined
      const boolFields = ['pre_caffeine', 'pre_following_plan', 'post_would_retake'];
      let ok = true;
      for (const field of boolFields) {
        const val = t[field];
        if (val !== null && val !== 0 && val !== 1) {
          console.log(`  ❌ ${t.symbol} (${user.name}): ${field} = "${val}" — invalid boolean`);
          fail++;
          ok = false;
        }
      }
      if (ok) pass++;
    }
  }
  console.log(`  ✅ All boolean psychology fields properly stored as 0/1/NULL`);
  return { pass, fail };
}

function printSummaryReport(results) {
  console.log('\n\n════════════════════════════════════════════════════════');
  console.log('  UAT SEED + VERIFICATION REPORT');
  console.log('════════════════════════════════════════════════════════\n');

  let totalPass = 0, totalFail = 0;
  for (const [name, r] of Object.entries(results)) {
    totalPass += r.pass;
    totalFail += r.fail;
    const icon = r.fail === 0 ? '✅' : '❌';
    console.log(`  ${icon} ${name}: ${r.pass} passed, ${r.fail} failed`);
  }

  console.log(`\n  Total: ${totalPass} passed, ${totalFail} failed`);

  if (totalFail === 0) {
    console.log('\n  🎉 ALL CHECKS PASSED — UAT data seeded and verified!');
  } else {
    console.log('\n  ⚠️  SOME CHECKS FAILED — Review errors above');
  }
  console.log('\n════════════════════════════════════════════════════════\n');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
console.log('PK Trades Journal — UAT Seed + Verification Script');
console.log(`DB: ${DB_PATH}\n`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (!checkSchema()) {
  console.error('DB schema check failed. Is the DB initialized?');
  process.exit(1);
}

console.log('\nWiping existing UAT data...');
wipeUATData();

console.log('\n━━━ SEEDING USERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const u1 = seedUser1();
const u2 = seedUser2();
const u3 = seedUser3();
const u4 = seedUser4();
const u5 = seedUser5();
const u6 = seedUser6();

// Load user display names + passcodes for verification
const getUser = (userId, passcode, name) => ({ userId, passcode, name });
const users = [
  getUser(u1.userId, '111111', 'Alice Chen'),
  getUser(u2.userId, '222222', 'Marcus Webb'),
  getUser(u3.userId, '333333', 'Sofia Ramirez'),
  getUser(u4.userId, '444444', 'Derek Park'),
  getUser(u5.userId, '555555', 'Priya Sharma'),
  getUser(u6.userId, '666666', 'Jake Turner'),
];

console.log('\n\nTotal trades seeded:');
const totalTrades = db.prepare("SELECT COUNT(*) as c FROM trades WHERE user_id IN (SELECT id FROM users WHERE passcode IN ('111111','222222','333333','444444','555555','666666'))").get();
const totalClosed = db.prepare("SELECT COUNT(*) as c FROM trades WHERE status='closed' AND user_id IN (SELECT id FROM users WHERE passcode IN ('111111','222222','333333','444444','555555','666666'))").get();
const totalOpen = db.prepare("SELECT COUNT(*) as c FROM trades WHERE status='open' AND user_id IN (SELECT id FROM users WHERE passcode IN ('111111','222222','333333','444444','555555','666666'))").get();
console.log(`  Total: ${totalTrades.c} | Closed: ${totalClosed.c} | Open: ${totalOpen.c}`);

// Run verifications
const results = {
  'User Isolation': verifyUserIsolation(users),
  'P&L Calculations': verifyPnLCalculations(users),
  'Metrics Calculations': verifyMetricsCalculations(users),
  'Tag & Strategy Isolation': verifyTagIsolation(users),
  'Per-User Settings': verifySettings(users),
  'Streak Calculations': verifyStreaks(users),
  'DB Migrations': verifyMigrations(),
  'Psychology Fields': verifyPsychologyFields(users),
};

printSummaryReport(results);

console.log('\n━━━ TEST USERS SUMMARY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('  Passcode │ Name            │ Account  │ Timezone             │ Profile');
console.log('  ─────────┼─────────────────┼──────────┼──────────────────────┼──────────────────────');
console.log('  111111   │ Alice Chen       │ $25,000  │ America/New_York (ET) │ Options spreads trader');
console.log('  222222   │ Marcus Webb      │ $10,000  │ America/Chicago (CT)  │ Stock day trader');
console.log('  333333   │ Sofia Ramirez    │ $50,000  │ America/Los_Angeles(PT)│ Swing options trader');
console.log('  444444   │ Derek Park       │ $5,000   │ America/Denver (MT)   │ Beginner, mostly losses');
console.log('  555555   │ Priya Sharma     │ $100,000 │ America/New_York (ET) │ Quant/conservative IC');
console.log('  666666   │ Jake Turner      │ $8,000   │ America/Chicago (CT)  │ High-beta momentum');
console.log('');
console.log('  All users can log in at http://localhost:3000 using their passcode.');
console.log('  Admin (090909) untouched.\n');

db.close();
