-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DECIMAL(38,18),
    "percentage" DECIMAL(5,2),
    "receiptuuid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);
