CREATE TABLE `admin_access` (
	`admin_id` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`permissions` text DEFAULT '[]' NOT NULL,
	CONSTRAINT "valid_admin_role" CHECK("admin_access"."role" IN ('admin','staff'))
);
