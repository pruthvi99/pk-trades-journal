/**
 * Design showcase page — displays all primitives for visual QA.
 * Not linked in production nav; accessible at /design.
 */

'use client';

import { useState } from 'react';
import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/primitives/dialog';
import { Input } from '@/components/primitives/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/primitives/select';
import { Slider } from '@/components/primitives/slider';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TableWrapper,
} from '@/components/primitives/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { Toggle } from '@/components/primitives/toggle';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="space-y-4">
			<h2 className="text-[16px] font-medium text-pk-white">{title}</h2>
			<div className="rounded-[8px] border border-pk-border bg-pk-black-raised p-6">{children}</div>
		</section>
	);
}

export default function DesignShowcasePage() {
	const [slider, setSlider] = useState([5]);
	const [toggle, setToggle] = useState(false);

	return (
		<div className="mx-auto max-w-3xl space-y-10 p-8">
			<div>
				<h1 className="text-[28px] font-semibold text-pk-white">Design System</h1>
				<p className="mt-1 text-[14px] text-pk-white-muted">
					pk_trades primitive components — visual QA reference.
				</p>
			</div>

			{/* Typography */}
			<Section title="Typography">
				<div className="space-y-3">
					<p className="text-[40px] font-semibold text-pk-white leading-none">Display 40</p>
					<p className="text-[28px] font-semibold text-pk-white">Heading 28</p>
					<p className="text-[20px] font-semibold text-pk-white">Heading 20</p>
					<p className="text-[16px] font-medium text-pk-white">Title 16</p>
					<p className="text-[14px] text-pk-white">Body 14</p>
					<p className="text-[13px] text-pk-white-muted">Body 13 muted</p>
					<p className="text-[12px] text-pk-white-dim">Caption 12 dim</p>
					<p className="eyebrow">Eyebrow label</p>
					<p className="font-mono tabular-nums text-[14px] text-pk-white">
						$1,234.56 — mono tabular
					</p>
				</div>
			</Section>

			{/* Colors */}
			<Section title="Colors">
				<div className="grid grid-cols-4 gap-3">
					{[
						['bg-pk-black', 'Black'],
						['bg-pk-black-sunken', 'Sunken'],
						['bg-pk-black-raised', 'Raised'],
						['bg-pk-border', 'Border'],
						['bg-pk-border-strong', 'Border Strong'],
						['bg-pk-white', 'White'],
						['bg-pk-purple', 'Purple'],
						['bg-pk-purple-bright', 'Purple Bright'],
						['bg-pk-purple-deep', 'Purple Deep'],
						['bg-pk-purple-faint', 'Purple Faint'],
					].map(([bg, label]) => (
						<div key={bg} className="flex items-center gap-2">
							<div className={`h-8 w-8 rounded-[4px] border border-pk-border ${bg}`} />
							<span className="text-[12px] text-pk-white-dim">{label}</span>
						</div>
					))}
				</div>
			</Section>

			{/* Buttons */}
			<Section title="Buttons">
				<div className="flex flex-wrap items-center gap-3">
					<Button variant="primary">Primary</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="ghost">Ghost</Button>
					<Button variant="danger">Danger</Button>
					<Button variant="primary" size="small">
						Small
					</Button>
					<Button variant="primary" disabled>
						Disabled
					</Button>
				</div>
			</Section>

			{/* Inputs */}
			<Section title="Inputs">
				<div className="space-y-3 max-w-sm">
					<Input placeholder="Text input…" />
					<Input numeric type="number" placeholder="0.00" />
					<Input disabled placeholder="Disabled input" />
				</div>
			</Section>

			{/* Select */}
			<Section title="Select">
				<div className="max-w-sm">
					<Select>
						<SelectTrigger>
							<SelectValue placeholder="Choose strategy…" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="bull-put">Bull Put Spread</SelectItem>
							<SelectItem value="iron-condor">Iron Condor</SelectItem>
							<SelectItem value="scalp">Stock Scalp</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</Section>

			{/* Badges */}
			<Section title="Badges">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="default">Default</Badge>
					<Badge variant="win">Win</Badge>
					<Badge variant="loss">Loss</Badge>
					<Badge variant="open">Open</Badge>
					<Badge variant="muted">Muted</Badge>
				</div>
			</Section>

			{/* Slider */}
			<Section title="Slider">
				<div className="max-w-sm space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-[13px] text-pk-white-muted">Confidence</span>
						<span className="font-mono tabular-nums text-[13px] text-pk-white">{slider[0]}</span>
					</div>
					<Slider min={1} max={10} step={1} value={slider} onValueChange={setSlider} />
				</div>
			</Section>

			{/* Toggle */}
			<Section title="Toggle">
				<div className="flex items-center gap-3">
					<Toggle checked={toggle} onCheckedChange={setToggle} />
					<span className="text-[13px] text-pk-white-muted">{toggle ? 'On' : 'Off'}</span>
				</div>
			</Section>

			{/* Dialog */}
			<Section title="Dialog">
				<Dialog>
					<DialogTrigger asChild>
						<Button variant="secondary">Open Dialog</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Confirm Action</DialogTitle>
							<DialogDescription>
								This is a sample dialog. Press close or click outside to dismiss.
							</DialogDescription>
						</DialogHeader>
						<div className="py-4">
							<Input placeholder="Some input inside dialog…" />
						</div>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="ghost">Cancel</Button>
							</DialogClose>
							<DialogClose asChild>
								<Button variant="primary">Confirm</Button>
							</DialogClose>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</Section>

			{/* Tabs */}
			<Section title="Tabs">
				<Tabs defaultValue="overview">
					<TabsList>
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="executions">Executions</TabsTrigger>
						<TabsTrigger value="notes">Notes</TabsTrigger>
					</TabsList>
					<TabsContent value="overview">
						<p className="text-[13px] text-pk-white-muted">Overview tab content.</p>
					</TabsContent>
					<TabsContent value="executions">
						<p className="text-[13px] text-pk-white-muted">Executions tab content.</p>
					</TabsContent>
					<TabsContent value="notes">
						<p className="text-[13px] text-pk-white-muted">Notes tab content.</p>
					</TabsContent>
				</Tabs>
			</Section>

			{/* Table */}
			<Section title="Table">
				<TableWrapper>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Date</TableHead>
								<TableHead>Symbol</TableHead>
								<TableHead>Strategy</TableHead>
								<TableHead className="text-right">P&amp;L</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<TableRow>
								<TableCell className="font-mono tabular-nums text-pk-white">2025-01-15</TableCell>
								<TableCell className="text-pk-white">SPX</TableCell>
								<TableCell>Bull Put Spread</TableCell>
								<TableCell className="text-right font-mono tabular-nums text-pk-white">
									+$340.00
								</TableCell>
								<TableCell>
									<Badge variant="win">Win</Badge>
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="font-mono tabular-nums text-pk-white">2025-01-16</TableCell>
								<TableCell className="text-pk-white">NVDA</TableCell>
								<TableCell>Stock Scalp</TableCell>
								<TableCell className="text-right font-mono tabular-nums text-pk-purple">
									−$85.50
								</TableCell>
								<TableCell>
									<Badge variant="loss">Loss</Badge>
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="font-mono tabular-nums text-pk-white">2025-01-17</TableCell>
								<TableCell className="text-pk-white">SPX</TableCell>
								<TableCell>Iron Condor</TableCell>
								<TableCell className="text-right font-mono tabular-nums text-pk-white-dim">
									—
								</TableCell>
								<TableCell>
									<Badge variant="open">Open</Badge>
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</TableWrapper>
			</Section>
		</div>
	);
}
