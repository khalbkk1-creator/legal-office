import { cookies, headers } from "next/headers";
import { encode, decode } from "next-auth/jwt";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "portal-session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 يوم
export const LINK_TTL_DAYS = 30;
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
export const MIN_PASSWORD_LENGTH = 8;

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

/** معلومات الطلب لتسجيلها بسجل الوصول */
export function requestMeta() {
  try {
    const h = headers();
    const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || null;
    const userAgent = h.get("user-agent")?.slice(0, 250) || null;
    return { ip, userAgent };
  } catch {
    return { ip: null, userAgent: null };
  }
}

export async function logPortalAccess(clientId: string, event: string, extra?: { path?: string; detail?: string }) {
  const { ip, userAgent } = requestMeta();
  try {
    await prisma.portalAccessLog.create({ data: { clientId, event, ip, userAgent, path: extra?.path ?? null, detail: extra?.detail ?? null } });
  } catch {
    // لا نوقف الطلب لو فشل التسجيل
  }
}

/** جلسة الكوكي الموقّعة (تسجيل الدخول بكلمة المرور) */
export async function getPortalClient() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = await decode({ token, secret: getSecret() });
    const clientId = payload?.clientId as string | undefined;
    if (!clientId) return null;
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client || client.portalDisabled) return null;
    return client;
  } catch {
    return null;
  }
}

/**
 * الوصول برابط الدعوة: يتحقق من وجود الرمز، وأن البوابة غير معطّلة، وأن الرابط لم تنتهِ صلاحيته.
 * يُسجّل كل وصول ناجح. يُستخدم بدل prisma.client.findUnique({ where: { accessToken } }) في كل مسارات البوابة.
 */
export async function resolvePortalClientByToken(token: string | undefined, path?: string) {
  if (!token || token.length < 16) return null;
  const client = await prisma.client.findUnique({ where: { accessToken: token } });
  if (!client) return null;
  if (client.portalDisabled) return null;
  if (client.accessTokenExpiresAt && client.accessTokenExpiresAt < new Date()) return null;
  await logPortalAccess(client.id, "LINK_ACCESS", { path });
  return client;
}

/** يولّد رابط دعوة جديد بصلاحية محددة (يُبطل القديم) */
export async function issueAccessToken(clientId: string) {
  const token = crypto.randomBytes(24).toString("base64url");
  const expires = new Date(Date.now() + LINK_TTL_DAYS * 86400000);
  await prisma.client.update({ where: { id: clientId }, data: { accessToken: token, accessTokenExpiresAt: expires } });
  return { token, expires };
}

export async function ensureClientAccessToken(clientId: string, existingToken: string | null, existingExpiry?: Date | null) {
  if (existingToken && (!existingExpiry || existingExpiry > new Date())) return existingToken;
  return (await issueAccessToken(clientId)).token;
}

/** حماية من تخمين كلمة المرور */
export function isLocked(client: { lockedUntil: Date | null }) {
  return !!client.lockedUntil && client.lockedUntil > new Date();
}

export async function recordFailedLogin(client: { id: string; failedLoginCount: number }) {
  const count = client.failedLoginCount + 1;
  const lock = count >= MAX_FAILED_LOGINS;
  await prisma.client.update({
    where: { id: client.id },
    data: { failedLoginCount: lock ? 0 : count, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60000) : null },
  });
  await logPortalAccess(client.id, lock ? "LOCKED" : "LOGIN_FAILED", { detail: lock ? `قُفل الحساب ${LOCK_MINUTES} دقيقة بعد ${MAX_FAILED_LOGINS} محاولات` : `محاولة ${count}` });
  return lock;
}

export async function recordSuccessfulLogin(clientId: string) {
  await prisma.client.update({ where: { id: clientId }, data: { failedLoginCount: 0, lockedUntil: null, lastPortalLoginAt: new Date() } });
  await logPortalAccess(clientId, "LOGIN_SUCCESS");
}
