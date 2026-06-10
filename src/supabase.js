import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function authFetch(url, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { ...opts.headers };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return fetch(url, { ...opts, headers });
}
