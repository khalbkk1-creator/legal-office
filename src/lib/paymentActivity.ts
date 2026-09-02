import { prisma } from "@/lib/prisma";

export type PaymentActivityAction = "CREATED" | "APPROVED" | "REJECTED" | "PAID" | "INVOICE_UPLOADED" | "CLOSED" | "COMMENT";

export async function logPaymentActivity(params: {
  requestId: string;
  userId: string;
  userName: string;
  action: PaymentActivityAction;
  stage?: "MANAGER" | "ACCOUNTANT" | "FINANCE";
  note?: string | null;
}) {
  await prisma.paymentRequestActivity.create({
    data: {
      requestId: params.requestId,
      userId: params.userId,
      userName: params.userName,
      action: params.action,
      stage: params.stage,
      note: params.note?.trim() || null,
    },
  });
}
