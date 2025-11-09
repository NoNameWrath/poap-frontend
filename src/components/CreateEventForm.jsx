// src/components/CreateEventForm.jsx
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function CreateEventForm({ onCreated }) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function publicUrl(bucket, path) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!name || !start || !end) { setErr("Fill all fields"); return; }
    setBusy(true);
    try {
      // 1) create event via your edge function (kept as-is)
      const { data, error } = await supabase.functions.invoke("events-create", {
        body: {
          name,
          starts_at: new Date(start).toISOString(),
          ends_at: new Date(end).toISOString(),
        },
      });
      if (error) throw error;
      const eventId = data?.id || data?.event?.id || data?.event_id; // accept any shape your function returns
      if (!eventId) throw new Error("Event id not returned from events-create");

      // 2) optional image upload to bucket `poap`
      let imageUrl = null;
      if (file) {
        const ext = (file.name.split(".").pop() || "png").toLowerCase();
        const contentType = file.type || (ext === "jpg" ? "image/jpeg" : `image/${ext}`);
        const imgPath = `events/${eventId}/image.${ext}`;

        const { error: upErr } = await supabase.storage.from("poap").upload(imgPath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType,
        });
        if (upErr) throw upErr;
        imageUrl = publicUrl("poap", imgPath);
      }

      // 3) metadata.json (per-event) → name = event name, image = uploaded image
      const metadata = {
        name,
        symbol: "POAP",
        description: `Proof of attendance: ${name}`,
        image: imageUrl,
        attributes: [
          { trait_type: "Event", value: name },
          { trait_type: "StartsAt", value: new Date(start).toISOString() },
          { trait_type: "EndsAt", value: new Date(end).toISOString() },
        ],
      };
      const metaPath = `events/${eventId}/metadata.json`;
      const metaBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
      const { error: metaErr } = await supabase.storage.from("poap").upload(metaPath, metaBlob, {
        cacheControl: "3600",
        upsert: true,
        contentType: "application/json",
      });
      if (metaErr) throw metaErr;
      const metadataUri = publicUrl("poap", metaPath);

      // 4) update event row with image_url + metadata_uri (requires RLS policy allowing admin update)
      const { error: updErr } = await supabase
        .from("events")
        .update({ image_url: imageUrl, metadata_uri: metadataUri })
        .eq("id", eventId);
      if (updErr) throw updErr;

      // 5) reset + trigger refresh
      setName(""); setStart(""); setEnd(""); setFile(null);
      onCreated?.({ id: eventId, name, image_url: imageUrl, metadata_uri: metadataUri });
    } catch (e) {
      console.error(e);
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
        required
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input className="input w-full" type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} required />
        <input className="input w-full" type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} required />
      </div>
      <input
        className="input w-full"
        type="file"
        accept="image/*"
        onChange={e=>setFile(e.target.files?.[0] || null)}
      />
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Creating..." : "Create"}
      </button>
      {err && <div className="text-xs text-red-500">{err}</div>}
    </form>
  );
}
