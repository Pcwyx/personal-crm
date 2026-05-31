export default function handler(req, res) {
  const appUrl = (process.env.VITE_APP_URL || "https://personal-crm-silk.vercel.app").trim();
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
  });
  res.redirect(`${base}?${params}`);
}
