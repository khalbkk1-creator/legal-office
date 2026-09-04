import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueAccessToken, logPortalAccess, LINK_TTL_DAYS } from "@/lib/portalAuth";

// توليد رابط جديد (يبطل القديم) بصلاحية LINK_TTL_DAYS
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { token, expires } = await issueAccessToken(params.id);
  await logPortalAccess(params.id, "LINK_ISSUED", { detail: `صلاحية ${LINK_TTL_DAYS} يوم — بواسطة ${(session.user as any)?.name ?? ""}` });
  return NextResponse.json({ accessToken: token, expiresAt: expires });
}

// إلغاء الرابط فوراً
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  await prisma.client.update({ where: { id: params.id }, data: { accessToken: null, accessTokenExpiresAt: null } });
  await logPortalAccess(params.id, "LINK_REVOKED", { detail: `بواسطة ${(session.user as any)?.name ?? ""}` });
  return NextResponse.json({ ok: true });
}

// تعطيل/تفعيل البوابة، وفك القفل
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.portalDisabled === "boolean") data.portalDisabled = body.portalDisabled;
  if (body.unlock) { data.lockedUntil = null; data.failedLoginCount = 0; }
  const updated = await prisma.client.update({ where: { id: params.id }, data });
  if (typeof body.portalDisabled === "boolean") await logPortalAccess(params.id, body.portalDisabled ? "PORTAL_DISABLED" : "PORTAL_ENABLED", { detail: `بواسطة ${(session.user as any)?.name ?? ""}` });
  if (body.unlock) await logPortalAccess(params.id, "UNLOCKED", { detail: `بواسطة ${(session.user as any)?.name ?? ""}` });
  return NextResponse.json({ ok: true, portalDisabled: updated.portalDisabled });
}
