import PortalAuthShell from "@/components/PortalAuthShell";
import OtpPasswordFlow from "@/components/OtpPasswordFlow";

export const dynamic = "force-dynamic";

export default function PortalForgotPage() {
  return (
    <PortalAuthShell title="استعادة كلمة المرور" subtitle="أدخل بريدك، وسيصلك رمز تحقق لتعيين كلمة مرور جديدة">
      <OtpPasswordFlow purpose="RESET" submitLabel="تعيين كلمة المرور" />
    </PortalAuthShell>
  );
}
