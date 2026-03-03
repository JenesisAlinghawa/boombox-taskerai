-- AlterTable
ALTER TABLE "DirectMessage" ADD COLUMN     "parentMessageId" INTEGER;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "DirectMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
