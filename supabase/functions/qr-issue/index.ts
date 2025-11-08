// supabase/functions/qr-issue/index.ts
// Use dynamic import with ts-ignore to avoid missing type declarations from esm.sh
// @ts-ignore: external module without types
import { createClient } from "npm:@supabase/supabase-js@2";
import * as ed from "npm:@noble/ed25519@2.1.0";


const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const PROJECT_URL = Deno.env.get("project_url")!;
const ANON_KEY = Deno.env.get("product_anon_key")!;

function sha256(data: Uint8Array): Promise<Uint8Array> {
  return crypto.subtle.digest("SHA-256", data).then(buf => new Uint8Array(buf));
}
function u8(s: string) { return new TextEncoder().encode(s); }
function b64ToU8(b64: string) { return Uint8Array.from(atob(b64), c => c.charCodeAt(0)); }
function randNonce(bytes = 12) { const a = new Uint8Array(bytes); crypto.getRandomValues(a); return btoa(String.fromCharCode(...a)).replace(/=+$/,""); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: cors });

  try {
    const url = new URL(req.url);
    const event_id = url.searchParams.get("event_id");
    if (!event_id) return new Response(JSON.stringify({ error: "event_id required" }), { status: 400, headers: cors });

    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(PROJECT_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });

    // fetch event + signer
    const { data: ev, error: evErr } = await supabase.from("events").select("starts_at,ends_at").eq("id", event_id).maybeSingle();
    if (evErr || !ev) return new Response(JSON.stringify({ error: "event missing" }), { status: 404, headers: cors });

    const { data: keyRow, error: keyErr } = await supabase.from("qr_keys").select("public_key,secret_b64").eq("event_id", event_id).maybeSingle();
    if (keyErr || !keyRow) return new Response(JSON.stringify({ error: "qr signer missing" }), { status: 404, headers: cors });

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 1000; // 30s TTL
    const token = { event: event_id, exp, nonce: randNonce(), ver: 1 };

    const msg = u8(JSON.stringify(token));
    const digest = await sha256(msg);
    const secret = b64ToU8(keyRow.secret_b64);
    const sig = await ed.signAsync(digest, secret); // Uint8Array(64)

    return new Response(JSON.stringify({
      token,
      sig: btoa(String.fromCharCode(...sig)),     // base64 signature
      signer: keyRow.public_key                   // hex of public key
    }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Unhandled", detail: String(e?.message ?? e) }), { status: 500, headers: cors });
  }
});
