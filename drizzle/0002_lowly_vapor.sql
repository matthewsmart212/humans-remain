CREATE TABLE `world_layout` (
	`id` text PRIMARY KEY NOT NULL,
	`draft_json` text,
	`applied_json` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` text
);

--> statement-breakpoint
INSERT INTO world_layout (id,revision) VALUES ('main',0);
