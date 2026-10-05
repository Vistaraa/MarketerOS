-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'ANALYST', 'CONTENT_MANAGER', 'SALES', 'VIEWER');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'SUSPENDED', 'ERROR', 'EXPIRED', 'PENDING');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('GOOGLE_ADS', 'GOOGLE_ANALYTICS', 'GOOGLE_SEARCH_CONSOLE', 'YOUTUBE', 'GOOGLE_BUSINESS_PROFILE', 'FIREBASE_ADMOB', 'META_ADS', 'FACEBOOK', 'INSTAGRAM', 'MESSENGER', 'WHATSAPP', 'LINKEDIN', 'TIKTOK', 'X', 'SHOPIFY', 'GOOGLE_PLAY', 'OTHER');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "CampaignObjective" AS ENUM ('SALES', 'LEADS', 'TRAFFIC', 'AWARENESS', 'ENGAGEMENT', 'APP_INSTALLS', 'CONVERSIONS');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('SEARCH', 'DISPLAY', 'SHOPPING', 'VIDEO', 'SOCIAL', 'LEAD_GEN', 'REMARKETING', 'PERFORMANCE_MAX', 'OTHER');

-- CreateEnum
CREATE TYPE "AdGroupStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DRAFT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DRAFT', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AdType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'CAROUSEL', 'RESPONSIVE', 'DISPLAY', 'SHOPPING');

-- CreateEnum
CREATE TYPE "KeywordMatchType" AS ENUM ('BROAD', 'PHRASE', 'EXACT');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'CONVERTED', 'LOST', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'GOOGLE_ADS', 'FACEBOOK_ADS', 'INSTAGRAM', 'LINKEDIN', 'TIKTOK', 'REFERRAL', 'MANUAL', 'IMPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('SOCIAL_POST', 'BLOG', 'EMAIL', 'AD_COPY', 'PRODUCT_DESCRIPTION', 'VIDEO_SCRIPT', 'LANDING_PAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SocialPostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'GENERATING', 'READY', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'CSV', 'XLSX', 'HTML');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('CAMPAIGN', 'AUDIENCE', 'CONTENT', 'BUDGET', 'KEYWORD', 'LEAD', 'REVENUE', 'PLATFORM');

-- CreateEnum
CREATE TYPE "InsightStatus" AS ENUM ('NEW', 'REVIEWED', 'APPLIED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'PAUSED');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CAMPAIGN', 'PERFORMANCE', 'LEAD', 'BILLING', 'CONTENT', 'TEAM', 'REPORT', 'INTEGRATION', 'AI');

-- CreateEnum
CREATE TYPE "PlayReleaseTrack" AS ENUM ('PRODUCTION', 'OPEN_TESTING', 'CLOSED_TESTING', 'INTERNAL_TESTING');

-- CreateEnum
CREATE TYPE "PlayReleaseStatus" AS ENUM ('IN_PROGRESS', 'HALTED', 'COMPLETED', 'DRAFT');

-- CreateEnum
CREATE TYPE "PlayInboxCategory" AS ENUM ('IMPORTANT', 'EVERYTHING_ELSE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "jobTitle" TEXT,
    "phone" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthState" (
    "id" TEXT NOT NULL,
    "state" TEXT,
    "stateHash" TEXT,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "platform" "Platform",
    "providerKey" TEXT,
    "returnTo" TEXT,
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "website" TEXT,
    "industry" TEXT,
    "businessType" TEXT,
    "description" TEXT,
    "country" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "monthlyBudget" DECIMAL(14,2),
    "marketingGoals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetAudience" TEXT,
    "targetAgeRange" TEXT,
    "targetGeo" TEXT,
    "targetLanguages" TEXT,
    "targetInterests" TEXT,
    "defaultDashboard" TEXT NOT NULL DEFAULT 'overview',
    "dateFormat" TEXT NOT NULL DEFAULT 'MMM d, yyyy',
    "timeFormat" TEXT NOT NULL DEFAULT 'h:mm a',
    "language" TEXT NOT NULL DEFAULT 'en',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "taxId" TEXT,
    "billingAddress" TEXT,
    "billingEmail" TEXT,
    "bonusAICredits" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industry" TEXT,
    "website" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "monthlyBudget" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT,
    "platform" "Platform" NOT NULL,
    "providerKey" TEXT,
    "accountName" TEXT,
    "accountId" TEXT,
    "apiKey" TEXT,
    "apiKeyEncrypted" TEXT,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "IntegrationStatus" NOT NULL DEFAULT 'CONNECTED',
    "metadata" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStarted" TIMESTAMP(3),
    "lastSyncFinished" TIMESTAMP(3),
    "syncFrequencyMinutes" INTEGER NOT NULL DEFAULT 60,
    "errorMessage" TEXT,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSyncLog" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recordsSynced" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "metadata" JSONB,
    "details" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "IntegrationSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformMetricDaily" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT,
    "integrationId" TEXT,
    "platform" "Platform" NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "spend" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "ctr" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "cpc" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cpa" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "roas" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "reach" BIGINT,
    "frequency" DECIMAL(6,2),
    "engagements" BIGINT,
    "rawMetrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformMetricDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT,
    "createdById" TEXT NOT NULL,
    "integrationId" TEXT,
    "name" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "type" "CampaignType" NOT NULL DEFAULT 'SEARCH',
    "objective" "CampaignObjective" NOT NULL DEFAULT 'SALES',
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "budget" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dailyBudget" DECIMAL(14,2),
    "spend" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "roas" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "ctr" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "cpc" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cpa" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "targetRoas" DECIMAL(8,2),
    "targetCpa" DECIMAL(10,2),
    "biddingStrategy" TEXT,
    "externalId" TEXT,
    "externalData" JSONB,
    "syncStatus" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdGroup" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AdGroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "bidAmount" DECIMAL(10,2),
    "externalId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "adGroupId" TEXT,
    "name" TEXT NOT NULL,
    "type" "AdType" NOT NULL DEFAULT 'TEXT',
    "status" "AdStatus" NOT NULL DEFAULT 'ACTIVE',
    "headline" TEXT,
    "description" TEXT,
    "finalUrl" TEXT,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "callToAction" TEXT,
    "externalId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "adGroupId" TEXT,
    "text" TEXT NOT NULL,
    "matchType" "KeywordMatchType" NOT NULL DEFAULT 'BROAD',
    "bidAmount" DECIMAL(10,2),
    "isNegative" BOOLEAN NOT NULL DEFAULT false,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMetricDaily" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "spend" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "ctr" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "cpc" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cpa" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "roas" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignMetricDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT,
    "platform" "Platform" NOT NULL,
    "accountId" TEXT,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "profileUrl" TEXT,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "socialAccountId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT,
    "caption" TEXT,
    "content" TEXT NOT NULL,
    "contentType" TEXT,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "SocialPostStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DECIMAL(5,2),
    "externalId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ContentType" NOT NULL DEFAULT 'SOCIAL_POST',
    "body" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "tone" TEXT,
    "targetAudience" TEXT,
    "platform" "Platform",
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cta" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "promptUsed" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT,
    "ownerId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "jobTitle" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" "LeadSource" NOT NULL DEFAULT 'WEBSITE',
    "score" INTEGER NOT NULL DEFAULT 0,
    "estimatedValue" DECIMAL(12,2),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInsight" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT,
    "recipientUserId" TEXT,
    "type" "InsightType" NOT NULL DEFAULT 'CAMPAIGN',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT NOT NULL,
    "impact" TEXT,
    "expectedImpact" TEXT,
    "score" INTEGER NOT NULL DEFAULT 50,
    "confidence" DECIMAL(5,2),
    "status" "InsightStatus" NOT NULL DEFAULT 'NEW',
    "actionPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" TEXT,
    "action" TEXT,
    "triggerType" TEXT,
    "triggerConfig" JSONB,
    "actionType" TEXT,
    "actionConfig" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "feature" TEXT,
    "kind" TEXT,
    "prompt" TEXT NOT NULL,
    "responseSummary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "inputTokens" INTEGER DEFAULT 0,
    "outputTokens" INTEGER DEFAULT 0,
    "tokensPrompt" INTEGER NOT NULL DEFAULT 0,
    "tokensResponse" INTEGER NOT NULL DEFAULT 0,
    "tokensTotal" INTEGER NOT NULL DEFAULT 0,
    "output" TEXT,
    "errorMessage" TEXT,
    "model" TEXT,
    "latencyMs" INTEGER,
    "costUsd" DECIMAL(8,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT,
    "createdById" TEXT NOT NULL,
    "name" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "format" "ReportFormat" NOT NULL DEFAULT 'PDF',
    "status" "ReportStatus" NOT NULL DEFAULT 'READY',
    "dateRange" TEXT,
    "configuration" JSONB,
    "generatedUrl" TEXT,
    "downloadUrl" TEXT,
    "fileSize" INTEGER,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" DECIMAL(10,2),
    "priceYearly" DECIMAL(10,2),
    "monthlyPrice" DECIMAL(10,2),
    "yearlyPrice" DECIMAL(10,2),
    "maxMembers" INTEGER DEFAULT 10,
    "maxClients" INTEGER DEFAULT 5,
    "maxCampaigns" INTEGER DEFAULT 20,
    "monthlyAICredits" INTEGER DEFAULT 1000,
    "storageBytes" BIGINT,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "limits" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stripePriceId" TEXT,
    "stripeProdId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planSlug" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "interval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "billingInterval" TEXT DEFAULT 'MONTHLY',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "externalCustomerId" TEXT,
    "externalSubscriptionId" TEXT,
    "razorpaySubscriptionId" TEXT,
    "razorpayPaymentId" TEXT,
    "payuTxnId" TEXT,
    "payuPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PAID',
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "stripeInvId" TEXT,
    "providerInvoiceId" TEXT,
    "items" JSONB,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "payuTxnId" TEXT,
    "payuPaymentId" TEXT,
    "payuStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "workspaceId" TEXT,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'CAMPAIGN',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "actionUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "description" TEXT,
    "beforeData" JSONB,
    "afterData" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "integrationId" TEXT,
    "name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'SYNC',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB,
    "result" JSONB,
    "error" TEXT,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextRunAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayConsoleApp" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "integrationId" TEXT,
    "packageName" TEXT NOT NULL,
    "appTitle" TEXT NOT NULL,
    "iconUrl" TEXT,
    "category" TEXT DEFAULT 'Application',
    "primaryLanguage" TEXT DEFAULT 'en',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayConsoleApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayConsoleKpiDaily" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalAudienceSize" INTEGER NOT NULL DEFAULT 0,
    "storeListingVisitors" INTEGER NOT NULL DEFAULT 0,
    "storeListingAcquisitions" INTEGER NOT NULL DEFAULT 0,
    "storeListingConversionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "activeDevices" INTEGER NOT NULL DEFAULT 0,
    "uninstallsCount" INTEGER NOT NULL DEFAULT 0,
    "crashesCount" INTEGER NOT NULL DEFAULT 0,
    "anrsCount" INTEGER NOT NULL DEFAULT 0,
    "ratingAverage" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "ratingsCount" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayConsoleKpiDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayConsoleRelease" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "track" "PlayReleaseTrack" NOT NULL DEFAULT 'PRODUCTION',
    "versionCode" INTEGER NOT NULL,
    "versionName" TEXT NOT NULL,
    "rolloutPercentage" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "status" "PlayReleaseStatus" NOT NULL DEFAULT 'COMPLETED',
    "targetDevices" TEXT[] DEFAULT ARRAY['Phones and tablets']::TEXT[],
    "userFraction" DECIMAL(5,4),
    "notes" TEXT,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayConsoleRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayConsoleInboxMessage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "appId" TEXT,
    "category" "PlayInboxCategory" NOT NULL DEFAULT 'EVERYTHING_ELSE',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayConsoleInboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserKpiPreference" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "pinnedKpis" TEXT[] DEFAULT ARRAY['total_audience', 'store_visitors', 'conversion_rate', 'crashes_anrs', 'daily_active']::TEXT[],
    "kpiOrder" TEXT[] DEFAULT ARRAY['total_audience', 'store_visitors', 'conversion_rate', 'crashes_anrs', 'daily_active']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKpiPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthState_stateHash_key" ON "OAuthState"("stateHash");

-- CreateIndex
CREATE INDEX "OAuthState_workspaceId_idx" ON "OAuthState"("workspaceId");

-- CreateIndex
CREATE INDEX "OAuthState_expiresAt_idx" ON "OAuthState"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");

-- CreateIndex
CREATE INDEX "Workspace_status_idx" ON "Workspace"("status");

-- CreateIndex
CREATE INDEX "Client_workspaceId_status_idx" ON "Client"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Client_workspaceId_updatedAt_idx" ON "Client"("workspaceId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Client_workspaceId_slug_key" ON "Client"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "Integration_workspaceId_platform_idx" ON "Integration"("workspaceId", "platform");

-- CreateIndex
CREATE INDEX "Integration_workspaceId_updatedAt_idx" ON "Integration"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "Integration_status_idx" ON "Integration"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_workspaceId_platform_accountId_key" ON "Integration"("workspaceId", "platform", "accountId");

-- CreateIndex
CREATE INDEX "IntegrationSyncLog_integrationId_startedAt_idx" ON "IntegrationSyncLog"("integrationId", "startedAt");

-- CreateIndex
CREATE INDEX "PlatformMetricDaily_workspaceId_date_idx" ON "PlatformMetricDaily"("workspaceId", "date");

-- CreateIndex
CREATE INDEX "PlatformMetricDaily_platform_date_idx" ON "PlatformMetricDaily"("platform", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformMetricDaily_workspaceId_platform_date_integrationId_key" ON "PlatformMetricDaily"("workspaceId", "platform", "date", "integrationId");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_status_idx" ON "Campaign"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_updatedAt_idx" ON "Campaign"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "Campaign_platform_status_idx" ON "Campaign"("platform", "status");

-- CreateIndex
CREATE INDEX "Campaign_externalId_idx" ON "Campaign"("externalId");

-- CreateIndex
CREATE INDEX "AdGroup_campaignId_idx" ON "AdGroup"("campaignId");

-- CreateIndex
CREATE INDEX "Ad_campaignId_idx" ON "Ad"("campaignId");

-- CreateIndex
CREATE INDEX "Ad_adGroupId_idx" ON "Ad"("adGroupId");

-- CreateIndex
CREATE INDEX "Keyword_campaignId_idx" ON "Keyword"("campaignId");

-- CreateIndex
CREATE INDEX "Keyword_adGroupId_idx" ON "Keyword"("adGroupId");

-- CreateIndex
CREATE INDEX "CampaignMetricDaily_campaignId_date_idx" ON "CampaignMetricDaily"("campaignId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMetricDaily_campaignId_date_key" ON "CampaignMetricDaily"("campaignId", "date");

-- CreateIndex
CREATE INDEX "SocialAccount_workspaceId_idx" ON "SocialAccount"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_workspaceId_platform_username_key" ON "SocialAccount"("workspaceId", "platform", "username");

-- CreateIndex
CREATE INDEX "SocialPost_socialAccountId_status_idx" ON "SocialPost"("socialAccountId", "status");

-- CreateIndex
CREATE INDEX "SocialPost_socialAccountId_updatedAt_idx" ON "SocialPost"("socialAccountId", "updatedAt");

-- CreateIndex
CREATE INDEX "SocialPost_workspaceId_idx" ON "SocialPost"("workspaceId");

-- CreateIndex
CREATE INDEX "Content_workspaceId_status_idx" ON "Content"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Content_workspaceId_updatedAt_idx" ON "Content"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "Content_type_idx" ON "Content"("type");

-- CreateIndex
CREATE INDEX "Lead_workspaceId_status_idx" ON "Lead"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Lead_workspaceId_createdAt_idx" ON "Lead"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "AIInsight_workspaceId_status_idx" ON "AIInsight"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "AIInsight_workspaceId_updatedAt_idx" ON "AIInsight"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "AIInsight_campaignId_idx" ON "AIInsight"("campaignId");

-- CreateIndex
CREATE INDEX "Automation_workspaceId_isActive_idx" ON "Automation"("workspaceId", "isActive");

-- CreateIndex
CREATE INDEX "Automation_workspaceId_updatedAt_idx" ON "Automation"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "AIRequest_workspaceId_createdAt_idx" ON "AIRequest"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Report_workspaceId_idx" ON "Report"("workspaceId");

-- CreateIndex
CREATE INDEX "Report_workspaceId_updatedAt_idx" ON "Report"("workspaceId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_workspaceId_key" ON "Subscription"("workspaceId");

-- CreateIndex
CREATE INDEX "Subscription_workspaceId_idx" ON "Subscription"("workspaceId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_workspaceId_idx" ON "Invoice"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingWebhookEvent_eventId_key" ON "BillingWebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX "BillingWebhookEvent_eventId_idx" ON "BillingWebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX "BillingWebhookEvent_workspaceId_idx" ON "BillingWebhookEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_workspaceId_idx" ON "Notification"("workspaceId");

-- CreateIndex
CREATE INDEX "Notification_workspaceId_userId_createdAt_idx" ON "Notification"("workspaceId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "BackgroundJob_workspaceId_status_idx" ON "BackgroundJob"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "BackgroundJob_type_status_idx" ON "BackgroundJob"("type", "status");

-- CreateIndex
CREATE INDEX "PlayConsoleApp_workspaceId_idx" ON "PlayConsoleApp"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayConsoleApp_workspaceId_packageName_key" ON "PlayConsoleApp"("workspaceId", "packageName");

-- CreateIndex
CREATE INDEX "PlayConsoleKpiDaily_workspaceId_date_idx" ON "PlayConsoleKpiDaily"("workspaceId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PlayConsoleKpiDaily_appId_date_key" ON "PlayConsoleKpiDaily"("appId", "date");

-- CreateIndex
CREATE INDEX "PlayConsoleRelease_workspaceId_appId_idx" ON "PlayConsoleRelease"("workspaceId", "appId");

-- CreateIndex
CREATE INDEX "PlayConsoleRelease_track_status_idx" ON "PlayConsoleRelease"("track", "status");

-- CreateIndex
CREATE INDEX "PlayConsoleInboxMessage_workspaceId_category_isRead_idx" ON "PlayConsoleInboxMessage"("workspaceId", "category", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "UserKpiPreference_workspaceId_key" ON "UserKpiPreference"("workspaceId");

-- CreateIndex
CREATE INDEX "RateLimit_windowStart_idx" ON "RateLimit"("windowStart");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthState" ADD CONSTRAINT "OAuthState_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthState" ADD CONSTRAINT "OAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationSyncLog" ADD CONSTRAINT "IntegrationSyncLog_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformMetricDaily" ADD CONSTRAINT "PlatformMetricDaily_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformMetricDaily" ADD CONSTRAINT "PlatformMetricDaily_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformMetricDaily" ADD CONSTRAINT "PlatformMetricDaily_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdGroup" ADD CONSTRAINT "AdGroup_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_adGroupId_fkey" FOREIGN KEY ("adGroupId") REFERENCES "AdGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_adGroupId_fkey" FOREIGN KEY ("adGroupId") REFERENCES "AdGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMetricDaily" ADD CONSTRAINT "CampaignMetricDaily_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRequest" ADD CONSTRAINT "AIRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRequest" ADD CONSTRAINT "AIRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingWebhookEvent" ADD CONSTRAINT "BillingWebhookEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayConsoleApp" ADD CONSTRAINT "PlayConsoleApp_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayConsoleApp" ADD CONSTRAINT "PlayConsoleApp_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayConsoleKpiDaily" ADD CONSTRAINT "PlayConsoleKpiDaily_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayConsoleKpiDaily" ADD CONSTRAINT "PlayConsoleKpiDaily_appId_fkey" FOREIGN KEY ("appId") REFERENCES "PlayConsoleApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayConsoleRelease" ADD CONSTRAINT "PlayConsoleRelease_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayConsoleRelease" ADD CONSTRAINT "PlayConsoleRelease_appId_fkey" FOREIGN KEY ("appId") REFERENCES "PlayConsoleApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayConsoleInboxMessage" ADD CONSTRAINT "PlayConsoleInboxMessage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayConsoleInboxMessage" ADD CONSTRAINT "PlayConsoleInboxMessage_appId_fkey" FOREIGN KEY ("appId") REFERENCES "PlayConsoleApp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKpiPreference" ADD CONSTRAINT "UserKpiPreference_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

