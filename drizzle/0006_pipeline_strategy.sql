CREATE TABLE IF NOT EXISTS `project_pipeline` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`currentStage` enum('intake','business_understanding','competitor_discovery','competitor_review','audience_persona','deliberation','strategy_generation','strategy_review','strategy_approved','execution_ready','monitoring_active') NOT NULL DEFAULT 'intake',
	`completedStages` json,
	`intakeData` json,
	`businessReport` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_pipeline_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `competitor_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`website` varchar(500),
	`status` enum('discovered','confirmed','rejected') NOT NULL DEFAULT 'discovered',
	`analysis` json,
	`strengths` json,
	`weaknesses` json,
	`discoveredBy` enum('system','user') NOT NULL DEFAULT 'system',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitor_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `personas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`demographics` json,
	`painPoints` json,
	`motivations` json,
	`objections` json,
	`buyingTriggers` json,
	`channels` json,
	`status` enum('draft','approved') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `personas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `master_strategy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`status` enum('draft','in_review','approved','superseded') NOT NULL DEFAULT 'draft',
	`positioning` text,
	`brandMessage` text,
	`toneOfVoice` text,
	`channelStrategy` json,
	`funnelArchitecture` json,
	`contentStrategy` json,
	`seoStrategy` json,
	`paidMediaStrategy` json,
	`automationStrategy` json,
	`kpis` json,
	`executionPriorities` json,
	`agentConsensus` json,
	`revisionHistory` json,
	`approvedAt` timestamp,
	`approvedBy` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `master_strategy_id` PRIMARY KEY(`id`)
);
