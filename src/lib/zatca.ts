import QRCode from "qrcode";

/**
 * توليد QR Code متوافق مع "فاتورة" (هيئة الزكاة والضريبة والجمارك) - المرحلة الأولى.
 * هذا معيار منشور رسمياً، يُبنى محلياً بالكامل بدون أي حساب أو اتصال بخوادم الهيئة.
 * المرجع: ZATCA e-Invoicing Detailed Guideline - TLV Encoding for QR Code.
 */

interface ZatcaInvoiceData {
  sellerName: string; // الاسم التجاري المسجّل بشهادة ضريبة القيمة المضافة
  vatNumber: string; // الرقم الضريبي (15 رقم)
  invoiceTimestamp: Date; // تاريخ ووقت إصدار الفاتورة
  invoiceTotal: number; // إجمالي الفاتورة شامل الضريبة
  vatTotal: number; // إجمالي مبلغ الضريبة
}

function tlvEncode(tag: number, value: string): Buffer {
  const valueBuffer = Buffer.from(value, "utf8");
  const header = Buffer.from([tag, valueBuffer.length]);
  return Buffer.concat([header, valueBuffer]);
}

/**
 * يبني السلسلة المشفّرة (Base64) اللي تُدخل داخل رمز QR.
 */
export function buildZatcaTlvBase64(data: ZatcaInvoiceData): string {
  const tlvBuffers = [
    tlvEncode(1, data.sellerName),
    tlvEncode(2, data.vatNumber),
    tlvEncode(3, data.invoiceTimestamp.toISOString()),
    tlvEncode(4, data.invoiceTotal.toFixed(2)),
    tlvEncode(5, data.vatTotal.toFixed(2)),
  ];
  const combined = Buffer.concat(tlvBuffers);
  return combined.toString("base64");
}

/**
 * يولّد صورة QR جاهزة (Data URL) تقدر تحطها مباشرة بـ<img src="..." /> بصفحة طباعة الفاتورة.
 */
export async function generateZatcaQrDataUrl(data: ZatcaInvoiceData): Promise<string> {
  const base64Payload = buildZatcaTlvBase64(data);
  const dataUrl = await QRCode.toDataURL(base64Payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 180,
  });
  return dataUrl;
}
