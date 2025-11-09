// supabase/functions/mint/index.ts

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin ?? "*",
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
} as const);

const PROJECT_URL = Deno.env.get("project_url")!;
const ANON_KEY = Deno.env.get("product_anon_key")!;
const RPC_URL = Deno.env.get("rpc_url")!;
const SERVER_MINT_SECRET_B64 = Deno.env.get("server_mint_secret_b64")!;

function b64ToU8(b64: string) { return Uint8Array.from(atob(b64), c => c.charCodeAt(0)); }
function u8(s: string) { return new TextEncoder().encode(s); }

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders(origin) });
  if (req.method !== "POST")   return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: corsHeaders(origin) });

  try {
    // dynamic imports (preflight-safe)
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const { sha512 } = await import("npm:@noble/hashes@1.3.0/sha512");
    const ed = await import("npm:@noble/ed25519@2.1.0");
    
    const bs58 = (await import("npm:bs58@5.0.0")).default;
    const { createUmi } = await import("npm:@metaplex-foundation/umi-bundle-defaults@1.4.1");
    const umiMod = await import("npm:@metaplex-foundation/umi@1.0.0");
    const coreMod = await import("npm:@metaplex-foundation/mpl-core@1.0.0");
    
    // Helper to concatenate byte arrays
    function concatBytes(...arrays: Uint8Array[]): Uint8Array {
      const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
      }
      return result;
    }

    // Configure SHA-512 for @noble/ed25519 using @noble/hashes
    ed.etc.sha512Sync = (...m) => sha512(m.length === 1 ? m[0] : concatBytes(...m));

    const sha256 = async (data: Uint8Array) => {
      const buf = await crypto.subtle.digest("SHA-256", data);
      return new Uint8Array(buf);
    };
    const decodePubkeyToU8 = (s: string): Uint8Array => {
      const hex = s.startsWith("0x") ? s.slice(2) : s;
      if (/^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0) {
        const out = new Uint8Array(hex.length / 2);
        for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i*2, i*2+2), 16);
        if (out.length === 32) return out;
      }
      const b = bs58.decode(s);
      if (b.length !== 32) throw new Error("invalid public key length");
      return b;
    };

    // auth
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(PROJECT_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders(origin) });

    // body
    const { event_id, token, sig, signer, wallet_pubkey } = await req.json();
    if (!event_id || !token || !sig || !signer || !wallet_pubkey) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: corsHeaders(origin) });
    }

    // event window
    const { data: ev, error: evErr } = await supabase
      .from("events").select("starts_at,ends_at,name,image_url,metadata_uri").eq("id", event_id).maybeSingle();
    if (evErr || !ev) return new Response(JSON.stringify({ error: "Event not found" }), { status: 404, headers: corsHeaders(origin) });
    const now = Math.floor(Date.now()/1000);
    const start = Math.floor(new Date(ev.starts_at).getTime()/1000);
    const end   = Math.floor(new Date(ev.ends_at).getTime()/1000);
    if (now < start || now > end) return new Response(JSON.stringify({ error: "Event not active" }), { status: 400, headers: corsHeaders(origin) });

    // expected QR signer
    const { data: keyRow } = await supabase
      .from("qr_keys").select("public_key").eq("event_id", event_id).maybeSingle();
    if (!keyRow) return new Response(JSON.stringify({ error: "Signer not found" }), { status: 404, headers: corsHeaders(origin) });

    // token checks
    if (token.event !== event_id) return new Response(JSON.stringify({ error: "Token event mismatch" }), { status: 400, headers: corsHeaders(origin) });
    if (now > token.exp)         return new Response(JSON.stringify({ error: "Token expired" }),       { status: 400, headers: corsHeaders(origin) });

    // verify QR signature (raw or sha256 of JSON(token))
    const tokenBytes = u8(JSON.stringify(token));
    const sigU8 = Uint8Array.from(atob(sig), c => c.charCodeAt(0));
    const signerPk = decodePubkeyToU8(signer);
    let ok = await ed.verifyAsync(sigU8, tokenBytes, signerPk);
    if (!ok) ok = await ed.verifyAsync(sigU8, await sha256(tokenBytes), signerPk);
    if (!ok) return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: corsHeaders(origin) });

    // match stored signer
    try {
      const storedPk = decodePubkeyToU8(keyRow.public_key);
      if (storedPk.length !== 32 || !storedPk.every((v,i)=>v===signerPk[i])) {
        return new Response(JSON.stringify({ error: "Signer mismatch" }), { status: 400, headers: corsHeaders(origin) });
      }
    } catch {
      if (signer !== keyRow.public_key) return new Response(JSON.stringify({ error: "Signer mismatch" }), { status: 400, headers: corsHeaders(origin) });
    }

    // idempotency
    const { data: pass } = await supabase
      .from("passes").select("minted_asset").eq("event_id", event_id).eq("wallet_pubkey", wallet_pubkey).maybeSingle();
    if (pass?.minted_asset) {
      return new Response(JSON.stringify({ ok: true, minted_asset: pass.minted_asset, reused: true }), { status: 200, headers: corsHeaders(origin) });
    }

    // ----- Umi + Core: create signer using umi.eddsa -----
    const umi = createUmi(RPC_URL);

    // Decode the server secret
    const secret = b64ToU8(SERVER_MINT_SECRET_B64);
    if (secret.length !== 64 && secret.length !== 32) {
      return new Response(JSON.stringify({ error: `server_mint_secret_b64 must be 64 or 32 bytes, got ${secret.length}` }),
        { status: 500, headers: corsHeaders(origin) });
    }

    // Use Umi's built-in method to create keypair from secret key
    const keypair = umi.eddsa.createKeypairFromSecretKey(secret);
    const { createSignerFromKeypair, keypairIdentity, publicKey, generateSigner } = umiMod;
    const signerUmi = createSignerFromKeypair(umi, keypair);
    umi.use(keypairIdentity(signerUmi));

    // Generate a new keypair for the NFT asset
    const asset = generateSigner(umi);
    const name = ev?.name || "POAP";
    const uri  = ev?.metadata_uri || "https://example.com/poap.json";

    
    // Create the NFT with the asset address
    await coreMod.create(umi, { 
      asset,
      name,
      uri,
      owner: publicKey(wallet_pubkey),
    }).sendAndConfirm(umi);
    
    // Store the asset's public key (the NFT address)
    const mintedAssetAddress = asset.publicKey;

    // persist
    const { error: insErr } = await supabase
      .from("passes")
      .insert([{ 
        event_id, 
        user_email: user.email ?? "", 
        wallet_pubkey, 
        minted_asset: mintedAssetAddress 
      }]);
    if (insErr) {
      const msg = insErr.message ?? String(insErr);
      const code = /duplicate|unique/i.test(msg) ? 409 : 500;
      return new Response(JSON.stringify({ error: "DB insert failed", detail: msg }), { status: code, headers: corsHeaders(origin) });
    }

    return new Response(JSON.stringify({ ok: true, minted_asset: mintedAssetAddress }), { status: 201, headers: corsHeaders(origin) });
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    return new Response(JSON.stringify({ error: "Unhandled", detail: msg }), { status: 500, headers: corsHeaders(origin) });
  }
});