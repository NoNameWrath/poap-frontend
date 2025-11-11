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
      // 1) Create event via edge function (this creates event + QR keys)
      const { data, error } = await supabase.functions.invoke("events-create", {
        body: {
          name,
          starts_at: new Date(start).toISOString(),
          ends_at: new Date(end).toISOString(),
        },
      });
      if (error) throw error;
      const eventId = data?.event_id;
      if (!eventId) throw new Error("Event id not returned from events-create");

      // 2) Upload image to bucket `poap` (if provided)
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

      // 3) Build metadata.json with the uploaded image
      const metadata = {
        name,
        symbol: "POAP",
        description: `Proof of attendance: ${name}`,
        image: imageUrl || "https://dummyimage.com/512x512/333333/ffffff.png&text=POAP",
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

      // 4) Update event row with image_url + metadata_uri
      // Use service role or ensure RLS policy allows this
      const upd = await supabase
        .from("events")
        .update({ image_url: imageUrl, metadata_uri: metadataUri })
        .eq("id", eventId)
        .select("id, image_url, metadata_uri")
        .single();
      if (upd.error) throw new Error("Update failed: " + upd.error.message);
      if (!upd.data?.id) throw new Error("Update touched 0 rows — event_id mismatch?");

      // 5) Reset form and notify parent
      setName(""); 
      setStart(""); 
      setEnd(""); 
      setFile(null);
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
        className="input w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
        type="text"
        placeholder="Event name"
        value={name}
        onChange={e=>setName(e.target.value)}
        required
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input 
          className="input w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white" 
          type="datetime-local" 
          value={start} 
          onChange={e=>setStart(e.target.value)} 
          required 
        />
        <input 
          className="input w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white" 
          type="datetime-local" 
          value={end} 
          onChange={e=>setEnd(e.target.value)} 
          required 
        />
      </div>
      <input
        className="input w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white hover:file:bg-primary-500"
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