import { prisma } from "@/lib/prisma";

// دليل الحسابات الافتراضي لمكتب خدمي (بدون مخزون)
const DEFAULT_ACCOUNTS: { code: string; name: string; type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"; parentCode?: string; isSystem?: boolean }[] = [
  { code: "1000", name: "الأصول", type: "ASSET" },
  { code: "1010", name: "الصندوق", type: "ASSET", parentCode: "1000", isSystem: true },
  { code: "1020", name: "البنك", type: "ASSET", parentCode: "1000", isSystem: true },
  { code: "1100", name: "ذمم العملاء", type: "ASSET", parentCode: "1000", isSystem: true },

  { code: "2000", name: "الالتزامات", type: "LIABILITY" },
  { code: "2100", name: "ذمم الموردين", type: "LIABILITY", parentCode: "2000", isSystem: true },
  { code: "2200", name: "ضريبة القيمة المضافة المستحقة", type: "LIABILITY", parentCode: "2000", isSystem: true },

  { code: "3000", name: "حقوق الملكية", type: "EQUITY" },
  { code: "3100", name: "رأس المال", type: "EQUITY", parentCode: "3000", isSystem: true },
  { code: "3200", name: "الأرباح المرحلة", type: "EQUITY", parentCode: "3000", isSystem: true },

  { code: "4000", name: "الإيرادات", type: "REVENUE" },
  { code: "4100", name: "إيرادات أتعاب قانونية", type: "REVENUE", parentCode: "4000", isSystem: true },

  { code: "5000", name: "المصروفات", type: "EXPENSE" },
  { code: "5100", name: "مصروفات تشغيلية عامة", type: "EXPENSE", parentCode: "5000", isSystem: true },
];

export async function ensureChartOfAccounts() {
  const count = await prisma.account.count();
  if (count > 0) return;

  const codeToId: Record<string, string> = {};
  for (const a of DEFAULT_ACCOUNTS) {
    const parentId = a.parentCode ? codeToId[a.parentCode] : undefined;
    const created = await prisma.account.create({
      data: { code: a.code, name: a.name, type: a.type, parentId, isSystem: a.isSystem ?? false },
    });
    codeToId[a.code] = created.id;
  }
}

// يضيف مستوى 2 (تصنيفات فرعية) فوق الحسابات الحالية، ويربطها تحته دون تغيير أرقامها أو حذف أي شي
const LEVEL2_HEADERS: { code: string; name: string; type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"; parentCode: string }[] = [
  { code: "1001", name: "الأصول المتداولة", type: "ASSET", parentCode: "1000" },
  { code: "1002", name: "الأصول الثابتة", type: "ASSET", parentCode: "1000" },
  { code: "2001", name: "الالتزامات المتداولة", type: "LIABILITY", parentCode: "2000" },
  { code: "3001", name: "حقوق الملكية الأساسية", type: "EQUITY", parentCode: "3000" },
  { code: "4001", name: "إيرادات الأتعاب القانونية", type: "REVENUE", parentCode: "4000" },
  { code: "5001", name: "مصروفات تشغيلية", type: "EXPENSE", parentCode: "5000" },
];

// حسابات تفصيلية جديدة (مستوى 3) تُضاف إن ما كانت موجودة، لإكمال العمق تحت فئات كانت فاضية
const LEVEL3_NEW_ACCOUNTS: { code: string; name: string; type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"; parentCode: string }[] = [
  { code: "1210", name: "أثاث ومعدات مكتبية", type: "ASSET", parentCode: "1002" },
  { code: "1220", name: "أجهزة حاسوب وبرمجيات", type: "ASSET", parentCode: "1002" },
];

// الحسابات الحالية اللي ننقلها لتصير تحت مستوى 2 الجديد (بدل ما تكون مباشرة تحت المستوى 1)
const RELOCATE_TO_LEVEL2: { code: string; newParentCode: string }[] = [
  { code: "1010", newParentCode: "1001" }, // الصندوق
  { code: "1020", newParentCode: "1001" }, // البنك
  { code: "1100", newParentCode: "1001" }, // ذمم العملاء
  { code: "2100", newParentCode: "2001" }, // ذمم الموردين
  { code: "2200", newParentCode: "2001" }, // ضريبة القيمة المضافة المستحقة
  { code: "4100", newParentCode: "4001" }, // إيرادات أتعاب قانونية
  { code: "3100", newParentCode: "3001" }, // رأس المال
  { code: "3200", newParentCode: "3001" }, // الأرباح المرحلة
];

export async function upgradeChartHierarchy() {
  await ensureChartOfAccounts();

  const allAccounts = await prisma.account.findMany();
  const byCode: Record<string, (typeof allAccounts)[number]> = {};
  for (const a of allAccounts) byCode[a.code] = a;

  for (const h of LEVEL2_HEADERS) {
    if (byCode[h.code]) continue;
    const parent = byCode[h.parentCode];
    if (!parent) continue;
    const created = await prisma.account.create({
      data: { code: h.code, name: h.name, type: h.type, parentId: parent.id, isSystem: true },
    });
    byCode[h.code] = created;
  }

  for (const d of LEVEL3_NEW_ACCOUNTS) {
    if (byCode[d.code]) continue;
    const parent = byCode[d.parentCode];
    if (!parent) continue;
    const created = await prisma.account.create({
      data: { code: d.code, name: d.name, type: d.type, parentId: parent.id },
    });
    byCode[d.code] = created;
  }

  // ينقل كل حساب مصروف فرعي تحت 5000 مباشرة (غير 5001 نفسه) ليصير تحت 5001
  const expensesRoot = byCode["5000"];
  const opExHeader = byCode["5001"];
  if (expensesRoot && opExHeader) {
    await prisma.account.updateMany({
      where: { parentId: expensesRoot.id, id: { not: opExHeader.id } },
      data: { parentId: opExHeader.id },
    });
  }

  const updates = RELOCATE_TO_LEVEL2.filter((r) => {
    const account = byCode[r.code];
    const newParent = byCode[r.newParentCode];
    return account && newParent && account.parentId !== newParent.id;
  });
  if (updates.length > 0) {
    await Promise.all(
      updates.map((r) =>
        prisma.account.update({ where: { id: byCode[r.code].id }, data: { parentId: byCode[r.newParentCode].id } })
      )
    );
  }
}

export async function getSystemAccountId(code: string): Promise<string> {
  await ensureChartOfAccounts();
  const account = await prisma.account.findUnique({ where: { code } });
  if (!account) throw new Error(`الحساب النظامي ${code} غير موجود`);
  return account.id;
}

// يبحث عن حساب مصروف فرعي مطابق للتصنيف، أو ينشئه تحت "المصروفات التشغيلية العامة"
export async function getOrCreateExpenseAccount(categoryName: string | null | undefined): Promise<string> {
  await upgradeChartHierarchy();
  if (!categoryName) return getSystemAccountId("5100");

  const existing = await prisma.account.findFirst({ where: { name: categoryName, type: "EXPENSE" } });
  if (existing) return existing.id;

  const parent = (await prisma.account.findUnique({ where: { code: "5001" } })) ?? (await prisma.account.findUnique({ where: { code: "5000" } }));
  const lastChild = await prisma.account.findFirst({
    where: { parentId: parent?.id },
    orderBy: { code: "desc" },
  });
  const nextCode = lastChild ? (parseInt(lastChild.code, 10) + 1).toString() : "5101";

  const created = await prisma.account.create({
    data: { code: nextCode, name: categoryName, type: "EXPENSE", parentId: parent?.id },
  });
  return created.id;
}

async function nextEntryNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.journalEntry.count({
    where: { entryNumber: { startsWith: `JE-${year}-` } },
  });
  return `JE-${year}-${(count + 1).toString().padStart(5, "0")}`;
}

export async function postJournalEntry(params: {
  date?: Date;
  description: string;
  sourceType?: string;
  sourceId?: string;
  createdById?: string;
  lines: { accountId: string; debit?: number; credit?: number; description?: string }[];
}) {
  const totalDebit = params.lines.reduce((sum, l) => sum + (l.debit ?? 0), 0);
  const totalCredit = params.lines.reduce((sum, l) => sum + (l.credit ?? 0), 0);

  if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)) {
    throw new Error(`القيد غير متوازن: مدين ${totalDebit} لا يساوي دائن ${totalCredit}`);
  }

  const entryNumber = await nextEntryNumber();

  return prisma.journalEntry.create({
    data: {
      entryNumber,
      date: params.date ?? new Date(),
      description: params.description,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      createdById: params.createdById,
      lines: {
        create: params.lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit ?? 0,
          credit: l.credit ?? 0,
          description: l.description,
        })),
      },
    },
    include: { lines: true },
  });
}
