CREATE TABLE IF NOT EXISTS `campaign_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`proposalId` int NOT NULL,
	`actualRoas` decimal(8,2),
	`actualCpa` decimal(10,2),
	`actualReach` int,
	`actualImpressions` int,
	`actualClicks` int,
	`actualConversions` int,
	`actualSpend` decimal(12,2),
	`actualRevenue` decimal(12,2),
	`periodStart` timestamp,
	`periodEnd` timestamp,
	`predictedRoas` decimal(8,2),
	`predictedCpa` decimal(10,2),
	`performanceVsPrediction` enum('exceeded','met','below','far_below'),
	`notes` text,
	`learningExtracted` boolean DEFAULT false,
	`learningId` int,
	`enteredBy` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `learnings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`eventType` enum('proposal_approved','proposal_rejected','proposal_revised','deliberation_complete','campaign_result','option_selected','pattern_detected') NOT NULL,
	`entityId` int,
	`entityType` varchar(50),
	`whatHappened` text NOT NULL,
	`whySucceeded` text,
	`whyFailed` text,
	`pattern` text,
	`actionableInsight` text NOT NULL,
	`category` enum('budget','audience','creative','timing','channel','approval_pattern','owner_preference','market','general') NOT NULL,
	`confidence` decimal(5,2) DEFAULT '0.70',
	`reviewedByHuman` boolean DEFAULT false,
	`appliedToRules` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `learnings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `owner_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`preferenceType` enum('budget_range','proposal_type','channel_preference','timing_preference','risk_tolerance','creative_style','audience_focus','general') NOT NULL,
	`key` varchar(255) NOT NULL,
	`value` json,
	`evidence` text,
	`confidence` decimal(5,2) DEFAULT '0.70',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `owner_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `system_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`ruleText` text NOT NULL,
	`ruleTextAr` text,
	`appliesTo` enum('proposals','budget','audience','creative','timing','channel','approval','general') NOT NULL,
	`sourceLearningIds` json,
	`confidence` decimal(5,2) DEFAULT '0.80',
	`approvedByHuman` boolean DEFAULT false,
	`approvedAt` timestamp,
	`approvedBy` varchar(255),
	`isActive` boolean DEFAULT false,
	`timesApplied` int DEFAULT 0,
	`successRate` decimal(5,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_rules_id` PRIMARY KEY(`id`)
);
