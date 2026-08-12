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

function rtlParagraph(text: string, opts: { bold?: boolean; size?: number; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; spacingAfter?: number } = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: opts.alignment ?? AlignmentType.RIGHT,
    spacing: { after: opts.spacingAfter ?? 200 },
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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();
  const templateType = body.templateType as string;
  const bodyText = (body.bodyText as string) || "";

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
  children.push(rtlParagraph(docTitle, { bold: true, size: 32, alignment: AlignmentType.CENTER, spacingAfter: 300 }));

  // بيانات القضية
  children.push(rtlParagraph(`التاريخ: ${today}`));
  children.push(rtlParagraph(`رقم القضية: ${item.caseNumber}`));
  children.push(rtlParagraph(`موضوع القضية: ${item.title}`));
  if (item.court) children.push(rtlParagraph(`المحكمة: ${item.court}`));
  children.push(rtlParagraph(`العميل: ${item.client.name}`));
  if (item.opposingParty) children.push(rtlParagraph(`الطرف الآخر: ${item.opposingParty}`));

  children.push(new Paragraph({ text: "", spacing: { after: 300 } }));

  // نص المستند
  const paragraphs = bodyText.split("\n").filter((p) => p.trim().length > 0);
  if (paragraphs.length === 0) {
    children.push(rtlParagraph("—"));
  } else {
    for (const p of paragraphs) {
      children.push(rtlParagraph(p, { spacingAfter: 200 }));
    }
  }

  children.push(new Paragraph({ text: "", spacing: { after: 600 } }));
  children.push(rtlParagraph(`المحامي: ${item.lawyer?.name ?? "—"}`, { alignment: AlignmentType.LEFT }));

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  const filename = `${docTitle}-${item.caseNumber}.docx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
