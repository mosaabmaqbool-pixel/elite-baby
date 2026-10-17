ALTER TABLE `store_assets` ADD `content_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `store_assets_content_hash_unique` ON `store_assets` (`content_hash`);