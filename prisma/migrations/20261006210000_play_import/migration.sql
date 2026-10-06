-- AlterTable
ALTER TABLE "PlayConsoleInboxMessage" ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "PlayConsoleKpiDaily" ADD COLUMN     "anrRate" DECIMAL(8,6),
ADD COLUMN     "crashRate" DECIMAL(8,6),
ALTER COLUMN "totalAudienceSize" DROP NOT NULL,
ALTER COLUMN "totalAudienceSize" DROP DEFAULT,
ALTER COLUMN "storeListingVisitors" DROP NOT NULL,
ALTER COLUMN "storeListingVisitors" DROP DEFAULT,
ALTER COLUMN "storeListingAcquisitions" DROP NOT NULL,
ALTER COLUMN "storeListingAcquisitions" DROP DEFAULT,
ALTER COLUMN "storeListingConversionRate" DROP NOT NULL,
ALTER COLUMN "storeListingConversionRate" DROP DEFAULT,
ALTER COLUMN "activeDevices" DROP NOT NULL,
ALTER COLUMN "activeDevices" DROP DEFAULT,
ALTER COLUMN "uninstallsCount" DROP NOT NULL,
ALTER COLUMN "uninstallsCount" DROP DEFAULT,
ALTER COLUMN "crashesCount" DROP NOT NULL,
ALTER COLUMN "crashesCount" DROP DEFAULT,
ALTER COLUMN "anrsCount" DROP NOT NULL,
ALTER COLUMN "anrsCount" DROP DEFAULT,
ALTER COLUMN "ratingAverage" DROP NOT NULL,
ALTER COLUMN "ratingAverage" DROP DEFAULT,
ALTER COLUMN "ratingsCount" DROP NOT NULL,
ALTER COLUMN "ratingsCount" DROP DEFAULT,
ALTER COLUMN "revenue" DROP NOT NULL,
ALTER COLUMN "revenue" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "PlayConsoleInboxMessage_workspaceId_externalId_key" ON "PlayConsoleInboxMessage"("workspaceId", "externalId");

