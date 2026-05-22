const http = require('http');
const fs = require('fs');

const cookieFile = fs.readFileSync('C:/Users/pruthvi/AppData/Local/Temp/local_uat.txt', 'utf8');
const cookieMatch = cookieFile.match(/pk_session\s+(\S+)/);
const cookie = cookieMatch ? `pk_session=${cookieMatch[1]}` : '';

const S_IC = 'a63c8ab0-c26a-4a53-9870-31a362f77fc1';
const S_BPS = 'd81679c5-5df4-4cdf-b7be-430e5a58d261';
const S_MOM = '98c039c3-4ee9-4306-a2d8-0e38cd559dc3';
const S_MR = 'b35ebc34-672a-4308-a7be-1aaca0223f9f';
const T_BRK = '236ca428-1c67-4580-88c2-79dc0fab48c0';
const T_SUP = 'a039dbb1-df5b-4e36-bb98-1924c98b149c';
const T_FOMO = '0b0ca08f-1557-448a-a14a-fe6cfcab387e';
const T_OVER = '0f4f97de-21dc-492f-a6ee-5fa9f0f0f811';
const T_TRD = '596aac79-bd92-4b64-9a8e-efa4f6362b24';
const T_ERN = 'cc52bc87-2b27-49e6-a75f-d5bc48c59611';
const T_HIV = '8ed28c45-f262-4625-b242-08a492d0f4b8';
const T_EXP = 'aaf6cc0f-da2d-4264-ba39-ee9a4122f46a';
const T_REV = '7ca94854-06b4-4117-9690-1751d74b9171';

function post(path, body) {
	return new Promise((resolve, reject) => {
		const data = JSON.stringify(body);
		const req = http.request(
			{
				hostname: 'localhost',
				port: 9999,
				path,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(data),
					Cookie: cookie,
				},
			},
			(res) => {
				let d = '';
				res.on('data', (c) => (d += c));
				res.on('end', () => resolve(JSON.parse(d)));
			},
		);
		req.on('error', reject);
		req.write(data);
		req.end();
	});
}

function patch(path, body) {
	return new Promise((resolve, reject) => {
		const data = JSON.stringify(body);
		const req = http.request(
			{
				hostname: 'localhost',
				port: 9999,
				path,
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(data),
					Cookie: cookie,
				},
			},
			(res) => {
				let d = '';
				res.on('data', (c) => (d += c));
				res.on('end', () => resolve(JSON.parse(d)));
			},
		);
		req.on('error', reject);
		req.write(data);
		req.end();
	});
}

function get(path) {
	return new Promise((resolve, reject) => {
		http
			.get({ hostname: 'localhost', port: 9999, path, headers: { Cookie: cookie } }, (res) => {
				let d = '';
				res.on('data', (c) => (d += c));
				res.on('end', () => resolve(JSON.parse(d)));
			})
			.on('error', reject);
	});
}

// ── Trade definitions ─────────────────────────────────────────────────────────
// Expected P&L annotated for manual verification
const trades = [
	// T1 NVDA long stock: (912-875)*20 - 2 fees = 738. R = 738/500 = 1.48
	{
		sym: 'NVDA',
		inst: 'stock',
		dir: 'long',
		strat: S_MOM,
		quality: 'A+',
		basis: 'rules',
		pEntry: 875,
		pStop: 850,
		pTarget: 920,
		pRisk: 500,
		tags: [T_BRK, T_TRD],
		mood: 'focused',
		sleep: 8,
		conf: 8,
		caffeine: true,
		followPlan: true,
		openedAt: '2026-01-06T09:35:00.000Z',
		closedAt: '2026-01-08T14:15:00.000Z',
		entryLegs: [{ side: 'buy', shares: 20, price: 875, multiplier: 1 }],
		entryFees: 1,
		exitLegs: [{ side: 'sell', shares: 20, price: 912, multiplier: 1 }],
		exitFees: 1,
		expectedPnl: 738,
		expectedR: 1.48,
		postSat: 9,
		postMood: 'focused',
		postLessons: 'Held to target, clean breakout.',
		retake: true,
		notes: 'NVDA breakout above $870 resistance on heavy volume.',
	},

	// T2 SPY long stock: (480-471)*50 - 2 = 448. R = 448/250 = 1.79
	{
		sym: 'SPY',
		inst: 'stock',
		dir: 'long',
		strat: S_MR,
		quality: 'A',
		basis: 'rules',
		pEntry: 471,
		pStop: 466,
		pTarget: 481,
		pRisk: 250,
		tags: [T_SUP],
		mood: 'calm',
		sleep: 7.5,
		conf: 7,
		caffeine: false,
		followPlan: true,
		openedAt: '2026-01-12T10:00:00.000Z',
		closedAt: '2026-01-14T15:30:00.000Z',
		entryLegs: [{ side: 'buy', shares: 50, price: 471, multiplier: 1 }],
		entryFees: 1,
		exitLegs: [{ side: 'sell', shares: 50, price: 480, multiplier: 1 }],
		exitFees: 1,
		expectedPnl: 448,
		expectedR: 1.79,
		postSat: 8,
		postMood: 'calm',
		postLessons: 'Support hold was clean.',
		retake: true,
		notes: 'SPY bounce off 50-day MA support.',
	},

	// T3 SPX BPS option_spread: entry=(2.80-1.20)*2*100=320, exit=(0.40-0.10)*2*100=60(cost), pnl=320-60-5.2=254.80. R=254.80/200=1.27
	{
		sym: 'SPX',
		inst: 'option_spread',
		dir: 'neutral',
		strat: S_BPS,
		quality: 'A++',
		basis: 'rules',
		pEntry: 2.8,
		pStop: 5.0,
		pTarget: 0.1,
		pRisk: 200,
		tags: [T_HIV],
		mood: 'focused',
		sleep: 8,
		conf: 9,
		caffeine: true,
		followPlan: true,
		openedAt: '2026-01-20T09:45:00.000Z',
		closedAt: '2026-01-28T14:00:00.000Z',
		entryLegs: [
			{
				side: 'sell',
				optionType: 'put',
				strike: 4750,
				expiration: '2026-02-21',
				contracts: 2,
				price: 2.8,
				multiplier: 100,
			},
			{
				side: 'buy',
				optionType: 'put',
				strike: 4700,
				expiration: '2026-02-21',
				contracts: 2,
				price: 1.2,
				multiplier: 100,
			},
		],
		entryFees: 2.6,
		exitLegs: [
			{
				side: 'buy',
				optionType: 'put',
				strike: 4750,
				expiration: '2026-02-21',
				contracts: 2,
				price: 0.4,
				multiplier: 100,
			},
			{
				side: 'sell',
				optionType: 'put',
				strike: 4700,
				expiration: '2026-02-21',
				contracts: 2,
				price: 0.1,
				multiplier: 100,
			},
		],
		exitFees: 2.6,
		expectedPnl: 254.8,
		expectedR: 1.27,
		postSat: 10,
		postMood: 'focused',
		postLessons: 'Perfect theta decay.',
		retake: true,
		notes: 'High IV environment, SPX above key support.',
	},

	// T4 AAPL long stock: (191-182)*30 - 2 = 268. R = 268/150 = 1.79
	{
		sym: 'AAPL',
		inst: 'stock',
		dir: 'long',
		strat: S_MOM,
		quality: 'A',
		basis: 'rules',
		pEntry: 182,
		pStop: 177,
		pTarget: 192,
		pRisk: 150,
		tags: [T_TRD],
		mood: 'calm',
		sleep: 7,
		conf: 7,
		caffeine: false,
		followPlan: true,
		openedAt: '2026-02-03T10:15:00.000Z',
		closedAt: '2026-02-05T11:00:00.000Z',
		entryLegs: [{ side: 'buy', shares: 30, price: 182, multiplier: 1 }],
		entryFees: 1,
		exitLegs: [{ side: 'sell', shares: 30, price: 191, multiplier: 1 }],
		exitFees: 1,
		expectedPnl: 268,
		expectedR: 1.79,
		postSat: 8,
		postMood: 'calm',
		postLessons: 'Held to target, no second-guessing.',
		retake: true,
		notes: 'AAPL trending day. Clean setup above VWAP.',
	},

	// T5 MSFT long stock: (408-395)*15 - 2 = 193. R = 193/150 = 1.29
	{
		sym: 'MSFT',
		inst: 'stock',
		dir: 'long',
		strat: S_MOM,
		quality: 'A+',
		basis: 'rules',
		pEntry: 395,
		pStop: 385,
		pTarget: 410,
		pRisk: 150,
		tags: [T_BRK],
		mood: 'focused',
		sleep: 7.5,
		conf: 8,
		caffeine: true,
		followPlan: true,
		openedAt: '2026-02-10T09:30:00.000Z',
		closedAt: '2026-02-11T15:00:00.000Z',
		entryLegs: [{ side: 'buy', shares: 15, price: 395, multiplier: 1 }],
		entryFees: 1,
		exitLegs: [{ side: 'sell', shares: 15, price: 408, multiplier: 1 }],
		exitFees: 1,
		expectedPnl: 193,
		expectedR: 1.29,
		postSat: 8,
		postMood: 'focused',
		postLessons: 'Good trade. Could have held longer.',
		retake: true,
		notes: 'MSFT breakout above consolidation zone.',
	},

	// T6 QQQ IC option_spread:
	// entry: sell(1.80+1.90)*100=370, buy(0.70+0.80)*100=150 => net recv=220
	// exit: buy(0.20+0.30)*100=50, sell(0.05+0.10)*100=15 => net pay=35
	// pnl = 220 - 35 - 2.60 = 182.40. R = 182.40/180 = 1.01
	{
		sym: 'QQQ',
		inst: 'option_spread',
		dir: 'neutral',
		strat: S_IC,
		quality: 'A',
		basis: 'rules',
		pEntry: 3.2,
		pStop: 6.0,
		pTarget: 0.1,
		pRisk: 180,
		tags: [T_HIV, T_EXP],
		mood: 'calm',
		sleep: 8,
		conf: 8,
		caffeine: false,
		followPlan: true,
		openedAt: '2026-02-17T10:00:00.000Z',
		closedAt: '2026-02-25T14:30:00.000Z',
		entryLegs: [
			{
				side: 'sell',
				optionType: 'call',
				strike: 430,
				expiration: '2026-03-21',
				contracts: 1,
				price: 1.8,
				multiplier: 100,
			},
			{
				side: 'buy',
				optionType: 'call',
				strike: 435,
				expiration: '2026-03-21',
				contracts: 1,
				price: 0.7,
				multiplier: 100,
			},
			{
				side: 'sell',
				optionType: 'put',
				strike: 410,
				expiration: '2026-03-21',
				contracts: 1,
				price: 1.9,
				multiplier: 100,
			},
			{
				side: 'buy',
				optionType: 'put',
				strike: 405,
				expiration: '2026-03-21',
				contracts: 1,
				price: 0.8,
				multiplier: 100,
			},
		],
		entryFees: 1.3,
		exitLegs: [
			{
				side: 'buy',
				optionType: 'call',
				strike: 430,
				expiration: '2026-03-21',
				contracts: 1,
				price: 0.2,
				multiplier: 100,
			},
			{
				side: 'sell',
				optionType: 'call',
				strike: 435,
				expiration: '2026-03-21',
				contracts: 1,
				price: 0.05,
				multiplier: 100,
			},
			{
				side: 'buy',
				optionType: 'put',
				strike: 410,
				expiration: '2026-03-21',
				contracts: 1,
				price: 0.3,
				multiplier: 100,
			},
			{
				side: 'sell',
				optionType: 'put',
				strike: 405,
				expiration: '2026-03-21',
				contracts: 1,
				price: 0.1,
				multiplier: 100,
			},
		],
		exitFees: 1.3,
		expectedPnl: 182.4,
		expectedR: 1.01,
		postSat: 8,
		postMood: 'calm',
		postLessons: 'IC worked well. Range stayed contained.',
		retake: true,
		notes: 'Low-vol environment, QQQ range-bound.',
	},

	// T7 META long stock: (540-520)*10 - 2 = 198. R = 198/100 = 1.98
	{
		sym: 'META',
		inst: 'stock',
		dir: 'long',
		strat: S_MOM,
		quality: 'A+',
		basis: 'rules',
		pEntry: 520,
		pStop: 510,
		pTarget: 542,
		pRisk: 100,
		tags: [T_BRK, T_TRD],
		mood: 'focused',
		sleep: 8,
		conf: 9,
		caffeine: true,
		followPlan: true,
		openedAt: '2026-03-02T09:45:00.000Z',
		closedAt: '2026-03-04T11:30:00.000Z',
		entryLegs: [{ side: 'buy', shares: 10, price: 520, multiplier: 1 }],
		entryFees: 1,
		exitLegs: [{ side: 'sell', shares: 10, price: 540, multiplier: 1 }],
		exitFees: 1,
		expectedPnl: 198,
		expectedR: 1.98,
		postSat: 9,
		postMood: 'focused',
		postLessons: 'Excellent momentum trade.',
		retake: true,
		notes: 'META breakout after earnings momentum continuation.',
	},

	// T8 TSLA long stock LOSER: (235-248)*20 - 2 = -262. R = -262/200 = -1.31
	{
		sym: 'TSLA',
		inst: 'stock',
		dir: 'long',
		strat: S_MOM,
		quality: 'B',
		basis: 'intuition',
		pEntry: 248,
		pStop: 238,
		pTarget: 265,
		pRisk: 200,
		tags: [T_FOMO],
		mood: 'fomo',
		sleep: 5.5,
		conf: 5,
		caffeine: true,
		followPlan: false,
		openedAt: '2026-01-27T13:45:00.000Z',
		closedAt: '2026-01-28T10:30:00.000Z',
		entryLegs: [{ side: 'buy', shares: 20, price: 248, multiplier: 1 }],
		entryFees: 1,
		exitLegs: [{ side: 'sell', shares: 20, price: 235, multiplier: 1 }],
		exitFees: 1,
		expectedPnl: -262,
		expectedR: -1.31,
		postSat: 2,
		postMood: 'anxious',
		postMistakes: 'Chased a breakout with no volume.',
		postLessons: 'Only enter with confirmation.',
		retake: false,
		notes: 'FOMO entry on TSLA spike. No real setup.',
	},

	// T9 AMD long stock LOSER: (152-160)*25 - 2 = -202. R = -202/125 = -1.62
	{
		sym: 'AMD',
		inst: 'stock',
		dir: 'long',
		strat: S_MOM,
		quality: 'B',
		basis: 'rules',
		pEntry: 160,
		pStop: 155,
		pTarget: 172,
		pRisk: 125,
		tags: [T_OVER],
		mood: 'tired',
		sleep: 5,
		conf: 4,
		caffeine: true,
		followPlan: false,
		openedAt: '2026-02-04T14:00:00.000Z',
		closedAt: '2026-02-05T09:35:00.000Z',
		entryLegs: [{ side: 'buy', shares: 25, price: 160, multiplier: 1 }],
		entryFees: 1,
		exitLegs: [{ side: 'sell', shares: 25, price: 152, multiplier: 1 }],
		exitFees: 1,
		expectedPnl: -202,
		expectedR: -1.62,
		postSat: 3,
		postMood: 'anxious',
		postMistakes: 'Entered too late while tired.',
		postLessons: 'No trades after 2pm when fatigued.',
		retake: false,
		notes: 'Tired entry, no follow-through.',
	},

	// T10 SPX BPS LOSER: entry=(1.50-0.60)*2*100=180, exit=(3.20-1.10)*2*100=420, pnl=180-420-5.2=-245.20. R=-245.20/300=-0.82
	{
		sym: 'SPX',
		inst: 'option_spread',
		dir: 'neutral',
		strat: S_BPS,
		quality: 'B+',
		basis: 'rules',
		pEntry: 1.5,
		pStop: 3.0,
		pTarget: 0.1,
		pRisk: 300,
		tags: [T_HIV],
		mood: 'neutral',
		sleep: 7,
		conf: 6,
		caffeine: false,
		followPlan: true,
		openedAt: '2026-02-12T10:30:00.000Z',
		closedAt: '2026-02-13T11:00:00.000Z',
		entryLegs: [
			{
				side: 'sell',
				optionType: 'put',
				strike: 4500,
				expiration: '2026-03-21',
				contracts: 2,
				price: 1.5,
				multiplier: 100,
			},
			{
				side: 'buy',
				optionType: 'put',
				strike: 4490,
				expiration: '2026-03-21',
				contracts: 2,
				price: 0.6,
				multiplier: 100,
			},
		],
		entryFees: 2.6,
		exitLegs: [
			{
				side: 'buy',
				optionType: 'put',
				strike: 4500,
				expiration: '2026-03-21',
				contracts: 2,
				price: 3.2,
				multiplier: 100,
			},
			{
				side: 'sell',
				optionType: 'put',
				strike: 4490,
				expiration: '2026-03-21',
				contracts: 2,
				price: 1.1,
				multiplier: 100,
			},
		],
		exitFees: 2.6,
		expectedPnl: -245.2,
		expectedR: -0.82,
		postSat: 4,
		postMood: 'anxious',
		postMistakes: 'Sold too close to money.',
		postLessons: 'Wider strikes on uncertain days.',
		retake: false,
		notes: 'SPX gap down through strike.',
	},

	// T11 GOOGL short stock LOSER: sell 20@155, buy 20@162, pnl=(155-162)*20-2=-142. R=-142/100=-1.42
	{
		sym: 'GOOGL',
		inst: 'stock',
		dir: 'short',
		strat: S_MR,
		quality: 'B',
		basis: 'intuition',
		pEntry: 155,
		pStop: 160,
		pTarget: 145,
		pRisk: 100,
		tags: [T_REV],
		mood: 'revenge',
		sleep: 6,
		conf: 4,
		caffeine: true,
		followPlan: false,
		openedAt: '2026-02-18T11:00:00.000Z',
		closedAt: '2026-02-19T09:45:00.000Z',
		entryLegs: [{ side: 'sell', shares: 20, price: 155, multiplier: 1 }],
		entryFees: 1,
		exitLegs: [{ side: 'buy', shares: 20, price: 162, multiplier: 1 }],
		exitFees: 1,
		expectedPnl: -142,
		expectedR: -1.42,
		postSat: 2,
		postMood: 'anxious',
		postMistakes: 'Revenge trade after AMD loss.',
		postLessons: 'Never trade to recover losses.',
		retake: false,
		notes: 'Revenge short. Market was actually trending up.',
	},

	// T12 SPY long BREAKEVEN: (475.10-475)*20 - 2 = 0. R = 0/80 = 0
	{
		sym: 'SPY',
		inst: 'stock',
		dir: 'long',
		strat: S_MR,
		quality: 'A',
		basis: 'rules',
		pEntry: 475,
		pStop: 471,
		pTarget: 483,
		pRisk: 80,
		mood: 'neutral',
		sleep: 7,
		conf: 6,
		caffeine: false,
		followPlan: true,
		openedAt: '2026-03-09T10:00:00.000Z',
		closedAt: '2026-03-09T15:45:00.000Z',
		entryLegs: [{ side: 'buy', shares: 20, price: 475, multiplier: 1 }],
		entryFees: 1,
		exitLegs: [{ side: 'sell', shares: 20, price: 475.1, multiplier: 1 }],
		exitFees: 1,
		expectedPnl: 0,
		expectedR: 0,
		postSat: 5,
		postMood: 'neutral',
		postLessons: 'Scratch trade. Setup never confirmed.',
		retake: false,
		notes: 'Trade never developed. Scratched at breakeven.',
	},

	// T13 AMZN long stock: (205-192)*8 - 2 = 102. R = 102/80 = 1.28
	{
		sym: 'AMZN',
		inst: 'stock',
		dir: 'long',
		strat: S_MOM,
		quality: 'A',
		basis: 'rules',
		pEntry: 192,
		pStop: 182,
		pTarget: 206,
		pRisk: 80,
		tags: [T_TRD],
		mood: 'calm',
		sleep: 8,
		conf: 7,
		caffeine: false,
		followPlan: true,
		openedAt: '2026-03-16T09:30:00.000Z',
		closedAt: '2026-03-18T14:00:00.000Z',
		entryLegs: [{ side: 'buy', shares: 8, price: 192, multiplier: 1 }],
		entryFees: 1,
		exitLegs: [{ side: 'sell', shares: 8, price: 205, multiplier: 1 }],
		exitFees: 1,
		expectedPnl: 102,
		expectedR: 1.28,
		postSat: 8,
		postMood: 'calm',
		postLessons: 'Good R:R, patient entry.',
		retake: true,
		notes: 'AMZN trend continuation. Patient entry on pullback.',
	},

	// T14 SPX BPS: entry=(2.20-0.90)*3*100=390, exit=(0.30-0.10)*3*100=60, pnl=390-60-7.80=322.20. R=322.20/300=1.07
	{
		sym: 'SPX',
		inst: 'option_spread',
		dir: 'neutral',
		strat: S_BPS,
		quality: 'A++',
		basis: 'rules',
		pEntry: 2.2,
		pStop: 4.0,
		pTarget: 0.1,
		pRisk: 300,
		tags: [T_HIV, T_EXP],
		mood: 'focused',
		sleep: 8,
		conf: 9,
		caffeine: true,
		followPlan: true,
		openedAt: '2026-03-23T09:45:00.000Z',
		closedAt: '2026-04-01T14:00:00.000Z',
		entryLegs: [
			{
				side: 'sell',
				optionType: 'put',
				strike: 5000,
				expiration: '2026-04-18',
				contracts: 3,
				price: 2.2,
				multiplier: 100,
			},
			{
				side: 'buy',
				optionType: 'put',
				strike: 4990,
				expiration: '2026-04-18',
				contracts: 3,
				price: 0.9,
				multiplier: 100,
			},
		],
		entryFees: 3.9,
		exitLegs: [
			{
				side: 'buy',
				optionType: 'put',
				strike: 5000,
				expiration: '2026-04-18',
				contracts: 3,
				price: 0.3,
				multiplier: 100,
			},
			{
				side: 'sell',
				optionType: 'put',
				strike: 4990,
				expiration: '2026-04-18',
				contracts: 3,
				price: 0.1,
				multiplier: 100,
			},
		],
		exitFees: 3.9,
		expectedPnl: 322.2,
		expectedR: 1.07,
		postSat: 9,
		postMood: 'focused',
		postLessons: 'Textbook BPS. High IV, strong support.',
		retake: true,
		notes: 'Excellent setup. SPX above 5000 support, IV rank high.',
	},

	// T15 NVDA long stock: (855-820)*10 - 2 = 348. R = 348/200 = 1.74
	{
		sym: 'NVDA',
		inst: 'stock',
		dir: 'long',
		strat: S_MOM,
		quality: 'A+',
		basis: 'rules',
		pEntry: 820,
		pStop: 800,
		pTarget: 858,
		pRisk: 200,
		tags: [T_BRK, T_TRD],
		mood: 'focused',
		sleep: 7.5,
		conf: 8,
		caffeine: true,
		followPlan: true,
		openedAt: '2026-04-07T09:30:00.000Z',
		closedAt: '2026-04-09T11:00:00.000Z',
		entryLegs: [{ side: 'buy', shares: 10, price: 820, multiplier: 1 }],
		entryFees: 1,
		exitLegs: [{ side: 'sell', shares: 10, price: 855, multiplier: 1 }],
		exitFees: 1,
		expectedPnl: 348,
		expectedR: 1.74,
		postSat: 9,
		postMood: 'focused',
		postLessons: 'NVDA AI momentum still strong.',
		retake: true,
		notes: 'NVDA breakout above key level on AI catalyst.',
	},

	// T16 TSLA bear call spread: entry=(1.80-0.60)*2*100=240, exit=(0.20-0.05)*2*100=30, pnl=240-30-5.20=204.80. R=204.80/160=1.28
	{
		sym: 'TSLA',
		inst: 'option_spread',
		dir: 'neutral',
		strat: S_IC,
		quality: 'A',
		basis: 'rules',
		pEntry: 1.8,
		pStop: 3.5,
		pTarget: 0.1,
		pRisk: 160,
		tags: [T_HIV],
		mood: 'calm',
		sleep: 8,
		conf: 8,
		caffeine: false,
		followPlan: true,
		openedAt: '2026-04-14T10:00:00.000Z',
		closedAt: '2026-04-22T14:00:00.000Z',
		entryLegs: [
			{
				side: 'sell',
				optionType: 'call',
				strike: 260,
				expiration: '2026-05-16',
				contracts: 2,
				price: 1.8,
				multiplier: 100,
			},
			{
				side: 'buy',
				optionType: 'call',
				strike: 265,
				expiration: '2026-05-16',
				contracts: 2,
				price: 0.6,
				multiplier: 100,
			},
		],
		entryFees: 2.6,
		exitLegs: [
			{
				side: 'buy',
				optionType: 'call',
				strike: 260,
				expiration: '2026-05-16',
				contracts: 2,
				price: 0.2,
				multiplier: 100,
			},
			{
				side: 'sell',
				optionType: 'call',
				strike: 265,
				expiration: '2026-05-16',
				contracts: 2,
				price: 0.05,
				multiplier: 100,
			},
		],
		exitFees: 2.6,
		expectedPnl: 204.8,
		expectedR: 1.28,
		postSat: 8,
		postMood: 'calm',
		postLessons: 'Bear call above resistance worked.',
		retake: true,
		notes: 'TSLA rejected at resistance. Sold bear call spread.',
	},

	// T17 AAPL short stock: sell 25@195, buy 25@188, pnl=(195-188)*25-2=173. R=173/125=1.38
	{
		sym: 'AAPL',
		inst: 'stock',
		dir: 'short',
		strat: S_MR,
		quality: 'A',
		basis: 'rules',
		pEntry: 195,
		pStop: 200,
		pTarget: 186,
		pRisk: 125,
		tags: [T_SUP],
		mood: 'calm',
		sleep: 7,
		conf: 7,
		caffeine: false,
		followPlan: true,
		openedAt: '2026-04-28T10:15:00.000Z',
		closedAt: '2026-04-30T09:30:00.000Z',
		entryLegs: [{ side: 'sell', shares: 25, price: 195, multiplier: 1 }],
		entryFees: 1,
		exitLegs: [{ side: 'buy', shares: 25, price: 188, multiplier: 1 }],
		exitFees: 1,
		expectedPnl: 173,
		expectedR: 1.38,
		postSat: 8,
		postMood: 'calm',
		postLessons: 'Short at resistance, clean fade.',
		retake: true,
		notes: 'AAPL extended at resistance, overdue for pullback.',
	},

	// T18 META long stock OPEN (no exit)
	{
		sym: 'META',
		inst: 'stock',
		dir: 'long',
		strat: S_MOM,
		quality: 'B+',
		basis: 'rules',
		pEntry: 580,
		pStop: 568,
		pTarget: 605,
		pRisk: 240,
		tags: [T_BRK],
		mood: 'focused',
		sleep: 7,
		conf: 7,
		caffeine: true,
		followPlan: true,
		openedAt: '2026-05-19T10:00:00.000Z',
		entryLegs: [{ side: 'buy', shares: 20, price: 581, multiplier: 1 }],
		entryFees: 0.5,
		notes: 'META pullback to 50-day. Still holding.',
	},
];

function buildLegs(legsArr, inst) {
	return legsArr.map((l) => ({
		side: l.side,
		price: l.price,
		...(inst === 'stock'
			? { shares: l.shares || 1, multiplier: 1 }
			: {
					optionType: l.optionType,
					strike: l.strike,
					expiration: l.expiration,
					contracts: l.contracts,
					multiplier: 100,
				}),
	}));
}

async function run() {
	let created = 0;
	const results = [];

	for (const t of trades) {
		const payload = {
			symbol: t.sym,
			instrument: t.inst,
			direction: t.dir,
			strategyId: t.strat,
			tradeQuality: t.quality,
			tradeBasis: t.basis,
			plannedEntry: t.pEntry,
			plannedStop: t.pStop,
			plannedTarget: t.pTarget,
			plannedRiskUsd: t.pRisk,
			openedAt: t.openedAt,
			notesMd: t.notes || undefined,
			tagIds: t.tags || undefined,
			preConfidence: t.conf,
			preMood: t.mood,
			preSleepHours: t.sleep,
			preCaffeine: t.caffeine,
			preFollowingPlan: t.followPlan,
			execution: {
				kind: 'entry',
				executedAt: t.openedAt,
				feesUsd: t.entryFees || 0.5,
				legs: buildLegs(t.entryLegs, t.inst),
			},
		};

		let trade = await post('/api/trades', payload);
		if (!trade.id) {
			console.error('FAILED create', t.sym, JSON.stringify(trade).slice(0, 200));
			continue;
		}

		if (t.exitLegs) {
			await post('/api/executions', {
				tradeId: trade.id,
				kind: 'exit',
				executedAt: t.closedAt,
				feesUsd: t.exitFees || 0.5,
				legs: buildLegs(t.exitLegs, t.inst),
			});
			await patch(`/api/trades/${trade.id}`, {
				status: 'closed',
				closedAt: t.closedAt,
				postSatisfaction: t.postSat,
				postMood: t.postMood,
				postMistakes: t.postMistakes,
				postLessons: t.postLessons,
				postWouldRetake: t.retake,
			});
		}

		trade = await get(`/api/trades/${trade.id}`);
		const pnl = trade.realizedPnlUsd;
		const r = trade.realizedPnlR;
		const pnlStr = pnl != null ? (pnl >= 0 ? '+' : '') + pnl.toFixed(2) : 'open';
		const rStr = r != null ? (r >= 0 ? '+' : '') + r.toFixed(2) : '—';

		let check = '';
		if (t.expectedPnl != null && pnl != null) {
			const diff = Math.abs(pnl - t.expectedPnl);
			check = diff < 0.05 ? ' ✓' : ` ✗ EXPECTED ${t.expectedPnl}`;
		}

		console.log(
			`${(t.sym).padEnd(5)} ${(trade.status).padEnd(6)} pnl=${pnlStr.padStart(9)} R=${rStr.padStart(6)}${check}`,
		);
		results.push({ sym: t.sym, status: trade.status, pnl, r, expected: t.expectedPnl });
		created++;
	}

	console.log(`\nCreated ${created}/${trades.length} trades`);
	return results;
}

run().catch(console.error);
