const fs = require('fs');
const DOLLAR = String.fromCharCode(36); // $
const OPEN_BRACE = String.fromCharCode(123); // {

let c = fs.readFileSync('app/(app)/journal/page.tsx', 'utf8');

// We want to find the pattern: "? '+' : '-'}" followed by "${Math.abs"
// and change it to: "? '+' : '-'}" + "$" + "${Math.abs"
// i.e. insert a literal $ dollar sign before the template expression ${Math.abs

const needle = "? '+' : '-'" + DOLLAR + OPEN_BRACE + 'Math.abs';
const alreadyFixed = "? '+' : '-'" + DOLLAR + DOLLAR + OPEN_BRACE + 'Math.abs';

if (c.includes(alreadyFixed)) {
	console.log('Already fixed, nothing to do');
} else if (c.includes(needle)) {
	// Insert a $ before the existing ${Math.abs
	const pos = c.indexOf(needle) + "? '+' : '-'}".length;
	c = c.slice(0, pos) + DOLLAR + c.slice(pos);
	fs.writeFileSync('app/(app)/journal/page.tsx', c, 'utf8');

	// Verify
	const verifyPos = c.indexOf('Math.abs(trade.realizedPnlUsd)');
	console.log('Fixed! Context:', JSON.stringify(c.slice(verifyPos - 20, verifyPos + 5)));
} else {
	console.log('Needle not found');
	const idx = c.indexOf('Math.abs(trade.realizedPnlUsd)');
	if (idx >= 0) {
		console.log('Math.abs context:', JSON.stringify(c.slice(idx - 20, idx + 5)));
	}
}
