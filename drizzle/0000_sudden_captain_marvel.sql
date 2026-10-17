CREATE TABLE `cart_items` (
	`session` text NOT NULL,
	`product` text NOT NULL,
	`option` text NOT NULL,
	`quantity` integer NOT NULL,
	PRIMARY KEY(`session`, `product`, `option`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`session` text NOT NULL,
	`product` text NOT NULL,
	PRIMARY KEY(`session`, `product`)
);
--> statement-breakpoint
CREATE TABLE `preview_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`session` text NOT NULL,
	`request_id` text NOT NULL,
	`customer` text NOT NULL,
	`items` text NOT NULL,
	`total` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `preview_orders_request_id_unique` ON `preview_orders` (`request_id`);--> statement-breakpoint
CREATE TABLE `subscribers` (
	`email` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
