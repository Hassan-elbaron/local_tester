CREATE TABLE IF NOT EXISTS `campaign_builds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`funnelId` int,
	`name` varchar(255) NOT NULL,
	`platform` varchar(100) NOT NULL,
	`objective` varchar(255),
	`structure` json,
	`audiences` json,
	`budgetLogic` json,
	`abTestMatrix` json,
	`launchChecklist` json,
	`buildDocs` text,
	`status` enum('draft','ready','launched') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_builds_id` PRIMARY KEY(`id`)
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
CREATE TABLE IF NOT EXISTS `content_calendar` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`funnelId` int,
	`platform` varchar(100) NOT NULL,
	`funnelStage` varchar(100),
	`objective` text,
	`concept` text,
	`brief` text,
	`caption` text,
	`ctaText` varchar(255),
	`visualNotes` text,
	`requiredAssets` json,
	`scheduledDate` timestamp,
	`week` int,
	`month` int,
	`copyStatus` enum('planned','briefed','copywritten','approved','published') NOT NULL DEFAULT 'planned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_calendar_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `funnels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`strategyId` int,
	`name` varchar(255) NOT NULL,
	`goal` text,
	`stage` enum('awareness','consideration','conversion','retention') NOT NULL DEFAULT 'awareness',
	`channels` json,
	`steps` json,
	`kpis` json,
	`budgetPct` float,
	`entryPoint` text,
	`conversionEvent` text,
	`retargetingPath` text,
	`automationPath` text,
	`status` enum('draft','approved') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `funnels_id` PRIMARY KEY(`id`)
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
