const fs = require('fs');
const DOLLAR = String.fromCharCode(36); // $

let c = fs.readFileSync('app/(app)/journal/page.tsx', 'utf8');

// Current in file: "? '+' : '-'}${Math.abs(...).toFixed(2)}"
// DOLLAR + "{Math.abs" means "$" + "{Math.abs" — the "${" starts a template expression
// We want to insert a LITERAL dollar sign BEFORE that "${", so it becomes:
// "? '+' : '-'}" + "$" + "${Math.abs(...).toFixed(2)}"
//                  ^^^  literal dollar sign for currency

// The closing '}' of the ternary ternary, followed by "${Math.abs"
const before = "? '+' : '-'}" + DOLLAR + '{Math.abs';
const after = "? '+' : '-'}" + DOLLAR + DOLLAR + '{Math.abs';

console.log('Looking for:', JSON.stringify(before));
const idx = c.indexOf(before);
if (idx >= 0) {
	console.log('Found at index', idx);
	c = c.replace(before, after);
	fs.writeFileSync('app/(app)/journal/page.tsx', c, 'utf8');
	const verifyIdx = c.indexOf('Math.abs(trade.realizedPnlUsd)');
	console.log('After fix context:', JSON.stringify(c.slice(verifyIdx - 25, verifyIdx + 5)));
} else {
	// Show what's actually there
	const idx2 = c.indexOf('Math.abs(trade.realizedPnlUsd)');
	if (idx2 >= 0) {
		console.log('Math.abs context (raw char codes):');
		const seg = c.slice(idx2 - 20, idx2 + 5);
		console.log('String:', JSON.stringify(seg));
		console.log(
			'Char codes:',
			[...seg].map((ch) => ch.charCodeAt(0)),
		);
	}
}
