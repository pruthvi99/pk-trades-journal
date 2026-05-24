const fs = require('fs');
let content = fs.readFileSync('app/(app)/journal/page.tsx', 'utf8');

// Fix: "$-142.00" → "-$142.00" for negative P&L
// Old: `${trade.realizedPnlUsd >= 0 ? '+' : ''}$${trade.realizedPnlUsd.toFixed(2)}`
// New: `${trade.realizedPnlUsd >= 0 ? '+' : '-'}$${Math.abs(trade.realizedPnlUsd).toFixed(2)}`

const oldFrag = "realizedPnlUsd >= 0 ? '+' : ''}$${trade.realizedPnlUsd.toFixed(2)}";
const newFrag = "realizedPnlUsd >= 0 ? '+' : '-'}$${Math.abs(trade.realizedPnlUsd).toFixed(2)}";

if (content.includes(oldFrag)) {
	content = content.replace(oldFrag, newFrag);
	fs.writeFileSync('app/(app)/journal/page.tsx', content, 'utf8');
	console.log('✓ Fixed P&L negative formatting');
} else {
	console.log('Fragment not found. Searching...');
	const idx = content.indexOf("realizedPnlUsd >= 0 ? '+' : ''");
	if (idx >= 0) {
		console.log('Found at:', idx);
		console.log('Context:', content.slice(idx - 5, idx + 80));
	} else {
		console.log('Not found at all');
	}
}
