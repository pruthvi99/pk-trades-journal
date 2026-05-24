const fs = require('fs');
const DOLLAR = String.fromCharCode(36);
let c = fs.readFileSync('app/(app)/analytics/page.tsx', 'utf8');

const replacements = [
	// revenge avg pnl
	[
		DOLLAR + DOLLAR + '{behavioral.revengeTradeDetection.revengeAvgPnl} avg P&L',
		'${fmtPnl(behavioral.revengeTradeDetection.revengeAvgPnl)} avg P&L',
	],
	// normal avg pnl
	[
		DOLLAR + DOLLAR + '{behavioral.revengeTradeDetection.normalAvgPnl} avg P&L',
		'${fmtPnl(behavioral.revengeTradeDetection.normalAvgPnl)} avg P&L',
	],
	// followed avg pnl
	[
		DOLLAR + DOLLAR + '{behavioral.planDeviationImpact.followedAvgPnl} avg',
		'${fmtPnl(behavioral.planDeviationImpact.followedAvgPnl)} avg',
	],
	// deviated avg pnl
	[
		DOLLAR + DOLLAR + '{behavioral.planDeviationImpact.deviatedAvgPnl} avg',
		'${fmtPnl(behavioral.planDeviationImpact.deviatedAvgPnl)} avg',
	],
	// high volume avg pnl
	[
		DOLLAR + DOLLAR + '{behavioral.overtradingDetection.highVolumeAvgPnl} avg P&L',
		'${fmtPnl(behavioral.overtradingDetection.highVolumeAvgPnl)} avg P&L',
	],
	// low volume avg pnl
	[
		DOLLAR + DOLLAR + '{behavioral.overtradingDetection.lowVolumeAvgPnl} avg P&L',
		'${fmtPnl(behavioral.overtradingDetection.lowVolumeAvgPnl)} avg P&L',
	],
];

let count = 0;
for (const [search, replace] of replacements) {
	if (c.includes(search)) {
		c = c.replace(search, () => replace);
		count++;
		console.log('Replaced:', JSON.stringify(search.slice(0, 40)));
	} else {
		console.log('NOT FOUND:', JSON.stringify(search.slice(0, 40)));
	}
}

fs.writeFileSync('app/(app)/analytics/page.tsx', c, 'utf8');
console.log(`Done — ${count} replacements made`);
