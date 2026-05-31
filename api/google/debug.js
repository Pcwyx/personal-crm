export default function handler(req, res) {
  const appUrl = (process.env.VITE_APP_URL || "https://personal-crm-silk.vercel.app").trim();
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  res.json({
    appUrl,
    redirectUri: `${appUrl}/api/google/callback`,
    clientIdLength: clientId.length,
    clientIdTrimmedLength: clientId.trim().length,
    clientIdSuffix: clientId.trim().slice(-30),
    hasNewline: clientId.includes("\n"),
  });
}
