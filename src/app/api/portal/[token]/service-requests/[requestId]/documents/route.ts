import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePortalClientByToken } from "@/lib/portalAuth";
import { supabaseAdmin, DOCUMENTS_BUCKET } from "@/lib/supabaseAdmin";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string; requestId: string } }
) {
  const client = await resolvePortalClientByToken(params.token);
  if (!client) return NextResponse.json({ error: "رابط غير صالح" }, { status: 404 });

  const request = await prisma.serviceRequest.findUnique({ where: { id: params.requestId } });
  if (!request || request.clientId !== client.id) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const categoryId = (formData.get("categoryId") as string | null) || null;
  if (!file) return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 });

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `service-requests/${params.requestId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream" });

  if (uploadError) {
    return NextResponse.json({ error: `فشل رفع الملف: ${uploadError.message}` }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(DOCUMENTS_BUCKET).getPublicUrl(storagePath);

  const document = await prisma.serviceRequestDocument.create({
    data: {
      serviceRequestId: params.requestId,
      categoryId: categoryId || undefined,
      fileName: file.name,
      fileUrl: publicUrlData.publicUrl,
      fileSize: file.size,
    },
  });

  await prisma.serviceRequest.update({
    where: { id: params.requestId },
    data: { status: "DOCS_SUBMITTED" },
  });

  return NextResponse.json(document, { status: 201 });
}
