// supabase/functions/mint/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as ed from "@noble/ed25519";
import { createUmi, publicKey, keypairIdentity } from "https://esm.sh/@metaplex-foundation/umi@0.9.1";
import { create } from "https://esm.sh/@metaplex-foundation/mpl-core@1.0.0";
import { Keypair } from "https://esm.sh/@solana/web3.js@1.95.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const PROJECT_URL = Deno.env.get("project_url")!;
const ANON_KEY = Deno.env.get("product_anon_key")!;
const RPC_URL = Deno.env.get("rpc_url")!;
const SERVER_MINT_SECRET_B64 = Deno.env.get("server_mint_secret_b64")!;

function u8(s: string) { return new TextEncoder().encode(s); }
function b64ToU8(b64: string) { return Uint8Array.from(atob(b64), c => c.charCodeAt(0)); }
function hexToU8(hex: string) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i*2, i*2+2), 16);
  return out;
}
async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return crypto.subtle.digest("SHA-256", data).then(buf => new Uint8Array(buf));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: cors });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(PROJECT_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const body = await req.json();
    const { event_id, token, sig, signer, wallet_pubkey } = body ?? {};
    if (!event_id || !token || !sig || !signer || !wallet_pubkey) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: cors });
    }

    // validate event timing
    const { data: ev, error: evErr } = await supabase.from("events")
      .select("starts_at,ends_at").eq("id", event_id).maybeSingle();
    if (evErr || !ev) return new Response(JSON.stringify({ error: "Event not found" }), { status: 404, headers: cors });

    const now = Math.floor(Date.now() / 1000);
    if (now < Math.floor(new Date(ev.starts_at).getTime()/1000) || now > Math.floor(new Date(ev.ends_at).getTime()/1000)) {
      return new Response(JSON.stringify({ error: "Event not active" }), { status: 400, headers: cors });
    }

    // fetch signer row and verify signature
    const { data: keyRow } = await supabase.from("qr_keys").select("public_key,secret_b64").eq("event_id", event_id).maybeSingle();
    if (!keyRow) return new Response(JSON.stringify({ error: "Signer not found" }), { status: 404, headers: cors });

    // basic checks on token
    if (token.event !== event_id) return new Response(JSON.stringify({ error: "Token event mismatch" }), { status: 400, headers: cors });
    if (now > token.exp) return new Response(JSON.stringify({ error: "Token expired" }), { status: 400, headers: cors });

    // verify sig
    const digest = await sha256(u8(JSON.stringify(token)));
    const sigU8 = b64ToU8(sig);
    const signerPk = hexToU8(signer);
    const ok = await ed.verifyAsync(sigU8, digest, signerPk);
    if (!ok || signer !== keyRow.public_key) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: cors });
    }

    // idempotency: already minted?
    const { data: pass } = await supabase.from("passes")
      .select("minted_asset")
      .eq("event_id", event_id)
      .eq("wallet_pubkey", wallet_pubkey)
      .maybeSingle();
    if (pass?.minted_asset) {
      return new Response(JSON.stringify({ ok: true, minted_asset: pass.minted_asset, reused: true }), { status: 200, headers: cors });
    }

    // Umi: mint a Core asset to attendee
    const umi = createUmi(RPC_URL);
    // load server authority keypair
    const serverSecret = b64ToU8(SERVER_MINT_SECRET_B64);
    const payer = Keypair.fromSecretKey(serverSecret);      // web3.js keypair for transport
    umi.use(keypairIdentity({ publicKey: payer.publicKey, secretKey: payer.secretKey } as any));

    // create Core asset with owner = attendee
    // If your Core version requires different args, adjust; owner should be the recipient
    const owner = publicKey(wallet_pubkey);
    const name = `POAP`;
    const uri = "https://example.com/poap.json"; // TODO: point to your metadata
    const { signature } = await create(umi, {
      // asset PDA is generated internally if omitted; passing owner assigns ownership
      name,
      uri,
      owner,
    }).sendAndConfirm(umi);

    const minted_asset = signature; // or derive the asset address if returned by your create() version

    // record pass
    const { error: insErr } = await supabase
      .from("passes")
      .insert([{ event_id, user_email: user.email ?? "", wallet_pubkey, minted_asset }]);

    if (insErr) return new Response(JSON.stringify({ error: "DB insert failed", detail: insErr.message }), { status: 500, headers: cors });

    return new Response(JSON.stringify({ ok: true, minted_asset }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Unhandled", detail: String(e?.message ?? e) }), { status: 500, headers: cors });
  }
});
