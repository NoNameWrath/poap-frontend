// src/pages/Admin.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";
import CreateEventForm from "../components/CreateEventForm";
import RotatingQR from "../components/RotatingQR";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  // auth
  useEffect(() => {
    let unsub;
    (async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
      unsub = supabase.auth.onAuthStateChange((_e, s) => {
        setUser(s?.user ?? null);
      }).data.subscription;
    })();
    return () => unsub?.unsubscribe();
  }, []);

  // admin check + load events
  useEffect(() => {
    if (!user) return;
    (async () => {
      setError("");
      // check admin membership
      const { data: adminRow, error: aerr } = await supabase
        .from("admins")
        .select("email")
        .eq("email", user.email)
        .maybeSingle();
      if (aerr) { setError(aerr.message); return; }
      setIsAdmin(!!adminRow);
      await refreshEvents(); // initial list load
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // refresh list after creation
  async function refreshEvents() {
    const { data: evs, error: eerr } = await supabase
      .from("events")
      .select("id,name,starts_at,ends_at,created_at,image_url") // include image for preview
      .order("created_at", { ascending: false });
    if (eerr) { setError(eerr.message); return; }
    setEvents(evs || []);
    if ((evs?.length ?? 0) && !selected) setSelected(evs[0].id);
  }

  if (!user) return <div className="p-6">Please login</div>;
  if (!isAdmin) return <div className="p-6">Not authorized</div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container-px mx-auto pt-8 pb-16">
        <h1 className="text-2xl font-semibold mb-4">Admin</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: create + events list */}
          <div className="space-y-6">
            <div className="card p-4">
              <div className="text-sm text-zinc-500 mb-2">Create Event</div>
              <CreateEventForm onCreated={refreshEvents} />
            </div>

            <div className="card p-4">
              <div className="text-sm text-zinc-500 mb-2">Events</div>
              <div className="space-y-2 max-h-[50vh] overflow-auto">
                {(events || []).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => setSelected(ev.id)}
                    className={`w-full text-left p-3 rounded border ${selected === ev.id ? "border-blue-500 bg-blue-50" : "border-zinc-200"}`}
                  >
                    <div className="flex items-center gap-3">
                      {ev.image_url ? (
                        <img
                          src={ev.image_url}
                          alt={ev.name}
                          className="h-8 w-8 rounded object-cover border"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-zinc-100 border" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{ev.name}</div>
                        <div className="text-xs text-zinc-500 truncate">
                          {new Date(ev.starts_at).toLocaleString()} – {new Date(ev.ends_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {!events?.length && <div className="text-sm text-zinc-500">No events yet.</div>}
              </div>
            </div>
          </div>

          {/* Right columns: rotating QR for selected event */}
          <div className="lg:col-span-2">
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-zinc-500">Rotating QR</div>
                  <div className="text-xs text-zinc-500">Changes every ~10s</div>
                </div>
                <div className="text-xs text-zinc-400">{selected || "—"}</div>
              </div>
              <div className="mt-4">
                {selected ? (
                  <RotatingQR eventId={selected} />
                ) : (
                  <div className="text-sm text-zinc-500">Select an event</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && <div className="mt-4 text-red-500 text-sm">{error}</div>}
      </main>
    </div>
  );
}
