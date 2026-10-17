CREATE TABLE `customer_addresses` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`label` text NOT NULL,
	`region` text NOT NULL,
	`city` text NOT NULL,
	`address` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_customer_addresses_customer` ON `customer_addresses` (`customer_id`);--> statement-breakpoint
CREATE TABLE `customer_otp_challenges` (
	`phone_e164` text PRIMARY KEY NOT NULL,
	`challenge_hash` text NOT NULL,
	`otp_hash` text NOT NULL,
	`expires` integer NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`last_sent_at` integer NOT NULL,
	`used_at` integer,
	`delivered` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_otp_challenges_challenge_hash_unique` ON `customer_otp_challenges` (`challenge_hash`);--> statement-breakpoint
CREATE TABLE `customer_favorites` (
	`customer_id` text NOT NULL,
	`product` text NOT NULL,
	PRIMARY KEY(`customer_id`, `product`),
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `customer_sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`csrf` text NOT NULL,
	`ua` text NOT NULL,
	`expires` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_customer_sessions_customer` ON `customer_sessions` (`customer_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`phone_e164` text NOT NULL,
	`phone_verified_at` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_login_at` text,
	CONSTRAINT "customer_valid_status" CHECK("customers"."status" IN ('active','disabled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_phone_e164_unique` ON `customers` (`phone_e164`);--> statement-breakpoint
ALTER TABLE `preview_orders` ADD `customer_id` text REFERENCES customers(id);--> statement-breakpoint
CREATE INDEX `idx_orders_customer` ON `preview_orders` (`customer_id`);