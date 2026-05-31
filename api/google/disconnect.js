import { getSupabaseAdmin } from "./_utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const supabase = getSupabaseAdmin();
  await supabase.from("settings").delete().eq("key", "google_tokens");
  await supabase.from("settings").delete().eq("key", "gcal_followup_id");
  await supabase.from("settings").delete().eq("key", "gcal_birthday_id");
  await supabase.from("settings").delete().eq("key", "gcal_last_sync");

  res.json({ ok: true });
}
