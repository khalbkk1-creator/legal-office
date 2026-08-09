import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, DOCUMENTS_BUCKET } from "@/lib/supabaseAdmin";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const doc = await prisma.caseDocument.findUnique({ where: { id: params.docId } });
  if (!doc) return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });

  // استخراج المسار داخل bucket من الرابط العام
  const marker = `/${DOCUMENTS_BUCKET}/`;
  const idx = doc.fileUrl.indexOf(marker);
  if (idx !== -1) {
    const storagePath = doc.fileUrl.slice(idx + marker.length);
    await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
  }

  await prisma.caseDocument.delete({ where: { id: params.docId } });
  return NextResponse.json({ ok: true });
}

