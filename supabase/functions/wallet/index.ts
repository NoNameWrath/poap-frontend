import { createClient } from "npm:@supabase/supabase-js@2";

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin ?? "*",
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
} as const);

const PROJECT_URL = Deno.env.get("project_url")!;
const ANON_KEY    = Deno.env.get("product_anon_key")!;

// robust body parser
async function parseBody(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;
  const ct = req.headers.get("content-type") || "";
  let address: string | null = null;
  let secretKey: string | null = null;

  try {
    if (ct.includes("application/json")) {
      const j = await req.json();
      address   = (j?.address ?? j?.public_key ?? j?.publicKey ?? null)?.toString() ?? null;
      secretKey = (j?.secretKey ?? j?.secret_key ?? null)?.toString() ?? null;
    } else if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
      const f = await req.formData();
      address   = (f.get("address") ?? f.get("public_key") ?? f.get("publicKey"))?.toString() ?? null;
      secretKey = (f.get("secretKey") ?? f.get("secret_key"))?.toString() ?? null;
    }
  } catch {
    // ignore, fall back to query
  }
  address   ||= params.get("address")    ?? params.get("public_key") ?? params.get("publicKey");
  secretKey ||= params.get("secretKey")  ?? params.get("secret_key");
  return { address: address?.trim() || null, secretKey: secretKey?.trim() || null };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: cors(origin) });
  if (req.method !== "POST")   return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: cors(origin) });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(PROJECT_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors(origin) });

    const { address, secretKey } = await parseBody(req);
    if (!address) {
      return new Response(JSON.stringify({
        error: "Missing address",
        hint: "Send { address } (or public_key/publicKey) as JSON/FormData, or ?address=…",
      }), { status: 400, headers: cors(origin) });
    }

    // idempotent read
    const existing = await supabase
      .from("wallets")
      .select("public_key")
      .eq("user_email", user.email)
      .maybeSingle();

    if (existing.error) {
      return new Response(JSON.stringify({ error: "Lookup failed", detail: existing.error.message }), { status: 500, headers: cors(origin) });
    }
    if (existing.data) {
      return new Response(JSON.stringify({ ok: true, alreadyExists: true, public_key: existing.data.public_key }), { status: 200, headers: cors(origin) });
    }

    // create (upsert avoids races)
    const inserted = await supabase
      .from("wallets")
      .upsert([{ user_email: user.email, public_key: address, secret_key: secretKey }], { onConflict: "user_email" })
      .select("public_key")
      .single();

    if (inserted.error) {
      return new Response(JSON.stringify({ error: "Insert failed", detail: inserted.error.message }), { status: 500, headers: cors(origin) });
    }

    return new Response(JSON.stringify({ ok: true, public_key: inserted.data.public_key }), { status: 200, headers: cors(origin) });
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    console.error("wallet fn error:", msg);
    return new Response(JSON.stringify({ error: "Unhandled", detail: msg }), { status: 500, headers: cors(origin) });
  }
});
