CREATE TABLE `dailyPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planDate` varchar(10) NOT NULL,
	`availableMinutes` int NOT NULL,
	`intensity` enum('steady','focused','sprint') NOT NULL,
	`preferredSubjects` text NOT NULL,
	`planItems` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyPlans_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_plan_user_date_unique` UNIQUE(`userId`,`planDate`)
);
--> statement-breakpoint
ALTER TABLE `flashcardReviews` ADD `intervalDays` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `flashcardReviews` ADD `nextReviewAt` timestamp;--> statement-breakpoint
ALTER TABLE `studySessions` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `studySessions` ADD `difficulty` enum('easy','okay','difficult','very_difficult');