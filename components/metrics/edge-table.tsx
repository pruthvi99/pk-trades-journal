/**
 * EdgeTable — sortable edge slicing table.
 * Columns: Label, Trades, Win%, Avg R, Expectancy, Total $.
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TableWrapper,
} from '@/components/primitives/table';

interface EdgeRow {
	label: string;
	trades: number;
	winPercent: number;
	avgR: number;
	expectancyUsd: number;
	totalUsd: number;
}

type SortKey = 'label' | 'trades' | 'winPercent' | 'avgR' | 'expectancyUsd' | 'totalUsd';

interface EdgeTableProps {
	rows: EdgeRow[];
	title: string;
}

export function EdgeTable({ rows, title }: EdgeTableProps) {
	const [sortKey, setSortKey] = useState<SortKey>('totalUsd');
	const [sortDesc, setSortDesc] = useState(true);

	const handleSort = useCallback(
		(key: SortKey) => {
			if (key === sortKey) {
				setSortDesc(!sortDesc);
			} else {
				setSortKey(key);
				setSortDesc(true);
			}
		},
		[sortKey, sortDesc],
	);

	const sorted = useMemo(() => {
		return [...rows].sort((a, b) => {
			const aVal = a[sortKey];
			const bVal = b[sortKey];
			if (typeof aVal === 'string' && typeof bVal === 'string') {
				return sortDesc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
			}
			return sortDesc ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
		});
	}, [rows, sortKey, sortDesc]);

	if (rows.length === 0) {
		return null;
	}

	const sortIndicator = (key: SortKey) => {
		if (key !== sortKey) return '';
		return sortDesc ? ' ↓' : ' ↑';
	};

	return (
		<div>
			<p className="eyebrow mb-3">{title}</p>
			<TableWrapper>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								<button
									type="button"
									onClick={() => handleSort('label')}
									className="hover:text-pk-white transition-colors"
								>
									Name{sortIndicator('label')}
								</button>
							</TableHead>
							<TableHead className="text-right">
								<button
									type="button"
									onClick={() => handleSort('trades')}
									className="hover:text-pk-white transition-colors"
								>
									Trades{sortIndicator('trades')}
								</button>
							</TableHead>
							<TableHead className="text-right">
								<button
									type="button"
									onClick={() => handleSort('winPercent')}
									className="hover:text-pk-white transition-colors"
								>
									Win%{sortIndicator('winPercent')}
								</button>
							</TableHead>
							<TableHead className="text-right">
								<button
									type="button"
									onClick={() => handleSort('avgR')}
									className="hover:text-pk-white transition-colors"
								>
									Avg R{sortIndicator('avgR')}
								</button>
							</TableHead>
							<TableHead className="text-right hidden sm:table-cell">
								<button
									type="button"
									onClick={() => handleSort('expectancyUsd')}
									className="hover:text-pk-white transition-colors"
								>
									Exp ${sortIndicator('expectancyUsd')}
								</button>
							</TableHead>
							<TableHead className="text-right">
								<button
									type="button"
									onClick={() => handleSort('totalUsd')}
									className="hover:text-pk-white transition-colors"
								>
									Total ${sortIndicator('totalUsd')}
								</button>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sorted.map((row) => (
							<TableRow key={row.label}>
								<TableCell className="text-pk-white font-medium">{row.label}</TableCell>
								<TableCell className="text-right font-mono tabular-nums">{row.trades}</TableCell>
								<TableCell className="text-right font-mono tabular-nums">
									{row.winPercent.toFixed(1)}%
								</TableCell>
								<TableCell
									className={`text-right font-mono tabular-nums ${
										row.avgR >= 0 ? 'text-pk-white' : 'text-pk-purple'
									}`}
								>
									{row.avgR >= 0 ? '+' : ''}
									{row.avgR.toFixed(2)}R
								</TableCell>
								<TableCell
									className={`text-right font-mono tabular-nums hidden sm:table-cell ${
										row.expectancyUsd >= 0 ? 'text-pk-white' : 'text-pk-purple'
									}`}
								>
									{row.expectancyUsd >= 0 ? '+' : ''}${row.expectancyUsd.toFixed(2)}
								</TableCell>
								<TableCell
									className={`text-right font-mono tabular-nums ${
										row.totalUsd >= 0 ? 'text-pk-white' : 'text-pk-purple'
									}`}
								>
									{row.totalUsd >= 0 ? '+' : ''}${row.totalUsd.toFixed(2)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableWrapper>
		</div>
	);
}
