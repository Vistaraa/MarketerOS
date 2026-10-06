-- TikTok and Shopify are no longer supported. Rows that still use those values are cleaned up first, because the
-- enum can't be narrowed while any row holds a removed value.

-- Connections and their synced metrics go; pending syncs for them would only fail.
DELETE FROM "BackgroundJob"
WHERE "status" = 'QUEUED'
  AND ("integrationId" IN (SELECT "id" FROM "Integration" WHERE "platform" IN ('TIKTOK', 'SHOPIFY'))
    OR "payload"->>'integrationId' IN (SELECT "id" FROM "Integration" WHERE "platform" IN ('TIKTOK', 'SHOPIFY')));
DELETE FROM "PlatformMetricDaily" WHERE "platform" IN ('TIKTOK', 'SHOPIFY');
DELETE FROM "Integration" WHERE "platform" IN ('TIKTOK', 'SHOPIFY');
DELETE FROM "SocialAccount" WHERE "platform" IN ('TIKTOK', 'SHOPIFY');
DELETE FROM "OAuthState" WHERE "platform" IN ('TIKTOK', 'SHOPIFY');

-- User content is kept, without the removed platform.
UPDATE "Campaign" SET "platform" = 'OTHER' WHERE "platform" IN ('TIKTOK', 'SHOPIFY');
UPDATE "Content" SET "platform" = NULL WHERE "platform" IN ('TIKTOK', 'SHOPIFY');
UPDATE "Lead" SET "source" = 'OTHER' WHERE "source" = 'TIKTOK';
UPDATE "ContentTemplate" SET "platforms" = array_remove(array_remove("platforms", 'tiktok'), 'shopify')
WHERE "platforms" && ARRAY['tiktok', 'shopify'];

-- AlterEnum
BEGIN;
CREATE TYPE "LeadSource_new" AS ENUM ('WEBSITE', 'GOOGLE_ADS', 'FACEBOOK_ADS', 'INSTAGRAM', 'LINKEDIN', 'REFERRAL', 'MANUAL', 'IMPORT', 'OTHER');
ALTER TABLE "Lead" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "source" TYPE "LeadSource_new" USING ("source"::text::"LeadSource_new");
ALTER TYPE "LeadSource" RENAME TO "LeadSource_old";
ALTER TYPE "LeadSource_new" RENAME TO "LeadSource";
DROP TYPE "LeadSource_old";
ALTER TABLE "Lead" ALTER COLUMN "source" SET DEFAULT 'WEBSITE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Platform_new" AS ENUM ('GOOGLE_ADS', 'GOOGLE_ANALYTICS', 'GOOGLE_SEARCH_CONSOLE', 'YOUTUBE', 'GOOGLE_BUSINESS_PROFILE', 'FIREBASE_ADMOB', 'META_ADS', 'FACEBOOK', 'INSTAGRAM', 'MESSENGER', 'WHATSAPP', 'LINKEDIN', 'X', 'GOOGLE_PLAY', 'OTHER');
ALTER TABLE "OAuthState" ALTER COLUMN "platform" TYPE "Platform_new" USING ("platform"::text::"Platform_new");
ALTER TABLE "Integration" ALTER COLUMN "platform" TYPE "Platform_new" USING ("platform"::text::"Platform_new");
ALTER TABLE "PlatformMetricDaily" ALTER COLUMN "platform" TYPE "Platform_new" USING ("platform"::text::"Platform_new");
ALTER TABLE "Campaign" ALTER COLUMN "platform" TYPE "Platform_new" USING ("platform"::text::"Platform_new");
ALTER TABLE "SocialAccount" ALTER COLUMN "platform" TYPE "Platform_new" USING ("platform"::text::"Platform_new");
ALTER TABLE "Content" ALTER COLUMN "platform" TYPE "Platform_new" USING ("platform"::text::"Platform_new");
ALTER TYPE "Platform" RENAME TO "Platform_old";
ALTER TYPE "Platform_new" RENAME TO "Platform";
DROP TYPE "Platform_old";
COMMIT;
