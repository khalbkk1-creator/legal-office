import PortalAuthShell from "@/components/PortalAuthShell";
import OtpPasswordFlow from "@/components/OtpPasswordFlow";

export const dynamic = "force-dynamic";

export default function PortalActivatePage() {
  return (
    <PortalAuthShell title="تفعيل حسابك" subtitle="أدخل بريدك المسجّل لدى المكتب، وسيصلك رمز تحقق لتعيين كلمة مرورك">
      <OtpPasswordFlow purpose="ACTIVATE" submitLabel="تفعيل الحساب" />
    </PortalAuthShell>
  );
}
