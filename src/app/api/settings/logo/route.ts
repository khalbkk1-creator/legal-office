import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, DOCUMENTS_BUCKET } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "PARTNER") {
    return NextResponse.json({ error: "تعديل الإعدادات متاح للشريك فقط" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 });

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const ext = (file.name.split(".").pop() || "png").replace(/[^a-zA-Z0-9]/g, "");
  const storagePath = `office/logo-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type || "image/png", upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: `فشل رفع الشعار: ${uploadError.message}` }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(DOCUMENTS_BUCKET).getPublicUrl(storagePath);

  const existing = await prisma.officeSettings.findFirst();
  const settings = existing
    ? await prisma.officeSettings.update({
        where: { id: existing.id },
        data: { logoUrl: publicUrlData.publicUrl },
      })
    : await prisma.officeSettings.create({ data: { logoUrl: publicUrlData.publicUrl } });

  return NextResponse.json(settings);
}
