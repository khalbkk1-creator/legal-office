"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const features = [
  { icon: "📁", label: "إدارة القضايا والجلسات" },
  { icon: "📒", label: "نظام محاسبي متكامل" },
  { icon: "💸", label: "حوكمة اعتماد طلبات الصرف" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* نموذج الدخول */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 md:py-4">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8 md:hidden text-center">
            <div className="mx-auto mb-3 w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center text-white text-xl font-bold shadow-elevated">
              م
            </div>
            <h1 className="text-lg font-bold text-ink">نظام إدارة مكتب المحاماة</h1>
          </div>

          <div className="hidden md:block mb-8">
            <h2 className="text-2xl font-bold text-ink">مرحباً بعودتك</h2>
            <p className="text-sm text-gray-500 mt-1.5">سجّل دخولك للمتابعة إلى لوحة التحكم</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-400 transition"
                placeholder="partner@office.sa"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                كلمة المرور
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-400 transition"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-l from-primary-800 to-primary-600 hover:from-primary-900 hover:to-primary-700 text-white rounded-xl py-3 text-sm font-semibold shadow-elevated transition disabled:opacity-60"
            >
              {loading ? "جاري الدخول..." : "تسجيل الدخول"}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-8">
            بيانات تجريبية: partner@office.sa / Password123!
          </p>
        </div>
      </div>

      {/* لوحة الهوية */}
      <div className="hidden md:flex md:w-[42%] relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 items-center justify-center p-12">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-accent-400/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-primary-300/10 blur-3xl" />

        <div className="relative text-white max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold mb-8">
            م
          </div>
          <h1 className="text-3xl font-bold leading-snug mb-3">
            نظام إدارة مكتب المحاماة
          </h1>
          <p className="text-primary-100/80 text-sm leading-relaxed mb-10">
            منصة متكاملة تجمع إدارة القضايا والعملاء والمالية وحوكمة الاعتمادات في مكان واحد.
          </p>

          <div className="space-y-4">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-lg shrink-0">
                  {f.icon}
                </div>
                <span className="text-sm text-primary-50/90">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
