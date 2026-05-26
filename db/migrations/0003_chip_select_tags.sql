-- Fix: Replace global UNIQUE on tags.label with per-user composite unique (userId + label).
-- This allows multiple users to each have a tag named e.g. "Overtrading".
DROP INDEX IF EXISTS `tags_label_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_user_label_unique` ON `tags` (`user_id`, `label`);
