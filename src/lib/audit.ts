import { prisma } from "@/lib/prisma";

export async function logAudit(params: {
  userId?: string;
  userName: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "REVERSE" | "RESET";
  entityType: string;
  entityId?: string;
  description: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        description: params.description,
      },
    });
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}
