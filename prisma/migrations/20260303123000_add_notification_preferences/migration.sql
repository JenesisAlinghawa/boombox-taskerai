-- Add email and message notification flags to User
ALTER TABLE "User" ADD COLUMN "emailNotifications" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "messageNotifications" BOOLEAN NOT NULL DEFAULT true;
