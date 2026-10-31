CREATE TABLE `asset_art_files` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`object_key` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`bytes` integer NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `asset_artwork` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`revision` integer NOT NULL,
	`config_json` text NOT NULL,
	`created_at` text NOT NULL
);
