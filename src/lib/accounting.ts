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

export async function getSystemAccountId(code: string): Promise<string> {
  await ensureChartOfAccounts();
  const account = await prisma.account.findUnique({ where: { code } });
  if (!account) throw new Error(`الحساب النظامي ${code} غير موجود`);
  return account.id;
}

// يبحث عن حساب مصروف فرعي مطابق للتصنيف، أو ينشئه تحت "المصروفات التشغيلية العامة"
export async function getOrCreateExpenseAccount(categoryName: string | null | undefined): Promise<string> {
  await ensureChartOfAccounts();
  if (!categoryName) return getSystemAccountId("5100");

  const existing = await prisma.account.findFirst({ where: { name: categoryName, type: "EXPENSE" } });
  if (existing) return existing.id;

  const parent = await prisma.account.findUnique({ where: { code: "5000" } });
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
