import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, DOCUMENTS_BUCKET } from "@/lib/supabaseAdmin";

// GET: للموظفين فقط (قائمة الطلبات)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const requests = await prisma.consultationRequest.findMany({
    orderBy: { requestedDate: "asc" },
  });
  return NextResponse.json(requests);
}

// POST: عام بدون تسجيل دخول (حجز استشارة من صفحة عامة)
export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const name = (formData.get("name") as string) || "";
  const phone = (formData.get("phone") as string) || "";
  const email = (formData.get("email") as string) || "";
  const notes = (formData.get("notes") as string) || "";
  const requestedDate = (formData.get("requestedDate") as string) || "";
  const file = formData.get("file") as File | null;

  if (!name.trim() || !phone.trim() || !requestedDate) {
    return NextResponse.json({ error: "الاسم والجوال وموعد الاستشارة مطلوبة" }, { status: 400 });
  }

  let attachmentUrl: string | undefined;
  let attachmentName: string | undefined;

  if (file && file.size > 0) {
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)" }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `consultation-requests/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream" });

    if (!uploadError) {
      const { data } = supabaseAdmin.storage.from(DOCUMENTS_BUCKET).getPublicUrl(storagePath);
      attachmentUrl = data.publicUrl;
      attachmentName = file.name;
    }
  }

  const created = await prisma.consultationRequest.create({
    data: {
      name,
      phone,
      email: email || undefined,
      notes: notes || undefined,
      requestedDate: new Date(requestedDate),
      attachmentUrl,
      attachmentName,
    },
  });

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
