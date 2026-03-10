-- AlterTable Task: Add new UUID column
ALTER TABLE "Task" ADD COLUMN "id_new" TEXT;

-- Generate UUIDs for existing tasks
UPDATE "Task" SET "id_new" = gen_random_uuid()::text WHERE "id_new" IS NULL;

-- Make the new column NOT NULL
ALTER TABLE "Task" ALTER COLUMN "id_new" SET NOT NULL;

-- Step 2: Create mapping from old integer id to new UUID id for relations
-- We'll use a temporary table to store the mapping
CREATE TEMPORARY TABLE task_id_mapping AS
SELECT "id", "id_new" FROM "Task";

-- Step 3: Drop the old foreign key constraints
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_taskId_fkey";
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_taskId_fkey";

-- Step 4: Change Comment.taskId and Attachment.taskId from INT to TEXT
ALTER TABLE "Comment" ALTER COLUMN "taskId" SET DATA TYPE TEXT USING CAST("taskId" AS TEXT);
ALTER TABLE "Attachment" ALTER COLUMN "taskId" SET DATA TYPE TEXT USING CAST("taskId" AS TEXT);

-- Step 5: Update Comment and Attachment taskId with the new UUID values
UPDATE "Comment" c SET "taskId" = t."id_new" FROM "Task" t WHERE CAST(c."taskId" AS INTEGER) = t."id";
UPDATE "Attachment" a SET "taskId" = t."id_new" FROM "Task" t WHERE CAST(a."taskId" AS INTEGER) = t."id";

-- Step 6: Drop the old primary key constraint
ALTER TABLE "Task" DROP CONSTRAINT "Task_pkey";

-- Step 7: Drop the old id column and rename new one
ALTER TABLE "Task" DROP COLUMN "id";
ALTER TABLE "Task" RENAME COLUMN "id_new" TO "id";

-- Step 8: Add the primary key constraint back
ALTER TABLE "Task" ADD CONSTRAINT "Task_pkey" PRIMARY KEY ("id");

-- Step 9: Add foreign key constraints back
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
