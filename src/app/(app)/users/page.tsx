import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const roleLabels: Record<string, { label: string; color: string }> = {
  PARTNER: { label: "شريك", color: "bg-primary-50 text-primary-700" },
  LAWYER: { label: "محامي", color: "bg-blue-50 text-blue-700" },
  SECRETARY: { label: "سكرتير", color: "bg-gray-100 text-gray-600" },
};

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "PARTNER") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, phone: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">المستخدمون</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة حسابات المحامين والسكرتارية</p>
        </div>
        <Link
          href="/users/new"
          className="bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition"
        >
          + مستخدم جديد
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-right px-5 py-3 font-medium">الاسم</th>
              <th className="text-right px-5 py-3 font-medium">البريد الإلكتروني</th>
              <th className="text-right px-5 py-3 font-medium">الجوال</th>
              <th className="text-right px-5 py-3 font-medium">الدور</th>
              <th className="text-right px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-gray-50 hover:bg-primary-50/30 transition">
                <td className="px-5 py-3 text-ink font-medium">{u.name}</td>
                <td className="px-5 py-3 text-gray-600">{u.email}</td>
                <td className="px-5 py-3 text-gray-600">{u.phone ?? "—"}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${roleLabels[u.role].color}`}>
                    {roleLabels[u.role].label}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <Link href={`/users/${u.id}`} className="text-primary-700 text-sm hover:underline">
                    تعديل
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
