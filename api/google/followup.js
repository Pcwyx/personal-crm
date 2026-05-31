import { getSupabaseAdmin, getValidAccessToken, getFollowUpCalendarId } from "./_utils.js";

function buildEventBody(contact, date, note) {
  const title = `Follow up: ${contact.name}`;
  const lines = [];
  if (contact.role) lines.push(contact.role + (contact.company ? ` @ ${contact.company}` : ""));
  if (contact.email) lines.push(contact.email);
  if (contact.phone) lines.push(contact.phone);
  if (note) lines.push(`\nNote: ${note}`);

  return {
    summary: title,
    description: lines.join("\n"),
    start: {
      dateTime: `${date}T08:00:00`,
      timeZone: "Asia/Taipei",
    },
    end: {
      dateTime: `${date}T08:30:00`,
      timeZone: "Asia/Taipei",
    },
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: 0 }],
    },
  };
}

export default async function handler(req, res) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return res.status(401).json({ error: "not_connected" });

  const supabase = getSupabaseAdmin();
  const calId = await getFollowUpCalendarId(supabase, accessToken);

  // POST: create event
  if (req.method === "POST") {
    const { contact, date, note } = req.body || {};
    if (!contact || !date) return res.status(400).json({ error: "missing_params" });

    const r = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildEventBody(contact, date, note)),
      }
    );
    const ev = await r.json();
    if (!ev.id) return res.status(500).json({ error: "create_failed", detail: ev });
    return res.json({ event_id: ev.id });
  }

  // PUT: update existing event
  if (req.method === "PUT") {
    const { event_id, contact, date, note } = req.body || {};
    if (!event_id || !contact || !date) return res.status(400).json({ error: "missing_params" });

    const r = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(event_id)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildEventBody(contact, date, note)),
      }
    );
    const ev = await r.json();
    if (!ev.id) return res.status(500).json({ error: "update_failed", detail: ev });
    return res.json({ event_id: ev.id });
  }

  // DELETE: remove event
  if (req.method === "DELETE") {
    const { event_id } = req.body || {};
    if (!event_id) return res.status(400).json({ error: "missing_params" });

    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(event_id)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return res.json({ ok: true });
  }

  res.status(405).json({ error: "method_not_allowed" });
}
