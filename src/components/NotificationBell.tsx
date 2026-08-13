"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

type Notification = {
  id: string;
  icon: string;
  title: string;
  description?: string;
  href: string;
  urgency: "high" | "medium" | "low";
  date: string;
};

const urgencyColor: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-gray-400",
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function load() {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => {});
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const highCount = notifications.filter((n) => n.urgency === "high").length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:border-primary-300 transition"
      >
        <span className="text-lg">🔔</span>
        {notifications.length > 0 && (
          <span
            className={`absolute -top-1 -left-1 min-w-[18px] h-[18px] rounded-full text-white text-[10px] flex items-center justify-center px-1 ${
              highCount > 0 ? "bg-red-500" : "bg-amber-500"
            }`}
          >
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-lg z-50">
          <div className="p-3 border-b border-gray-50">
            <p className="text-sm font-bold text-ink">التنبيهات</p>
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400 p-4 text-center">لا توجد تنبيهات حالياً 🎉</p>
          ) : (
            <div>
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-2 px-3 py-3 border-b border-gray-50 last:border-0 hover:bg-primary-50/30 transition"
                >
                  <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${urgencyColor[n.urgency]}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink">{n.title}</p>
                    {n.description && <p className="text-xs text-gray-400 mt-0.5">{n.description}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
