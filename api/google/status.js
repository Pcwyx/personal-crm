import { getSupabaseAdmin } from "./_utils.js";

export default async function handler(req, res) {
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
