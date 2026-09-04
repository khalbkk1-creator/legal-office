import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function PortalAuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const settings = await prisma.officeSettings.findFirst().catch(() => null);
  return (
    <div className="min-h-screen bg-primary-900 flex items-center justify-center px-4 py-10" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          {settings?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt="" className="w-16 h-16 object-contain bg-white rounded-2xl p-2 mx-auto mb-3" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-white/10 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-3">م</div>
          )}
          <p className="text-white font-semibold">{settings?.officeName || "مكتب المحاماة"}</p>
          <p className="text-primary-200 text-xs mt-0.5">بوابة العملاء</p>
        </div>
        <div className="bg-white rounded-3xl shadow-floating p-7">
          <h1 className="text-xl font-bold text-ink">{title}</h1>
          <p className="text-sm text-gray-500 mt-1 mb-5">{subtitle}</p>
          {children}
        </div>
        <p className="text-center text-[11px] text-primary-200 mt-4">
          <Link href="/portal/login" className="hover:text-white">دخول</Link> · <Link href="/portal/register" className="hover:text-white">إنشاء حساب</Link> · <Link href="/portal/forgot" className="hover:text-white">نسيت كلمة المرور</Link>
        </p>
      </div>
    </div>
  );
}
