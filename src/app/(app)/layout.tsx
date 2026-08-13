import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";
import GlobalSearch from "@/components/GlobalSearch";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as any;

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={user.name} userRole={user.role} />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <GlobalSearch />
          <NotificationBell />
        </div>
        {children}
      </main>
    </div>
  );
}
