import Link from "next/link";

export type TimelineEvent = {
  date: Date;
  icon: string;
  title: string;
  description?: string;
  href?: string;
  color?: string;
};

export default function Timeline({ events }: { events: TimelineEvent[] }) {
  const sorted = [...events].sort((a, b) => b.date.getTime() - a.date.getTime());

  if (sorted.length === 0) {
    return <p className="text-sm text-gray-400">لا توجد أحداث مسجّلة بعد.</p>;
  }

  return (
    <div className="relative">
      <div className="absolute right-4 top-1 bottom-1 w-px bg-gray-100" />
      <div className="space-y-5">
        {sorted.map((e, i) => {
          const content = (
            <div className="flex gap-3">
              <div
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm relative z-10 ${
                  e.color || "bg-primary-50 text-primary-700"
                }`}
              >
                {e.icon}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm font-medium text-ink">{e.title}</p>
                {e.description && <p className="text-xs text-gray-500 mt-0.5">{e.description}</p>}
                <p className="text-xs text-gray-400 mt-0.5">
                  {e.date.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>
          );
          return e.href ? (
            <Link key={i} href={e.href} className="block hover:bg-primary-50/30 rounded-lg -mx-2 px-2 py-1 transition">
              {content}
            </Link>
          ) : (
            <div key={i}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
