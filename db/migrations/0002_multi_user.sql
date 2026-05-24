-- Multi-user support: users table, user_settings, userId on trades/strategies/tags
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`passcode` text NOT NULL,
	`display_name` text,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_passcode_unique` ON `users` (`passcode`);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`updated_at` text NOT NULL,
	PRIMARY KEY (`user_id`, `key`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `trades` ADD `user_id` text REFERENCES `users`(`id`);
--> statement-breakpoint
ALTER TABLE `strategies` ADD `user_id` text REFERENCES `users`(`id`);
--> statement-breakpoint
ALTER TABLE `tags` ADD `user_id` text REFERENCES `users`(`id`);
--> statement-breakpoint
INSERT INTO `users` (`id`, `passcode`, `display_name`, `is_admin`, `created_at`)
VALUES ('00000000-0000-0000-0000-000000090909', '090909', 'Admin', 1, '2026-05-24T00:00:00.000Z');
--> statement-breakpoint
UPDATE `trades` SET `user_id` = '00000000-0000-0000-0000-000000090909';
--> statement-breakpoint
UPDATE `strategies` SET `user_id` = '00000000-0000-0000-0000-000000090909';
--> statement-breakpoint
UPDATE `tags` SET `user_id` = '00000000-0000-0000-0000-000000090909';
--> statement-breakpoint
INSERT INTO `user_settings` (`user_id`, `key`, `value`, `updated_at`)
SELECT '00000000-0000-0000-0000-000000090909', `key`, `value`, `updated_at`
FROM `settings`;
