// supabase/functions/events-create/index.ts
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: cors });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(PROJECT_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });

    // only authed users (you can add role checks later)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const body = await req.json();
    const { name, starts_at, ends_at } = body ?? {};
    
    if (!name || !starts_at || !ends_at) {
      return new Response(JSON.stringify({ error: "name, starts_at, ends_at required" }), { status: 400, headers: cors });
    }

    // generate a QR signer keypair for this event
    const sk = ed.utils.randomPrivateKey();                  // 32 bytes
    const pk = await ed.getPublicKeyAsync(sk);               // 32 bytes
    const secret_b64 = btoa(String.fromCharCode(...sk));
    const public_key = Array.from(pk).map(b => b.toString(16).padStart(2,"0")).join(""); // hex for readability

    // create event
    const { data: ev, error: evErr } = await supabase
      .from("events")
      .insert([{ name, starts_at, ends_at }])
      .select("id")
      .single();

    if (evErr) return new Response(JSON.stringify({ error: "create event failed", detail: evErr.message }), { status: 500, headers: cors });

    // store qr signer
    const { error: qrErr } = await supabase
      .from("qr_keys")
      .insert([{ event_id: ev.id, public_key, secret_b64 }]);

    if (qrErr) return new Response(JSON.stringify({ error: "store qr key failed", detail: qrErr.message }), { status: 500, headers: cors });

    return new Response(JSON.stringify({ ok: true, event_id: ev.id, qr_signer_pubkey: public_key }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Unhandled", detail: String(e?.message ?? e) }), { status: 500, headers: cors });
  }
});
