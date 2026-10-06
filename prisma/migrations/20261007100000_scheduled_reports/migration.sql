-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "nextRunAt" TIMESTAMP(3),
ADD COLUMN     "scheduleFrequency" TEXT;

-- CreateIndex
CREATE INDEX "Report_nextRunAt_idx" ON "Report"("nextRunAt");

