-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletionScheduledAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "deletionScheduledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WorkspaceExport" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requestedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT,
    "sizeBytes" INTEGER,
    "errorMessage" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WorkspaceExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceExport_workspaceId_createdAt_idx" ON "WorkspaceExport"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkspaceExport_expiresAt_idx" ON "WorkspaceExport"("expiresAt");

-- CreateIndex
CREATE INDEX "Workspace_deletionScheduledAt_idx" ON "Workspace"("deletionScheduledAt");

-- AddForeignKey
ALTER TABLE "WorkspaceExport" ADD CONSTRAINT "WorkspaceExport_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

