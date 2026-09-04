import { NextResponse } from "next/server";
// التسجيل الذاتي مُعطّل: الحسابات يُنشئها المكتب، والعميل يفعّلها برمز تحقق على بريده (/portal/register).
export async function POST() {
  return NextResponse.json({ error: "التسجيل الذاتي غير متاح. فعّل حسابك برمز التحقق المرسل إلى بريدك المسجّل لدى المكتب." }, { status: 400 });
}
