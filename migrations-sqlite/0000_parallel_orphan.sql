CREATE TABLE `ai_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`is_active` integer DEFAULT true,
	`language` text DEFAULT 'pt-BR',
	`tone` text DEFAULT 'professional',
	`module_presets` text,
	`allow_broker_edits` integer DEFAULT true,
	`created_at` text DEFAULT '2025-12-15T00:06:05.212Z' NOT NULL,
	`updated_at` text DEFAULT '2025-12-15T00:06:05.212Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_settings_tenant_id_unique` ON `ai_settings` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `brand_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`logo_url` text,
	`favicon_url` text,
	`custom_domain` text,
	`subdomain` text,
	`facebook_url` text,
	`instagram_url` text,
	`linkedin_url` text,
	`youtube_url` text,
	`footer_text` text,
	`seo_title` text,
	`seo_description` text,
	`seo_keywords` text,
	`og_image` text,
	`google_analytics_id` text,
	`whatsapp_enabled` integer DEFAULT true,
	`updated_at` text DEFAULT '2025-12-15T00:06:05.212Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brand_settings_tenant_id_unique` ON `brand_settings` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `commissions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`sale_id` text,
	`rental_contract_id` text,
	`broker_id` text NOT NULL,
	`transaction_type` text NOT NULL,
	`transaction_value` text NOT NULL,
	`commission_rate` text NOT NULL,
	`gross_commission` text NOT NULL,
	`agency_split` text DEFAULT '50' NOT NULL,
	`broker_commission` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_at` text,
	`paid_at` text,
	`notes` text,
	`created_at` text DEFAULT '2025-12-15T00:06:05.210Z' NOT NULL,
	`updated_at` text DEFAULT '2025-12-15T00:06:05.210Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sale_id`) REFERENCES `property_sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rental_contract_id`) REFERENCES `rental_contracts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`broker_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`value` text NOT NULL,
	`terms` text,
	`signed_at` text,
	`created_at` text DEFAULT '2025-12-15T00:06:05.209Z' NOT NULL,
	`updated_at` text DEFAULT '2025-12-15T00:06:05.209Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `finance_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`color` text DEFAULT '#6b7280',
	`is_system_generated` integer DEFAULT false,
	`created_at` text DEFAULT '2025-12-15T00:06:05.210Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `finance_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`category_id` text,
	`source_type` text,
	`source_id` text,
	`description` text NOT NULL,
	`amount` text NOT NULL,
	`flow` text NOT NULL,
	`entry_date` text NOT NULL,
	`notes` text,
	`origin_type` text,
	`origin_id` text,
	`related_entity_type` text,
	`related_entity_id` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`created_at` text DEFAULT '2025-12-15T00:06:05.210Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `finance_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `follow_ups` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`assigned_to` text,
	`due_at` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`completed_at` text,
	`created_at` text DEFAULT '2025-12-15T00:06:05.210Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `integration_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`integration_type` text,
	`integration_name` text NOT NULL,
	`config` text NOT NULL,
	`status` text DEFAULT 'disconnected' NOT NULL,
	`last_sync` text,
	`created_at` text DEFAULT '2025-12-15T00:06:05.212Z' NOT NULL,
	`updated_at` text DEFAULT '2025-12-15T00:06:05.212Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `interactions` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT '2025-12-15T00:06:05.208Z' NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lead_tag_links` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` text DEFAULT '2025-12-15T00:06:05.210Z' NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `lead_tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lead_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#3b82f6',
	`created_at` text DEFAULT '2025-12-15T00:06:05.210Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`budget` text,
	`interests` text,
	`notes` text,
	`assigned_to` text,
	`preferred_type` text,
	`preferred_category` text,
	`preferred_city` text,
	`preferred_neighborhood` text,
	`min_bedrooms` integer,
	`max_bedrooms` integer,
	`created_at` text DEFAULT '2025-12-15T00:06:05.208Z' NOT NULL,
	`updated_at` text DEFAULT '2025-12-15T00:06:05.208Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `newsletter_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`tenant_id` text,
	`subscribed_at` text DEFAULT '2025-12-15T00:06:05.209Z' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_subscriptions_email_unique` ON `newsletter_subscriptions` (`email`);--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`event_type` text NOT NULL,
	`channel` text NOT NULL,
	`recipient_role` text,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT '2025-12-15T00:06:05.212Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `owners` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text NOT NULL,
	`cpf_cnpj` text,
	`address` text,
	`bank_name` text,
	`bank_agency` text,
	`bank_account` text,
	`pix_key` text,
	`notes` text,
	`created_at` text DEFAULT '2025-12-15T00:06:05.209Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`price` text NOT NULL,
	`address` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`zip_code` text,
	`bedrooms` integer,
	`bathrooms` integer,
	`area` integer,
	`features` text,
	`images` text,
	`status` text DEFAULT 'available' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT '2025-12-15T00:06:05.208Z' NOT NULL,
	`updated_at` text DEFAULT '2025-12-15T00:06:05.208Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `property_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`buyer_lead_id` text NOT NULL,
	`seller_id` text,
	`broker_id` text,
	`sale_value` text NOT NULL,
	`sale_date` text NOT NULL,
	`commission_rate` text DEFAULT '6',
	`commission_value` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT '2025-12-15T00:06:05.210Z' NOT NULL,
	`updated_at` text DEFAULT '2025-12-15T00:06:05.210Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`buyer_lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`seller_id`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`broker_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rental_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`renter_id` text NOT NULL,
	`rent_value` text NOT NULL,
	`condo_fee` text,
	`iptu_value` text,
	`due_day` integer DEFAULT 10 NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`adjustment_index` text DEFAULT 'IGPM',
	`deposit_value` text,
	`administration_fee` text DEFAULT '10',
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT '2025-12-15T00:06:05.209Z' NOT NULL,
	`updated_at` text DEFAULT '2025-12-15T00:06:05.209Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`renter_id`) REFERENCES `renters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rental_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`rental_contract_id` text NOT NULL,
	`reference_month` text NOT NULL,
	`due_date` text NOT NULL,
	`rent_value` text NOT NULL,
	`condo_fee` text,
	`iptu_value` text,
	`extra_charges` text,
	`discounts` text,
	`total_value` text NOT NULL,
	`paid_value` text,
	`paid_date` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_method` text,
	`notes` text,
	`created_at` text DEFAULT '2025-12-15T00:06:05.209Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rental_contract_id`) REFERENCES `rental_contracts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rental_transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`reference_month` text NOT NULL,
	`gross_amount` text NOT NULL,
	`administration_fee` text,
	`maintenance_deductions` text,
	`other_deductions` text,
	`net_amount` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`paid_date` text,
	`payment_method` text,
	`notes` text,
	`created_at` text DEFAULT '2025-12-15T00:06:05.210Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `renters` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text NOT NULL,
	`cpf_cnpj` text,
	`rg` text,
	`profession` text,
	`income` text,
	`address` text,
	`emergency_contact` text,
	`emergency_phone` text,
	`notes` text,
	`created_at` text DEFAULT '2025-12-15T00:06:05.209Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sale_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`proposed_value` text NOT NULL,
	`validity_date` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT '2025-12-15T00:06:05.210Z' NOT NULL,
	`updated_at` text DEFAULT '2025-12-15T00:06:05.210Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `saved_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`report_type` text NOT NULL,
	`filters` text NOT NULL,
	`is_favorite` integer DEFAULT false,
	`created_at` text DEFAULT '2025-12-15T00:06:05.213Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tenant_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`cnpj` text,
	`municipal_registration` text,
	`creci` text,
	`bank_name` text,
	`bank_agency` text,
	`bank_account` text,
	`pix_key` text,
	`business_hours` text,
	`timezone` text DEFAULT 'America/Sao_Paulo',
	`primary_color` text,
	`secondary_color` text,
	`logo_url` text,
	`favicon_url` text,
	`custom_domain` text,
	`subdomain` text,
	`social_links` text,
	`footer_text` text,
	`seo_title` text,
	`seo_description` text,
	`portal_settings` text,
	`created_at` text DEFAULT '2025-12-15T00:06:05.211Z' NOT NULL,
	`updated_at` text DEFAULT '2025-12-15T00:06:05.211Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_settings_tenant_id_unique` ON `tenant_settings` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo` text,
	`primary_color` text DEFAULT '#0066cc' NOT NULL,
	`secondary_color` text DEFAULT '#333333' NOT NULL,
	`phone` text,
	`email` text,
	`address` text,
	`created_at` text DEFAULT '2025-12-15T00:06:05.206Z' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_slug_unique` ON `tenants` (`slug`);--> statement-breakpoint
CREATE TABLE `user_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role_id` text,
	`custom_permissions` text,
	`created_at` text DEFAULT '2025-12-15T00:06:05.212Z' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `user_roles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`permissions` text NOT NULL,
	`is_default` integer DEFAULT false,
	`is_system_role` integer DEFAULT false,
	`created_at` text DEFAULT '2025-12-15T00:06:05.212Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`avatar` text,
	`created_at` text DEFAULT '2025-12-15T00:06:05.207Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `visits` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`lead_id` text,
	`scheduled_for` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`notes` text,
	`assigned_to` text,
	`created_at` text DEFAULT '2025-12-15T00:06:05.208Z' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
