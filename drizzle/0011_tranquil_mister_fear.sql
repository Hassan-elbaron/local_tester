CREATE TABLE `behavior_insights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`insightType` enum('drop_off','friction_point','rage_click_zone','dead_click_zone','scroll_depth_issue','cta_performance','path_analysis','ux_issue') NOT NULL,
	`page` varchar(1000),
	`element` varchar(500),
	`severity` enum('critical','high','medium','low') NOT NULL DEFAULT 'medium',
	`description` text NOT NULL,
	`dataPoints` int NOT NULL DEFAULT 0,
	`recommendation` text,
	`status` enum('new','acknowledged','fixed','dismissed') NOT NULL DEFAULT 'new',
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `behavior_insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brand_mentions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`source` enum('twitter','facebook','instagram','linkedin','google_reviews','trustpilot','news','forum','other') NOT NULL DEFAULT 'other',
	`sourceUrl` varchar(1000),
	`authorName` varchar(255),
	`content` text NOT NULL,
	`sentiment` enum('positive','neutral','negative') NOT NULL DEFAULT 'neutral',
	`sentimentScore` decimal(5,2),
	`category` enum('complaint','praise','question','mention','review','news') NOT NULL DEFAULT 'mention',
	`isUrgent` boolean NOT NULL DEFAULT false,
	`isReviewed` boolean NOT NULL DEFAULT false,
	`reviewNotes` text,
	`mentionedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `brand_mentions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`issueType` enum('objection','faq','complaint','pre_sale_concern','post_sale_issue','support_theme','feature_request') NOT NULL,
	`content` text NOT NULL,
	`frequency` int NOT NULL DEFAULT 1,
	`source` varchar(100),
	`sourceRefs` json,
	`status` enum('open','addressed','resolved','in_faq') NOT NULL DEFAULT 'open',
	`suggestedResponse` text,
	`suggestedFaq` text,
	`priority` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_issues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `decisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`decisionType` enum('strategy','campaign','content','budget','channel','creative','audience','seo','optimization') NOT NULL,
	`recommendation` text NOT NULL,
	`reason` text NOT NULL,
	`sourceAgents` json,
	`confidence` decimal(5,2) NOT NULL,
	`urgency` enum('immediate','high','medium','low') NOT NULL DEFAULT 'medium',
	`expectedImpact` json,
	`alternatives` json,
	`supportingMetrics` json,
	`deliberationId` int,
	`status` enum('pending','approved','rejected','edited','deferred') NOT NULL DEFAULT 'pending',
	`humanNotes` text,
	`approvedAt` timestamp,
	`rejectedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `decisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deliberation_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`topic` varchar(500) NOT NULL,
	`topicType` enum('strategy','campaign','funnel','content','budget','channel','creative','persona','seo','general') NOT NULL DEFAULT 'strategy',
	`contextData` json,
	`firstPassOpinions` json,
	`secondPassOpinions` json,
	`agreements` json,
	`disagreements` json,
	`conflictsResolved` json,
	`finalDecision` text,
	`alternatives` json,
	`confidenceScore` decimal(5,2),
	`consensusReached` boolean NOT NULL DEFAULT false,
	`totalAgents` int NOT NULL DEFAULT 0,
	`supportingAgents` int NOT NULL DEFAULT 0,
	`opposingAgents` int NOT NULL DEFAULT 0,
	`abstainAgents` int NOT NULL DEFAULT 0,
	`status` enum('running','completed','failed','awaiting_human') NOT NULL DEFAULT 'running',
	`humanReview` enum('pending','approved','revised','rejected') DEFAULT 'pending',
	`humanNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deliberation_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `external_ideas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int,
	`title` varchar(500) NOT NULL,
	`sourceUrl` varchar(1000),
	`sourceType` enum('github_repo','article','tool','workflow','doc','example','plugin','other') NOT NULL DEFAULT 'other',
	`rawContent` text,
	`summary` text,
	`usefulnessScore` decimal(5,2),
	`whereToUse` text,
	`complexity` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`risks` json,
	`aiSuggestion` enum('accept','reject','defer') DEFAULT 'defer',
	`aiReasoning` text,
	`status` enum('pending_review','approved','rejected','deferred','implemented') NOT NULL DEFAULT 'pending_review',
	`humanDecision` enum('approved','rejected','deferred'),
	`implementationPlan` json,
	`addedBy` varchar(255) NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `external_ideas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monitoring_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`entityType` enum('campaign','funnel','content_item','website','social_channel') NOT NULL,
	`entityId` int,
	`platform` varchar(100),
	`snapshotDate` timestamp NOT NULL DEFAULT (now()),
	`metrics` json,
	`impressions` int,
	`clicks` int,
	`spend` decimal(12,2),
	`conversions` int,
	`revenue` decimal(12,2),
	`ctr` decimal(8,4),
	`cpa` decimal(10,2),
	`roas` decimal(8,2),
	`status` enum('on_track','warning','critical','paused') NOT NULL DEFAULT 'on_track',
	`alerts` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monitoring_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`predictionType` enum('trend_detection','anomaly_detection','fatigue_detection','conversion_drop','funnel_issue','opportunity_signal','churn_risk') NOT NULL,
	`entityType` varchar(100),
	`entityId` int,
	`title` varchar(500) NOT NULL,
	`description` text NOT NULL,
	`confidence` decimal(5,2) NOT NULL,
	`urgency` enum('immediate','high','medium','low') NOT NULL DEFAULT 'medium',
	`expectedImpact` text,
	`supportingData` json,
	`suggestedAction` text,
	`status` enum('active','acknowledged','resolved','expired') NOT NULL DEFAULT 'active',
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `predictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seo_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`url` varchar(1000),
	`auditType` enum('technical','on_page','content','competitor_gap','full') NOT NULL DEFAULT 'full',
	`status` enum('pending','running','complete','failed') NOT NULL DEFAULT 'pending',
	`score` int,
	`issues` json,
	`opportunities` json,
	`technicalReport` json,
	`onPageReport` json,
	`contentGaps` json,
	`keywordOpportunities` json,
	`priorityQueue` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seo_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`sessionId` varchar(100) NOT NULL,
	`startPage` varchar(1000),
	`exitPage` varchar(1000),
	`pageViews` int NOT NULL DEFAULT 0,
	`duration` int,
	`scrollDepthAvg` decimal(5,2),
	`converted` boolean NOT NULL DEFAULT false,
	`bounced` boolean NOT NULL DEFAULT false,
	`deviceType` enum('desktop','mobile','tablet','unknown') NOT NULL DEFAULT 'unknown',
	`country` varchar(100),
	`path` json,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `skills_registry` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('seo','social_listening','analytics','content','crm','reporting','ux','ads','automation','other') NOT NULL,
	`description` text,
	`sourceUrl` varchar(1000),
	`implementationType` enum('api','npm_package','python_tool','manual','webhook','other') NOT NULL DEFAULT 'api',
	`compatibilityNotes` text,
	`valueScore` decimal(5,2),
	`complexityScore` decimal(5,2),
	`status` enum('discovered','under_review','approved','rejected','integrated','deprecated') NOT NULL DEFAULT 'discovered',
	`aiReview` json,
	`humanApproval` boolean DEFAULT false,
	`integrationPlan` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skills_registry_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategy_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`strategyId` int NOT NULL,
	`version` int NOT NULL,
	`snapshotData` json NOT NULL,
	`changeLog` json,
	`changedBy` varchar(255) NOT NULL DEFAULT 'system',
	`changeReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `strategy_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `web_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`sessionId` varchar(100) NOT NULL,
	`eventType` enum('page_view','click','scroll','form_submit','video_play','rage_click','dead_click','exit','conversion','custom') NOT NULL,
	`page` varchar(1000),
	`element` varchar(500),
	`elementText` varchar(500),
	`xPos` int,
	`yPos` int,
	`scrollDepth` int,
	`timeOnPage` int,
	`referrer` varchar(1000),
	`userAgent` varchar(500),
	`metadata` json,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `web_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `project_pipeline` MODIFY COLUMN `currentStage` varchar(100) NOT NULL DEFAULT 'init';