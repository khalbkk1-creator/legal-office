import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolvePortalClientByToken } from "@/lib/portalAuth";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage({ params }: { params: { token: string } }) {
  const client = await resolvePortalClientByToken(params.token, undefined, { mode: "page" });
  if (!client) notFound();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <a href={`/portal/${params.token}`} className="text-sm text-primary-700 hover:underline">‹ رجوع للبوابة</a>
          <h1 className="text-xl font-bold text-ink mt-2">بياناتك</h1>
          <p className="text-sm text-gray-500 mt-1">أكمل أو عدّل بياناتك في أي وقت.</p>
        </div>

        <ProfileForm
          token={params.token}
          initial={{
            name: client.name,
            type: client.type,
            idNumber: client.idNumber ?? "",
            phone: client.phone ?? "",
            email: client.email ?? "",
            address: client.address ?? "",
          }}
        />
      </div>
    </div>
  );
}
