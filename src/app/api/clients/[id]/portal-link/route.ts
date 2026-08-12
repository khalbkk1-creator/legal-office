import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const token = crypto.randomBytes(24).toString("base64url");

  const updated = await prisma.client.update({
    where: { id: params.id },
    data: { accessToken: token },
  });

  return NextResponse.json({ accessToken: updated.accessToken });
}
