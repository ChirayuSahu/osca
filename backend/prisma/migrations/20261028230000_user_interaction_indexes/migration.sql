-- CreateIndex
CREATE INDEX "UserInteraction_userId_action_idx" ON "UserInteraction"("userId", "action");

-- CreateIndex
CREATE INDEX "UserInteraction_repositoryId_userId_idx" ON "UserInteraction"("repositoryId", "userId");
