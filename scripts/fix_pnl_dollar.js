const fs = require('fs');
let content = fs.readFileSync('app/(app)/journal/page.tsx', 'utf8');

// Current (broken): `${...'+' : '-'}${Math.abs(...)...}`
// Should be:        `${...'+' : '-'}$${Math.abs(...)...}`
// Need to insert a literal $ between '}' and '${Math.abs'

const broken = "? '+' : '-'}${Math.abs(trade.realizedPnlUsd).toFixed(2)}`";
const fixed = "? '+' : '-'}$${Math.abs(trade.realizedPnlUsd).toFixed(2)}`";

if (content.includes(broken)) {
	content = content.replace(broken, fixed);
	fs.writeFileSync('app/(app)/journal/page.tsx', content, 'utf8');
	console.log('Fixed: added literal $ before ${Math.abs(...)');
} else {
	console.log('Pattern not found');
	// Debug: show relevant section
	const idx = content.indexOf('Math.abs(trade.realizedPnlUsd)');
	if (idx > 0) console.log('Context:', JSON.stringify(content.slice(idx - 40, idx + 50)));
}
