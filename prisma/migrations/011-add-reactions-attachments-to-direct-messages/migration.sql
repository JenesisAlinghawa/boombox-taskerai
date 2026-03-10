-- AlterTable
ALTER TABLE "DirectMessage" ADD COLUMN     "attachments" TEXT[],
ADD COLUMN     "reactions" JSONB[];
