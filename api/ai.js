export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { messages, max_tokens } = req.body;
  if (!messages) return res.status(400).json({ error: "messages required" });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: max_tokens ?? 1000, messages }),
  });

  const data = await response.json();
  res.status(response.status).json(data);
}
