ALTER TABLE `agent_opinions` MODIFY COLUMN `concerns` json;--> statement-breakpoint
ALTER TABLE `agent_opinions` MODIFY COLUMN `suggestions` json;--> statement-breakpoint
ALTER TABLE `approvals` MODIFY COLUMN `risks` json;--> statement-breakpoint
ALTER TABLE `audit_logs` MODIFY COLUMN `metadata` json;--> statement-breakpoint
ALTER TABLE `chat_messages` MODIFY COLUMN `metadata` json;--> statement-breakpoint
ALTER TABLE `deliberations` MODIFY COLUMN `alternativeOptions` json;--> statement-breakpoint
ALTER TABLE `deliberations` MODIFY COLUMN `rounds` json;--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `metadata` json;--> statement-breakpoint
ALTER TABLE `proposals` MODIFY COLUMN `channels` json;--> statement-breakpoint
ALTER TABLE `proposals` MODIFY COLUMN `alternatives` json;--> statement-breakpoint
ALTER TABLE `proposals` MODIFY COLUMN `risks` json;--> statement-breakpoint
ALTER TABLE `proposals` MODIFY COLUMN `expectedOutcomes` json;--> statement-breakpoint
ALTER TABLE `proposals` MODIFY COLUMN `metadata` json;