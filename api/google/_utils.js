import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function getValidAccessToken() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "google_tokens")
    .single();
  if (!data?.value?.refresh_token) return null;

  const tokens = data.value;
  // Refresh if expiring within 60 seconds
  if (!tokens.expiry_date || tokens.expiry_date < Date.now() + 60_000) {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: tokens.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const refreshed = await r.json();
    if (!refreshed.access_token) return null;
    const updated = {
      ...tokens,
      access_token: refreshed.access_token,
      expiry_date: Date.now() + refreshed.expires_in * 1000,
    };
    await supabase.from("settings").upsert({ key: "google_tokens", value: updated });
    return updated.access_token;
  }
  return tokens.access_token;
}

export async function getBirthdayCalendarId(supabase, accessToken) {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "gcal_birthday_id")
    .single();
  if (data?.value?.id) return data.value.id;

  const r = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ summary: "CRM Birthdays" }),
  });
  const cal = await r.json();
  if (cal.id) {
    await supabase.from("settings").upsert({ key: "gcal_birthday_id", value: { id: cal.id } });
    return cal.id;
  }
  return "primary";
}

export async function getFollowUpCalendarId(supabase, accessToken) {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "gcal_followup_id")
    .single();
  if (data?.value?.id) return data.value.id;

  // Create the calendar
  const r = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ summary: "CRM Follow-ups" }),
  });
  const cal = await r.json();
  if (cal.id) {
    await supabase.from("settings").upsert({ key: "gcal_followup_id", value: { id: cal.id } });
    return cal.id;
  }
  return "primary";
}

// Keyword-based interaction type inference from event title
export function inferType(title = "") {
  const t = title.toLowerCase();
  if (/電話|call|phone/.test(t)) return "call";
  if (/視訊|video|zoom|google meet|teams|skype/.test(t)) return "video";
  if (/咖啡|coffee|lunch|dinner|eat|飯|餐/.test(t)) return "coffee";
  if (/活動|event|party|聚會/.test(t)) return "event";
  return "meeting";
}

// Character-set similarity — works well for CJK names
function charSimilarity(a, b) {
  if (!a || !b) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  const inter = [...sa].filter(c => sb.has(c)).length;
  return inter / Math.max(sa.size, sb.size);
}

export function matchContact(attendee, contacts) {
  // 1. Exact email match
  if (attendee.email) {
    const hit = contacts.find(
      c => c.email && c.email.toLowerCase() === attendee.email.toLowerCase()
    );
    if (hit) return hit;
  }
  // 2. Fuzzy name match (threshold 0.75)
  if (attendee.displayName) {
    const hit = contacts.find(
      c => c.name && charSimilarity(c.name, attendee.displayName) >= 0.75
    );
    if (hit) return hit;
  }
  return null;
}
