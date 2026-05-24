const fs = require('fs');
const DOLLAR = String.fromCharCode(36); // $

let c = fs.readFileSync('app/(app)/journal/page.tsx', 'utf8');

// In JS .replace(), $$ in replacement means "insert one $" — special handling.
// Use function form to insert LITERAL replacement without any special $ processing.

// Current broken line has: "'-'}" + "$" + "{Math.abs"   (one dollar — starts template expr)
// Fixed line should have:  "'-'}" + "$" + "$" + "{Math.abs"  (literal $ + template expr start)

const searchFor = "? '+' : '-'}" + DOLLAR + '{Math.abs';
const replaceWith = "? '+' : '-'}" + DOLLAR + DOLLAR + '{Math.abs';

console.log('Search:', JSON.stringify(searchFor));
console.log('Replace:', JSON.stringify(replaceWith));

if (c.includes(searchFor)) {
	// Use function form so replacement $ chars aren't treated as special
	c = c.replace(searchFor, () => replaceWith);
	fs.writeFileSync('app/(app)/journal/page.tsx', c, 'utf8');

	// Verify
	const idx = c.indexOf('Math.abs(trade.realizedPnlUsd)');
	const seg = c.slice(idx - 25, idx + 5);
	console.log('After fix:', JSON.stringify(seg));
	const codes = [...seg].map((ch) => ch.charCodeAt(0));
	console.log('Char codes:', codes);
} else {
	const idx = c.indexOf('Math.abs(trade.realizedPnlUsd)');
	const seg = c.slice(idx - 25, idx + 5);
	console.log('Not found. Current context:', JSON.stringify(seg));
	console.log(
		'Char codes:',
		[...seg].map((ch) => ch.charCodeAt(0)),
	);
}
