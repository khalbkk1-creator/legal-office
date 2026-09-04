import PortalAuthShell from "@/components/PortalAuthShell";
import LoginFlow from "./LoginFlow";

export const dynamic = "force-dynamic";

export default function PortalLoginPage({ searchParams }: { searchParams?: { next?: string } }) {
  return (
    <PortalAuthShell title="تسجيل الدخول" subtitle="أدخل بريدك وكلمة مرورك، ثم رمز التحقق الذي سيصلك">
      <LoginFlow next={searchParams?.next} />
    </PortalAuthShell>
  );
}
