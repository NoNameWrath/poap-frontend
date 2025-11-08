// src/components/RotatingQR.jsx
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import QRCode from "qrcode.react";

const FUNCTIONS_URL = `${import.meta.env.SUPABASE_URL}/functions/v1`;

export default function RotatingQR({ eventId, intervalMs = 10000 }) {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");
  const [ttl, setTtl] = useState(0);
  const timerRef = useRef(null);
  const tickRef = useRef(null);

  async function fetchToken() {
    try {
      setError("");
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${FUNCTIONS_URL}/qr-issue?event_id=${eventId}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "qr-issue failed");
      setPayload(json);
      // setup TTL countdown based on token.exp
      const now = Math.floor(Date.now()/1000);
      setTtl(Math.max(0, (json?.token?.exp ?? now) - now));
    } catch (e) {
      setError(e.message || "Failed to fetch QR token");
      setPayload(null);
      setTtl(0);
    }
  }

  // poll
  useEffect(() => {
    fetchToken();
    timerRef.current = setInterval(fetchToken, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [eventId]);

  // ttl countdown
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => setTtl(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(tickRef.current);
  }, [payload?.token?.exp]);

  return (
    <div className="flex flex-col items-center">
      {payload ? (
        <>
          <QRCode value={JSON.stringify(payload)} size={320} />
          <div className="mt-2 text-sm text-zinc-600">
            Expires in <span className="font-mono">{ttl}s</span>
          </div>
        </>
      ) : (
        <div className="text-sm text-zinc-500">No QR yet.</div>
      )}
      {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
    </div>
  );
}
