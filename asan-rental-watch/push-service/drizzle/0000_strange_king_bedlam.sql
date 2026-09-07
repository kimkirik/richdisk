CREATE TABLE `deliveries` (
	`device_id` text NOT NULL,
	`event_id` text NOT NULL,
	`sent_at` integer,
	`received_at` integer,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	PRIMARY KEY(`device_id`, `event_id`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`subscription` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_devices_token` ON `devices` (`token_hash`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`audience` text
);
--> statement-breakpoint
CREATE INDEX `idx_events_expiry` ON `events` (`expires_at`);--> statement-breakpoint
CREATE TABLE `state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
