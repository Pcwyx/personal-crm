import { getSupabaseAdmin, getFollowUpCalendarId } from "./_utils.js";

export default async function handler(req, res) {
  const { code, error } = req.query;
  const appUrl = (process.env.VITE_APP_URL || "https://personal-crm-silk.vercel.app").trim();

  if (error || !code) {
    return res.redirect(`${appUrl}?gcal_error=${encodeURIComponent(error || "no_code")}`);
  }

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${appUrl}/api/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await r.json();

  if (!tokens.access_token || !tokens.refresh_token) {
    return res.redirect(`${appUrl}?gcal_error=token_exchange_failed`);
  }

  const tokenData = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: Date.now() + tokens.expires_in * 1000,
  };

  const supabase = getSupabaseAdmin();
  await supabase.from("settings").upsert({ key: "google_tokens", value: tokenData });

  // Pre-create the CRM Follow-ups calendar
  await getFollowUpCalendarId(supabase, tokens.access_token);

  return res.redirect(`${appUrl}?gcal_connected=1`);
}
