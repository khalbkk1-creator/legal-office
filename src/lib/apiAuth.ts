import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export function generateApiKey() {
  const raw = "sk_" + randomBytes(24).toString("hex");
  const prefix = raw.slice(0, 11); // "sk_" + أول 8 خانات، للعرض فقط
  return { raw, prefix };
}

export async function verifyApiKey(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const rawKey = authHeader.slice(7);
  if (!rawKey) return false;

  const activeKeys = await prisma.apiKey.findMany({ where: { isActive: true } });
  for (const key of activeKeys) {
    const match = await bcrypt.compare(rawKey, key.keyHash);
    if (match) {
      await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
      return true;
    }
  }
  return false;
}
