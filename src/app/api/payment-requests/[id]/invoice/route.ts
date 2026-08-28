import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, DOCUMENTS_BUCKET } from "@/lib/supabaseAdmin";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = session.user as any;

  const request = await prisma.paymentRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

  if (request.status !== "PAID") {
    return NextResponse.json({ error: "لازم يتم التحويل أولاً قبل إرفاق الفاتورة" }, { status: 400 });
  }
  if (request.requestedById !== user.id && user.role !== "PARTNER") {
    return NextResponse.json({ error: "إرفاق الفاتورة متاح لمقدّم الطلب أو الشريك فقط" }, { status: 403 });
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
  const storagePath = `payment-request-invoices/${params.id}-${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream" });

  if (uploadError) {
    return NextResponse.json({ error: `فشل رفع الفاتورة: ${uploadError.message}` }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(DOCUMENTS_BUCKET).getPublicUrl(storagePath);

  const updated = await prisma.paymentRequest.update({
    where: { id: params.id },
    data: { invoiceUrl: publicUrlData.publicUrl, invoiceName: file.name, invoiceUploadedAt: new Date() },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityType: "PaymentRequest",
    entityId: params.id,
    description: `أرفق فاتورة المورد لطلب صرف: ${request.requestNumber}`,
  });

  return NextResponse.json(updated);
}
