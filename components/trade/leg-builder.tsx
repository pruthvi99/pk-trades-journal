/**
 * Leg builder component — add/remove legs for option spreads.
 * For stock trades, renders a simplified single-leg view.
 */

'use client';

import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/primitives/select';

export interface LegData {
	side: 'buy' | 'sell';
	optionType?: 'call' | 'put';
	strike?: number;
	expiration?: string;
	contracts?: number;
	shares?: number;
	price: number;
	multiplier: number;
}

interface LegBuilderProps {
	instrument: 'option_spread' | 'stock';
	legs: LegData[];
	onChange: (legs: LegData[]) => void;
}

function emptyOptionLeg(): LegData {
	return { side: 'sell', optionType: 'put', price: 0, multiplier: 100 };
}

function emptyStockLeg(): LegData {
	return { side: 'buy', price: 0, multiplier: 1 };
}

/** Leg builder for option spreads and stock trades. */
export function LegBuilder({ instrument, legs, onChange }: LegBuilderProps) {
	const updateLeg = (index: number, field: string, value: unknown) => {
		const updated = legs.map((leg, i) => (i === index ? { ...leg, [field]: value } : leg));
		onChange(updated);
	};

	const addLeg = () => {
		onChange([...legs, instrument === 'option_spread' ? emptyOptionLeg() : emptyStockLeg()]);
	};

	const removeLeg = (index: number) => {
		onChange(legs.filter((_, i) => i !== index));
	};

	if (instrument === 'stock') {
		const leg = legs[0] ?? emptyStockLeg();
		return (
			<div className="space-y-3">
				<p className="eyebrow">Stock execution</p>
				<div className="grid grid-cols-3 gap-3">
					<div>
						<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">Side</label>
						<Select
							value={leg.side}
							onValueChange={(v) => onChange([{ ...leg, side: v as 'buy' | 'sell' }])}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="buy">Buy</SelectItem>
								<SelectItem value="sell">Sell</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
							Shares
						</label>
						<Input
							numeric
							type="number"
							placeholder="100"
							value={leg.shares ?? ''}
							onChange={(e) =>
								updateLeg(0, 'shares', e.target.value ? Number(e.target.value) : undefined)
							}
						/>
					</div>
					<div>
						<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">Price</label>
						<Input
							numeric
							type="number"
							step="0.01"
							placeholder="0.00"
							value={leg.price || ''}
							onChange={(e) => updateLeg(0, 'price', Number(e.target.value))}
						/>
					</div>
				</div>
			</div>
		);
	}

	// Option spread
	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<p className="eyebrow">Legs</p>
				<Button variant="ghost" size="small" type="button" onClick={addLeg}>
					+ Add leg
				</Button>
			</div>
			{legs.map((leg, i) => (
				<div
					key={`leg-${i}`}
					className="rounded-[6px] border border-pk-border bg-pk-black-sunken p-3 space-y-3"
				>
					<div className="flex items-center justify-between">
						<span className="text-[14px] sm:text-[12px] text-pk-white-dim">Leg {i + 1}</span>
						{legs.length > 1 && (
							<Button variant="ghost" size="small" type="button" onClick={() => removeLeg(i)}>
								Remove
							</Button>
						)}
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
						<div>
							<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
								Side
							</label>
							<Select value={leg.side} onValueChange={(v) => updateLeg(i, 'side', v)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="buy">Buy</SelectItem>
									<SelectItem value="sell">Sell</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
								Type
							</label>
							<Select
								value={leg.optionType ?? 'put'}
								onValueChange={(v) => updateLeg(i, 'optionType', v)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="call">Call</SelectItem>
									<SelectItem value="put">Put</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
								Strike
							</label>
							<Input
								numeric
								type="number"
								step="0.5"
								placeholder="0.00"
								value={leg.strike ?? ''}
								onChange={(e) =>
									updateLeg(i, 'strike', e.target.value ? Number(e.target.value) : undefined)
								}
							/>
						</div>
						<div>
							<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
								Expiration
							</label>
							<Input
								type="date"
								value={leg.expiration ?? ''}
								onChange={(e) => updateLeg(i, 'expiration', e.target.value || undefined)}
							/>
						</div>
						<div>
							<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
								Contracts
							</label>
							<Input
								numeric
								type="number"
								placeholder="1"
								value={leg.contracts ?? ''}
								onChange={(e) =>
									updateLeg(i, 'contracts', e.target.value ? Number(e.target.value) : undefined)
								}
							/>
						</div>
						<div>
							<label className="text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
								Price
							</label>
							<Input
								numeric
								type="number"
								step="0.01"
								placeholder="0.00"
								value={leg.price || ''}
								onChange={(e) => updateLeg(i, 'price', Number(e.target.value))}
							/>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
