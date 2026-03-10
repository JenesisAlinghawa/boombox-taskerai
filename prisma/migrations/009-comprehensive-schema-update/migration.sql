/*
  Warnings:

  - You are about to drop the column `userId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `isRead` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `relatedId` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - Added the required column `creatorId` to the `Channel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderId` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `data` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receiverId` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_userId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "creatorId" INTEGER NOT NULL,
ADD COLUMN     "profilePicture" TEXT;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "userId",
ADD COLUMN     "attachments" TEXT[],
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentMessageId" INTEGER,
ADD COLUMN     "reactions" JSONB[],
ADD COLUMN     "senderId" INTEGER NOT NULL,
ALTER COLUMN "channelId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "isRead",
DROP COLUMN "message",
DROP COLUMN "relatedId",
DROP COLUMN "title",
DROP COLUMN "userId",
ADD COLUMN     "data" JSONB NOT NULL,
ADD COLUMN     "read" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "receiverId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastActive" TIMESTAMP(3),
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "profilePicture" TEXT;

-- CreateTable
CREATE TABLE "ChannelEditor" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "channelId" INTEGER NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelEditor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChannelEditor_userId_channelId_key" ON "ChannelEditor"("userId", "channelId");

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelEditor" ADD CONSTRAINT "ChannelEditor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelEditor" ADD CONSTRAINT "ChannelEditor_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
