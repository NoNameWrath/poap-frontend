// src/pages/Scan.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../store/useAppStore";
import { Scanner } from "@yudiel/react-qr-scanner";

export default function Scan() {
  const { wallet } = useAppStore();
  const [scanned, setScanned] = useState(null);
  const [mintSig, setMintSig] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const EVENT_ID = "7640d518-08a8-45a6-a95f-8662d1e93b1e";

  const handleScan = async (text) => {
    if (busy) return; // Prevent duplicate scans
    
    try {
      setBusy(true);
      setError("");
      
      if (!text) {
        setError("Empty QR code");
        return;
      }

      console.log("Raw QR text:", text);

      // Parse the QR payload
      let payload;
      try {
        payload = JSON.parse(text);
      } catch (parseErr) {
        console.error("Parse error:", parseErr);
        setError("Invalid QR format - not valid JSON");
        return;
      }

      setScanned(payload);

      const { token, sig, signer } = payload || {};
      if (!token?.event || !sig || !signer) {
        setError("Invalid QR payload - missing required fields");
        return;
      }

      if (!wallet?.address) {
        setError("No wallet found. Create or login first.");
        return;
      }

      console.log("Calling mint with:", {
        event_id: token.event,
        wallet_pubkey: wallet.address,
        token,
        sig,
        signer
      });

      const { data, error: mintError } = await supabase.functions.invoke("mint", {
        body: {
          event_id: token.event,
          token,
          sig,
          signer,
          wallet_pubkey: wallet.address
        }
      });

      if (mintError) {
        let msg = mintError.message;
        try {
          const resp = mintError.context;
          if (resp && typeof resp.text === "function") {
            const ct = resp.headers?.get("content-type") || "";
            const body = ct.includes("application/json")
              ? await resp.json()
              : await resp.text();
            console.log("[MINT][ERR body]", body);
            msg = body?.error || body?.detail || body || msg;
          }
        } catch (e) {
          console.log("[MINT][parse err]", e);
        }
        setError(msg);
        return;
      }

      console.log("Mint success:", data);
      setMintSig(data?.minted_asset || null);
    } catch (e) {
      console.error("Scan error:", e);
      setError(e?.message || "Mint failed");
    } finally {
      setBusy(false);
    }
  };

  // Handle scanner detection - it returns the decoded text directly
  const onScanSuccess = (result) => {
    if (result && result.length > 0) {
      const text = result[0]?.rawValue || result;
      handleScan(text);
    }
  };

  useEffect(() => {
    setScanned(null);
    setMintSig(null);
    setError("");
  }, []);

  const testMint = async () => {
    try {
      setBusy(true);
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

      // Fetch a FRESH QR payload
      const res = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/qr-issue?event_id=${EVENT_ID}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      const payload = await res.json();
      console.log("Test payload:", payload);

      // handleScan expects a STRING (JSON stringified)
      await handleScan(JSON.stringify(payload));
    } catch (e) {
      setError(e?.message || "QR fetch failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Scan POAP</h1>
        <div className="text-sm text-zinc-400 mb-4">
          Wallet: <span className="font-mono">{wallet?.address || "none"}</span>
        </div>

        <div className="rounded overflow-hidden border border-zinc-700 bg-black">
          <Scanner
            constraints={{ facingMode: "environment" }}
            onScan={onScanSuccess}
            onError={(err) => {
              console.error("Camera error:", err);
              setError(err?.message || "Camera error");
            }}
            components={{
              audio: false,
              finder: true
            }}
          />
        </div>

        {scanned && (
          <div className="mt-4 text-xs bg-zinc-900 p-3 rounded border border-zinc-700">
            <div className="text-zinc-400 mb-1">Scanned payload</div>
            <pre className="overflow-auto text-zinc-300">
              {JSON.stringify(scanned, null, 2)}
            </pre>
          </div>
        )}

        {mintSig && (
          <div className="mt-4 p-3 rounded bg-green-900/30 border border-green-700">
            <div className="text-green-400 text-sm font-semibold">Minted!</div>
            <div className="text-xs break-all font-mono text-green-300 mt-1">
              {mintSig}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-2 text-xs text-red-400 bg-red-900/30 border border-red-700 p-3 rounded">
            {error}
          </div>
        )}

        <button
          className="mt-4 btn btn-primary w-full"
          onClick={testMint}
          disabled={busy}
        >
          {busy ? "Processing..." : "Test Mint (fresh QR)"}
        </button>

        {busy && (
          <div className="mt-2 text-center text-sm text-zinc-500">
            Processing, please wait...
          </div>
        )}
      </div>
    </div>
  );
}