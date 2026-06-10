import { getSupabaseAdmin, verifyAuth } from "./_utils.js";

export default async function handler(req, res) {
  if (!await verifyAuth(req)) return res.status(401).json({ error: "Unauthorized" });
  const supabase = getSupabaseAdmin();
  const { data: tokenRow } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "google_tokens")
    .single();

  const connected = !!tokenRow?.value?.refresh_token;

  const { data: syncRow } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "gcal_last_sync")
    .single();

  res.json({ connected, last_sync: syncRow?.value?.ts || null });
}
