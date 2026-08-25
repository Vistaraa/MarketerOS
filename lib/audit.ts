import { prisma } from "@/lib/prisma";

export async function recordAudit(input: { workspaceId: string; userId?: string; action: string; module: string; entityType?: string; entityId?: string; description?: string; beforeData?: unknown; afterData?: unknown }) {
  await prisma.auditLog.create({ data: { workspaceId: input.workspaceId, userId: input.userId, action: input.action, module: input.module, entityType: input.entityType, entityId: input.entityId, description: input.description, beforeData: input.beforeData as never, afterData: input.afterData as never } });
}
