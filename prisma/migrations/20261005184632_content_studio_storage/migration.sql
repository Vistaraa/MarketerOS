-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "contentStudioSettings" JSONB;

-- CreateTable
CREATE TABLE "ContentTemplate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'My Templates',
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "thumbnailUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "headline" TEXT,
    "subheadline" TEXT,
    "captionTemplate" TEXT,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" DOUBLE PRECISION,
    "folder" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HashtagGroup" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HashtagGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentTemplate_workspaceId_idx" ON "ContentTemplate"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");

-- CreateIndex
CREATE INDEX "MediaAsset_workspaceId_createdAt_idx" ON "MediaAsset"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "HashtagGroup_workspaceId_idx" ON "HashtagGroup"("workspaceId");

-- AddForeignKey
ALTER TABLE "ContentTemplate" ADD CONSTRAINT "ContentTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HashtagGroup" ADD CONSTRAINT "HashtagGroup_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
