import { NextResponse } from "next/server";
import { portalCookieOptions } from "@/lib/portalAuth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const { name: cookieName } = portalCookieOptions();
  res.cookies.set(cookieName, "", { maxAge: 0, path: "/" });
  return res;
}
