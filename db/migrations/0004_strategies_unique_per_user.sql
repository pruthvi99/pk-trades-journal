-- Fix strategies.name: replace global unique with per-user composite unique
DROP INDEX IF EXISTS `strategies_name_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX `strategies_user_name_unique` ON `strategies` (`user_id`, `name`);
