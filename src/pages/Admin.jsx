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
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => {
    if (!user) return;
    (async () => {
      setError("");
      const { data: adminRow, error: aerr } = await supabase
        .from("admins")
        .select("email")
        .eq("email", user.email)
        .maybeSingle();
      if (aerr) { setError(aerr.message); return; }
      setIsAdmin(!!adminRow);
      await refreshEvents();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function refreshEvents() {
    const { data: evs, error: eerr } = await supabase
      .from("events")
      .select("id,name,starts_at,ends_at,created_at,image_url")
      .order("created_at", { ascending: false });
    if (eerr) { setError(eerr.message); return; }
    setEvents(evs || []);
    if ((evs?.length ?? 0) && !selected) setSelected(evs[0].id);
  }

  const deleteEvent = async (eventId) => {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone and will delete all associated data.")) {
      return;
    }

    setDeleting(true);
    setError("");
    try {
      const { data, error } = await supabase.functions.invoke("events-delete", {
        body: { event_id: eventId }
      });

      if (error) throw error;

      // Refresh the events list
      await refreshEvents();
      
      // If the deleted event was selected, select the first event or null
      if (selected === eventId) {
        const remainingEvents = events.filter(e => e.id !== eventId);
        setSelected(remainingEvents?.[0]?.id ?? null);
      }

      alert("Event deleted successfully");
    } catch (e) {
      console.error("Delete error:", e);
      setError(e?.message || "Failed to delete event");
    } finally {
      setDeleting(false);
    }
  };

  const copyEventLink = async () => {
    if (!selected) return;
    const link = `${window.location.origin}/event/${selected}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert("Failed to copy: " + e.message);
    }
  };

  const getEventLink = () => {
    if (!selected) return "";
    return `${window.location.origin}/event/${selected}`;
  };

  if (!user) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="p-6 text-center">
        <div className="text-zinc-400">Please login to access the admin dashboard</div>
      </div>
    </div>
  );

  if (!isAdmin) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="p-6 text-center">
        <div className="text-zinc-400">Not authorized. Admin access required.</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container-px mx-auto pt-8 pb-16">
        <h1 className="text-2xl font-semibold mb-4">Admin Dashboard</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: create + events list */}
          <div className="space-y-6">
            <div className="card p-4">
              <div className="text-sm text-zinc-400 mb-2">Create Event</div>
              <CreateEventForm onCreated={refreshEvents} />
            </div>

            <div className="card p-4">
              <div className="text-sm text-zinc-400 mb-2">Events</div>
              <div className="space-y-2 max-h-[50vh] overflow-auto">
                {(events || []).map((ev) => (
                  <div
                    key={ev.id}
                    className={`w-full text-left p-3 rounded border transition ${
                      selected === ev.id 
                        ? "border-primary-600 bg-primary-600/10" 
                        : "border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    <div 
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => setSelected(ev.id)}
                    >
                      {ev.image_url ? (
                        <img
                          src={ev.image_url}
                          alt={ev.name}
                          className="h-10 w-10 rounded object-cover border border-zinc-700"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-600">
                          📅
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate text-white">{ev.name}</div>
                        <div className="text-xs text-zinc-500 truncate">
                          {new Date(ev.starts_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEvent(ev.id);
                        }}
                        disabled={deleting}
                        className="btn btn-ghost btn-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 disabled:opacity-50"
                        title="Delete event"
                      >
                        {deleting ? "..." : "🗑️"}
                      </button>
                    </div>
                  </div>
                ))}
                {!events?.length && (
                  <div className="text-sm text-zinc-500">No events yet.</div>
                )}
              </div>
            </div>
          </div>

          {/* Right columns: QR + sharing */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shareable Link */}
            {selected && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Share Event</h3>
                    <p className="text-sm text-zinc-400 mt-1">
                      Students can scan the QR at this link
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={getEventLink()}
                    readOnly
                    className="input flex-1 font-mono text-sm"
                  />
                  <button
                    onClick={copyEventLink}
                    className="btn btn-primary px-6"
                  >
                    {copied ? "✓ Copied" : "Copy Link"}
                  </button>
                </div>

                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
                  <div className="text-sm text-blue-300">
                    💡 <strong>Pro tip:</strong> Display this link on a projector or TV screen so students can scan with their phones.
                    The QR code rotates automatically for security.
                  </div>
                </div>
              </div>
            )}

            {/* QR Display */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-lg font-semibold text-white">Rotating QR Code</div>
                  <div className="text-xs text-zinc-500">
                    Updates every 10 seconds • Expires in 30 seconds
                  </div>
                </div>
                {selected && (
                  <div className="text-xs text-zinc-400 font-mono">
                    {selected.slice(0, 8)}...
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                {selected ? (
                  <RotatingQR eventId={selected} />
                ) : (
                  <div className="flex items-center justify-center h-80 w-80 bg-zinc-900 rounded border border-zinc-700">
                    <div className="text-sm text-zinc-500">Select an event</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 text-red-400 text-sm bg-red-900/20 border border-red-700 p-3 rounded">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}