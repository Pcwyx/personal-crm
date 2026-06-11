import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../supabase.js", () => ({ authFetch: vi.fn() }));

import { authFetch } from "../supabase.js";
import { callAI } from "./ai.js";

function okResponse(content) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  };
}

beforeEach(() => vi.clearAllMocks());

describe("callAI", () => {
  it("parses JSON content on success", async () => {
    authFetch.mockResolvedValueOnce(okResponse('{"action":"call her","message":"hi"}'));
    const out = await callAI([{ role: "user", content: "x" }], 500);
    expect(out).toEqual({ action: "call her", message: "hi" });
    expect(authFetch).toHaveBeenCalledTimes(1);
  });

  it("strips markdown code fences", async () => {
    authFetch.mockResolvedValueOnce(okResponse('```json\n{"a":1}\n```'));
    expect(await callAI([])).toEqual({ a: 1 });
  });

  it("retries once on 500 then succeeds", async () => {
    authFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce(okResponse('{"a":1}'));
    expect(await callAI([])).toEqual({ a: 1 });
    expect(authFetch).toHaveBeenCalledTimes(2);
  });

  it("retries on network error then succeeds", async () => {
    authFetch
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(okResponse('{"a":1}'));
    expect(await callAI([])).toEqual({ a: 1 });
    expect(authFetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 401 (fatal)", async () => {
    authFetch.mockResolvedValue({ ok: false, status: 401 });
    await expect(callAI([])).rejects.toThrow("HTTP 401");
    expect(authFetch).toHaveBeenCalledTimes(1);
  });

  it("retries 429 (rate limit)", async () => {
    authFetch
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce(okResponse('{"a":1}'));
    expect(await callAI([])).toEqual({ a: 1 });
    expect(authFetch).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries", async () => {
    authFetch.mockResolvedValue({ ok: false, status: 503 });
    await expect(callAI([])).rejects.toThrow("HTTP 503");
    expect(authFetch).toHaveBeenCalledTimes(2);
  });

  it("passes max_tokens and timeout signal", async () => {
    authFetch.mockResolvedValueOnce(okResponse("{}"));
    await callAI([{ role: "user", content: "x" }], 600);
    const [url, opts] = authFetch.mock.calls[0];
    expect(url).toBe("/api/ai");
    expect(JSON.parse(opts.body).max_tokens).toBe(600);
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });
});
