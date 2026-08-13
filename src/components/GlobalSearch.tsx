"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Results = {
  clients: { id: string; name: string; phone: string | null }[];
  cases: { id: string; title: string; caseNumber: string; client: { name: string } }[];
  sales: { id: string; invoiceNumber: string; description: string; client: { name: string } }[];
  quotes: { id: string; quoteNumber: string; description: string; client: { name: string } }[];
  documents: { id: string; fileName: string; caseId: string; case: { title: string } }[];
};

const empty: Results = { clients: [], cases: [], sales: [], quotes: [], documents: [] };

export default function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results>(empty);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(empty);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          setResults(data);
          setOpen(true);
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timeout);
  }, [q]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalResults =
    results.clients.length + results.cases.length + results.sales.length + results.quotes.length + results.documents.length;

  function closeAndClear() {
    setOpen(false);
    setQ("");
  }

  return (
    <div ref={ref} className="relative flex-1 max-w-md">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.trim().length >= 2 && setOpen(true)}
        placeholder="🔍 بحث عن عميل، قضية، فاتورة..."
        className="w-full rounded-full border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:border-primary-400"
      />

      {open && (
        <div className="absolute left-0 right-0 mt-2 max-h-96 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-lg z-50">
          {totalResults === 0 ? (
            <p className="text-sm text-gray-400 p-4 text-center">لا توجد نتائج.</p>
          ) : (
            <div className="p-2">
              {results.clients.length > 0 && (
                <SearchGroup title="العملاء">
                  {results.clients.map((c) => (
                    <SearchItem key={c.id} href={`/clients/${c.id}`} onClick={closeAndClear} title={c.name} subtitle={c.phone ?? ""} icon="👤" />
                  ))}
                </SearchGroup>
              )}
              {results.cases.length > 0 && (
                <SearchGroup title="القضايا">
                  {results.cases.map((c) => (
                    <SearchItem key={c.id} href={`/cases/${c.id}`} onClick={closeAndClear} title={c.title} subtitle={`${c.caseNumber} · ${c.client.name}`} icon="📁" />
                  ))}
                </SearchGroup>
              )}
              {results.sales.length > 0 && (
                <SearchGroup title="الفواتير">
                  {results.sales.map((s) => (
                    <SearchItem key={s.id} href="/sales" onClick={closeAndClear} title={s.invoiceNumber} subtitle={`${s.description} · ${s.client.name}`} icon="💰" />
                  ))}
                </SearchGroup>
              )}
              {results.quotes.length > 0 && (
                <SearchGroup title="عروض الأسعار">
                  {results.quotes.map((q2) => (
                    <SearchItem key={q2.id} href="/quotes" onClick={closeAndClear} title={q2.quoteNumber} subtitle={`${q2.description} · ${q2.client.name}`} icon="📝" />
                  ))}
                </SearchGroup>
              )}
              {results.documents.length > 0 && (
                <SearchGroup title="المرفقات">
                  {results.documents.map((d) => (
                    <SearchItem key={d.id} href={`/cases/${d.caseId}`} onClick={closeAndClear} title={d.fileName} subtitle={d.case.title} icon="📎" />
                  ))}
                </SearchGroup>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 last:mb-0">
      <p className="text-[11px] text-gray-400 font-medium px-2 mb-1">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function SearchItem({
  href,
  title,
  subtitle,
  icon,
  onClick,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-primary-50 transition"
    >
      <span className="text-sm shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink truncate">{title}</p>
        {subtitle && <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>}
      </div>
    </Link>
  );
}
