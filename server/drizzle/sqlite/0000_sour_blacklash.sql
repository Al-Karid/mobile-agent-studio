CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` text NOT NULL,
	`run_id` integer,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_events_project` ON `events` (`project_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`prompt` text NOT NULL,
	`status` text DEFAULT 'created' NOT NULL,
	`exp_url` text,
	`metro_port` integer,
	`agent` text DEFAULT 'cline' NOT NULL,
	`model` text DEFAULT 'deepseek-v4-flash' NOT NULL,
	`platform` text DEFAULT 'ios' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`input` text,
	`agent` text,
	`model` text,
	`log` text DEFAULT '' NOT NULL,
	`error` text,
	`commit_sha` text,
	`created_at` integer NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_runs_project` ON `runs` (`project_id`);