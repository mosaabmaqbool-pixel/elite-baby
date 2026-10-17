-- Apply to a NEW, EMPTY database only. No accounts or sessions are included.
CREATE TABLE `cart_items` (
	`session` text NOT NULL,
	`product` text NOT NULL,
	`option` text NOT NULL,
	`quantity` integer NOT NULL,
	PRIMARY KEY(`session`, `product`, `option`)
);

CREATE TABLE `favorites` (
	`session` text NOT NULL,
	`product` text NOT NULL,
	PRIMARY KEY(`session`, `product`)
);

CREATE TABLE `preview_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`session` text NOT NULL,
	`request_id` text NOT NULL,
	`customer` text NOT NULL,
	`items` text NOT NULL,
	`total` integer NOT NULL,
	`created_at` text NOT NULL
);

CREATE UNIQUE INDEX `preview_orders_request_id_unique` ON `preview_orders` (`request_id`);
CREATE TABLE `subscribers` (
	`email` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);

CREATE TABLE `admin_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`created_at` text NOT NULL
);

CREATE TABLE `admin_sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`csrf` text NOT NULL,
	`ua` text NOT NULL,
	`expires` integer NOT NULL,
	`touched` integer NOT NULL
);

CREATE TABLE `admin_users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`primary_admin` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);

CREATE UNIQUE INDEX `admin_users_email_unique` ON `admin_users` (`email`);
CREATE TABLE `inventory_guards` (
	`id` text PRIMARY KEY NOT NULL,
	`ok` integer NOT NULL,
	CONSTRAINT "reservation_must_succeed" CHECK("inventory_guards"."ok" = 1)
);

CREATE TABLE `login_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);

CREATE TABLE `order_management` (
	`order_id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`coupon` text,
	`discount` integer DEFAULT 0 NOT NULL,
	`test` integer DEFAULT 1 NOT NULL
);

CREATE TABLE `store_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);

CREATE TABLE `store_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL
);

CREATE TABLE `store_coupons` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`data` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`uses` integer DEFAULT 0 NOT NULL
);

CREATE UNIQUE INDEX `store_coupons_code_unique` ON `store_coupons` (`code`);
CREATE TABLE `store_products` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`data` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	CONSTRAINT "products_nonnegative_stock" CHECK("store_products"."stock" >= 0)
);

CREATE INDEX `idx_products_category` ON `store_products` (`category`);
CREATE TABLE `store_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);

CREATE TABLE `store_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`data` text NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	CONSTRAINT "variants_nonnegative_stock" CHECK("store_variants"."stock" >= 0)
);

CREATE INDEX `idx_variants_product` ON `store_variants` (`product_id`);
CREATE TABLE `admin_access` (
	`admin_id` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`permissions` text DEFAULT '[]' NOT NULL,
	CONSTRAINT "valid_admin_role" CHECK("admin_access"."role" IN ('admin','staff'))
);

ALTER TABLE `admin_users` ADD `gender` text DEFAULT 'female' NOT NULL;
ALTER TABLE `admin_sessions` ADD `remember` integer DEFAULT 0 NOT NULL;
ALTER TABLE `admin_users` ADD `force_password_change` integer DEFAULT 0 NOT NULL;
ALTER TABLE `admin_users` ADD `temporary_password_expires` integer;
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

CREATE INDEX `idx_customer_addresses_customer` ON `customer_addresses` (`customer_id`);
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

CREATE UNIQUE INDEX `customer_otp_challenges_challenge_hash_unique` ON `customer_otp_challenges` (`challenge_hash`);
CREATE TABLE `customer_favorites` (
	`customer_id` text NOT NULL,
	`product` text NOT NULL,
	PRIMARY KEY(`customer_id`, `product`),
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `customer_sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`csrf` text NOT NULL,
	`ua` text NOT NULL,
	`expires` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX `idx_customer_sessions_customer` ON `customer_sessions` (`customer_id`);
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

CREATE UNIQUE INDEX `customers_phone_e164_unique` ON `customers` (`phone_e164`);
ALTER TABLE `preview_orders` ADD `customer_id` text REFERENCES customers(id);
CREATE INDEX `idx_orders_customer` ON `preview_orders` (`customer_id`);
ALTER TABLE `store_assets` ADD `content_hash` text;
CREATE UNIQUE INDEX `store_assets_content_hash_unique` ON `store_assets` (`content_hash`);