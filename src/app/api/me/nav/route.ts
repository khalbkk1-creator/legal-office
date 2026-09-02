import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as any;
  if (!sessionUser) return NextResponse.json({ isPartner: false, hasPosition: false, allowedModules: [] });

  const isPartner = sessionUser.role === "PARTNER";
  const currentUser = await prisma.user.findUnique({ where: { id: sessionUser.id }, include: { position: true } });

  return NextResponse.json({
    isPartner,
    hasPosition: !!currentUser?.positionId,
    allowedModules: currentUser?.position?.allowedModules ?? [],
  });
}
