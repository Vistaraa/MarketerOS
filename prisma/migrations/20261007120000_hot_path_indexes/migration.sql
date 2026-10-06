-- CreateIndex
CREATE INDEX "BackgroundJob_status_runAt_idx" ON "BackgroundJob"("status", "runAt");

-- CreateIndex
CREATE INDEX "BackgroundJob_integrationId_status_idx" ON "BackgroundJob"("integrationId", "status");

-- CreateIndex
CREATE INDEX "Invoice_workspaceId_invoiceDate_idx" ON "Invoice"("workspaceId", "invoiceDate");

-- CreateIndex
CREATE INDEX "OAuthState_userId_providerKey_idx" ON "OAuthState"("userId", "providerKey");

-- CreateIndex
CREATE INDEX "OAuthState_workspaceId_providerKey_idx" ON "OAuthState"("workspaceId", "providerKey");

-- CreateIndex
CREATE INDEX "Subscription_status_currentPeriodEnd_idx" ON "Subscription"("status", "currentPeriodEnd");

-- CreateIndex
CREATE INDEX "User_deletionScheduledAt_idx" ON "User"("deletionScheduledAt");

