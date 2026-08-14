import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const note = (body.note || "").trim();
  if (!note) return NextResponse.json({ error: "الملاحظة فارغة" }, { status: 400 });

  const user = session.user as any;

  const created = await prisma.consultationNote.create({
    data: {
      consultationRequestId: params.id,
      authorId: user.id,
      note,
    },
    include: { author: true },
  });

  return NextResponse.json(created, { status: 201 });
}
