"use client";

import Link from "next/link";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";

export default function AppShell({
  children,
}: {
  userName: string;
  userRole: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link
            href="/dashboard"
            className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center shrink-0 hover:border-primary-300 transition"
            title="الرئيسية"
          >
            <span className="text-lg">🏠</span>
          </Link>
          <GlobalSearch />
          <NotificationBell />
        </div>
        {children}
      </main>
    </div>
  );
}
