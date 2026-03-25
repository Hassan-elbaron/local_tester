CREATE TABLE IF NOT EXISTS `agent_opinions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deliberationId` int NOT NULL,
	`companyId` int NOT NULL,
	`round` int NOT NULL,
	`agentRole` varchar(100) NOT NULL,
	`agentName` varchar(255) NOT NULL,
	`opinion` text NOT NULL,
	`opinionAr` text,
	`recommendation` text,
	`confidence` float NOT NULL,
	`concerns` json DEFAULT ('[]'),
	`suggestions` json DEFAULT ('[]'),
	`votedFor` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_opinions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`companyId` int NOT NULL,
	`deliberationId` int,
	`status` enum('pending','approved','rejected','revised') NOT NULL DEFAULT 'pending',
	`version` int NOT NULL DEFAULT 1,
	`recommendation` text,
	`recommendationAr` text,
	`risks` json DEFAULT ('[]'),
	`consensusScore` float,
	`approvedBy` varchar(255),
	`approvalReason` text,
	`rejectionReason` text,
	`revisionNotes` text,
	`approvedAt` timestamp,
	`rejectedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`entityType` enum('company','proposal','deliberation','approval','agent','memory','system') NOT NULL,
	`entityId` int,
	`action` varchar(100) NOT NULL,
	`actor` varchar(255) NOT NULL,
	`summary` text NOT NULL,
	`summaryAr` text,
	`before` json,
	`after` json,
	`metadata` json DEFAULT ('{}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`contentAr` text,
	`agentRole` varchar(100),
	`relatedEntityType` varchar(50),
	`relatedEntityId` int,
	`metadata` json DEFAULT ('{}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`industry` varchar(100),
	`website` varchar(500),
	`description` text,
	`descriptionAr` text,
	`logoUrl` varchar(500),
	`primaryColor` varchar(7) DEFAULT '#6366f1',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `company_memory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`key` varchar(255) NOT NULL,
	`value` json NOT NULL,
	`category` enum('strategy','audience','competitors','brand','performance','preferences') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_memory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `deliberations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`companyId` int NOT NULL,
	`status` enum('in_progress','completed','failed') NOT NULL DEFAULT 'in_progress',
	`totalRounds` int NOT NULL DEFAULT 0,
	`consensusScore` float,
	`finalRecommendation` text,
	`finalRecommendationAr` text,
	`alternativeOptions` json DEFAULT ('[]'),
	`rounds` json DEFAULT ('[]'),
	`summary` text,
	`summaryAr` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `deliberations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`type` enum('approval_request','approval_decision','deliberation_complete','proposal_update','system','agent_insight') NOT NULL,
	`title` varchar(500) NOT NULL,
	`titleAr` varchar(500),
	`message` text NOT NULL,
	`messageAr` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`entityType` varchar(50),
	`entityId` int,
	`metadata` json DEFAULT ('{}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`titleAr` varchar(500),
	`description` text,
	`descriptionAr` text,
	`type` enum('strategy','campaign','budget','content','seo','paid_media','crm','funnel') NOT NULL,
	`status` enum('draft','deliberating','pending_approval','approved','rejected','revised','executed') NOT NULL DEFAULT 'draft',
	`version` int NOT NULL DEFAULT 1,
	`budget` float,
	`currency` varchar(3) DEFAULT 'USD',
	`timeline` varchar(100),
	`channels` json DEFAULT ('[]'),
	`recommendation` text,
	`recommendationAr` text,
	`alternatives` json DEFAULT ('[]'),
	`risks` json DEFAULT ('[]'),
	`expectedOutcomes` json DEFAULT ('[]'),
	`metadata` json DEFAULT ('{}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `proposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `preferredLanguage` enum('en','ar') DEFAULT 'en' NOT NULL;