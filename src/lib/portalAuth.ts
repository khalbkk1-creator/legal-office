import { cookies } from "next/headers";
import { encode, decode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "portal-session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 يوم

function getSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET غير معرّف");
  return secret;
}

export async function createPortalSessionCookieValue(clientId: string) {
  return encode({ token: { clientId }, secret: getSecret(), maxAge: MAX_AGE });
}

export function portalCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
  };
}

export async function getPortalClient() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const payload = await decode({ token, secret: getSecret() });
    const clientId = payload?.clientId as string | undefined;
    if (!clientId) return null;

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    return client;
  } catch {
    return null;
  }
}
