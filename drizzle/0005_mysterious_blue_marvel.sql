ALTER TABLE `admin_users` ADD `force_password_change` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_users` ADD `temporary_password_expires` integer;