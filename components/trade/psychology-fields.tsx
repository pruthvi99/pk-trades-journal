/**
 * Pre-trade psychology fields for the new trade form.
 * Confidence slider, mood picker, sleep, caffeine, following plan.
 */

'use client';

import { Input } from '@/components/primitives/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/primitives/select';
import { Slider } from '@/components/primitives/slider';
import { Toggle } from '@/components/primitives/toggle';

export interface PrePsychologyData {
	preConfidence?: number;
	preConviction?: string;
	preMood?: string;
	preSleepHours?: number;
	preCaffeine?: boolean;
	preFollowingPlan?: boolean;
}

interface PrePsychologyFieldsProps {
	data: PrePsychologyData;
	onChange: (data: PrePsychologyData) => void;
}

const MOODS = ['calm', 'focused', 'neutral', 'anxious', 'fomo', 'revenge', 'tired'] as const;

/** Pre-trade psychology form fields. */
export function PrePsychologyFields({ data, onChange }: PrePsychologyFieldsProps) {
	const update = (field: string, value: unknown) => {
		onChange({ ...data, [field]: value });
	};

	return (
		<div className="space-y-4">
			<p className="eyebrow">Pre-trade psychology</p>

			{/* Confidence slider */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<label className="text-[13px] text-pk-white-muted">Confidence</label>
					<span className="font-mono tabular-nums text-[13px] text-pk-white">
						{data.preConfidence ?? '—'}
					</span>
				</div>
				<Slider
					min={1}
					max={10}
					step={1}
					value={[data.preConfidence ?? 5]}
					onValueChange={([v]) => update('preConfidence', v)}
				/>
			</div>

			{/* Conviction */}
			<div>
				<label className="text-[11px] text-pk-white-dim mb-1 block">Conviction / thesis</label>
				<Input
					placeholder="Why this trade?"
					value={data.preConviction ?? ''}
					onChange={(e) => update('preConviction', e.target.value || undefined)}
				/>
			</div>

			{/* Mood */}
			<div>
				<label className="text-[11px] text-pk-white-dim mb-1 block">Mood</label>
				<Select value={data.preMood ?? ''} onValueChange={(v) => update('preMood', v || undefined)}>
					<SelectTrigger>
						<SelectValue placeholder="Select mood…" />
					</SelectTrigger>
					<SelectContent>
						{MOODS.map((mood) => (
							<SelectItem key={mood} value={mood}>
								{mood.charAt(0).toUpperCase() + mood.slice(1)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Sleep + Caffeine row */}
			<div className="grid grid-cols-2 gap-3">
				<div>
					<label className="text-[11px] text-pk-white-dim mb-1 block">Sleep (hours)</label>
					<Input
						numeric
						type="number"
						step="0.5"
						min="0"
						max="24"
						placeholder="7"
						value={data.preSleepHours ?? ''}
						onChange={(e) =>
							update('preSleepHours', e.target.value ? Number(e.target.value) : undefined)
						}
					/>
				</div>
				<div className="flex flex-col">
					<label className="text-[11px] text-pk-white-dim mb-1">Caffeine</label>
					<div className="flex items-center gap-2 h-8">
						<Toggle
							checked={data.preCaffeine ?? false}
							onCheckedChange={(v) => update('preCaffeine', v || undefined)}
						/>
						<span className="text-[12px] text-pk-white-dim">{data.preCaffeine ? 'Yes' : 'No'}</span>
					</div>
				</div>
			</div>

			{/* Following plan */}
			<div className="flex items-center gap-3">
				<Toggle
					checked={data.preFollowingPlan ?? false}
					onCheckedChange={(v) => update('preFollowingPlan', v || undefined)}
				/>
				<label className="text-[13px] text-pk-white-muted">Following the plan</label>
			</div>
		</div>
	);
}

// ─── Post-trade and During-trade psychology ─────────────────────────────────

export interface DuringPsychologyData {
	duringStress?: number;
	duringDeviations?: string;
}

interface DuringPsychologyFieldsProps {
	data: DuringPsychologyData;
	onChange: (data: DuringPsychologyData) => void;
}

/** During-trade psychology form fields. */
export function DuringPsychologyFields({ data, onChange }: DuringPsychologyFieldsProps) {
	const update = (field: string, value: unknown) => {
		onChange({ ...data, [field]: value });
	};

	return (
		<div className="space-y-4">
			<p className="eyebrow">During trade</p>
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<label className="text-[13px] text-pk-white-muted">Stress level</label>
					<span className="font-mono tabular-nums text-[13px] text-pk-white">
						{data.duringStress ?? '—'}
					</span>
				</div>
				<Slider
					min={1}
					max={10}
					step={1}
					value={[data.duringStress ?? 5]}
					onValueChange={([v]) => update('duringStress', v)}
				/>
			</div>
			<div>
				<label className="text-[11px] text-pk-white-dim mb-1 block">Deviations from plan</label>
				<Input
					placeholder="Any adjustments or deviations?"
					value={data.duringDeviations ?? ''}
					onChange={(e) => update('duringDeviations', e.target.value || undefined)}
				/>
			</div>
		</div>
	);
}

export interface PostPsychologyData {
	postSatisfaction?: number;
	postMistakes?: string;
	postLessons?: string;
	postMood?: string;
	postWouldRetake?: boolean;
}

interface PostPsychologyFieldsProps {
	data: PostPsychologyData;
	onChange: (data: PostPsychologyData) => void;
}

/** Post-trade psychology form fields. */
export function PostPsychologyFields({ data, onChange }: PostPsychologyFieldsProps) {
	const update = (field: string, value: unknown) => {
		onChange({ ...data, [field]: value });
	};

	return (
		<div className="space-y-4">
			<p className="eyebrow">Post-trade reflection</p>
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<label className="text-[13px] text-pk-white-muted">Satisfaction</label>
					<span className="font-mono tabular-nums text-[13px] text-pk-white">
						{data.postSatisfaction ?? '—'}
					</span>
				</div>
				<Slider
					min={1}
					max={10}
					step={1}
					value={[data.postSatisfaction ?? 5]}
					onValueChange={([v]) => update('postSatisfaction', v)}
				/>
			</div>
			<div>
				<label className="text-[11px] text-pk-white-dim mb-1 block">Mood</label>
				<Select
					value={data.postMood ?? ''}
					onValueChange={(v) => update('postMood', v || undefined)}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select mood…" />
					</SelectTrigger>
					<SelectContent>
						{MOODS.map((mood) => (
							<SelectItem key={mood} value={mood}>
								{mood.charAt(0).toUpperCase() + mood.slice(1)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div>
				<label className="text-[11px] text-pk-white-dim mb-1 block">Mistakes</label>
				<Input
					placeholder="What went wrong?"
					value={data.postMistakes ?? ''}
					onChange={(e) => update('postMistakes', e.target.value || undefined)}
				/>
			</div>
			<div>
				<label className="text-[11px] text-pk-white-dim mb-1 block">Lessons</label>
				<Input
					placeholder="Key takeaway?"
					value={data.postLessons ?? ''}
					onChange={(e) => update('postLessons', e.target.value || undefined)}
				/>
			</div>
			<div className="flex items-center gap-3">
				<Toggle
					checked={data.postWouldRetake ?? false}
					onCheckedChange={(v) => update('postWouldRetake', v || undefined)}
				/>
				<label className="text-[13px] text-pk-white-muted">Would take this trade again</label>
			</div>
		</div>
	);
}
