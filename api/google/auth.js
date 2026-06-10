import crypto from "crypto";
import { getSupabaseAdmin } from "./_utils.js";

export default async function handler(req, res) {
  const appUrl = (process.env.VITE_APP_URL || "https://personal-crm-silk.vercel.app").trim();
  const state = crypto.randomBytes(16).toString("hex");
  const supabase = getSupabaseAdmin();
  await supabase.from("settings").upsert({
    key: "oauth_state",
    value: { state, expires: Date.now() + 600_000 },
  });

  const base = "https://accounts.google.com/o/oauth2/v2/auth";
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${appUrl}/api/google/callback`,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  res.redirect(`${base}?${params}`);
}
