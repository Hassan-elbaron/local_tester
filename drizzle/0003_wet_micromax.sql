CREATE TABLE IF NOT EXISTS `company_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`fileName` varchar(500) NOT NULL,
	`fileKey` varchar(1000) NOT NULL,
	`fileUrl` varchar(1000) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileSize` bigint NOT NULL,
	`category` enum('logo','brand_guidelines','creative','report','brief','audience_doc','competitor_analysis','pricing','sales_doc','other') NOT NULL DEFAULT 'other',
	`description` text,
	`extractionStatus` enum('pending','processing','complete','failed') NOT NULL DEFAULT 'pending',
	`extractedKnowledge` json,
	`knowledgeMemoryIds` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `decision_trace` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`companyId` int NOT NULL,
	`deliberationId` int,
	`problemStatement` text,
	`contextUsed` json,
	`optionsGenerated` int NOT NULL DEFAULT 0,
	`evaluationCriteria` json,
	`agentConsensus` json,
	`finalDecision` text,
	`finalDecisionAr` text,
	`decisionRationale` text,
	`decisionRationaleAr` text,
	`rejectedAlternatives` json,
	`keyInsights` json,
	`keyInsightsAr` json,
	`humanDecision` enum('pending','approved','rejected','revision_requested') NOT NULL DEFAULT 'pending',
	`humanDecisionReason` text,
	`humanDecisionAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `decision_trace_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `execution_previews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`companyId` int NOT NULL,
	`approvalId` int NOT NULL,
	`status` enum('draft','ready','approved','executed') NOT NULL DEFAULT 'draft',
	`campaignStructure` json,
	`adPreviews` json,
	`executionSteps` json,
	`changeLog` json,
	`humanPreviewApproved` boolean NOT NULL DEFAULT false,
	`humanPreviewApprovedAt` timestamp,
	`humanPreviewNotes` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `execution_previews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `proposal_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`companyId` int NOT NULL,
	`deliberationId` int,
	`optionIndex` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`titleAr` varchar(500),
	`description` text NOT NULL,
	`descriptionAr` text,
	`scores` json NOT NULL,
	`pros` json,
	`cons` json,
	`estimatedBudget` float,
	`estimatedTimeline` varchar(100),
	`channels` json,
	`isRecommended` boolean NOT NULL DEFAULT false,
	`whyRecommended` text,
	`whyOthersRejected` text,
	`agentVotes` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `proposal_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` MODIFY COLUMN `entityType` enum('company','proposal','deliberation','approval','agent','memory','system','file') NOT NULL;--> statement-breakpoint
ALTER TABLE `company_memory` MODIFY COLUMN `category` enum('strategy','audience','competitors','brand','performance','preferences','decisions','campaigns','results','assets','guidelines') NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `type` enum('approval_request','approval_decision','deliberation_complete','proposal_update','system','agent_insight','file_processed','revision_needed','anomaly','opportunity','execution_ready') NOT NULL;--> statement-breakpoint
ALTER TABLE `proposals` MODIFY COLUMN `status` enum('draft','proposed','under_deliberation','pending_approval','approved','rejected','needs_revision','ready_for_execution','executed','rolled_back') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `agent_opinions` ADD `preferredOptionIndex` int;--> statement-breakpoint
ALTER TABLE `approvals` ADD `alternativeSuggestions` json;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `commandType` enum('chat','analyze','propose','approve','reject','retrieve_memory','compare_options','explain_decision','preview_execution','summarize') DEFAULT 'chat' NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `brandVoice` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `brandVoiceAr` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `targetAudience` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `competitors` json;--> statement-breakpoint
ALTER TABLE `companies` ADD `knowledgeStatus` enum('empty','partial','complete') DEFAULT 'empty' NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `externalResearchApproved` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `company_memory` ADD `importance` int DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `company_memory` ADD `source` enum('manual','file_upload','analytics','agent','external_research') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `company_memory` ADD `sourceRef` varchar(500);--> statement-breakpoint
ALTER TABLE `company_memory` ADD `tags` json;--> statement-breakpoint
ALTER TABLE `notifications` ADD `priority` enum('low','medium','high','urgent') DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `actionUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `proposals` ADD `parentId` int;--> statement-breakpoint
ALTER TABLE `proposals` ADD `revisionHistory` json;