// src/pages/Scan.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../store/useAppStore";
import { Scanner } from "@yudiel/react-qr-scanner";

export default function Scan() {
  const { wallet } = useAppStore(); // expects wallet.address present
  const [scanned, setScanned] = useState(null);
  const [mintSig, setMintSig] = useState(null);
  const [error, setError] = useState("");
  const EVENT_ID = "a0982bcb-d7ea-4f72-99ad-527cd2936ec3"; // or prop/state
const [busy, setBusy] = useState(false);

  const handleScan = async (text) => {
    try {
      setError("");
      if (!text) return;
      const payload = JSON.parse(text);
      setScanned(payload);

      const { token, sig, signer } = payload || {};
      if (!token?.event || !sig || !signer) {
        setError("Invalid QR payload");
        return;
      }
      if (!wallet?.address) {
        setError("No wallet found. Create or login first.");
        return;
      }

      const { data, error } = await supabase.functions.invoke("mint", {
  body: { event_id: token.event, token, sig, signer, wallet_pubkey: wallet.address }
});

if (error) {
  let msg = error.message;
  try {
    const resp = error.context; // a Response
    if (resp && typeof resp.text === "function") {
      const ct = resp.headers?.get("content-type") || "";
      const body = ct.includes("application/json") ? await resp.json() : await resp.text();
      console.log("[MINT][ERR body]", body);
      msg = body?.error || body?.detail || body || msg;
    }
  } catch (e) {
    console.log("[MINT][parse err]", e);
  }
  setError(msg);
  return;
}

setMintSig(data?.minted_asset || null);



    } catch (e) {
      console.error(e);
      setError(e?.message || "Mint failed");
    }
  };

  useEffect(() => {
    setScanned(null);
    setMintSig(null);
    setError("");
  }, []);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Scan POAP</h1>
        <div className="text-sm text-zinc-600 mb-4">
          Wallet: <span className="font-mono">{wallet?.address || "none"}</span>
        </div>

        <div className="rounded overflow-hidden border">
          <Scanner
            constraints={{ facingMode: "environment" }}
            onDecode={handleScan}
            onError={(err) => setError(err?.message || "Camera error")}
          />
        </div>

        {scanned && (
          <div className="mt-4 text-xs bg-zinc-100 p-3 rounded">
            <div className="text-zinc-500 mb-1">Scanned payload</div>
            <pre className="overflow-auto">{JSON.stringify(scanned, null, 2)}</pre>
          </div>
        )}

        {mintSig && (
          <div className="mt-4 p-3 rounded bg-green-50 border border-green-200">
            <div className="text-green-700 text-sm">Minted!</div>
            <div className="text-xs break-all font-mono">{mintSig}</div>
          </div>
        )}

        {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
      </div>
      <button
  className="mt-3 btn btn-primary"
  onClick={async () => {
    try {
      setError("");
      setMintSig(null);

      if (!wallet?.address) {
        setError("No wallet found. Create or login first.");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Not logged in");
        return;
      }

      // fetch a FRESH QR payload
      const res = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/qr-issue?event_id=${EVENT_ID}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      const payload = await res.json();  // { token, sig, signer }
      // IMPORTANT: handleScan expects a STRING
      await handleScan(JSON.stringify(payload));
    } catch (e) {
      setError(e?.message || "QR fetch failed");
    }
    
  }}
>
  Test Mint (fresh QR)
</button>


    </div>
  );
}
