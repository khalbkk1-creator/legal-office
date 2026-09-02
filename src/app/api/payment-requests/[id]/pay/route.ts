import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postJournalEntry, assertDateNotLocked } from "@/lib/accounting";
import { supabaseAdmin, DOCUMENTS_BUCKET } from "@/lib/supabaseAdmin";
import { logAudit } from "@/lib/audit";
import { logPaymentActivity } from "@/lib/paymentActivity";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = session.user as any;

  const request = await prisma.paymentRequest.findUnique({
    where: { id: params.id },
    include: { payee: true },
  });
  if (!request) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

  const isOwner = request.requestedById === user.id;
  if (!isOwner && user.role !== "PARTNER") {
    return NextResponse.json({ error: "تنفيذ الصرف متاح لمقدّم الطلب أو الشريك فقط" }, { status: 403 });
  }
  if (request.status !== "APPROVED") {
    return NextResponse.json({ error: "الطلب لازم يكون معتمد بالكامل قبل الصرف" }, { status: 400 });
  }

  try {
    await assertDateNotLocked(new Date());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  const formData = await req.formData();
  const paymentAccountId = formData.get("paymentAccountId") as string;
  const file = formData.get("file") as File | null;

  if (!paymentAccountId) {
    return NextResponse.json({ error: "حدد الحساب النقدي/البنكي المصروف منه" }, { status: 400 });
  }

  let transferProofUrl: string | undefined;
  let transferProofName: string | undefined;

  if (file) {
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)" }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `payment-transfer-proofs/${params.id}-${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream" });

    if (uploadError) {
      return NextResponse.json({ error: `فشل رفع إثبات التحويل: ${uploadError.message}` }, { status: 500 });
    }
    const { data: publicUrlData } = supabaseAdmin.storage.from(DOCUMENTS_BUCKET).getPublicUrl(storagePath);
    transferProofUrl = publicUrlData.publicUrl;
    transferProofName = file.name;
  }

  const journalEntry = await postJournalEntry({
    description: `دفعة لمورد — ${request.requestNumber}`,
    sourceType: "PAYMENT_REQUEST_DISBURSEMENT",
    sourceId: request.id,
    createdById: user.id,
    lines: [
      { accountId: request.payee.accountId, debit: request.amount, description: `دفعة — ${request.requestNumber}` },
      { accountId: paymentAccountId, credit: request.amount, description: `دفعة — ${request.requestNumber}` },
    ],
  });

  const updated = await prisma.paymentRequest.update({
    where: { id: params.id },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paymentAccountId,
      transferProofUrl,
      transferProofName,
      paymentJournalEntryId: journalEntry.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityType: "PaymentRequest",
    entityId: params.id,
    description: `صرف ورحّل دفعة طلب صرف: ${request.requestNumber} (${request.amount.toLocaleString()} ر.س)`,
  });

  await logPaymentActivity({ requestId: params.id, userId: user.id, userName: user.name, action: "PAID" });

  return NextResponse.json(updated);
}
