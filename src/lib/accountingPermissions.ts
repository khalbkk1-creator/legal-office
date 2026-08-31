import { prisma } from "@/lib/prisma";

export type AccountingPermission =
  | "journalCreate"
  | "journalConfirm"
  | "journalEdit"
  | "journalDelete"
  | "journalReverse"
  | "journalAttach"
  | "chartCreate"
  | "chartEdit"
  | "chartDelete"
  | "chartReset"
  | "periodLock"
  | "openingBalances"
  | "recurringManage"
  | "recurringPost"
  | "reconciliationManage"
  | "reconciliationSave";

const FIELD_BY_PERMISSION: Record<AccountingPermission, string> = {
  journalCreate: "acctJournalCreate",
  journalConfirm: "acctJournalConfirm",
  journalEdit: "acctJournalEdit",
  journalDelete: "acctJournalDelete",
  journalReverse: "acctJournalReverse",
  journalAttach: "acctJournalAttach",
  chartCreate: "acctChartCreate",
  chartEdit: "acctChartEdit",
  chartDelete: "acctChartDelete",
  chartReset: "acctChartReset",
  periodLock: "acctPeriodLock",
  openingBalances: "acctOpeningBalances",
  recurringManage: "acctRecurringManage",
  recurringPost: "acctRecurringPost",
  reconciliationManage: "acctReconciliationManage",
  reconciliationSave: "acctReconciliationSave",
};

/**
 * يتحقق هل المستخدم يقدر يسوي إجراء محاسبي معيّن — كل إجراء له صلاحية مستقلة تماماً.
 * الشريك (PARTNER) يتجاوز كل القيود دائماً.
 * لو المسمى الوظيفي عليه "عرض فقط"، يُرفض أي إجراء بغض النظر عن باقي الصلاحيات.
 */
export async function hasAccountingPermission(
  userId: string,
  userRole: string,
  permission: AccountingPermission
): Promise<boolean> {
  if (userRole === "PARTNER") return true;

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { position: true } });
  if (!user?.position) return false;
  if (user.position.acctViewOnly) return false;

  const field = FIELD_BY_PERMISSION[permission];
  return !!(user.position as any)[field];
}

const permissionErrorMessages: Record<AccountingPermission, string> = {
  journalCreate: "ما عندك صلاحية إنشاء قيود يدوية جديدة",
  journalConfirm: "ما عندك صلاحية اعتماد القيود",
  journalEdit: "ما عندك صلاحية تعديل مسودات القيود",
  journalDelete: "ما عندك صلاحية حذف القيود نهائياً",
  journalReverse: "ما عندك صلاحية عكس القيود",
  journalAttach: "ما عندك صلاحية رفع مرفقات للقيود",
  chartCreate: "ما عندك صلاحية إضافة حسابات جديدة",
  chartEdit: "ما عندك صلاحية تعديل الحسابات",
  chartDelete: "ما عندك صلاحية حذف الحسابات",
  chartReset: "ما عندك صلاحية إعادة تعيين دليل الحسابات",
  periodLock: "ما عندك صلاحية إدارة قفل الفترات المحاسبية",
  openingBalances: "ما عندك صلاحية إدارة الأرصدة الافتتاحية",
  recurringManage: "ما عندك صلاحية إدارة القيود المتكررة",
  recurringPost: "ما عندك صلاحية ترحيل القيود المتكررة",
  reconciliationManage: "ما عندك صلاحية إدارة المطابقة البنكية",
  reconciliationSave: "ما عندك صلاحية حفظ ملخصات المطابقة",
};

export function accountingPermissionError(permission: AccountingPermission) {
  return permissionErrorMessages[permission];
}

export const ACCOUNTING_PERMISSION_FIELDS = Object.values(FIELD_BY_PERMISSION).concat("acctViewOnly");
