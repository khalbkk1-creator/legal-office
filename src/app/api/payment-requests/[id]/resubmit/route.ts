import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, DOCUMENTS_BUCKET } from "@/lib/supabaseAdmin";
import { logAudit } from "@/lib/audit";
import { logPaymentActivity } from "@/lib/paymentActivity";

// صاحب الطلب (أو الشريك) يعدّل الطلب المُرجع/المرفوض ويعيد تقديمه من بداية سلسلة الاعتماد
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const user = session.user as any;

  const request = await prisma.paymentRequest.findUnique({ where: { id: params.id }, include: { requestedBy: true } });
  if (!request) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  if (request.status !== "RETURNED" && request.status !== "REJECTED") {
    return NextResponse.json({ error: "إعادة التقديم متاحة فقط للطلبات المُرجعة أو المرفوضة" }, { status: 400 });
  }
  const isOwner = request.requestedById === user.id;
  if (!isOwner && user.role !== "PARTNER") {
    return NextResponse.json({ error: "إعادة التقديم متاحة لصاحب الطلب فقط" }, { status: 403 });
  }

  const formData = await req.formData();
  const description = ((formData.get("description") as string) || request.description).trim();
  const amount = formData.get("amount") ? Number(formData.get("amount")) : request.amount;
  const vatAmount = formData.get("vatAmount") !== null && formData.get("vatAmount") !== "" ? Number(formData.get("vatAmount")) : request.vatAmount;
  const categoryId = formData.has("categoryId") ? ((formData.get("categoryId") as string) || null) : request.categoryId;
  const changeNote = ((formData.get("note") as string) || "").trim();
  const file = formData.get("file") as File | null;

  if (!description) return NextResponse.json({ error: "الوصف مطلوب" }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "المبلغ غير صالح" }, { status: 400 });
  if (!Number.isFinite(vatAmount) || vatAmount < 0 || vatAmount > amount) return NextResponse.json({ error: "قيمة الضريبة غير صالحة" }, { status: 400 });

  let attachmentUrl = request.attachmentUrl;
  let attachmentName = request.attachmentName;
  if (file && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `payment-request-attachments/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream" });
    if (uploadError) return NextResponse.json({ error: `فشل رفع المستند: ${uploadError.message}` }, { status: 500 });
    attachmentUrl = supabaseAdmin.storage.from(DOCUMENTS_BUCKET).getPublicUrl(storagePath).data.publicUrl;
    attachmentName = file.name;
  }

  const needsManagerApproval = !!request.requestedBy.managerId;
  const changes: string[] = [];
  if (description !== request.description) changes.push("الوصف");
  if (amount !== request.amount) changes.push(`المبلغ ${request.amount.toLocaleString()} ← ${amount.toLocaleString()}`);
  if (vatAmount !== request.vatAmount) changes.push("الضريبة");
  if (categoryId !== request.categoryId) changes.push("التصنيف");
  if (attachmentUrl !== request.attachmentUrl) changes.push("المرفق");

  const updated = await prisma.paymentRequest.update({
    where: { id: params.id },
    data: {
      description,
      amount,
      vatAmount,
      categoryId,
      attachmentUrl,
      attachmentName,
      needsManagerApproval,
      status: needsManagerApproval ? "PENDING_MANAGER" : "PENDING_ACCOUNTANT",
      managerApprovedById: null, managerApprovedAt: null, managerNote: null,
      accountantApprovedById: null, accountantApprovedAt: null, accountantNote: null,
      financeApprovedById: null, financeApprovedAt: null, financeNote: null,
      rejectedById: null, rejectedAt: null, rejectionReason: null,
      returnedById: null, returnedAt: null, returnReason: null,
    },
  });

  const summary = [changes.length ? `تعديلات: ${changes.join("، ")}` : "بدون تعديل على البيانات", changeNote].filter(Boolean).join(" — ");
  await logAudit({ userId: user.id, userName: user.name, action: "UPDATE", entityType: "PaymentRequest", entityId: params.id, description: `أعاد تقديم طلب صرف: ${request.requestNumber} — ${summary}` });
  await logPaymentActivity({ requestId: params.id, userId: user.id, userName: user.name, action: "RESUBMITTED", note: summary });

  return NextResponse.json(updated);
}
