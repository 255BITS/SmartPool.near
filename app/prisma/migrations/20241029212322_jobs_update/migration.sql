/*
  Warnings:

  - You are about to drop the column `amount` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `percentage` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `receiptuuid` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Job` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Job" DROP COLUMN "amount",
DROP COLUMN "percentage",
DROP COLUMN "receiptuuid",
DROP COLUMN "userId";
