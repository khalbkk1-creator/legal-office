import { getSystemAccountId } from "@/lib/accounting";

/**
 * يحدد أين تُرحّل ذمة المورد:
 * - مورد قديم له حساب فرعي بالدليل → نفس الحساب (توافق مع القيود السابقة)
 * - مورد جديد → حساب المراقبة "ذمم الموردين 2100" مع تحليل المورد على السطر
 */
export async function supplierLineTarget(payee: { id: string; accountId: string | null }) {
  if (payee.accountId) return { accountId: payee.accountId, payeeId: payee.id };
  return { accountId: await getSystemAccountId("2100"), payeeId: payee.id };
}
