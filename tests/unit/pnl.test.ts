import { describe, expect, it } from 'vitest';
import {
	computeRealizedPnl,
	computeRMultiple,
	computeTotalFees,
	executionCashFlow,
	type PnlExecution,
} from '@/lib/pnl';

describe('executionCashFlow', () => {
	it('sell leg produces positive cash flow', () => {
		const exec: PnlExecution = {
			kind: 'entry',
			feesUsd: 0,
			legs: [{ side: 'sell', price: 1.5, quantity: 10, multiplier: 100 }],
		};
		expect(executionCashFlow(exec)).toBe(1500);
	});

	it('buy leg produces negative cash flow', () => {
		const exec: PnlExecution = {
			kind: 'entry',
			feesUsd: 0,
			legs: [{ side: 'buy', price: 2.0, quantity: 5, multiplier: 100 }],
		};
		expect(executionCashFlow(exec)).toBe(-1000);
	});

	it('handles multi-leg spread', () => {
		// Bull put spread: sell higher strike put, buy lower strike put
		const exec: PnlExecution = {
			kind: 'entry',
			feesUsd: 0,
			legs: [
				{ side: 'sell', price: 3.0, quantity: 10, multiplier: 100 },
				{ side: 'buy', price: 1.5, quantity: 10, multiplier: 100 },
			],
		};
		// Net credit = (3.0 * 10 * 100) - (1.5 * 10 * 100) = 3000 - 1500 = 1500
		expect(executionCashFlow(exec)).toBe(1500);
	});
});

describe('computeRealizedPnl', () => {
	it('returns 0 for no executions', () => {
		expect(computeRealizedPnl([])).toBe(0);
	});

	// ─── Bull put spread (credit spread, winning) ──────────────
	it('bull put spread — full win (expires worthless)', () => {
		const executions: PnlExecution[] = [
			{
				kind: 'entry',
				feesUsd: 1.3, // 2 legs * $0.65
				legs: [
					{ side: 'sell', price: 3.0, quantity: 1, multiplier: 100 }, // sell 430P
					{ side: 'buy', price: 1.5, quantity: 1, multiplier: 100 }, // buy 425P
				],
			},
			{
				kind: 'exit',
				feesUsd: 1.3,
				legs: [
					{ side: 'buy', price: 0.05, quantity: 1, multiplier: 100 }, // buy back 430P
					{ side: 'sell', price: 0.02, quantity: 1, multiplier: 100 }, // sell 425P
				],
			},
		];
		// Entry credit: (3.0 - 1.5) * 100 = $150
		// Exit debit: (0.05 - 0.02) * 100 = $3
		// P&L = $150 - $3 - $2.60 fees = $144.40
		expect(computeRealizedPnl(executions)).toBe(144.4);
	});

	it('bull put spread — loss (breached)', () => {
		const executions: PnlExecution[] = [
			{
				kind: 'entry',
				feesUsd: 1.3,
				legs: [
					{ side: 'sell', price: 3.0, quantity: 1, multiplier: 100 },
					{ side: 'buy', price: 1.5, quantity: 1, multiplier: 100 },
				],
			},
			{
				kind: 'exit',
				feesUsd: 1.3,
				legs: [
					{ side: 'buy', price: 4.8, quantity: 1, multiplier: 100 }, // buy back at loss
					{ side: 'sell', price: 0.3, quantity: 1, multiplier: 100 },
				],
			},
		];
		// Entry credit: (3.0 - 1.5) * 100 = $150
		// Exit debit: (4.8 - 0.3) * 100 = $450
		// P&L = $150 - $450 - $2.60 = -$302.60
		expect(computeRealizedPnl(executions)).toBe(-302.6);
	});

	// ─── Bear call spread (credit spread) ──────────────────────
	it('bear call spread — winning', () => {
		const executions: PnlExecution[] = [
			{
				kind: 'entry',
				feesUsd: 1.3,
				legs: [
					{ side: 'sell', price: 2.0, quantity: 2, multiplier: 100 }, // sell 440C
					{ side: 'buy', price: 0.8, quantity: 2, multiplier: 100 }, // buy 445C
				],
			},
			{
				kind: 'exit',
				feesUsd: 1.3,
				legs: [
					{ side: 'buy', price: 0.1, quantity: 2, multiplier: 100 },
					{ side: 'sell', price: 0.02, quantity: 2, multiplier: 100 },
				],
			},
		];
		// Entry credit: (2.0 - 0.8) * 2 * 100 = $240
		// Exit debit: (0.1 - 0.02) * 2 * 100 = $16
		// P&L = $240 - $16 - $2.60 = $221.40
		expect(computeRealizedPnl(executions)).toBe(221.4);
	});

	// ─── Iron condor (4 legs) ──────────────────────────────────
	it('iron condor — full win', () => {
		const executions: PnlExecution[] = [
			{
				kind: 'entry',
				feesUsd: 2.6, // 4 legs
				legs: [
					// Put side (bull put)
					{ side: 'sell', price: 2.0, quantity: 1, multiplier: 100 },
					{ side: 'buy', price: 1.0, quantity: 1, multiplier: 100 },
					// Call side (bear call)
					{ side: 'sell', price: 2.0, quantity: 1, multiplier: 100 },
					{ side: 'buy', price: 1.0, quantity: 1, multiplier: 100 },
				],
			},
			{
				kind: 'exit',
				feesUsd: 2.6,
				legs: [
					{ side: 'buy', price: 0.05, quantity: 1, multiplier: 100 },
					{ side: 'sell', price: 0.01, quantity: 1, multiplier: 100 },
					{ side: 'buy', price: 0.05, quantity: 1, multiplier: 100 },
					{ side: 'sell', price: 0.01, quantity: 1, multiplier: 100 },
				],
			},
		];
		// Entry credit: (2+2-1-1) * 100 = $200
		// Exit debit: (0.05+0.05-0.01-0.01) * 100 = $8
		// P&L = $200 - $8 - $5.20 = $186.80
		expect(computeRealizedPnl(executions)).toBe(186.8);
	});

	// ─── Debit spread ──────────────────────────────────────────
	it('debit spread — winning', () => {
		const executions: PnlExecution[] = [
			{
				kind: 'entry',
				feesUsd: 1.3,
				legs: [
					{ side: 'buy', price: 5.0, quantity: 1, multiplier: 100 }, // buy 440C
					{ side: 'sell', price: 2.0, quantity: 1, multiplier: 100 }, // sell 445C
				],
			},
			{
				kind: 'exit',
				feesUsd: 1.3,
				legs: [
					{ side: 'sell', price: 4.5, quantity: 1, multiplier: 100 },
					{ side: 'buy', price: 0.5, quantity: 1, multiplier: 100 },
				],
			},
		];
		// Entry debit: (5.0 - 2.0) * 100 = $300 (negative cash flow)
		// Exit credit: (4.5 - 0.5) * 100 = $400 (positive cash flow)
		// P&L = -$300 + $400 - $2.60 = $97.40
		expect(computeRealizedPnl(executions)).toBe(97.4);
	});

	// ─── Stock scalp ───────────────────────────────────────────
	it('stock scalp — long, winning', () => {
		const executions: PnlExecution[] = [
			{
				kind: 'entry',
				feesUsd: 0,
				legs: [{ side: 'buy', price: 150.0, quantity: 100, multiplier: 1 }],
			},
			{
				kind: 'exit',
				feesUsd: 0,
				legs: [{ side: 'sell', price: 151.5, quantity: 100, multiplier: 1 }],
			},
		];
		// P&L = (151.5 - 150.0) * 100 = $150.00
		expect(computeRealizedPnl(executions)).toBe(150);
	});

	it('stock scalp — short, winning', () => {
		const executions: PnlExecution[] = [
			{
				kind: 'entry',
				feesUsd: 0,
				legs: [{ side: 'sell', price: 200.0, quantity: 50, multiplier: 1 }],
			},
			{
				kind: 'exit',
				feesUsd: 0,
				legs: [{ side: 'buy', price: 198.0, quantity: 50, multiplier: 1 }],
			},
		];
		// P&L = (200.0 - 198.0) * 50 = $100.00
		expect(computeRealizedPnl(executions)).toBe(100);
	});

	it('stock scalp — long, losing', () => {
		const executions: PnlExecution[] = [
			{
				kind: 'entry',
				feesUsd: 0,
				legs: [{ side: 'buy', price: 150.0, quantity: 100, multiplier: 1 }],
			},
			{
				kind: 'exit',
				feesUsd: 0,
				legs: [{ side: 'sell', price: 148.5, quantity: 100, multiplier: 1 }],
			},
		];
		expect(computeRealizedPnl(executions)).toBe(-150);
	});

	// ─── Pyramiding (multiple entries) ─────────────────────────
	it('pyramiding — two entries, one exit', () => {
		const executions: PnlExecution[] = [
			{
				kind: 'entry',
				feesUsd: 0,
				legs: [{ side: 'buy', price: 100.0, quantity: 50, multiplier: 1 }],
			},
			{
				kind: 'entry',
				feesUsd: 0,
				legs: [{ side: 'buy', price: 102.0, quantity: 50, multiplier: 1 }],
			},
			{
				kind: 'exit',
				feesUsd: 0,
				legs: [{ side: 'sell', price: 105.0, quantity: 100, multiplier: 1 }],
			},
		];
		// Total cost: 50*100 + 50*102 = $5000 + $5100 = $10100
		// Exit: 100 * 105 = $10500
		// P&L = $10500 - $10100 = $400
		expect(computeRealizedPnl(executions)).toBe(400);
	});

	// ─── Partial exits (scaling out) ───────────────────────────
	it('partial exits — two scale-outs', () => {
		const executions: PnlExecution[] = [
			{
				kind: 'entry',
				feesUsd: 0,
				legs: [{ side: 'buy', price: 100.0, quantity: 100, multiplier: 1 }],
			},
			{
				kind: 'exit',
				feesUsd: 0,
				legs: [{ side: 'sell', price: 103.0, quantity: 50, multiplier: 1 }],
			},
			{
				kind: 'exit',
				feesUsd: 0,
				legs: [{ side: 'sell', price: 106.0, quantity: 50, multiplier: 1 }],
			},
		];
		// Total cost: 100 * 100 = $10000
		// Exit 1: 50 * 103 = $5150
		// Exit 2: 50 * 106 = $5300
		// P&L = $5150 + $5300 - $10000 = $450
		expect(computeRealizedPnl(executions)).toBe(450);
	});

	// ─── Fee handling ──────────────────────────────────────────
	it('handles execution-level fees', () => {
		const executions: PnlExecution[] = [
			{
				kind: 'entry',
				feesUsd: 5.0,
				legs: [{ side: 'buy', price: 100.0, quantity: 100, multiplier: 1 }],
			},
			{
				kind: 'exit',
				feesUsd: 5.0,
				legs: [{ side: 'sell', price: 102.0, quantity: 100, multiplier: 1 }],
			},
		];
		// P&L = (102 - 100) * 100 - 10 fees = $200 - $10 = $190
		expect(computeRealizedPnl(executions)).toBe(190);
	});

	it('handles trade-level fees', () => {
		const executions: PnlExecution[] = [
			{
				kind: 'entry',
				feesUsd: 0,
				legs: [{ side: 'buy', price: 100.0, quantity: 100, multiplier: 1 }],
			},
			{
				kind: 'exit',
				feesUsd: 0,
				legs: [{ side: 'sell', price: 102.0, quantity: 100, multiplier: 1 }],
			},
		];
		expect(computeRealizedPnl(executions, 3.5)).toBe(196.5);
	});

	it('handles combined execution and trade-level fees', () => {
		const executions: PnlExecution[] = [
			{
				kind: 'entry',
				feesUsd: 1.3,
				legs: [
					{ side: 'sell', price: 2.0, quantity: 1, multiplier: 100 },
					{ side: 'buy', price: 1.0, quantity: 1, multiplier: 100 },
				],
			},
			{
				kind: 'exit',
				feesUsd: 1.3,
				legs: [
					{ side: 'buy', price: 0.05, quantity: 1, multiplier: 100 },
					{ side: 'sell', price: 0.01, quantity: 1, multiplier: 100 },
				],
			},
		];
		// Cash flow: entry $100, exit -$4 = $96
		// Fees: 1.3 + 1.3 + 2.0 trade-level = $4.60
		// P&L = $96 - $4.60 = $91.40
		expect(computeRealizedPnl(executions, 2.0)).toBe(91.4);
	});

	// ─── Rounding ──────────────────────────────────────────────
	it('rounds to 2 decimal places', () => {
		const executions: PnlExecution[] = [
			{
				kind: 'entry',
				feesUsd: 0.65,
				legs: [{ side: 'sell', price: 1.33, quantity: 1, multiplier: 100 }],
			},
			{
				kind: 'exit',
				feesUsd: 0.65,
				legs: [{ side: 'buy', price: 0.77, quantity: 1, multiplier: 100 }],
			},
		];
		// Cash flow: 133 - 77 = 56
		// Fees: 1.30
		// P&L = 54.70
		const result = computeRealizedPnl(executions);
		expect(result).toBe(54.7);
		expect(result.toString()).not.toContain('e'); // no scientific notation
	});
});

describe('computeRMultiple', () => {
	it('returns null when planned risk is null', () => {
		expect(computeRMultiple(100, null)).toBeNull();
	});

	it('returns null when planned risk is undefined', () => {
		expect(computeRMultiple(100, undefined)).toBeNull();
	});

	it('returns null when planned risk is zero', () => {
		expect(computeRMultiple(100, 0)).toBeNull();
	});

	it('computes positive R for a win', () => {
		expect(computeRMultiple(300, 150)).toBe(2);
	});

	it('computes negative R for a loss', () => {
		expect(computeRMultiple(-150, 150)).toBe(-1);
	});

	it('computes fractional R', () => {
		expect(computeRMultiple(75, 150)).toBe(0.5);
	});

	it('computes R greater than planned loss', () => {
		// Lost more than planned risk
		expect(computeRMultiple(-300, 150)).toBe(-2);
	});
});

describe('computeTotalFees', () => {
	it('returns 0 for no executions', () => {
		expect(computeTotalFees([])).toBe(0);
	});

	it('sums execution fees', () => {
		const executions: PnlExecution[] = [
			{ kind: 'entry', feesUsd: 1.3, legs: [] },
			{ kind: 'exit', feesUsd: 1.3, legs: [] },
		];
		expect(computeTotalFees(executions)).toBe(2.6);
	});

	it('adds trade-level fees', () => {
		const executions: PnlExecution[] = [{ kind: 'entry', feesUsd: 1.3, legs: [] }];
		expect(computeTotalFees(executions, 5.0)).toBe(6.3);
	});
});
