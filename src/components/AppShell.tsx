"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";

const roleLabels: Record<string, string> = {
  PARTNER: "شريك",
  LAWYER: "محامي",
  SECRETARY: "سكرتير",
};

type NavItem = { href: string; label: string; icon: keyof typeof icons; moduleKey: string; partnerOnly?: boolean };
type NavGroup = { title: string; items: NavItem[] };

const icons = {
  home: "M3 11.5 12 4l9 7.5M5 10.5V20h14v-9.5",
  briefcase: "M4 8h16v11H4zM9 8V5h6v3M4 13h16",
  users: "M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M21 20v-2a4 4 0 0 0-3-3.9M15 3.1a4 4 0 0 1 0 7.8",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  chat: "M4 5h16v11H9l-5 4z",
  clipboard: "M8 4h8v3H8zM6 6h12v14H6zM9 12h6M9 16h4",
  tag: "M3 12V3h9l9 9-9 9zM7.5 7.5h.01",
  book: "M4 4h9a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-4a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h5z",
  send: "M4 12 20 4l-4 16-4-7z",
  truck: "M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  key: "M14 10a4 4 0 1 0-4 4l1 0 2 2h2v2h2v2h3v-3l-6-6z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  plug: "M9 3v5M15 3v5M6 8h12v4a6 6 0 0 1-12 0zM12 18v3",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6 6 18",
};

function Icon({ name, className = "w-5 h-5" }: { name: keyof typeof icons; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={icons[name]} />
    </svg>
  );
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "العمل",
    items: [
      { href: "/cases", label: "القضايا", icon: "briefcase", moduleKey: "cases" },
      { href: "/clients", label: "العملاء", icon: "users", moduleKey: "clients" },
      { href: "/hearings", label: "الجلسات", icon: "calendar", moduleKey: "hearings" },
      { href: "/consultations", label: "طلبات الاستشارة", icon: "chat", moduleKey: "consultations" },
      { href: "/service-requests", label: "طلبات الخدمة", icon: "clipboard", moduleKey: "service-requests" },
      { href: "/quotes", label: "عروض الأسعار", icon: "tag", moduleKey: "quotes" },
    ],
  },
  {
    title: "المالية",
    items: [
      { href: "/accounting", label: "النظام المحاسبي", icon: "book", moduleKey: "accounting" },
      { href: "/payment-requests", label: "طلبات الصرف", icon: "send", moduleKey: "payment-requests" },
      { href: "/payees", label: "الموردون", icon: "truck", moduleKey: "payees" },
      { href: "/finance", label: "اللوحة المالية", icon: "chart", moduleKey: "finance" },
      { href: "/analytics", label: "الإحصائيات", icon: "trend", moduleKey: "analytics" },
    ],
  },
  {
    title: "الإدارة",
    items: [
      { href: "/users", label: "المستخدمون", icon: "key", moduleKey: "users", partnerOnly: true },
      { href: "/positions", label: "المسميات والصلاحيات", icon: "shield", moduleKey: "positions", partnerOnly: true },
      { href: "/api-keys", label: "مفاتيح API", icon: "plug", moduleKey: "api-keys", partnerOnly: true },
      { href: "/settings", label: "إعدادات المكتب", icon: "settings", moduleKey: "settings", partnerOnly: true },
    ],
  },
];

export default function AppShell({
  userName,
  userRole,
  children,
}: {
  userName: string;
  userRole: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initials = (userName || "؟").trim().slice(0, 1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [nav, setNav] = useState<{ isPartner: boolean; hasPosition: boolean; allowedModules: string[] } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/me/nav")
      .then((r) => r.json())
      .then(setNav)
      .catch(() => setNav({ isPartner: userRole === "PARTNER", hasPosition: false, allowedModules: [] }));
  }, [userRole]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  function canSee(item: NavItem) {
    if (!nav) return !item.partnerOnly;
    if (nav.isPartner) return true;
    if (nav.hasPosition) return nav.allowedModules.includes(item.moduleKey);
    return !item.partnerOnly;
  }

  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter(canSee) })).filter((g) => g.items.length > 0);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const sidebar = (
    <nav className="flex flex-col h-full">
      <Link href="/dashboard" className="flex items-center gap-3 px-5 py-5 border-b border-white/10" onClick={() => setDrawerOpen(false)}>
        <div className="w-9 h-9 rounded-lg bg-accent-400 text-primary-950 flex items-center justify-center font-bold text-lg">م</div>
        <div className="leading-tight">
          <p className="text-white font-semibold text-sm">مكتب المحاماة</p>
          <p className="text-primary-200 text-[11px]">نظام الإدارة</p>
        </div>
      </Link>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
            isActive("/dashboard") ? "bg-white/12 text-white font-medium" : "text-primary-100 hover:bg-white/8 hover:text-white"
          }`}
        >
          <Icon name="home" />
          الرئيسية
        </Link>

        {groups.map((g) => (
          <div key={g.title}>
            <p className="px-3 mb-1.5 text-[11px] font-medium text-primary-300">{g.title}</p>
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                      active ? "bg-white/12 text-white font-medium" : "text-primary-100 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    {active && <span className="absolute right-0 top-2 bottom-2 w-[3px] rounded-l bg-accent-400" />}
                    <Icon name={item.icon} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-primary-100 hover:bg-white/8 hover:text-white transition"
        >
          <Icon name="logout" />
          تسجيل الخروج
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f3f5f4]">
      <aside className="hidden lg:block fixed inset-y-0 right-0 w-64 bg-primary-900 z-30">{sidebar}</aside>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-72 bg-primary-900 shadow-floating">
            <button onClick={() => setDrawerOpen(false)} className="absolute left-3 top-4 text-primary-200 hover:text-white" aria-label="إغلاق">
              <Icon name="close" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:mr-64">
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="px-4 md:px-8 h-16 flex items-center gap-3">
            <button onClick={() => setDrawerOpen(true)} className="lg:hidden text-gray-600 hover:text-ink" aria-label="القائمة">
              <Icon name="menu" className="w-6 h-6" />
            </button>
            <GlobalSearch />
            <NotificationBell />
            {userName && (
              <div className="relative shrink-0" ref={menuRef}>
                <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2.5 rounded-full hover:bg-gray-100 transition py-1 pr-1 pl-3">
                  <div className="w-9 h-9 rounded-full bg-primary-700 text-white flex items-center justify-center text-sm font-semibold shrink-0">{initials}</div>
                  <div className="hidden sm:flex flex-col leading-tight text-right">
                    <span className="text-sm font-medium text-ink">{userName}</span>
                    {userRole && <span className="text-[11px] text-gray-500">{roleLabels[userRole] ?? userRole}</span>}
                  </div>
                </button>
                {menuOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-floating overflow-hidden z-30">
                    <div className="px-4 py-3 border-b border-gray-100 sm:hidden">
                      <p className="text-sm font-medium text-ink">{userName}</p>
                      {userRole && <p className="text-[11px] text-gray-500">{roleLabels[userRole] ?? userRole}</p>}
                    </div>
                    <button onClick={() => signOut({ callbackUrl: "/login" })} className="w-full flex items-center gap-2 text-right px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition">
                      <Icon name="logout" className="w-4 h-4" />
                      تسجيل الخروج
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="max-w-6xl mx-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
