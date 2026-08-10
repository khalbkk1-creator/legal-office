import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, DOCUMENTS_BUCKET } from "@/lib/supabaseAdmin";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const documents = await prisma.caseDocument.findMany({
    where: { caseId: params.id },
    include: { uploadedBy: { select: { name: true } }, category: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(documents);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const categoryId = (formData.get("categoryId") as string | null) || null;
  if (!file) {
    return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 });
  }

  // حد أقصى 10 ميجا للملف
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const safeName = file.name.replace(/[^a-zA-Z0-9\u0600-\u06FF._-]/g, "_");
  const storagePath = `${params.id}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream" });

  if (uploadError) {
    return NextResponse.json({ error: `فشل رفع الملف: ${uploadError.message}` }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(DOCUMENTS_BUCKET).getPublicUrl(storagePath);

  const user = session.user as any;
  const document = await prisma.caseDocument.create({
    data: {
      caseId: params.id,
      fileName: file.name,
      fileUrl: publicUrlData.publicUrl,
      fileSize: file.size,
      uploadedById: user.id,
      categoryId: categoryId || undefined,
    },
    include: { category: true },
  });

  return NextResponse.json(document, { status: 201 });
}
