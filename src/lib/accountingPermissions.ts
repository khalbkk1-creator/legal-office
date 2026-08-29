import { prisma } from "@/lib/prisma";

export type AccountingPermission = "record" | "editPosted" | "manageChart" | "managePeriods";

/**
 * يتحقق هل المستخدم يقدر يسوي إجراء معيّن داخل النظام المحاسبي.
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

  switch (permission) {
    case "record":
      return user.position.acctCanRecord;
    case "editPosted":
      return user.position.acctCanEditPosted;
    case "manageChart":
      return user.position.acctCanManageChart;
    case "managePeriods":
      return user.position.acctCanManagePeriods;
    default:
      return false;
  }
}

const permissionErrorMessages: Record<AccountingPermission, string> = {
  record: "ما عندك صلاحية تسجيل فواتير أو مصاريف أو قيود جديدة",
  editPosted: "ما عندك صلاحية تعديل أو حذف أو عكس القيود المرحّلة",
  manageChart: "ما عندك صلاحية إدارة دليل الحسابات",
  managePeriods: "ما عندك صلاحية إدارة الفترات المحاسبية أو إعادة تعيين الدليل",
};

export function accountingPermissionError(permission: AccountingPermission) {
  return permissionErrorMessages[permission];
}
