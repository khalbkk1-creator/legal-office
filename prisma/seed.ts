import { PrismaClient, Role, ClientType, CaseStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const partner = await prisma.user.upsert({
    where: { email: "partner@office.sa" },
    update: {},
    create: {
      name: "المحامي عبدالله السالم",
      email: "partner@office.sa",
      passwordHash,
      role: Role.PARTNER,
      phone: "0501111111",
    },
  });

  const lawyer = await prisma.user.upsert({
    where: { email: "lawyer@office.sa" },
    update: {},
    create: {
      name: "المحامية سارة القحطاني",
      email: "lawyer@office.sa",
      passwordHash,
      role: Role.LAWYER,
      phone: "0502222222",
    },
  });

  await prisma.user.upsert({
    where: { email: "secretary@office.sa" },
    update: {},
    create: {
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
      status: CaseStatus.OPEN,
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

  await prisma.caseUpdate.create({
    data: {
      caseId: case1.id,
      authorId: lawyer.id,
      note: "تم استلام صحيفة الدعوى وجارٍ إعداد المذكرة الجوابية.",
    },
  });

  console.log("تم إدخال البيانات التجريبية بنجاح ✅");
  console.log("بيانات الدخول: partner@office.sa / lawyer@office.sa / secretary@office.sa");
  console.log("كلمة المرور للجميع: Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
