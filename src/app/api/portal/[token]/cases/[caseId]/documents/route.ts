import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePortalClientByToken } from "@/lib/portalAuth";
import { supabaseAdmin, DOCUMENTS_BUCKET } from "@/lib/supabaseAdmin";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string; caseId: string } }
) {
  const client = await resolvePortalClientByToken(params.token);
  if (!client) return NextResponse.json({ error: "رابط غير صالح" }, { status: 404 });

  const caseItem = await prisma.case.findUnique({ where: { id: params.caseId } });
  if (!caseItem || caseItem.clientId !== client.id) {
    return NextResponse.json({ error: "القضية غير موجودة" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 });

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${params.caseId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream" });

  if (uploadError) {
    return NextResponse.json({ error: `فشل رفع الملف: ${uploadError.message}` }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(DOCUMENTS_BUCKET).getPublicUrl(storagePath);

  const document = await prisma.caseDocument.create({
    data: {
      caseId: params.caseId,
      fileName: file.name,
      fileUrl: publicUrlData.publicUrl,
      fileSize: file.size,
    },
  });

  return NextResponse.json(document, { status: 201 });
}
