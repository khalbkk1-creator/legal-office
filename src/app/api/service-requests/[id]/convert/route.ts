import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const request = await prisma.serviceRequest.findUnique({
    where: { id: params.id },
    include: { client: true, quotation: true, documents: true },
  });
  if (!request) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  if (request.status === "CONVERTED") {
    return NextResponse.json({ error: "تم تحويل هذا الطلب مسبقاً" }, { status: 400 });
  }
  if (request.requestType === "CASE" && (!request.quotation || request.quotation.status !== "ACCEPTED")) {
    return NextResponse.json({ error: "يجب موافقة العميل على عرض السعر أولاً" }, { status: 400 });
  }

  if (request.requestType === "CASE") {
    const year = new Date().getFullYear();
    const count = await prisma.case.count({ where: { caseNumber: { startsWith: `C-${year}-` } } });
    const caseNumber = `C-${year}-${(count + 1).toString().padStart(4, "0")}`;

    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        title: request.notes?.slice(0, 100) || "قضية جديدة من طلب خدمة",
        caseType: "غير محدد",
        status: "UNDER_REVIEW",
        description: request.notes || undefined,
        clientId: request.clientId,
      },
    });

    if (request.documents.length > 0) {
      await prisma.caseDocument.createMany({
        data: request.documents.map((d) => ({
          caseId: newCase.id,
          fileName: d.fileName,
          fileUrl: d.fileUrl,
          fileSize: d.fileSize,
          categoryId: d.categoryId,
        })),
      });
    }

    const updated = await prisma.serviceRequest.update({
      where: { id: params.id },
      data: { status: "CONVERTED", convertedCaseId: newCase.id },
    });

    return NextResponse.json({ ...updated, destination: "case", destinationId: newCase.id });
  }

  // CONSULTATION
  const consultationLabels: Record<string, string> = {
    PHONE: "استشارة هاتفية",
    IN_PERSON: "استشارة حضورية",
    WRITTEN: "استشارة كتابية",
  };
  const typeLabel = request.consultationType ? consultationLabels[request.consultationType] : "";
  const costNote = request.estimatedCost ? ` — التكلفة: ${request.estimatedCost.toLocaleString()} ر.س` : "";
  const combinedNotes = [typeLabel, request.notes, costNote].filter(Boolean).join(" | ");

  const consultation = await prisma.consultationRequest.create({
    data: {
      name: request.client.name,
      phone: request.client.phone || "",
      email: request.client.email || undefined,
      notes: combinedNotes || undefined,
      requestedDate: request.requestedDate ?? new Date(),
      status: "CONFIRMED",
      serviceRequestId: request.id,
    },
  });

  const updated = await prisma.serviceRequest.update({
    where: { id: params.id },
    data: { status: "CONVERTED", convertedConsultationId: consultation.id },
  });

  return NextResponse.json({ ...updated, destination: "consultation", destinationId: consultation.id });
}
