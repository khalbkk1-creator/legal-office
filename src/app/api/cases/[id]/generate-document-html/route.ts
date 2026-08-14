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

function renderSectionHtml(heading: string, text: string) {
  if (!text.trim()) return "";
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const bulletLines = lines.filter((l) => l.trim().startsWith("- ") || l.trim().startsWith("• "));
  const isAllBullets = bulletLines.length === lines.length && lines.length > 0;

  let bodyHtml = "";
  if (isAllBullets) {
    bodyHtml = `<ul style="margin:0; padding-inline-start: 20px;">${lines
      .map((l) => `<li style="margin-bottom:6px;">${escapeHtml(l.trim().replace(/^[-•]\s*/, ""))}</li>`)
      .join("")}</ul>`;
  } else {
    bodyHtml = lines
      .map((l) => {
        const trimmed = l.trim();
        if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
          return `<p style="margin:0 0 6px 0;">• ${escapeHtml(trimmed.replace(/^[-•]\s*/, ""))}</p>`;
        }
        return `<p style="margin:0 0 10px 0;">${escapeHtml(trimmed)}</p>`;
      })
      .join("");
  }

  return `<h3 style="font-size:15px; font-weight:bold; margin:16px 0 8px 0;">${escapeHtml(heading)}</h3>${bodyHtml}`;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const formData = await req.formData();
  const templateType = (formData.get("templateType") as string) || "";
  const facts = (formData.get("facts") as string) || "";
  const legalGrounds = (formData.get("legalGrounds") as string) || "";
  const requests = (formData.get("requests") as string) || "";

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

  const opening =
    `يتقدم الموكل / ${item.client.name} بهذه ${docTitle}` +
    (item.opposingParty ? ` في مواجهة / ${item.opposingParty}` : "") +
    `، وذلك في القضية رقم (${item.caseNumber})` +
    (item.court ? ` المنظورة أمام ${item.court}` : "") +
    `، للأسباب الآتية:`;

  const sectionsHtml =
    renderSectionHtml("أولاً: الوقائع", facts) +
    renderSectionHtml("ثانياً: الأسانيد القانونية", legalGrounds) +
    renderSectionHtml("ثالثاً: الطلبات", requests);

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
  h1 { font-size: 20px; text-align: center; margin: 0 0 6px 0; }
  .date { font-size: 12px; text-align: center; color: #666; margin: 0 0 20px 0; }
  .opening { font-size: 14px; line-height: 1.9; margin-bottom: 10px; }
  .sections { font-size: 14px; line-height: 1.9; }
  .signature { margin-top: 60px; text-align: left; font-size: 13px; }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
  <div class="page">
    <h1>${escapeHtml(docTitle)}</h1>
    <p class="date">التاريخ: ${escapeHtml(today)}</p>
    <p class="opening">${escapeHtml(opening)}</p>
    <div class="sections">${sectionsHtml}</div>
    <div class="signature">المحامي: ${escapeHtml(item.lawyer?.name ?? "—")}</div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
