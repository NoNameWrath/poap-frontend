// src/components/CreateEventForm.jsx
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function CreateEventForm({ onCreated }) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!name || !start || !end) { setErr("Fill all fields"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("events-create", {
        body: { name, starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString() }
      });
      if (error) throw error;
      setName(""); setStart(""); setEnd("");
      onCreated?.(data);
    } catch (e) {
      setErr(e?.message || "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        className="input w-full"
        type="text"
        placeholder="Event name"
        value={name}
        onChange={e=>setName(e.target.value)}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input className="input w-full" type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} />
        <input className="input w-full" type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} />
      </div>
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Creating..." : "Create"}
      </button>
      {err && <div className="text-xs text-red-500">{err}</div>}
    </form>
  );
}
