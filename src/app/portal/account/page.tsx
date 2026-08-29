import { redirect } from "next/navigation";
import { getPortalClient, ensureClientAccessToken } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";

export default async function PortalAccountRedirect() {
  const client = await getPortalClient();
  if (!client) redirect("/portal/login");

  const token = await ensureClientAccessToken(client.id, client.accessToken);
  redirect(`/portal/${token}`);
}
