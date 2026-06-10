import { getSupabaseAdmin, getValidAccessToken, getBirthdayCalendarId, verifyAuth } from "./_utils.js";

// Next occurrence of MM-DD from today (Asia/Taipei)
function nextBirthdayYear(mm, dd) {
  const now = new Date(Date.now() + 8 * 3600000); // UTC+8
  const thisYear = now.getUTCFullYear();
  const thisMonth = now.getUTCMonth() + 1;
  const thisDay = now.getUTCDate();
  if (mm > thisMonth || (mm === thisMonth && dd >= thisDay)) return thisYear;
  return thisYear + 1;
}

function buildEventBody(contact, mm, dd) {
  const year = nextBirthdayYear(mm, dd);
  const pad = n => String(n).padStart(2, "0");
  const dateStr = `${year}-${pad(mm)}-${pad(dd)}`;
  const lines = [];
  if (contact.role) lines.push(contact.role + (contact.company ? ` @ ${contact.company}` : ""));
  if (contact.email) lines.push(contact.email);
  if (contact.phone) lines.push(contact.phone);

  return {
    summary: `🎂 ${contact.name}'s Birthday`,
    description: lines.join("\n") || undefined,
    start: { dateTime: `${dateStr}T08:00:00`, timeZone: "Asia/Taipei" },
    end:   { dateTime: `${dateStr}T08:30:00`, timeZone: "Asia/Taipei" },
    recurrence: ["RRULE:FREQ=YEARLY"],
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: 0 }],
    },
  };
}

export default async function handler(req, res) {
  if (!await verifyAuth(req)) return res.status(401).json({ error: "Unauthorized" });
  const accessToken = await getValidAccessToken();
  if (!accessToken) return res.status(401).json({ error: "not_connected" });

  const supabase = getSupabaseAdmin();
  const calId = await getBirthdayCalendarId(supabase, accessToken);

  // POST: create or update
  if (req.method === "POST") {
    const { contact, birthday, event_id } = req.body || {};
    if (!contact || !birthday) return res.status(400).json({ error: "missing_params" });

    const [mm, dd] = birthday.split("-").map(Number);
    if (!mm || !dd) return res.status(400).json({ error: "invalid_birthday" });

    const body = buildEventBody(contact, mm, dd);
    const url = event_id
      ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(event_id)}`
      : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`;
    const method = event_id ? "PUT" : "POST";

    const r = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const ev = await r.json();
    if (!ev.id) return res.status(500).json({ error: "create_failed", detail: ev });
    return res.json({ event_id: ev.id });
  }

  // DELETE
  if (req.method === "DELETE") {
    const { event_id } = req.body || {};
    if (!event_id) return res.status(400).json({ error: "missing_params" });

    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(event_id)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return res.json({ ok: true });
  }

  res.status(405).json({ error: "method_not_allowed" });
}
