const fs = require('fs');
const DOLLAR = String.fromCharCode(36);
const filePath = 'app/(app)/trades/[id]/page.tsx';
let c = fs.readFileSync(filePath, 'utf8');

// Fix 1: pnlDisplay negative formatting
// Old: `${trade.realizedPnlUsd >= 0 ? '+' : ''}$${trade.realizedPnlUsd.toFixed(2)}`
// New: `${trade.realizedPnlUsd >= 0 ? '+' : '-'}$${Math.abs(trade.realizedPnlUsd).toFixed(2)}`
const old1 = "? '+' : ''}" + DOLLAR + DOLLAR + '{trade.realizedPnlUsd.toFixed(2)}';
const new1 = "? '+' : '-'}" + DOLLAR + DOLLAR + '{Math.abs(trade.realizedPnlUsd).toFixed(2)}';

if (c.includes(old1)) {
	c = c.replace(old1, () => new1);
	console.log('Fixed pnlDisplay');
} else {
	// Check what's actually there
	const idx = c.indexOf('realizedPnlUsd.toFixed');
	if (idx >= 0)
		console.log('realizedPnlUsd.toFixed context:', JSON.stringify(c.slice(idx - 30, idx + 40)));
}

// Fix 2: isWin should not count open trades as wins/losses
// Old: const isWin = (trade.realizedPnlUsd ?? 0) > 0;
// New: const isOpen = trade.status === 'open'; const isWin = !isOpen && (trade.realizedPnlUsd ?? 0) > 0;
const old2 = 'const isWin = (trade.realizedPnlUsd ?? 0) > 0;';
const new2 =
	"const isOpen = trade.status === 'open';\n\tconst isWin = !isOpen && (trade.realizedPnlUsd ?? 0) > 0;";
if (c.includes(old2)) {
	c = c.replace(old2, () => new2);
	console.log('Fixed isWin to account for open trades');
}

fs.writeFileSync(filePath, c, 'utf8');
console.log('Done');

// Verify
const c2 = fs.readFileSync(filePath, 'utf8');
const idx = c2.indexOf('Math.abs(trade.realizedPnlUsd)');
if (idx >= 0) console.log('Verification:', JSON.stringify(c2.slice(idx - 30, idx + 40)));
