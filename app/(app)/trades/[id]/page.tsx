/**
 * Trade detail page — server component that fetches trade data,
 * renders header, execution timeline, screenshots, tags, notes, psychology.
 */

import { notFound } from 'next/navigation';
import { Badge } from '@/components/primitives/badge';
import { getTrade } from '@/lib/db/queries';
import { TradeDetailClient } from './client';

export default async function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const trade = getTrade(id);

	if (!trade) notFound();

	const pnlDisplay =
		trade.realizedPnlUsd != null
			? `${trade.realizedPnlUsd >= 0 ? '+' : '-'}$${Math.abs(trade.realizedPnlUsd).toFixed(2)}`
			: '—';

	const rDisplay =
		trade.realizedPnlR != null
			? `${trade.realizedPnlR >= 0 ? '+' : ''}${trade.realizedPnlR.toFixed(2)}R`
			: '';

	const isOpen = trade.status === 'open';
	const isWin = !isOpen && (trade.realizedPnlUsd ?? 0) > 0;
	const statusVariant =
		trade.status === 'open' ? 'open' : isWin ? 'win' : trade.status === 'closed' ? 'loss' : 'muted';

	return (
		<div className="mx-auto max-w-3xl space-y-8">
			{/* Header */}
			<div className="space-y-2">
				<div className="flex items-center gap-3">
					<h1 className="text-[28px] font-semibold text-pk-white">{trade.symbol}</h1>
					<Badge variant={statusVariant}>
						{trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
					</Badge>
				</div>
				<div className="flex items-center gap-4 text-[13px]">
					{trade.strategy && <span className="text-pk-white-muted">{trade.strategy.name}</span>}
					<span className="text-pk-white-dim">{trade.direction}</span>
					<span className="text-pk-white-dim">{new Date(trade.openedAt).toLocaleDateString()}</span>
				</div>
				<div className="flex items-baseline gap-3">
					<span
						className={`text-[20px] font-semibold font-mono tabular-nums ${
							isWin ? 'text-pk-white' : 'text-pk-purple'
						}`}
					>
						{pnlDisplay}
					</span>
					{rDisplay && (
						<span className="text-[14px] font-mono tabular-nums text-pk-white-muted">
							{rDisplay}
						</span>
					)}
				</div>
			</div>

			{/* Client-side interactive sections */}
			<TradeDetailClient trade={trade} />
		</div>
	);
}
