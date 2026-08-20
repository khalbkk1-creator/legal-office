import { redirect } from "next/navigation";

export default function SalesPage() {
  redirect("/accounting?tab=invoices");
}
