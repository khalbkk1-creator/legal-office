import PortalAuthShell from "@/components/PortalAuthShell";
import OtpPasswordFlow from "@/components/OtpPasswordFlow";

export const dynamic = "force-dynamic";

export default function PortalActivatePage() {
  return (
    <PortalAuthShell title="إنشاء حساب" subtitle="سجّل بياناتك وسيصلك رمز تحقق على بريدك لتأكيده وتعيين كلمة مرورك">
      <OtpPasswordFlow purpose="ACTIVATE" submitLabel="إنشاء الحساب" />
    </PortalAuthShell>
  );
}
