/*
  Warnings:

  - You are about to drop the `ai_lp` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "ai_lp";

-- CreateTable
CREATE TABLE "Action" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "by" TEXT NOT NULL,
    "details" JSONB,
    "poolName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pool" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "holdings" JSONB,

    CONSTRAINT "Pool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pool_name_key" ON "Pool"("name");
