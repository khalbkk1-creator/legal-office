import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Role, ClientType, CaseStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// نقطة تعبئة بيانات تجريبية لمرة واحدة - تُستخدم عند النشر بدون طرفية (مثل Vercel).
// افتح: https://your-domain.com/api/seed?key=YOUR_SEED_KEY من المتصفح مرة واحدة فقط بعد النشر.
// SEED_KEY يجب ضبطه كمتغير بيئة في Vercel قبل الاستخدام، واحذف/عطّل هذا الملف بعد التعبئة لأسباب أمنية.
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const expected = process.env.SEED_KEY;

  if (!expected || key !== expected) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const existing = await prisma.user.count();
  if (existing > 0) {
    return NextResponse.json({ message: "البيانات موجودة مسبقاً، لم يتم التكرار." });
  }

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const partner = await prisma.user.create({
    data: {
      name: "المحامي عبدالله السالم",
      email: "partner@office.sa",
      passwordHash,
      role: Role.PARTNER,
      phone: "0501111111",
    },
  });

  const lawyer = await prisma.user.create({
    data: {
      name: "المحامية سارة القحطاني",
      email: "lawyer@office.sa",
      passwordHash,
      role: Role.LAWYER,
      phone: "0502222222",
    },
  });

  await prisma.user.create({
    data: {
      name: "نورة العتيبي",
      email: "secretary@office.sa",
      passwordHash,
      role: Role.SECRETARY,
      phone: "0503333333",
    },
  });

  const client1 = await prisma.client.create({
    data: {
      name: "شركة الأفق للمقاولات",
      type: ClientType.COMPANY,
      idNumber: "1010123456",
      phone: "0114445555",
      email: "info@alofoq.sa",
      address: "الرياض - حي العليا",
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: "خالد بن ناصر المطيري",
      type: ClientType.INDIVIDUAL,
      idNumber: "1098765432",
      phone: "0556667777",
      address: "الرياض - حي النرجس",
    },
  });

  const case1 = await prisma.case.create({
    data: {
      caseNumber: "C-2026-001",
      title: "مطالبة مالية بقيمة مستحقات مقاولة",
      caseType: "تجارية",
      status: CaseStatus.ACTIVE,
      court: "المحكمة التجارية بالرياض",
      opposingParty: "مؤسسة البناء الحديث",
      claimValue: 450000,
      description: "مطالبة بمستحقات متأخرة عن أعمال مقاولة منفذة بموجب عقد.",
      clientId: client1.id,
      lawyerId: lawyer.id,
    },
  });

  await prisma.case.create({
    data: {
      caseNumber: "C-2026-002",
      title: "نزاع عمالي - إنهاء عقد عمل",
      caseType: "عمالية",
      status: CaseStatus.UNDER_REVIEW,
      court: "المحكمة العمالية بالرياض",
      opposingParty: "شركة النجاح للتجارة",
      claimValue: 60000,
      clientId: client2.id,
      lawyerId: partner.id,
    },
  });

  await prisma.hearing.create({
    data: {
      caseId: case1.id,
      date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
      court: "المحكمة التجارية بالرياض",
      roundNumber: 1,
      notes: "الجلسة الأولى - تقديم المذكرة الجوابية",
    },
  });

  return NextResponse.json({
    message: "تمت تعبئة البيانات التجريبية بنجاح ✅",
    logins: [
      "partner@office.sa / Password123!",
      "lawyer@office.sa / Password123!",
      "secretary@office.sa / Password123!",
    ],
  });
}
