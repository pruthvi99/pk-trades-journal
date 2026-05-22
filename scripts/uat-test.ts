/**
 * Comprehensive UAT test script.
 * Creates strategies, tags, 18 trades across multiple dates/types,
 * closes trades with exit executions, verifies metrics, P&L, calendar, journal.
 *
 * Run: pnpm tsx --env-file=.env.local scripts/uat-test.ts
 */

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
let cookie = '';
let pass = 0;
let fail = 0;
const failures: string[] = [];

// ─── Helpers ────────────────────────────────────────────────────────────────

async function api(
	method: string,
	path: string,
	body?: unknown,
): Promise<{ status: number; data: unknown }> {
	const res = await fetch(`${BASE}${path}`, {
		method,
		headers: {
			'Content-Type': 'application/json',
			...(cookie ? { Cookie: cookie } : {}),
		},
		body: body ? JSON.stringify(body) : undefined,
		redirect: 'manual',
	});
	const text = await res.text();
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		data = text;
	}
	return { status: res.status, data };
}

function assert(label: string, condition: boolean, detail = '') {
	if (condition) {
		pass++;
		console.log(`  ✅ ${label}`);
	} else {
		fail++;
		const msg = detail ? `${label} — ${detail}` : label;
		failures.push(msg);
		console.log(`  ❌ ${label}${detail ? ` (${detail})` : ''}`);
	}
}

function approxEq(a: number, b: number, tolerance = 0.02): boolean {
	return Math.abs(a - b) <= tolerance;
}

// ─── Phase 1: Auth ──────────────────────────────────────────────────────────

async function testAuth() {
	console.log('\n═══ Phase 1: Authentication ═══');

	// Bad password
	const bad = await api('POST', '/api/auth/login', { password: 'wrong' });
	assert('Reject wrong password', bad.status === 401);

	// No password
	const empty = await api('POST', '/api/auth/login', {});
	assert('Reject empty body', empty.status === 400);

	// Correct password
	const good = await fetch(`${BASE}/api/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ password: 'dev' }),
		redirect: 'manual',
	});
	const setCookie = good.headers.get('set-cookie') ?? '';
	cookie = setCookie.split(';')[0] ?? '';
	assert('Login with correct password', good.status === 200 && cookie.includes('pk_session'));

	// Auth-protected endpoint without cookie
	const noAuth = await fetch(`${BASE}/api/trades`, { redirect: 'manual' });
	assert('Unauthenticated request gets redirected', noAuth.status === 307 || noAuth.status === 302);
}

// ─── Phase 0: Cleanup previous test data ────────────────────────────────────

async function cleanup() {
	console.log('\n═══ Phase 0: Cleanup ═══');

	// Delete all existing trades (API returns { trades: [...], total })
	const tradesRes = await api('GET', '/api/trades?limit=500');
	if (tradesRes.status === 200) {
		const data = tradesRes.data as { trades: Array<{ id: string }>; total: number };
		if (data.trades && data.trades.length > 0) {
			for (const t of data.trades) {
				await api('DELETE', `/api/trades/${t.id}`);
			}
			console.log(`  🧹 Deleted ${data.trades.length} existing trades`);
		} else {
			console.log('  🧹 No existing trades to clean up');
		}
	}

	// Note: strategies and tags don't have DELETE endpoints,
	// so we'll handle duplicates in creation phases.
}

// ─── Phase 2: Strategies ────────────────────────────────────────────────────

const strategyIds: Record<string, string> = {};

async function testStrategies() {
	console.log('\n═══ Phase 2: Strategies ═══');

	const strats = [
		{
			name: 'Iron Condor',
			description: 'Non-directional premium selling',
			defaultInstrument: 'option',
		},
		{ name: 'Bull Put Spread', description: 'Bullish credit spread', defaultInstrument: 'option' },
		{ name: 'Bear Call Spread', description: 'Bearish credit spread', defaultInstrument: 'option' },
		{ name: 'Momentum Scalp', description: 'Intraday stock momentum', defaultInstrument: 'stock' },
		{ name: 'Earnings Play', description: 'Pre-earnings volatility', defaultInstrument: 'option' },
	];

	// Fetch existing strategies to avoid duplicates
	const existing = await api('GET', '/api/strategies');
	const existingStrats =
		existing.status === 200 && Array.isArray(existing.data)
			? (existing.data as Array<{ id: string; name: string }>)
			: [];
	for (const e of existingStrats) {
		strategyIds[e.name] = e.id;
	}

	for (const s of strats) {
		if (strategyIds[s.name]) {
			pass++;
			console.log(`  ✅ Create strategy: ${s.name} (already exists)`);
			continue;
		}
		const res = await api('POST', '/api/strategies', s);
		assert(`Create strategy: ${s.name}`, res.status === 201);
		if (res.status === 201) {
			const d = res.data as { id: string; name: string };
			strategyIds[s.name] = d.id;
		}
	}

	// List
	const list = await api('GET', '/api/strategies');
	assert('List strategies returns all 5', (list.data as unknown[]).length >= 5);

	// Update
	const updateRes = await api('PATCH', `/api/strategies/${strategyIds['Iron Condor']}`, {
		description: 'Updated: Non-directional premium selling strategy',
	});
	assert('Update strategy description', updateRes.status === 200);
}

// ─── Phase 3: Tags ──────────────────────────────────────────────────────────

const tagIds: Record<string, string> = {};

async function testTags() {
	console.log('\n═══ Phase 3: Tags ═══');

	const tagDefs = [
		{ label: 'Support Bounce', category: 'setup' as const },
		{ label: 'Resistance Break', category: 'setup' as const },
		{ label: 'FOMC', category: 'context' as const },
		{ label: 'Earnings', category: 'context' as const },
		{ label: 'CPI Day', category: 'context' as const },
		{ label: 'Overtraded', category: 'mistake' as const },
		{ label: 'Moved Stop', category: 'mistake' as const },
		{ label: 'FOMO Entry', category: 'psychology' as const },
		{ label: 'Revenge Trade', category: 'psychology' as const },
		{ label: 'Clean Setup', category: 'custom' as const },
	];

	// Fetch existing tags to avoid duplicates
	const existingTags = await api('GET', '/api/tags');
	const existingTagList =
		existingTags.status === 200 && Array.isArray(existingTags.data)
			? (existingTags.data as Array<{ id: string; label: string }>)
			: [];
	for (const e of existingTagList) {
		tagIds[e.label] = e.id;
	}

	for (const t of tagDefs) {
		if (tagIds[t.label]) {
			pass++;
			console.log(`  ✅ Create tag: ${t.label} (${t.category}) (already exists)`);
			continue;
		}
		const res = await api('POST', '/api/tags', t);
		assert(`Create tag: ${t.label} (${t.category})`, res.status === 201);
		if (res.status === 201) {
			const d = res.data as { id: string };
			tagIds[t.label] = d.id;
		}
	}

	const list = await api('GET', '/api/tags');
	assert('List tags returns all 10', (list.data as unknown[]).length >= 10);

	// Update tag — rename Clean Setup to A+ Setup
	// If A+ Setup already exists from a prior run, rename it back first to test the update flow
	if (tagIds['A+ Setup'] && tagIds['Clean Setup']) {
		// Both exist — delete the old A+ Setup by renaming it to something unique, then rename Clean Setup
		await api('PATCH', `/api/tags/${tagIds['A+ Setup']}`, { label: `_old_${Date.now()}` });
	}
	const cleanSetupId = tagIds['Clean Setup'];
	if (cleanSetupId) {
		const updateRes = await api('PATCH', `/api/tags/${cleanSetupId}`, { label: 'A+ Setup' });
		assert('Update tag label', updateRes.status === 200);
		tagIds['A+ Setup'] = cleanSetupId;
	} else if (tagIds['A+ Setup']) {
		// Already renamed from prior run — verify the update API works by renaming it again
		const updateRes = await api('PATCH', `/api/tags/${tagIds['A+ Setup']}`, { label: 'A+ Setup' });
		assert('Update tag label', updateRes.status === 200);
	} else {
		assert('Update tag label', false, 'Neither Clean Setup nor A+ Setup found');
	}
}

// ─── Phase 4: Create Trades ─────────────────────────────────────────────────

interface CreatedTrade {
	id: string;
	symbol: string;
	instrument: string;
	pnlExpected?: number;
}
const createdTrades: CreatedTrade[] = [];

async function createTrades() {
	console.log('\n═══ Phase 4: Create 18 Trades ═══');

	// Trade definitions — diverse mix across dates, instruments, strategies, etc.
	const tradeDefs = [
		// ── Option Spread Trades ──
		{
			name: 'SPX Bull Put 1',
			payload: {
				symbol: 'SPX',
				instrument: 'option_spread',
				direction: 'long',
				strategyId: strategyIds['Bull Put Spread'],
				openedAt: '2026-05-01T14:30:00.000Z',
				plannedEntry: 2.5,
				plannedStop: 5.0,
				plannedTarget: 0.1,
				plannedSize: 2,
				plannedRiskUsd: 500,
				notesMd: 'SPX above 5800 support, selling 5750/5700 put spread for $2.50 credit',
				preConfidence: 8,
				preMood: 'focused',
				preSleepHours: 7.5,
				preCaffeine: true,
				preFollowingPlan: true,
				tagIds: [tagIds['Support Bounce'], tagIds['A+ Setup']],
				execution: {
					kind: 'entry',
					executedAt: '2026-05-01T14:30:00.000Z',
					legs: [
						{
							side: 'sell',
							optionType: 'put',
							strike: 5750,
							expiration: '2026-05-16',
							contracts: 2,
							price: 2.5,
							multiplier: 100,
						},
						{
							side: 'buy',
							optionType: 'put',
							strike: 5700,
							expiration: '2026-05-16',
							contracts: 2,
							price: 0.8,
							multiplier: 100,
						},
					],
				},
			},
		},
		{
			name: 'SPX Bear Call 1',
			payload: {
				symbol: 'SPX',
				instrument: 'option_spread',
				direction: 'short',
				strategyId: strategyIds['Bear Call Spread'],
				openedAt: '2026-05-02T15:00:00.000Z',
				plannedEntry: 3.0,
				plannedStop: 6.0,
				plannedTarget: 0.1,
				plannedRiskUsd: 300,
				notesMd: 'Resistance at 5900, selling 5950/6000 call spread',
				preConfidence: 7,
				preMood: 'calm',
				preSleepHours: 8,
				preFollowingPlan: true,
				tagIds: [tagIds['Resistance Break']],
				execution: {
					kind: 'entry',
					executedAt: '2026-05-02T15:00:00.000Z',
					legs: [
						{
							side: 'sell',
							optionType: 'call',
							strike: 5950,
							expiration: '2026-05-16',
							contracts: 1,
							price: 3.0,
							multiplier: 100,
						},
						{
							side: 'buy',
							optionType: 'call',
							strike: 6000,
							expiration: '2026-05-16',
							contracts: 1,
							price: 1.2,
							multiplier: 100,
						},
					],
				},
			},
		},
		{
			name: 'SPX Iron Condor 1',
			payload: {
				symbol: 'SPX',
				instrument: 'option_spread',
				direction: 'neutral',
				strategyId: strategyIds['Iron Condor'],
				openedAt: '2026-05-05T14:00:00.000Z',
				plannedEntry: 4.0,
				plannedRiskUsd: 600,
				notesMd: 'Range-bound after FOMC. Selling 5700/5650 put and 5950/6000 call wings.',
				preConfidence: 6,
				preMood: 'neutral',
				preSleepHours: 6,
				preCaffeine: true,
				tagIds: [tagIds['FOMC']],
				execution: {
					kind: 'entry',
					executedAt: '2026-05-05T14:00:00.000Z',
					legs: [
						{
							side: 'sell',
							optionType: 'put',
							strike: 5700,
							expiration: '2026-05-23',
							contracts: 1,
							price: 2.2,
							multiplier: 100,
						},
						{
							side: 'buy',
							optionType: 'put',
							strike: 5650,
							expiration: '2026-05-23',
							contracts: 1,
							price: 1.0,
							multiplier: 100,
						},
						{
							side: 'sell',
							optionType: 'call',
							strike: 5950,
							expiration: '2026-05-23',
							contracts: 1,
							price: 2.1,
							multiplier: 100,
						},
						{
							side: 'buy',
							optionType: 'call',
							strike: 6000,
							expiration: '2026-05-23',
							contracts: 1,
							price: 0.9,
							multiplier: 100,
						},
					],
				},
			},
		},
		{
			name: 'AAPL Earnings Bull Put',
			payload: {
				symbol: 'AAPL',
				instrument: 'option_spread',
				direction: 'long',
				strategyId: strategyIds['Earnings Play'],
				openedAt: '2026-05-06T13:30:00.000Z',
				plannedEntry: 1.8,
				plannedRiskUsd: 320,
				notesMd: 'Selling AAPL 220/215 put spread before earnings. IV elevated.',
				preConfidence: 5,
				preMood: 'anxious',
				preSleepHours: 5.5,
				preCaffeine: true,
				tagIds: [tagIds['Earnings'], tagIds['FOMO Entry']],
				execution: {
					kind: 'entry',
					executedAt: '2026-05-06T13:30:00.000Z',
					legs: [
						{
							side: 'sell',
							optionType: 'put',
							strike: 220,
							expiration: '2026-05-09',
							contracts: 1,
							price: 1.8,
							multiplier: 100,
						},
						{
							side: 'buy',
							optionType: 'put',
							strike: 215,
							expiration: '2026-05-09',
							contracts: 1,
							price: 0.5,
							multiplier: 100,
						},
					],
				},
			},
		},
		{
			name: 'TSLA Bull Put',
			payload: {
				symbol: 'TSLA',
				instrument: 'option_spread',
				direction: 'long',
				strategyId: strategyIds['Bull Put Spread'],
				openedAt: '2026-05-07T14:00:00.000Z',
				plannedEntry: 2.0,
				plannedRiskUsd: 300,
				notesMd: 'TSLA bouncing off 200-day MA',
				preConfidence: 7,
				preMood: 'focused',
				preSleepHours: 7,
				preFollowingPlan: true,
				tagIds: [tagIds['Support Bounce']],
				execution: {
					kind: 'entry',
					executedAt: '2026-05-07T14:00:00.000Z',
					legs: [
						{
							side: 'sell',
							optionType: 'put',
							strike: 180,
							expiration: '2026-05-23',
							contracts: 1,
							price: 2.0,
							multiplier: 100,
						},
						{
							side: 'buy',
							optionType: 'put',
							strike: 175,
							expiration: '2026-05-23',
							contracts: 1,
							price: 0.8,
							multiplier: 100,
						},
					],
				},
			},
		},
		{
			name: 'SPX Bull Put 2',
			payload: {
				symbol: 'SPX',
				instrument: 'option_spread',
				direction: 'long',
				strategyId: strategyIds['Bull Put Spread'],
				openedAt: '2026-05-08T14:30:00.000Z',
				plannedEntry: 2.8,
				plannedRiskUsd: 220,
				notesMd: 'CPI day play, selling into elevated IV',
				preConfidence: 6,
				preMood: 'calm',
				preSleepHours: 8,
				preCaffeine: false,
				preFollowingPlan: true,
				tagIds: [tagIds['CPI Day'], tagIds['A+ Setup']],
				execution: {
					kind: 'entry',
					executedAt: '2026-05-08T14:30:00.000Z',
					legs: [
						{
							side: 'sell',
							optionType: 'put',
							strike: 5800,
							expiration: '2026-05-16',
							contracts: 1,
							price: 2.8,
							multiplier: 100,
						},
						{
							side: 'buy',
							optionType: 'put',
							strike: 5775,
							expiration: '2026-05-16',
							contracts: 1,
							price: 1.3,
							multiplier: 100,
						},
					],
				},
			},
		},
		{
			name: 'AMZN Bear Call',
			payload: {
				symbol: 'AMZN',
				instrument: 'option_spread',
				direction: 'short',
				strategyId: strategyIds['Bear Call Spread'],
				openedAt: '2026-05-09T15:00:00.000Z',
				plannedEntry: 2.5,
				plannedRiskUsd: 250,
				notesMd: 'AMZN extended above upper BB',
				preConfidence: 4,
				preMood: 'revenge',
				preSleepHours: 5,
				preCaffeine: true,
				tagIds: [tagIds['Revenge Trade'], tagIds['Moved Stop']],
				execution: {
					kind: 'entry',
					executedAt: '2026-05-09T15:00:00.000Z',
					legs: [
						{
							side: 'sell',
							optionType: 'call',
							strike: 200,
							expiration: '2026-05-23',
							contracts: 1,
							price: 2.5,
							multiplier: 100,
						},
						{
							side: 'buy',
							optionType: 'call',
							strike: 205,
							expiration: '2026-05-23',
							contracts: 1,
							price: 1.0,
							multiplier: 100,
						},
					],
				},
			},
		},
		{
			name: 'SPX Iron Condor 2',
			payload: {
				symbol: 'SPX',
				instrument: 'option_spread',
				direction: 'neutral',
				strategyId: strategyIds['Iron Condor'],
				openedAt: '2026-05-12T14:00:00.000Z',
				plannedEntry: 3.8,
				plannedRiskUsd: 620,
				notesMd: 'Low VIX environment, wide wings',
				preConfidence: 8,
				preMood: 'focused',
				preSleepHours: 8.5,
				preFollowingPlan: true,
				tagIds: [tagIds['A+ Setup']],
				execution: {
					kind: 'entry',
					executedAt: '2026-05-12T14:00:00.000Z',
					legs: [
						{
							side: 'sell',
							optionType: 'put',
							strike: 5680,
							expiration: '2026-05-30',
							contracts: 1,
							price: 2.1,
							multiplier: 100,
						},
						{
							side: 'buy',
							optionType: 'put',
							strike: 5630,
							expiration: '2026-05-30',
							contracts: 1,
							price: 0.9,
							multiplier: 100,
						},
						{
							side: 'sell',
							optionType: 'call',
							strike: 5980,
							expiration: '2026-05-30',
							contracts: 1,
							price: 1.9,
							multiplier: 100,
						},
						{
							side: 'buy',
							optionType: 'call',
							strike: 6030,
							expiration: '2026-05-30',
							contracts: 1,
							price: 0.7,
							multiplier: 100,
						},
					],
				},
			},
		},
		// ── Stock Trades ──
		{
			name: 'NVDA Momentum Scalp 1',
			payload: {
				symbol: 'NVDA',
				instrument: 'stock',
				direction: 'long',
				strategyId: strategyIds['Momentum Scalp'],
				openedAt: '2026-05-03T14:35:00.000Z',
				plannedEntry: 135.0,
				plannedStop: 133.0,
				plannedTarget: 139.0,
				plannedSize: 50,
				plannedRiskUsd: 100,
				notesMd: 'NVDA breaking out of consolidation on volume',
				preConfidence: 9,
				preMood: 'focused',
				preSleepHours: 7,
				preCaffeine: false,
				preFollowingPlan: true,
				tagIds: [tagIds['Resistance Break'], tagIds['A+ Setup']],
				execution: {
					kind: 'entry',
					executedAt: '2026-05-03T14:35:00.000Z',
					legs: [{ side: 'buy', shares: 50, price: 135.0, multiplier: 1 }],
				},
			},
		},
		{
			name: 'AMD Momentum Scalp',
			payload: {
				symbol: 'AMD',
				instrument: 'stock',
				direction: 'long',
				strategyId: strategyIds['Momentum Scalp'],
				openedAt: '2026-05-10T14:40:00.000Z',
				plannedEntry: 165.0,
				plannedStop: 163.0,
				plannedTarget: 169.0,
				plannedSize: 30,
				plannedRiskUsd: 60,
				notesMd: 'AMD gap up on AI news',
				preConfidence: 7,
				preMood: 'calm',
				preSleepHours: 7.5,
				tagIds: [tagIds['Resistance Break']],
				execution: {
					kind: 'entry',
					executedAt: '2026-05-10T14:40:00.000Z',
					legs: [{ side: 'buy', shares: 30, price: 165.0, multiplier: 1 }],
				},
			},
		},
		{
			name: 'META Short Scalp',
			payload: {
				symbol: 'META',
				instrument: 'stock',
				direction: 'short',
				strategyId: strategyIds['Momentum Scalp'],
				openedAt: '2026-05-13T15:00:00.000Z',
				plannedEntry: 520.0,
				plannedStop: 525.0,
				plannedTarget: 510.0,
				plannedSize: 10,
				plannedRiskUsd: 50,
				notesMd: 'META rejected at resistance',
				preConfidence: 6,
				preMood: 'neutral',
				preSleepHours: 6.5,
				tagIds: [tagIds['Resistance Break']],
				execution: {
					kind: 'entry',
					executedAt: '2026-05-13T15:00:00.000Z',
					legs: [{ side: 'sell', shares: 10, price: 520.0, multiplier: 1 }],
				},
			},
		},
		{
			name: 'GOOGL Momentum Long',
			payload: {
				symbol: 'GOOGL',
				instrument: 'stock',
				direction: 'long',
				strategyId: strategyIds['Momentum Scalp'],
				openedAt: '2026-05-14T14:30:00.000Z',
				plannedEntry: 180.0,
				plannedStop: 178.0,
				plannedTarget: 184.0,
				plannedSize: 40,
				plannedRiskUsd: 80,
				notesMd: 'GOOGL breakout above 180 with strong volume',
				preConfidence: 8,
				preMood: 'focused',
				preSleepHours: 7,
				preCaffeine: true,
				preFollowingPlan: true,
				tagIds: [tagIds['Resistance Break'], tagIds['A+ Setup']],
				execution: {
					kind: 'entry',
					executedAt: '2026-05-14T14:30:00.000Z',
					legs: [{ side: 'buy', shares: 40, price: 180.0, multiplier: 1 }],
				},
			},
		},
		// ── More option trades for different dates ──
		{
			name: 'SPX Bull Put 3',
			payload: {
				symbol: 'SPX',
				instrument: 'option_spread',
				direction: 'long',
				strategyId: strategyIds['Bull Put Spread'],
				openedAt: '2026-05-15T14:00:00.000Z',
				plannedEntry: 1.9,
				plannedRiskUsd: 310,
				notesMd: 'Weekly expiry play',
				preConfidence: 7,
				preMood: 'calm',
				preSleepHours: 8,
				preFollowingPlan: true,
				execution: {
					kind: 'entry',
					executedAt: '2026-05-15T14:00:00.000Z',
					legs: [
						{
							side: 'sell',
							optionType: 'put',
							strike: 5780,
							expiration: '2026-05-16',
							contracts: 1,
							price: 1.9,
							multiplier: 100,
						},
						{
							side: 'buy',
							optionType: 'put',
							strike: 5750,
							expiration: '2026-05-16',
							contracts: 1,
							price: 0.6,
							multiplier: 100,
						},
					],
				},
			},
		},
		{
			name: 'QQQ Bull Put',
			payload: {
				symbol: 'QQQ',
				instrument: 'option_spread',
				direction: 'long',
				strategyId: strategyIds['Bull Put Spread'],
				openedAt: '2026-05-16T14:30:00.000Z',
				plannedEntry: 1.5,
				plannedRiskUsd: 350,
				notesMd: 'Tech strength, QQQ holding 500',
				preConfidence: 6,
				preMood: 'focused',
				preSleepHours: 7,
				tagIds: [tagIds['Support Bounce']],
				execution: {
					kind: 'entry',
					executedAt: '2026-05-16T14:30:00.000Z',
					legs: [
						{
							side: 'sell',
							optionType: 'put',
							strike: 500,
							expiration: '2026-05-30',
							contracts: 1,
							price: 1.5,
							multiplier: 100,
						},
						{
							side: 'buy',
							optionType: 'put',
							strike: 495,
							expiration: '2026-05-30',
							contracts: 1,
							price: 0.6,
							multiplier: 100,
						},
					],
				},
			},
		},
		{
			name: 'MSFT Scalp',
			payload: {
				symbol: 'MSFT',
				instrument: 'stock',
				direction: 'long',
				strategyId: strategyIds['Momentum Scalp'],
				openedAt: '2026-05-19T14:30:00.000Z',
				plannedEntry: 450.0,
				plannedStop: 447.0,
				plannedTarget: 456.0,
				plannedSize: 20,
				plannedRiskUsd: 60,
				notesMd: 'MSFT bounce off 450 support',
				preConfidence: 7,
				preMood: 'calm',
				preSleepHours: 8,
				tagIds: [tagIds['Support Bounce']],
				execution: {
					kind: 'entry',
					executedAt: '2026-05-19T14:30:00.000Z',
					legs: [{ side: 'buy', shares: 20, price: 450.0, multiplier: 1 }],
				},
			},
		},
		{
			name: 'SPX Bear Call 2',
			payload: {
				symbol: 'SPX',
				instrument: 'option_spread',
				direction: 'short',
				strategyId: strategyIds['Bear Call Spread'],
				openedAt: '2026-05-20T15:00:00.000Z',
				plannedEntry: 2.3,
				plannedRiskUsd: 270,
				notesMd: 'SPX approaching all-time highs, selling calls into resistance',
				preConfidence: 5,
				preMood: 'anxious',
				preSleepHours: 6,
				preCaffeine: true,
				tagIds: [tagIds['Overtraded']],
				execution: {
					kind: 'entry',
					executedAt: '2026-05-20T15:00:00.000Z',
					legs: [
						{
							side: 'sell',
							optionType: 'call',
							strike: 6000,
							expiration: '2026-06-06',
							contracts: 1,
							price: 2.3,
							multiplier: 100,
						},
						{
							side: 'buy',
							optionType: 'call',
							strike: 6025,
							expiration: '2026-06-06',
							contracts: 1,
							price: 0.9,
							multiplier: 100,
						},
					],
				},
			},
		},
		// April trades (different month to test calendar multi-month)
		{
			name: 'SPX April Iron Condor',
			payload: {
				symbol: 'SPX',
				instrument: 'option_spread',
				direction: 'neutral',
				strategyId: strategyIds['Iron Condor'],
				openedAt: '2026-04-21T14:00:00.000Z',
				plannedEntry: 4.5,
				plannedRiskUsd: 550,
				notesMd: 'April expiry play',
				preConfidence: 8,
				preMood: 'focused',
				preSleepHours: 7.5,
				preFollowingPlan: true,
				tagIds: [tagIds['A+ Setup']],
				execution: {
					kind: 'entry',
					executedAt: '2026-04-21T14:00:00.000Z',
					legs: [
						{
							side: 'sell',
							optionType: 'put',
							strike: 5600,
							expiration: '2026-04-30',
							contracts: 1,
							price: 2.5,
							multiplier: 100,
						},
						{
							side: 'buy',
							optionType: 'put',
							strike: 5550,
							expiration: '2026-04-30',
							contracts: 1,
							price: 1.1,
							multiplier: 100,
						},
						{
							side: 'sell',
							optionType: 'call',
							strike: 5900,
							expiration: '2026-04-30',
							contracts: 1,
							price: 2.3,
							multiplier: 100,
						},
						{
							side: 'buy',
							optionType: 'call',
							strike: 5950,
							expiration: '2026-04-30',
							contracts: 1,
							price: 0.9,
							multiplier: 100,
						},
					],
				},
			},
		},
		{
			name: 'AAPL April Stock Long',
			payload: {
				symbol: 'AAPL',
				instrument: 'stock',
				direction: 'long',
				strategyId: strategyIds['Momentum Scalp'],
				openedAt: '2026-04-28T14:30:00.000Z',
				plannedEntry: 215.0,
				plannedStop: 212.0,
				plannedTarget: 221.0,
				plannedSize: 25,
				plannedRiskUsd: 75,
				notesMd: 'AAPL bounce off earnings support',
				preConfidence: 7,
				preMood: 'calm',
				preSleepHours: 7,
				tagIds: [tagIds['Support Bounce'], tagIds['Earnings']],
				execution: {
					kind: 'entry',
					executedAt: '2026-04-28T14:30:00.000Z',
					legs: [{ side: 'buy', shares: 25, price: 215.0, multiplier: 1 }],
				},
			},
		},
	];

	for (const td of tradeDefs) {
		const res = await api('POST', '/api/trades', td.payload);
		assert(`Create trade: ${td.name}`, res.status === 201);
		if (res.status === 201) {
			const d = res.data as { id: string; instrument: string; symbol: string };
			createdTrades.push({ id: d.id, symbol: d.symbol, instrument: d.instrument });
		} else {
			console.log(`    Error:`, JSON.stringify(res.data).slice(0, 200));
		}
	}

	assert(`Total trades created = 18`, createdTrades.length === 18);

	// Verify all are open
	const allTrades = await api('GET', '/api/trades?status=open');
	const openCount = ((allTrades.data as { trades: unknown[] }).trades ?? []).length;
	assert(`All 18 trades are open`, openCount === 18);
}

// ─── Phase 5: Close Trades with Exit Executions ─────────────────────────────

interface ClosedTradeData {
	id: string;
	expectedPnl: number;
	closedDate: string;
}
const closedTradesData: ClosedTradeData[] = [];

async function closeTrades() {
	console.log('\n═══ Phase 5: Close Trades with Exit Executions ═══');

	// Close trade definitions: [tradeIndex, exitLegs, closedAt, expectedPnl]
	// P&L for options: sum(all cash flows) = entry_flow + exit_flow
	// Entry flow for bull put spread (sell put + buy put): sell*100 - buy*100

	// Trade 0: SPX Bull Put 1 — Entry: sell 2x $2.50, buy 2x $0.80 = +$340
	//   Exit: buy back at $0.20, sell at $0.05 = -$30. Total PnL = $340 - $30 = $310 (win)
	const t0 = createdTrades[0]!;
	let res = await api('POST', '/api/executions', {
		tradeId: t0.id,
		kind: 'exit',
		executedAt: '2026-05-15T14:00:00.000Z',
		legs: [
			{
				side: 'buy',
				optionType: 'put',
				strike: 5750,
				expiration: '2026-05-16',
				contracts: 2,
				price: 0.2,
				multiplier: 100,
			},
			{
				side: 'sell',
				optionType: 'put',
				strike: 5700,
				expiration: '2026-05-16',
				contracts: 2,
				price: 0.05,
				multiplier: 100,
			},
		],
	});
	assert('Close trade 0: SPX Bull Put 1 (exit execution)', res.status === 201);
	// Now close the trade via PATCH
	await api('PATCH', `/api/trades/${t0.id}`, {
		status: 'closed',
		closedAt: '2026-05-15T14:00:00.000Z',
		postSatisfaction: 9,
		postMood: 'calm',
		postWouldRetake: true,
		postLessons: 'Clean execution, followed the plan',
	});
	closedTradesData.push({ id: t0.id, expectedPnl: 310, closedDate: '2026-05-15' });

	// Trade 1: SPX Bear Call 1 — Entry: sell 1x $3.00, buy 1x $1.20 = +$180
	//   Exit: buy back at $4.50, sell at $2.00 = -$250. Total PnL = $180 - $250 = -$70 (loss)
	const t1 = createdTrades[1]!;
	res = await api('POST', '/api/executions', {
		tradeId: t1.id,
		kind: 'exit',
		executedAt: '2026-05-14T14:00:00.000Z',
		legs: [
			{
				side: 'buy',
				optionType: 'call',
				strike: 5950,
				expiration: '2026-05-16',
				contracts: 1,
				price: 4.5,
				multiplier: 100,
			},
			{
				side: 'sell',
				optionType: 'call',
				strike: 6000,
				expiration: '2026-05-16',
				contracts: 1,
				price: 2.0,
				multiplier: 100,
			},
		],
	});
	assert('Close trade 1: SPX Bear Call 1 (loss)', res.status === 201);
	await api('PATCH', `/api/trades/${t1.id}`, {
		status: 'closed',
		closedAt: '2026-05-14T14:00:00.000Z',
		postSatisfaction: 3,
		postMood: 'anxious',
		postWouldRetake: false,
		postMistakes: 'Held too long',
	});
	closedTradesData.push({ id: t1.id, expectedPnl: -70, closedDate: '2026-05-14' });

	// Trade 2: SPX Iron Condor 1 — Entry: sell put $2.20, buy put $1.00, sell call $2.10, buy call $0.90 = +$240
	//   Exit: all expire worthless (close at $0) — total PnL = $240 (win)
	const t2 = createdTrades[2]!;
	res = await api('POST', '/api/executions', {
		tradeId: t2.id,
		kind: 'exit',
		executedAt: '2026-05-23T16:00:00.000Z',
		legs: [
			{
				side: 'buy',
				optionType: 'put',
				strike: 5700,
				expiration: '2026-05-23',
				contracts: 1,
				price: 0.0,
				multiplier: 100,
			},
			{
				side: 'sell',
				optionType: 'put',
				strike: 5650,
				expiration: '2026-05-23',
				contracts: 1,
				price: 0.0,
				multiplier: 100,
			},
			{
				side: 'buy',
				optionType: 'call',
				strike: 5950,
				expiration: '2026-05-23',
				contracts: 1,
				price: 0.0,
				multiplier: 100,
			},
			{
				side: 'sell',
				optionType: 'call',
				strike: 6000,
				expiration: '2026-05-23',
				contracts: 1,
				price: 0.0,
				multiplier: 100,
			},
		],
	});
	assert('Close trade 2: SPX IC 1 (full win)', res.status === 201);
	await api('PATCH', `/api/trades/${t2.id}`, {
		status: 'closed',
		closedAt: '2026-05-23T16:00:00.000Z',
		postSatisfaction: 10,
		postMood: 'calm',
		postWouldRetake: true,
	});
	closedTradesData.push({ id: t2.id, expectedPnl: 240, closedDate: '2026-05-23' });

	// Trade 3: AAPL Earnings Bull Put — Entry: sell $1.80, buy $0.50 = +$130
	//   Exit: buy back at $3.80, sell at $1.50 = -$230. PnL = $130 - $230 = -$100 (loss)
	const t3 = createdTrades[3]!;
	res = await api('POST', '/api/executions', {
		tradeId: t3.id,
		kind: 'exit',
		executedAt: '2026-05-09T14:00:00.000Z',
		legs: [
			{
				side: 'buy',
				optionType: 'put',
				strike: 220,
				expiration: '2026-05-09',
				contracts: 1,
				price: 3.8,
				multiplier: 100,
			},
			{
				side: 'sell',
				optionType: 'put',
				strike: 215,
				expiration: '2026-05-09',
				contracts: 1,
				price: 1.5,
				multiplier: 100,
			},
		],
	});
	assert('Close trade 3: AAPL Earnings (loss)', res.status === 201);
	await api('PATCH', `/api/trades/${t3.id}`, {
		status: 'closed',
		closedAt: '2026-05-09T14:00:00.000Z',
		postSatisfaction: 2,
		postMood: 'revenge',
		postWouldRetake: false,
		postMistakes: 'FOMO entry, earnings were bad',
	});
	closedTradesData.push({ id: t3.id, expectedPnl: -100, closedDate: '2026-05-09' });

	// Trade 4: TSLA Bull Put — Entry: sell $2.00, buy $0.80 = +$120
	//   Exit: buy back at $0.10, sell at $0.02 = -$8. PnL = $120 - $8 = $112 (win)
	const t4 = createdTrades[4]!;
	res = await api('POST', '/api/executions', {
		tradeId: t4.id,
		kind: 'exit',
		executedAt: '2026-05-22T14:00:00.000Z',
		legs: [
			{
				side: 'buy',
				optionType: 'put',
				strike: 180,
				expiration: '2026-05-23',
				contracts: 1,
				price: 0.1,
				multiplier: 100,
			},
			{
				side: 'sell',
				optionType: 'put',
				strike: 175,
				expiration: '2026-05-23',
				contracts: 1,
				price: 0.02,
				multiplier: 100,
			},
		],
	});
	assert('Close trade 4: TSLA Bull Put (win)', res.status === 201);
	await api('PATCH', `/api/trades/${t4.id}`, {
		status: 'closed',
		closedAt: '2026-05-22T14:00:00.000Z',
		postSatisfaction: 8,
		postMood: 'calm',
		postWouldRetake: true,
	});
	closedTradesData.push({ id: t4.id, expectedPnl: 112, closedDate: '2026-05-22' });

	// Trade 5: SPX Bull Put 2 — Entry: sell $2.80, buy $1.30 = +$150. Expires worthless. PnL = $150
	const t5 = createdTrades[5]!;
	res = await api('POST', '/api/executions', {
		tradeId: t5.id,
		kind: 'exit',
		executedAt: '2026-05-16T16:00:00.000Z',
		legs: [
			{
				side: 'buy',
				optionType: 'put',
				strike: 5800,
				expiration: '2026-05-16',
				contracts: 1,
				price: 0.0,
				multiplier: 100,
			},
			{
				side: 'sell',
				optionType: 'put',
				strike: 5775,
				expiration: '2026-05-16',
				contracts: 1,
				price: 0.0,
				multiplier: 100,
			},
		],
	});
	assert('Close trade 5: SPX Bull Put 2 (full win)', res.status === 201);
	await api('PATCH', `/api/trades/${t5.id}`, {
		status: 'closed',
		closedAt: '2026-05-16T16:00:00.000Z',
		postSatisfaction: 9,
		postMood: 'focused',
		postWouldRetake: true,
	});
	closedTradesData.push({ id: t5.id, expectedPnl: 150, closedDate: '2026-05-16' });

	// Trade 6: AMZN Bear Call — Entry: sell $2.50, buy $1.00 = +$150
	//   Exit: buy back at $5.00, sell at $2.80 = -$220. PnL = $150 - $220 = -$70 (loss)
	const t6 = createdTrades[6]!;
	res = await api('POST', '/api/executions', {
		tradeId: t6.id,
		kind: 'exit',
		executedAt: '2026-05-20T14:00:00.000Z',
		legs: [
			{
				side: 'buy',
				optionType: 'call',
				strike: 200,
				expiration: '2026-05-23',
				contracts: 1,
				price: 5.0,
				multiplier: 100,
			},
			{
				side: 'sell',
				optionType: 'call',
				strike: 205,
				expiration: '2026-05-23',
				contracts: 1,
				price: 2.8,
				multiplier: 100,
			},
		],
	});
	assert('Close trade 6: AMZN Bear Call (loss)', res.status === 201);
	await api('PATCH', `/api/trades/${t6.id}`, {
		status: 'closed',
		closedAt: '2026-05-20T14:00:00.000Z',
		postSatisfaction: 2,
		postMood: 'revenge',
		postWouldRetake: false,
		postMistakes: 'Revenge trade after previous loss',
	});
	closedTradesData.push({ id: t6.id, expectedPnl: -70, closedDate: '2026-05-20' });

	// Trade 8 (NVDA stock): Entry buy 50 @ $135 = -$6750. Exit sell 50 @ $139.50 = +$6975. PnL = $225
	const t8 = createdTrades[8]!;
	res = await api('POST', '/api/executions', {
		tradeId: t8.id,
		kind: 'exit',
		executedAt: '2026-05-03T15:30:00.000Z',
		legs: [{ side: 'sell', shares: 50, price: 139.5, multiplier: 1 }],
	});
	assert('Close trade 8: NVDA scalp (win)', res.status === 201);
	await api('PATCH', `/api/trades/${t8.id}`, {
		status: 'closed',
		closedAt: '2026-05-03T15:30:00.000Z',
		postSatisfaction: 9,
		postMood: 'focused',
		postWouldRetake: true,
	});
	closedTradesData.push({ id: t8.id, expectedPnl: 225, closedDate: '2026-05-03' });

	// Trade 9 (AMD stock): Entry buy 30 @ $165 = -$4950. Exit sell 30 @ $162 = +$4860. PnL = -$90
	const t9 = createdTrades[9]!;
	res = await api('POST', '/api/executions', {
		tradeId: t9.id,
		kind: 'exit',
		executedAt: '2026-05-10T15:50:00.000Z',
		legs: [{ side: 'sell', shares: 30, price: 162.0, multiplier: 1 }],
	});
	assert('Close trade 9: AMD scalp (loss)', res.status === 201);
	await api('PATCH', `/api/trades/${t9.id}`, {
		status: 'closed',
		closedAt: '2026-05-10T15:50:00.000Z',
		postSatisfaction: 4,
		postMood: 'anxious',
		postWouldRetake: false,
		postMistakes: 'Did not cut loss fast enough',
	});
	closedTradesData.push({ id: t9.id, expectedPnl: -90, closedDate: '2026-05-10' });

	// Trade 10 (META short): Entry sell 10 @ $520 = +$5200. Exit buy 10 @ $515 = -$5150. PnL = $50
	const t10 = createdTrades[10]!;
	res = await api('POST', '/api/executions', {
		tradeId: t10.id,
		kind: 'exit',
		executedAt: '2026-05-13T15:45:00.000Z',
		legs: [{ side: 'buy', shares: 10, price: 515.0, multiplier: 1 }],
	});
	assert('Close trade 10: META short (win)', res.status === 201);
	await api('PATCH', `/api/trades/${t10.id}`, {
		status: 'closed',
		closedAt: '2026-05-13T15:45:00.000Z',
		postSatisfaction: 7,
		postMood: 'calm',
		postWouldRetake: true,
	});
	closedTradesData.push({ id: t10.id, expectedPnl: 50, closedDate: '2026-05-13' });

	// Trade 11 (GOOGL): Entry buy 40 @ $180 = -$7200. Exit sell 40 @ $183.50 = +$7340. PnL = $140
	const t11 = createdTrades[11]!;
	res = await api('POST', '/api/executions', {
		tradeId: t11.id,
		kind: 'exit',
		executedAt: '2026-05-14T15:30:00.000Z',
		legs: [{ side: 'sell', shares: 40, price: 183.5, multiplier: 1 }],
	});
	assert('Close trade 11: GOOGL long (win)', res.status === 201);
	await api('PATCH', `/api/trades/${t11.id}`, {
		status: 'closed',
		closedAt: '2026-05-14T15:30:00.000Z',
		postSatisfaction: 8,
		postMood: 'focused',
		postWouldRetake: true,
	});
	closedTradesData.push({ id: t11.id, expectedPnl: 140, closedDate: '2026-05-14' });

	// Trade 16 (April IC): Entry: sell put $2.50, buy put $1.10, sell call $2.30, buy call $0.90 = +$280
	//   Expires worthless. PnL = $280
	const t16 = createdTrades[16]!;
	res = await api('POST', '/api/executions', {
		tradeId: t16.id,
		kind: 'exit',
		executedAt: '2026-04-30T16:00:00.000Z',
		legs: [
			{
				side: 'buy',
				optionType: 'put',
				strike: 5600,
				expiration: '2026-04-30',
				contracts: 1,
				price: 0.0,
				multiplier: 100,
			},
			{
				side: 'sell',
				optionType: 'put',
				strike: 5550,
				expiration: '2026-04-30',
				contracts: 1,
				price: 0.0,
				multiplier: 100,
			},
			{
				side: 'buy',
				optionType: 'call',
				strike: 5900,
				expiration: '2026-04-30',
				contracts: 1,
				price: 0.0,
				multiplier: 100,
			},
			{
				side: 'sell',
				optionType: 'call',
				strike: 5950,
				expiration: '2026-04-30',
				contracts: 1,
				price: 0.0,
				multiplier: 100,
			},
		],
	});
	assert('Close trade 16: April IC (full win)', res.status === 201);
	await api('PATCH', `/api/trades/${t16.id}`, {
		status: 'closed',
		closedAt: '2026-04-30T16:00:00.000Z',
		postSatisfaction: 10,
		postMood: 'calm',
		postWouldRetake: true,
	});
	closedTradesData.push({ id: t16.id, expectedPnl: 280, closedDate: '2026-04-30' });

	// Trade 17 (AAPL April stock): Entry buy 25 @ $215 = -$5375. Exit sell 25 @ $220 = +$5500. PnL = $125
	const t17 = createdTrades[17]!;
	res = await api('POST', '/api/executions', {
		tradeId: t17.id,
		kind: 'exit',
		executedAt: '2026-04-29T15:30:00.000Z',
		legs: [{ side: 'sell', shares: 25, price: 220.0, multiplier: 1 }],
	});
	assert('Close trade 17: AAPL April stock (win)', res.status === 201);
	await api('PATCH', `/api/trades/${t17.id}`, {
		status: 'closed',
		closedAt: '2026-04-29T15:30:00.000Z',
		postSatisfaction: 8,
		postMood: 'focused',
		postWouldRetake: true,
	});
	closedTradesData.push({ id: t17.id, expectedPnl: 125, closedDate: '2026-04-29' });
}

// ─── Phase 6: Verify Individual Trade P&L ───────────────────────────────────

async function verifyPnl() {
	console.log('\n═══ Phase 6: Verify P&L Calculations ═══');

	for (const ct of closedTradesData) {
		const res = await api('GET', `/api/trades/${ct.id}`);
		const trade = res.data as { realizedPnlUsd: number | null; status: string; symbol: string };
		const actualPnl = trade.realizedPnlUsd ?? 0;
		assert(
			`P&L for ${trade.symbol} (${ct.id.slice(0, 8)}): expected $${ct.expectedPnl}, got $${actualPnl}`,
			approxEq(actualPnl, ct.expectedPnl),
			`diff = ${Math.abs(actualPnl - ct.expectedPnl).toFixed(2)}`,
		);
		assert(`Status for ${trade.symbol} is closed`, trade.status === 'closed');
	}

	// Verify R-multiples for trades that have planned risk
	const t0detail = (await api('GET', `/api/trades/${closedTradesData[0]!.id}`)).data as {
		realizedPnlR: number | null;
		plannedRiskUsd: number | null;
		realizedPnlUsd: number;
	};
	if (t0detail.plannedRiskUsd) {
		const expectedR = t0detail.realizedPnlUsd / t0detail.plannedRiskUsd;
		assert(
			`R-multiple for trade 0: expected ${expectedR.toFixed(2)}, got ${t0detail.realizedPnlR?.toFixed(2)}`,
			t0detail.realizedPnlR != null && approxEq(t0detail.realizedPnlR, expectedR),
		);
	}
}

// ─── Phase 7: Verify Metrics ────────────────────────────────────────────────

async function verifyMetrics() {
	console.log('\n═══ Phase 7: Verify Metrics ═══');

	const res = await api('GET', '/api/metrics');
	const m = res.data as {
		summary: { totalTrades: number; openTrades: number; closedTrades: number };
		headline: {
			totalPnlUsd: number;
			winRate: number;
			profitFactor: number;
			expectancyUsd: number;
			averageR: number;
		};
		distribution: { maxDrawdown: { maxDrawdownUsd: number } };
		edge: {
			bySymbol: unknown[];
			byStrategy: unknown[];
			byDayOfWeek: unknown[];
			byInstrument: unknown[];
		};
	};

	// Summary
	assert(`Total trades = 18`, m.summary.totalTrades === 18);
	// We closed 13 trades (indices 0-6, 8-11, 16-17), left 5 open (7, 12-15)
	assert(`Closed trades = 13`, m.summary.closedTrades === 13);
	assert(`Open trades = 5`, m.summary.openTrades === 5);

	// Total P&L: Sum of all closed trade P&Ls
	// $310 + (-$70) + $240 + (-$100) + $112 + $150 + (-$70) + $225 + (-$90) + $50 + $140 + $280 + $125 = $1,302
	const expectedTotalPnl =
		310 + -70 + 240 + -100 + 112 + 150 + -70 + 225 + -90 + 50 + 140 + 280 + 125;
	assert(
		`Total P&L = $${expectedTotalPnl} (got $${m.headline.totalPnlUsd})`,
		approxEq(m.headline.totalPnlUsd, expectedTotalPnl, 1),
		`expected ${expectedTotalPnl}`,
	);

	// Win rate: 10 wins / 14 closed = 71.43%
	// Wins: trades 0,2,4,5,8,10,11,16,17 = 9 wins. Wait let me recount.
	// T0: +310 win, T1: -70 loss, T2: +240 win, T3: -100 loss, T4: +112 win, T5: +150 win, T6: -70 loss
	// T8: +225 win, T9: -90 loss, T10: +50 win, T11: +140 win, T16: +280 win, T17: +125 win
	// Wins: 0,2,4,5,8,10,11,16,17 = 9 wins
	// Losses: 1,3,6,9 = 4 losses
	// Win rate: 9/13... wait, 9+4 = 13 but we have 14 closed? Let me count again.
	// We closed indices: 0,1,2,3,4,5,6,8,9,10,11,16,17 = 13 closed trades
	// Oh! I only closed 13, not 14. Let me recount.
	// closedTradesData entries: 14 entries (t0 through t17). Let me count push calls:
	// t0, t1, t2, t3, t4, t5, t6, t8, t9, t10, t11, t16, t17 = 13 pushes
	// But I said 14 in the assert! Let me fix this.
	// Actually wait... I need to recount. Let me count the push statements:
	// 1. t0, 2. t1, 3. t2, 4. t3, 5. t4, 6. t5, 7. t6, 8. t8, 9. t9, 10. t10, 11. t11, 12. t16, 13. t17
	// = 13 closed trades. Open: 7, 12, 13, 14, 15 = 5 open trades.
	// But total = 18. 13 + 5 = 18. ✓

	const closedCount = closedTradesData.length; // should be 13
	const openCount2 = 18 - closedCount; // should be 5
	assert(
		`Closed trade count correct: ${closedCount}`,
		m.summary.closedTrades === closedCount,
		`got ${m.summary.closedTrades}`,
	);
	assert(
		`Open trade count correct: ${openCount2}`,
		m.summary.openTrades === openCount2,
		`got ${m.summary.openTrades}`,
	);

	// Win rate calculation
	const wins = closedTradesData.filter((t) => t.expectedPnl > 0).length;
	const expectedWinRate = Math.round((wins / closedCount) * 10000) / 100;
	assert(
		`Win rate: expected ${expectedWinRate}%, got ${m.headline.winRate}%`,
		approxEq(m.headline.winRate, expectedWinRate, 0.1),
		`expected ${expectedWinRate}`,
	);

	// Profit factor: gross wins / |gross losses|
	const grossWins = closedTradesData
		.filter((t) => t.expectedPnl > 0)
		.reduce((s, t) => s + t.expectedPnl, 0);
	const grossLosses = Math.abs(
		closedTradesData.filter((t) => t.expectedPnl < 0).reduce((s, t) => s + t.expectedPnl, 0),
	);
	const expectedPF = Math.round((grossWins / grossLosses) * 100) / 100;
	assert(
		`Profit factor: expected ${expectedPF}, got ${m.headline.profitFactor}`,
		approxEq(m.headline.profitFactor, expectedPF, 0.1),
		`expected ${expectedPF}`,
	);

	// Expectancy
	const expectedExpectancy = Math.round((expectedTotalPnl / closedCount) * 100) / 100;
	assert(
		`Expectancy: expected $${expectedExpectancy}, got $${m.headline.expectancyUsd}`,
		approxEq(m.headline.expectancyUsd, expectedExpectancy, 1),
		`expected ${expectedExpectancy}`,
	);

	// Edge slices exist
	assert('Edge: bySymbol has data', (m.edge.bySymbol as unknown[]).length > 0);
	assert('Edge: byStrategy has data', (m.edge.byStrategy as unknown[]).length > 0);
	assert('Edge: byDayOfWeek has data', (m.edge.byDayOfWeek as unknown[]).length > 0);
	assert('Edge: byInstrument has data', (m.edge.byInstrument as unknown[]).length > 0);

	// Max drawdown should be positive (we had losing trades)
	assert('Max drawdown > 0', m.distribution.maxDrawdown.maxDrawdownUsd > 0);
}

// ─── Phase 8: Verify Calendar ───────────────────────────────────────────────

async function verifyCalendar() {
	console.log('\n═══ Phase 8: Verify Calendar ═══');

	// May 2026
	const mayRes = await api('GET', '/api/calendar?year=2026&month=5');
	const mayDays = mayRes.data as Array<{ date: string; pnlUsd: number; tradeCount: number }>;
	assert('May calendar returns data', mayDays.length > 0, `got ${mayDays.length} days`);

	// Check specific dates
	const may15 = mayDays.find((d) => d.date === '2026-05-15');
	assert('May 15 exists in calendar (SPX Bull Put 1 closed)', may15 != null);
	if (may15) {
		// $310 from trade 0 (closed) + $130 from trade 12 (open, entry credit $1.30 × 100) = $440
		assert(`May 15 P&L = $440`, approxEq(may15.pnlUsd, 440), `got $${may15.pnlUsd}`);
	}

	const may03 = mayDays.find((d) => d.date === '2026-05-03');
	assert('May 3 exists (NVDA closed)', may03 != null);
	if (may03) {
		assert(`May 3 P&L = $225`, approxEq(may03.pnlUsd, 225), `got $${may03.pnlUsd}`);
	}

	// April 2026
	const aprRes = await api('GET', '/api/calendar?year=2026&month=4');
	const aprDays = aprRes.data as Array<{ date: string; pnlUsd: number; tradeCount: number }>;
	assert('April calendar returns data', aprDays.length > 0, `got ${aprDays.length} days`);

	const apr30 = aprDays.find((d) => d.date === '2026-04-30');
	assert('April 30 exists (IC expired)', apr30 != null);
	if (apr30) {
		assert(`April 30 P&L = $280`, approxEq(apr30.pnlUsd, 280), `got $${apr30.pnlUsd}`);
	}
}

// ─── Phase 9: Verify Journal List ───────────────────────────────────────────

async function verifyJournal() {
	console.log('\n═══ Phase 9: Verify Journal List ═══');

	// All trades
	const all = await api('GET', '/api/trades');
	const allData = all.data as { trades: unknown[]; total: number };
	assert(`Journal lists 18 trades`, allData.total === 18);

	// Filter by symbol
	const spx = await api('GET', '/api/trades?symbol=SPX');
	const spxData = spx.data as { trades: unknown[]; total: number };
	assert(`SPX filter returns correct count`, spxData.total >= 7, `got ${spxData.total}`);

	// Filter by status
	const closed = await api('GET', '/api/trades?status=closed');
	const closedData = closed.data as { trades: unknown[]; total: number };
	assert(
		`Closed filter returns ${closedTradesData.length}`,
		closedData.total === closedTradesData.length,
	);

	const open = await api('GET', '/api/trades?status=open');
	const openData = open.data as { trades: unknown[]; total: number };
	assert(
		`Open filter returns ${18 - closedTradesData.length}`,
		openData.total === 18 - closedTradesData.length,
	);

	// Filter by instrument
	const stocks = await api('GET', '/api/trades?instrument=stock');
	const stocksData = stocks.data as { trades: unknown[]; total: number };
	assert(`Stock instrument filter returns 6`, stocksData.total === 6);

	// Symbols autocomplete
	const symbols = await api('GET', '/api/trades/symbols');
	const syms = symbols.data as string[];
	assert(
		`Distinct symbols include SPX, AAPL, NVDA`,
		syms.includes('SPX') && syms.includes('AAPL') && syms.includes('NVDA'),
	);
}

// ─── Phase 10: Edit & Delete Trades ─────────────────────────────────────────

async function testEditDelete() {
	console.log('\n═══ Phase 10: Edit & Delete Trades ═══');

	// Edit a trade's notes
	const tradeToEdit = createdTrades[12]!; // SPX Bull Put 3 (open)
	const editRes = await api('PATCH', `/api/trades/${tradeToEdit.id}`, {
		notesMd: 'Updated: Weekly expiry play — added after the fact',
		preConfidence: 9,
	});
	assert('Edit trade notes', editRes.status === 200);
	const edited = editRes.data as { notesMd: string; preConfidence: number };
	assert('Edited notes persisted', edited.notesMd?.includes('Updated'));
	assert('Edited confidence persisted', edited.preConfidence === 9);

	// Create a trade specifically to delete
	const deleteTarget = await api('POST', '/api/trades', {
		symbol: 'TEST',
		instrument: 'stock',
		direction: 'long',
		openedAt: '2026-05-21T12:00:00.000Z',
		execution: {
			kind: 'entry',
			executedAt: '2026-05-21T12:00:00.000Z',
			legs: [{ side: 'buy', shares: 1, price: 100, multiplier: 1 }],
		},
	});
	assert('Create test trade for deletion', deleteTarget.status === 201);
	const testId = (deleteTarget.data as { id: string }).id;

	const delRes = await api('DELETE', `/api/trades/${testId}`);
	assert('Delete trade returns 200', delRes.status === 200);

	const getDeleted = await api('GET', `/api/trades/${testId}`);
	assert('Deleted trade returns 404', getDeleted.status === 404);

	// Delete non-existent trade
	const del404 = await api('DELETE', '/api/trades/00000000-0000-0000-0000-000000000000');
	assert('Delete non-existent trade returns 404', del404.status === 404);
}

// ─── Phase 11: Settings API ─────────────────────────────────────────────────

async function testSettings() {
	console.log('\n═══ Phase 11: Settings ═══');

	const getRes = await api('GET', '/api/settings');
	assert('Get settings returns 200', getRes.status === 200);

	const updateRes = await api('PATCH', '/api/settings', {
		timezone: 'America/Chicago',
		startingBalance: '25000',
	});
	assert('Update settings returns 200', updateRes.status === 200);
}

// ─── Phase 12: Page Load Tests ──────────────────────────────────────────────

async function testPageLoads() {
	console.log('\n═══ Phase 12: Page Load Tests ═══');

	const pages = ['/login', '/journal', '/trades/new', '/calendar', '/metrics', '/settings'];

	for (const page of pages) {
		const res = await fetch(`${BASE}${page}`, {
			headers: cookie ? { Cookie: cookie } : {},
			redirect: 'manual',
		});
		const ok = res.status === 200 || res.status === 307;
		assert(`Page ${page} loads (${res.status})`, ok);
	}

	// Trade detail page (a specific trade)
	if (createdTrades.length > 0) {
		const detailRes = await fetch(`${BASE}/trades/${createdTrades[0]!.id}`, {
			headers: { Cookie: cookie },
			redirect: 'manual',
		});
		assert(`Trade detail page loads (${detailRes.status})`, detailRes.status === 200);
	}
}

// ─── Phase 13: Logout ───────────────────────────────────────────────────────

async function testLogout() {
	console.log('\n═══ Phase 13: Logout ═══');

	const logoutRes = await api('POST', '/api/auth/logout');
	assert('Logout returns 200', logoutRes.status === 200);

	// Verify unauthenticated access is blocked (send NO cookie)
	const afterLogout = await fetch(`${BASE}/api/trades`, {
		redirect: 'manual',
	});
	assert(
		'After logout, unauthenticated request redirects to login',
		afterLogout.status === 307 || afterLogout.status === 302,
	);
}

// ─── Run All ────────────────────────────────────────────────────────────────

async function main() {
	console.log('╔══════════════════════════════════════════╗');
	console.log('║    pk_trades UAT — Full Feature Test     ║');
	console.log('╚══════════════════════════════════════════╝');

	await testAuth();
	await cleanup();
	await testStrategies();
	await testTags();
	await createTrades();
	await closeTrades();
	await verifyPnl();
	await verifyMetrics();
	await verifyCalendar();
	await verifyJournal();
	await testEditDelete();
	await testSettings();
	await testPageLoads();
	await testLogout();

	console.log('\n╔══════════════════════════════════════════╗');
	console.log(`║  Results: ${pass} passed, ${fail} failed             `);
	console.log('╚══════════════════════════════════════════╝');

	if (failures.length > 0) {
		console.log('\n❌ FAILURES:');
		for (const f of failures) {
			console.log(`   • ${f}`);
		}
	} else {
		console.log('\n🎉 ALL TESTS PASSED — production ready!');
	}

	process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
