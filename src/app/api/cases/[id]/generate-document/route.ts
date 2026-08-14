import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
} from "docx";

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

function rtlParagraph(
  text: string,
  opts: {
    bold?: boolean;
    size?: number;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    spacingAfter?: number;
    bullet?: boolean;
  } = {}
) {
  return new Paragraph({
    bidirectional: true,
    alignment: opts.alignment ?? AlignmentType.RIGHT,
    spacing: { after: opts.spacingAfter ?? 200 },
    bullet: opts.bullet ? { level: 0 } : undefined,
    children: [
      new TextRun({
        text,
        bold: opts.bold ?? false,
        size: opts.size ?? 24,
        rightToLeft: true,
        font: "Arial",
      }),
    ],
  });
}

// يحوّل نص حر إلى فقرات منسّقة: الأسطر التي تبدأ بـ "- " تصير نقاط
function renderSection(children: Paragraph[], heading: string, text: string) {
  if (!text.trim()) return;
  children.push(rtlParagraph(heading, { bold: true, size: 26, spacingAfter: 150 }));
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      children.push(rtlParagraph(trimmed.replace(/^[-•]\s*/, ""), { bullet: true, spacingAfter: 120 }));
    } else {
      children.push(rtlParagraph(trimmed, { spacingAfter: 150 }));
    }
  }
  children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const templateType = body.templateType as string;
  const facts = (body.facts as string) || "";
  const legalGrounds = (body.legalGrounds as string) || "";
  const requests = (body.requests as string) || "";

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

  const children: Paragraph[] = [];

  // ترويسة المكتب
  if (settings?.officeName) {
    children.push(rtlParagraph(settings.officeName, { bold: true, size: 28, alignment: AlignmentType.CENTER }));
  }
  if (settings?.taxNumber) {
    children.push(rtlParagraph(`الرقم الضريبي: ${settings.taxNumber}`, { size: 18, alignment: AlignmentType.CENTER }));
  }
  children.push(new Paragraph({ text: "", spacing: { after: 300 } }));

  // عنوان المستند
  children.push(rtlParagraph(docTitle, { bold: true, size: 32, alignment: AlignmentType.CENTER, spacingAfter: 100 }));
  children.push(rtlParagraph(`التاريخ: ${today}`, { alignment: AlignmentType.CENTER, spacingAfter: 300 }));

  // فقرة افتتاحية تدمج بيانات القضية داخل نص المذكرة
  const opening =
    `يتقدم الموكل / ${item.client.name} بهذه ${docTitle}` +
    (item.opposingParty ? ` في مواجهة / ${item.opposingParty}` : "") +
    `، وذلك في القضية رقم (${item.caseNumber})` +
    (item.court ? ` المنظورة أمام ${item.court}` : "") +
    `، للأسباب الآتية:`;
  children.push(rtlParagraph(opening, { spacingAfter: 300 }));

  renderSection(children, "أولاً: الوقائع", facts);
  renderSection(children, "ثانياً: الأسانيد القانونية", legalGrounds);
  renderSection(children, "ثالثاً: الطلبات", requests);

  children.push(new Paragraph({ text: "", spacing: { after: 400 } }));
  children.push(rtlParagraph("وتفضلوا بقبول فائق الاحترام والتقدير.", { spacingAfter: 400 }));
  children.push(rtlParagraph(`المحامي: ${item.lawyer?.name ?? "—"}`, { alignment: AlignmentType.LEFT }));

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  const filename = `${docTitle}-${item.caseNumber}.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
