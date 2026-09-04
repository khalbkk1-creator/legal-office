import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePortalClientByToken, logPortalAccess } from "@/lib/portalAuth";

// العميل يعدّل بيانات التواصل فقط — النوع ورقم الهوية والإيميل من صلاحية المكتب
export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  const client = await resolvePortalClientByToken(params.token, "/profile");
  if (!client) return NextResponse.json({ error: "الرابط غير صالح أو منتهي" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.phone === "string" && body.phone.trim()) data.phone = body.phone.trim();
  if (typeof body.address === "string") data.address = body.address.trim() || null;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "لا توجد بيانات قابلة للتعديل" }, { status: 400 });
  const updated = await prisma.client.update({ where: { id: client.id }, data });
  await logPortalAccess(client.id, "PROFILE_UPDATE", { detail: Object.keys(data).join("، ") });
  return NextResponse.json({ id: updated.id, name: updated.name, phone: updated.phone, address: updated.address });
}
