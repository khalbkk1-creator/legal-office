"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";

export default function AppShell({
  userName,
  userRole,
  children,
}: {
  userName: string;
  userRole: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={userName} userRole={userRole} open={open} onClose={() => setOpen(false)} />

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <main className="flex-1 min-w-0 p-4 md:p-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            onClick={() => setOpen(true)}
            className="md:hidden w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center shrink-0"
          >
            <span className="text-lg">☰</span>
          </button>
          <GlobalSearch />
          <NotificationBell />
        </div>
        {children}
      </main>
    </div>
  );
}
