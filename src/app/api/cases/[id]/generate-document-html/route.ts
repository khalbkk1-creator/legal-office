import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DOCUMENT_TITLES: Record<string, string> = {
  RESPONSE_MEMO: "مذكرة جوابية",
  OBJECTION_MEMO: "مذكرة اعتراضية",
  RECONSIDERATION_MEMO: "مذكرة التماس إعادة نظر",
  CASSATION_MEMO: "مذكرة نقض",
  CLAIM_STATEMENT: "صحيفة الدعوى",
  REPORT: "تقرير",
  NOTICE: "إخطار",
  LETTER: "خطاب رسمي",
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const formData = await req.formData();
  const templateType = (formData.get("templateType") as string) || "";
  const bodyText = (formData.get("bodyText") as string) || "";

  const [item, settings] = await Promise.all([
    prisma.case.findUnique({
      where: { id: params.id },
      include: { client: true, lawyer: true },
    }),
    prisma.officeSettings.findFirst(),
  ]);

  if (!item) return NextResponse.json({ error: "القضية غير موجودة" }, { status: 404 });

  const docTitle = DOCUMENT_TITLES[templateType] || "مستند";
  const today = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });

  const paragraphsHtml = bodyText
    .split("\n")
    .filter((p) => p.trim().length > 0)
    .map((p) => `<p style="margin: 0 0 12px 0;">${escapeHtml(p)}</p>`)
    .join("");

  const letterheadStyle = settings?.letterheadUrl
    ? `background-image: url('${settings.letterheadUrl}'); background-size: 100% 100%; background-repeat: no-repeat;`
    : "";

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(docTitle)} - ${escapeHtml(item.caseNumber)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, "Segoe UI", Tahoma, sans-serif; background: #f2f2f2; }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 20px auto;
    background: white;
    ${letterheadStyle}
    padding: 45mm 20mm 30mm 20mm;
    box-shadow: 0 0 8px rgba(0,0,0,0.15);
  }
  @media print {
    body { background: white; }
    .page { margin: 0; box-shadow: none; }
    .print-btn { display: none; }
  }
  .print-btn {
    position: fixed;
    top: 20px;
    left: 20px;
    background: #0f6b52;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    z-index: 100;
  }
  h1 { font-size: 20px; text-align: center; margin: 0 0 20px 0; }
  .meta { font-size: 13px; margin: 4px 0; }
  .body-text { font-size: 14px; line-height: 1.9; margin-top: 20px; }
  .signature { margin-top: 60px; text-align: left; font-size: 13px; }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
  <div class="page">
    <h1>${escapeHtml(docTitle)}</h1>
    <p class="meta">التاريخ: ${escapeHtml(today)}</p>
    <p class="meta">رقم القضية: ${escapeHtml(item.caseNumber)}</p>
    <p class="meta">موضوع القضية: ${escapeHtml(item.title)}</p>
    ${item.court ? `<p class="meta">المحكمة: ${escapeHtml(item.court)}</p>` : ""}
    <p class="meta">العميل: ${escapeHtml(item.client.name)}</p>
    ${item.opposingParty ? `<p class="meta">الطرف الآخر: ${escapeHtml(item.opposingParty)}</p>` : ""}
    <div class="body-text">${paragraphsHtml || "<p>—</p>"}</div>
    <div class="signature">المحامي: ${escapeHtml(item.lawyer?.name ?? "—")}</div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
