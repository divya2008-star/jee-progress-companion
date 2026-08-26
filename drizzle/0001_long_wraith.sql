CREATE TABLE `chapterProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`chapterId` varchar(80) NOT NULL,
	`subject` enum('Physics','Chemistry','Mathematics') NOT NULL,
	`stage` enum('not_started','revising','revised','test_ready') NOT NULL DEFAULT 'not_started',
	`targetWeek` int NOT NULL DEFAULT 1,
	`notes` text NOT NULL,
	`starred` boolean NOT NULL DEFAULT false,
	`flagged` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chapterProgress_id` PRIMARY KEY(`id`),
	CONSTRAINT `chapter_user_unique` UNIQUE(`userId`,`chapterId`)
);
--> statement-breakpoint
CREATE TABLE `flashcardReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cardId` varchar(100) NOT NULL,
	`status` enum('known','shaky') NOT NULL,
	`reviewedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flashcardReviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `flashcard_user_unique` UNIQUE(`userId`,`cardId`)
);
--> statement-breakpoint
CREATE TABLE `mockTests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`physics` int NOT NULL,
	`chemistry` int NOT NULL,
	`mathematics` int NOT NULL,
	`total` int NOT NULL,
	`attemptedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mockTests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studentProfiles` (
	`userId` int NOT NULL,
	`targetExamDate` timestamp NOT NULL DEFAULT (now()),
	`dailyGoalMinutes` int NOT NULL DEFAULT 180,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studentProfiles_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
CREATE TABLE `studySessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`minutes` int NOT NULL,
	`focus` varchar(120) NOT NULL DEFAULT 'Focused revision',
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studySessions_id` PRIMARY KEY(`id`)
);
