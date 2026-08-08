import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const user = session.user as any;

  const update = await prisma.caseUpdate.create({
    data: {
      caseId: params.id,
      authorId: user.id,
      note: body.note,
    },
  });
  return NextResponse.json(update, { status: 201 });
}
