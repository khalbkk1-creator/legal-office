"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SYSTEM_MODULES = [
  { key: "cases", label: "القضايا", icon: "📁" },
  { key: "clients", label: "العملاء", icon: "👥" },
  { key: "hearings", label: "الجلسات", icon: "📅" },
  { key: "consultations", label: "طلبات الاستشارة", icon: "📩" },
  { key: "service-requests", label: "طلبات الخدمة", icon: "📋" },
  { key: "accounting", label: "النظام المحاسبي", icon: "📒" },
  { key: "quotes", label: "عروض الأسعار", icon: "📝" },
  { key: "payment-requests", label: "طلبات الصرف", icon: "💸" },
  { key: "payees", label: "المستفيدون", icon: "📇" },
  { key: "finance", label: "اللوحة المالية", icon: "📊" },
  { key: "analytics", label: "الإحصائيات", icon: "📈" },
  { key: "users", label: "المستخدمون", icon: "🔑" },
  { key: "positions", label: "المسميات والصلاحيات", icon: "🛡️" },
  { key: "api-keys", label: "مفاتيح API الخارجية", icon: "🔌" },
  { key: "settings", label: "إعدادات المكتب", icon: "⚙️" },
];

type Department = { id: string; name: string };

type Position = {
  id: string;
  name: string;
  allowedModules: string[];
  isAccountant: boolean;
  isFinancialManager: boolean;
  departmentId: string | null;
  department: Department | null;
  users: { id: string; name: string }[];
};

export default function PositionsPage() {
  const router = useRouter();
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [modules, setModules] = useState<string[]>([]);
  const [isAccountant, setIsAccountant] = useState(false);
  const [isFinancialManager, setIsFinancialManager] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [newDepartment, setNewDepartment] = useState({ show: false, name: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/positions").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
    ]).then(([positionsData, departmentsData]) => {
      setPositions(Array.isArray(positionsData) ? positionsData : []);
      setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setEditingId(null);
    setName("");
    setModules([]);
    setIsAccountant(false);
    setIsFinancialManager(false);
    setDepartmentId("");
    setNewDepartment({ show: false, name: "" });
    setError("");
  }

  function startEdit(p: Position) {
    setEditingId(p.id);
    setName(p.name);
    setModules(p.allowedModules);
    setIsAccountant(p.isAccountant);
    setIsFinancialManager(p.isFinancialManager);
    setDepartmentId(p.departmentId ?? "");
    setNewDepartment({ show: false, name: "" });
    setShowForm(true);
  }

  function toggleModule(key: string) {
    setModules((m) => (m.includes(key) ? m.filter((x) => x !== key) : [...m, key]));
  }

  async function createDepartmentInline(): Promise<string | null> {
    if (!newDepartment.name.trim()) return null;
    const res = await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newDepartment.name }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id as string;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    let finalDepartmentId = departmentId;
    if (newDepartment.show) {
      const createdId = await createDepartmentInline();
      if (!createdId) {
        setSaving(false);
        setError("تعذر إنشاء الإدارة الجديدة");
        return;
      }
      finalDepartmentId = createdId;
    }

    const payload = {
      name,
      allowedModules: modules,
      isAccountant,
      isFinancialManager,
      departmentId: finalDepartmentId || null,
    };
    const res = await fetch(editingId ? `/api/positions/${editingId}` : "/api/positions", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر الحفظ");
      return;
    }

    resetForm();
    setShowForm(false);
    load();
    router.refresh();
  }

  async function deletePosition(id: string) {
    if (!confirm("متأكد تبي تحذف هذا المسمى الوظيفي؟")) return;
    const res = await fetch(`/api/positions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "تعذر الحذف");
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">المسميات الوظيفية والصلاحيات</h1>
          <p className="text-gray-500 text-sm mt-1">
            حدد لكل مسمى وظيفي أي الشاشات يقدر يشوفها، وهل يشارك باعتماد طلبات الصرف
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm((s) => !s);
          }}
          className="bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition"
        >
          {showForm ? "إلغاء" : "+ مسمى وظيفي جديد"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم المسمى الوظيفي *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: محاسب، مدير مالي، محامي أول"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الإدارة</label>
            {!newDepartment.show ? (
              <div className="flex items-center gap-2">
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">بدون إدارة محددة</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setNewDepartment({ show: true, name: "" })}
                  className="text-xs text-primary-700 hover:underline whitespace-nowrap"
                >
                  + إدارة جديدة
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  value={newDepartment.name}
                  onChange={(e) => setNewDepartment((n) => ({ ...n, name: e.target.value }))}
                  placeholder="اسم الإدارة الجديدة"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setNewDepartment({ show: false, name: "" })}
                  className="text-xs text-gray-400 hover:underline whitespace-nowrap"
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الشاشات المسموح الوصول لها</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SYSTEM_MODULES.map((m) => (
                <label
                  key={m.key}
                  className={`flex items-center gap-2 text-sm rounded-lg border px-3 py-2 cursor-pointer transition ${
                    modules.includes(m.key) ? "border-primary-600 bg-primary-50 text-primary-700" : "border-gray-300 text-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={modules.includes(m.key)}
                    onChange={() => toggleModule(m.key)}
                    className="accent-primary-700"
                  />
                  <span>{m.icon} {m.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 rounded-lg p-4 space-y-2">
            <p className="text-xs text-amber-800 font-medium mb-1">دور بسلسلة اعتماد طلبات الصرف (اختياري)</p>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isAccountant} onChange={(e) => setIsAccountant(e.target.checked)} className="accent-primary-700" />
              يعتمد كمرحلة "المحاسب"
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isFinancialManager} onChange={(e) => setIsFinancialManager(e.target.checked)} className="accent-primary-700" />
              يعتمد كمرحلة "المدير المالي" (الاعتماد النهائي)
            </label>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="bg-primary-700 hover:bg-primary-800 text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "إنشاء المسمى الوظيفي"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-right px-5 py-3 font-medium">الاسم</th>
              <th className="text-right px-5 py-3 font-medium">الإدارة</th>
              <th className="text-right px-5 py-3 font-medium">عدد الشاشات المتاحة</th>
              <th className="text-right px-5 py-3 font-medium">أدوار الاعتماد</th>
              <th className="text-right px-5 py-3 font-medium">عدد المستخدمين</th>
              <th className="text-right px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.id} className="border-t border-gray-50">
                <td className="px-5 py-3 font-medium text-ink">{p.name}</td>
                <td className="px-5 py-3 text-gray-600">{p.department?.name ?? "—"}</td>
                <td className="px-5 py-3 text-gray-600">{p.allowedModules.length} من {SYSTEM_MODULES.length}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {p.isAccountant && <span className="text-xs px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">محاسب</span>}
                    {p.isFinancialManager && <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">مدير مالي</span>}
                    {!p.isAccountant && !p.isFinancialManager && <span className="text-xs text-gray-400">—</span>}
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-600">{p.users.length}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => startEdit(p)} className="text-xs text-primary-700 hover:underline">تعديل</button>
                    <button onClick={() => deletePosition(p.id)} className="text-xs text-red-600 hover:underline">حذف</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && positions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-gray-400">لا توجد مسميات وظيفية بعد.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
