import { authFetch } from "../supabase.js";

const TIMEOUT_MS = 15000;
const RETRIES = 1;

export async function callAI(messages, maxTokens = 500) {
  let lastErr;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const res = await authFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, max_tokens: maxTokens }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        // 4xx (except 429) won't succeed on retry
        if (res.status < 500 && res.status !== 429) throw Object.assign(new Error(`HTTP ${res.status}`), { fatal: true });
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "{}";
      return JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch (e) {
      lastErr = e;
      if (e.fatal || attempt === RETRIES) break;
      await new Promise(r => setTimeout(r, 800));
    }
  }
  throw lastErr;
}
