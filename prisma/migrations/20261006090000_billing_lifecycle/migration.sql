-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "complimentary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLifecycleNotice" TEXT;

-- CreateTable
CREATE TABLE "SystemTask" (
    "name" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemTask_pkey" PRIMARY KEY ("name")
);

-- Workspaces created before trials existed were given Pro for free. Keep their access unchanged:
-- any subscription that was never paid for becomes complimentary (it never expires or locks).
UPDATE "Subscription"
SET "complimentary" = true
WHERE "payuPaymentId" IS NULL AND "payuTxnId" IS NULL AND "razorpayPaymentId" IS NULL AND "stripeSubscriptionId" IS NULL;
