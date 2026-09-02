import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, DOCUMENTS_BUCKET } from "@/lib/supabaseAdmin";
import { logAudit } from "@/lib/audit";
import { logPaymentActivity } from "@/lib/paymentActivity";

async function nextRequestNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.paymentRequest.count({
    where: { requestNumber: { startsWith: `PR-${year}-` } },
  });
  return `PR-${year}-${(count + 1).toString().padStart(5, "0")}`;
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const requests = await prisma.paymentRequest.findMany({
    include: {
      payee: true,
      category: true,
      case: true,
      requestedBy: true,
      managerApprovedBy: true,
      accountantApprovedBy: true,
      financeApprovedBy: true,
      rejectedBy: true,
      closedBy: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const formData = await req.formData();
  const description = (formData.get("description") as string || "").trim();
  const amount = Number(formData.get("amount"));
  const vatAmount = Number(formData.get("vatAmount") || 0);
  const payeeId = formData.get("payeeId") as string;
  const categoryId = (formData.get("categoryId") as string) || undefined;
  const caseId = (formData.get("caseId") as string) || undefined;
  const file = formData.get("file") as File | null;

  if (!description || !amount || amount <= 0 || !payeeId) {
    return NextResponse.json({ error: "الوصف والمبلغ والمستفيد مطلوبة" }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "يجب إرفاق مستند مؤيد للطلب (سياسة إلزامية)" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)" }, { status: 400 });
  }

  const user = session.user as any;
  const requester = await prisma.user.findUnique({ where: { id: user.id } });
  if (!requester) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `payment-request-attachments/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream" });

  if (uploadError) {
    return NextResponse.json({ error: `فشل رفع المستند: ${uploadError.message}` }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(DOCUMENTS_BUCKET).getPublicUrl(storagePath);

  // اعتماد المدير مرحلة اختيارية (فقط إذا كان للموظف مدير مباشر)، بعده دايماً يمر بالمحاسب ثم المدير المالي
  const needsManagerApproval = !!requester.managerId;
  const initialStatus = needsManagerApproval ? "PENDING_MANAGER" : "PENDING_ACCOUNTANT";
  const requestNumber = await nextRequestNumber();

  const created = await prisma.paymentRequest.create({
    data: {
      requestNumber,
      description,
      amount,
      vatAmount,
      payeeId,
      categoryId,
      caseId,
      requestedById: user.id,
      needsManagerApproval,
      status: initialStatus,
      attachmentUrl: publicUrlData.publicUrl,
      attachmentName: file.name,
    },
    include: { payee: true, requestedBy: true },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "CREATE",
    entityType: "PaymentRequest",
    entityId: created.id,
    description: `أنشأ طلب صرف: ${requestNumber} — ${description} (${amount.toLocaleString()} ر.س) للمستفيد ${created.payee.name}`,
  });

  await logPaymentActivity({ requestId: created.id, userId: user.id, userName: user.name, action: "CREATED" });

  return NextResponse.json(created, { status: 201 });
}
