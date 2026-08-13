import Link from "next/link";

export default function BillingTabs({ active }: { active: "sales" | "quotes" }) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
      <Link
        href="/sales"
        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
          active === "sales" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
        }`}
      >
        💰 الفواتير
      </Link>
      <Link
        href="/quotes"
        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
          active === "quotes" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
        }`}
      >
        📝 عروض الأسعار
      </Link>
    </div>
  );
}
