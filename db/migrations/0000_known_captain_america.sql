CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text,
	`action` text NOT NULL,
	`diff_json` text,
	`occurred_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `strategies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`default_instrument` text,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `strategies_name_unique` ON `strategies` (`name`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`category` text NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_label_unique` ON `tags` (`label`);--> statement-breakpoint
CREATE TABLE `trade_execution_legs` (
	`id` text PRIMARY KEY NOT NULL,
	`execution_id` text NOT NULL,
	`side` text NOT NULL,
	`shares` real,
	`option_type` text,
	`strike` real,
	`expiration` text,
	`contracts` real,
	`price` real NOT NULL,
	`multiplier` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`execution_id`) REFERENCES `trade_executions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trade_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`trade_id` text NOT NULL,
	`kind` text NOT NULL,
	`executed_at` text NOT NULL,
	`notes` text,
	`fees_usd` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`trade_id`) REFERENCES `trades`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trade_screenshots` (
	`id` text PRIMARY KEY NOT NULL,
	`trade_id` text NOT NULL,
	`timeframe` text NOT NULL,
	`url` text NOT NULL,
	`label` text,
	`captured_at` text,
	FOREIGN KEY (`trade_id`) REFERENCES `trades`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trade_tags` (
	`trade_id` text NOT NULL,
	`tag_id` text NOT NULL,
	FOREIGN KEY (`trade_id`) REFERENCES `trades`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` text PRIMARY KEY NOT NULL,
	`symbol` text NOT NULL,
	`instrument` text NOT NULL,
	`direction` text NOT NULL,
	`strategy_id` text,
	`status` text DEFAULT 'open' NOT NULL,
	`planned_entry` real,
	`planned_stop` real,
	`planned_target` real,
	`planned_size` real,
	`planned_risk_usd` real,
	`opened_at` text NOT NULL,
	`closed_at` text,
	`realized_pnl_usd` real,
	`realized_pnl_r` real,
	`fees_usd` real DEFAULT 0 NOT NULL,
	`notes_md` text,
	`pre_confidence` integer,
	`pre_conviction` text,
	`pre_mood` text,
	`pre_sleep_hours` real,
	`pre_caffeine` integer,
	`pre_following_plan` integer,
	`during_stress` integer,
	`during_deviations` text,
	`post_satisfaction` integer,
	`post_mistakes` text,
	`post_lessons` text,
	`post_mood` text,
	`post_would_retake` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`strategy_id`) REFERENCES `strategies`(`id`) ON UPDATE no action ON DELETE no action
);
