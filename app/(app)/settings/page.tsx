/**
 * Settings page — timezone, balance, commissions, strategy & tag management.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/primitives/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TableWrapper,
} from '@/components/primitives/table';

interface Strategy {
	id: string;
	name: string;
	description: string | null;
	defaultInstrument: string | null;
	archived: boolean;
}

interface Tag {
	id: string;
	label: string;
	category: string;
	archived: boolean;
}

type SettingsMap = Record<string, string>;

export default function SettingsPage() {
	// General settings
	const [settingsMap, setSettingsMap] = useState<SettingsMap>({});
	const [settingsLoading, setSettingsLoading] = useState(true);
	const [settingsSaving, setSettingsSaving] = useState(false);
	const [settingsMsg, setSettingsMsg] = useState('');

	// Strategies
	const [strategies, setStrategies] = useState<Strategy[]>([]);
	const [newStratName, setNewStratName] = useState('');
	const [newStratDesc, setNewStratDesc] = useState('');
	const [newStratInstrument, setNewStratInstrument] = useState('');
	const [stratSaving, setStratSaving] = useState(false);

	// Tags
	const [tags, setTags] = useState<Tag[]>([]);
	const [newTagLabel, setNewTagLabel] = useState('');
	const [newTagCategory, setNewTagCategory] = useState('custom');
	const [tagSaving, setTagSaving] = useState(false);

	// Load settings
	useEffect(() => {
		fetch('/api/settings')
			.then((r) => r.json())
			.then((data) => {
				setSettingsMap(data as SettingsMap);
				setSettingsLoading(false);
			});
	}, []);

	// Load strategies
	const fetchStrategies = useCallback(() => {
		fetch('/api/strategies?archived=true')
			.then((r) => r.json())
			.then((data) => setStrategies(data as Strategy[]));
	}, []);

	// Load tags
	const fetchTags = useCallback(() => {
		fetch('/api/tags?archived=true')
			.then((r) => r.json())
			.then((data) => setTags(data as Tag[]));
	}, []);

	useEffect(() => {
		fetchStrategies();
		fetchTags();
	}, [fetchStrategies, fetchTags]);

	// Save settings
	const saveSettings = async () => {
		setSettingsSaving(true);
		setSettingsMsg('');
		const res = await fetch('/api/settings', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(settingsMap),
		});
		if (res.ok) {
			const data = (await res.json()) as SettingsMap;
			setSettingsMap(data);
			setSettingsMsg('Saved');
			setTimeout(() => setSettingsMsg(''), 2000);
		}
		setSettingsSaving(false);
	};

	// Create strategy
	const createStrategy = async () => {
		if (!newStratName.trim()) return;
		setStratSaving(true);
		const res = await fetch('/api/strategies', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: newStratName.trim(),
				description: newStratDesc.trim() || undefined,
				defaultInstrument: newStratInstrument || undefined,
			}),
		});
		if (res.ok) {
			setNewStratName('');
			setNewStratDesc('');
			setNewStratInstrument('');
			fetchStrategies();
		}
		setStratSaving(false);
	};

	// Toggle strategy archive
	const toggleStrategyArchive = async (id: string, currentlyArchived: boolean) => {
		await fetch(`/api/strategies/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ archived: !currentlyArchived }),
		});
		fetchStrategies();
	};

	// Create tag
	const createTag = async () => {
		if (!newTagLabel.trim()) return;
		setTagSaving(true);
		const res = await fetch('/api/tags', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				label: newTagLabel.trim(),
				category: newTagCategory,
			}),
		});
		if (res.ok) {
			setNewTagLabel('');
			setNewTagCategory('custom');
			fetchTags();
		}
		setTagSaving(false);
	};

	// Toggle tag archive
	const toggleTagArchive = async (id: string, currentlyArchived: boolean) => {
		await fetch(`/api/tags/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ archived: !currentlyArchived }),
		});
		fetchTags();
	};

	const updateSetting = (key: string, value: string) => {
		setSettingsMap((prev) => ({ ...prev, [key]: value }));
	};

	return (
		<div className="mx-auto max-w-2xl space-y-10 pb-12">
			{/* Header */}
			<div>
				<p className="eyebrow">settings</p>
				<h1 className="text-[20px] font-medium text-pk-white mt-1">Settings</h1>
			</div>

			{/* General Settings */}
			<section className="space-y-4">
				<p className="eyebrow">General</p>
				{settingsLoading ? (
					<p className="text-[13px] text-pk-white-dim">Loading…</p>
				) : (
					<>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
									Timezone
								</label>
								<Select
									value={settingsMap.timezone ?? 'America/Chicago'}
									onValueChange={(v) => updateSetting('timezone', v)}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="America/Chicago">America/Chicago (CT)</SelectItem>
										<SelectItem value="America/New_York">America/New_York (ET)</SelectItem>
										<SelectItem value="America/Los_Angeles">America/Los_Angeles (PT)</SelectItem>
										<SelectItem value="America/Denver">America/Denver (MT)</SelectItem>
										<SelectItem value="UTC">UTC</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
									Starting balance ($)
								</label>
								<Input
									numeric
									type="number"
									step="100"
									value={settingsMap.startingBalance ?? '25000'}
									onChange={(e) => updateSetting('startingBalance', e.target.value)}
								/>
							</div>
							<div>
								<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
									Commission / contract ($)
								</label>
								<Input
									numeric
									type="number"
									step="0.01"
									value={settingsMap.commissionPerContract ?? '0.65'}
									onChange={(e) => updateSetting('commissionPerContract', e.target.value)}
								/>
							</div>
							<div>
								<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
									Commission / share ($)
								</label>
								<Input
									numeric
									type="number"
									step="0.001"
									value={settingsMap.commissionPerShare ?? '0.005'}
									onChange={(e) => updateSetting('commissionPerShare', e.target.value)}
								/>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<Button
								variant="primary"
								size="small"
								onClick={saveSettings}
								disabled={settingsSaving}
							>
								{settingsSaving ? 'Saving…' : 'Save settings'}
							</Button>
							{settingsMsg && (
								<span className="text-[12px] text-pk-purple-bright">{settingsMsg}</span>
							)}
						</div>
					</>
				)}
			</section>

			{/* Strategies */}
			<section className="space-y-4">
				<p className="eyebrow">Strategies</p>
				<div className="flex flex-wrap gap-2 items-end">
					<div className="flex-1 min-w-[140px]">
						<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
							Name
						</label>
						<Input
							placeholder="e.g. Bull Put Spread"
							value={newStratName}
							onChange={(e) => setNewStratName(e.target.value)}
						/>
					</div>
					<div className="flex-1 min-w-[140px]">
						<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
							Description
						</label>
						<Input
							placeholder="Optional"
							value={newStratDesc}
							onChange={(e) => setNewStratDesc(e.target.value)}
						/>
					</div>
					<div className="w-32">
						<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
							Instrument
						</label>
						<Select value={newStratInstrument} onValueChange={setNewStratInstrument}>
							<SelectTrigger>
								<SelectValue placeholder="Any" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="any">Any</SelectItem>
								<SelectItem value="option">Spread</SelectItem>
								<SelectItem value="stock">Stock</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<Button variant="primary" size="small" onClick={createStrategy} disabled={stratSaving}>
						Add
					</Button>
				</div>

				{strategies.length > 0 && (
					<TableWrapper>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead className="hidden sm:table-cell">Description</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{strategies.map((s) => (
									<TableRow key={s.id}>
										<TableCell className="text-pk-white font-medium">{s.name}</TableCell>
										<TableCell className="hidden sm:table-cell text-pk-white-dim">
											{s.description || '—'}
										</TableCell>
										<TableCell>
											<Badge variant={s.archived ? 'muted' : 'open'}>
												{s.archived ? 'Archived' : 'Active'}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											<button
												type="button"
												onClick={() => toggleStrategyArchive(s.id, s.archived)}
												className="text-[12px] text-pk-white-dim hover:text-pk-purple-bright transition-colors"
											>
												{s.archived ? 'Restore' : 'Archive'}
											</button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableWrapper>
				)}
			</section>

			{/* Tags */}
			<section className="space-y-4">
				<p className="eyebrow">Tags</p>
				<div className="flex flex-wrap gap-2 items-end">
					<div className="flex-1 min-w-[140px]">
						<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
							Label
						</label>
						<Input
							placeholder="e.g. earnings play"
							value={newTagLabel}
							onChange={(e) => setNewTagLabel(e.target.value)}
						/>
					</div>
					<div className="w-36">
						<label className="text-[13px] sm:text-[13px] sm:text-[11px] text-pk-white-dim mb-1 block">
							Category
						</label>
						<Select value={newTagCategory} onValueChange={setNewTagCategory}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="setup">Setup</SelectItem>
								<SelectItem value="market_condition">Market</SelectItem>
								<SelectItem value="mistake">Mistake</SelectItem>
								<SelectItem value="custom">Custom</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<Button variant="primary" size="small" onClick={createTag} disabled={tagSaving}>
						Add
					</Button>
				</div>

				{tags.length > 0 && (
					<TableWrapper>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Label</TableHead>
									<TableHead>Category</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{tags.map((t) => (
									<TableRow key={t.id}>
										<TableCell className="text-pk-white font-medium">{t.label}</TableCell>
										<TableCell className="text-pk-white-dim capitalize">{t.category}</TableCell>
										<TableCell>
											<Badge variant={t.archived ? 'muted' : 'open'}>
												{t.archived ? 'Archived' : 'Active'}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											<button
												type="button"
												onClick={() => toggleTagArchive(t.id, t.archived)}
												className="text-[12px] text-pk-white-dim hover:text-pk-purple-bright transition-colors"
											>
												{t.archived ? 'Restore' : 'Archive'}
											</button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableWrapper>
				)}
			</section>

			{/* Danger Zone */}
			<section className="space-y-4">
				<p className="eyebrow text-pk-purple">Danger zone</p>
				<div className="rounded-[6px] border border-pk-border bg-pk-black-raised p-4 space-y-3">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-[13px] text-pk-white">Export database</p>
							<p className="text-[13px] sm:text-[11px] text-pk-white-dim">
								Download the SQLite database file.
							</p>
						</div>
						<Button
							variant="ghost"
							size="small"
							onClick={() => {
								window.location.href = '/api/admin/db/snapshot';
							}}
						>
							Export .db
						</Button>
					</div>
				</div>
			</section>
		</div>
	);
}
