CREATE TABLE `asset_intake` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`contentItemId` int,
	`fileId` int,
	`assetName` varchar(255) NOT NULL,
	`assetType` varchar(100),
	`source` enum('uploaded','drive_link','url','auto_detected','missing') NOT NULL DEFAULT 'missing',
	`driveLink` varchar(1000),
	`externalUrl` varchar(1000),
	`mappedTo` json,
	`gapStatus` enum('available','missing','partial') NOT NULL DEFAULT 'missing',
	`recommendation` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `asset_intake_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int,
	`type` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`credentials` json,
	`status` enum('connected','disconnected','error','pending') NOT NULL DEFAULT 'disconnected',
	`metadata` json,
	`lastSyncAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `llm_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(100) NOT NULL,
	`modelId` varchar(255) NOT NULL,
	`label` varchar(255) NOT NULL,
	`apiKey` text,
	`apiUrl` varchar(500),
	`category` enum('cloud_free','cloud_paid','local') NOT NULL DEFAULT 'cloud_free',
	`isActive` boolean NOT NULL DEFAULT true,
	`isDefault` boolean NOT NULL DEFAULT false,
	`testStatus` enum('untested','success','failed') DEFAULT 'untested',
	`testError` text,
	`lastTestedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `llm_configs_id` PRIMARY KEY(`id`)
);
