import { createClient } from "@supabase/supabase-js";

// عميل Supabase من جهة السيرفر فقط - يستخدم مفتاح الخدمة (Service Role) لرفع الملفات
// لا تستخدم هذا الملف أو المفتاح في أي كود يعمل على المتصفح (client-side).
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

export const DOCUMENTS_BUCKET = "case-documents";

