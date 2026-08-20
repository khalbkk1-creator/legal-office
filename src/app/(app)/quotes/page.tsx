import { prisma } from "@/lib/prisma";
import QuotesScreen from "@/components/QuotesScreen";

export default async function QuotesPage() {
  const quotes = await prisma.quotation.findMany({
    include: { client: true, case: true },
    orderBy: { createdAt: "desc" },
  });

  return <QuotesScreen quotes={quotes} />;
}
