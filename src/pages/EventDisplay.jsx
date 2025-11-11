// src/pages/EventDisplay.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import RotatingQR from "../components/RotatingQR";

export default function EventDisplay() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("events")
          .select("id, name, starts_at, ends_at, image_url")
          .eq("id", eventId)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("Event not found");

        setEvent(data);
      } catch (e) {
        console.error("Load event error:", e);
        setError(e.message || "Failed to load event");
      } finally {
        setLoading(false);
      }
    }

    if (eventId) loadEvent();
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black">
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-2">Loading...</div>
          <div className="text-zinc-400">Preparing event display</div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black">
        <div className="card p-8 max-w-md">
          <div className="text-red-400 text-lg font-semibold mb-2">Error</div>
          <div className="text-zinc-400">{error || "Event not found"}</div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const starts = new Date(event.starts_at);
  const ends = new Date(event.ends_at);
  const isActive = now >= starts && now <= ends;
  const isPast = now > ends;
  const isFuture = now < starts;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-black/50 backdrop-blur">
        <div className="container-px mx-auto py-6">
          <div className="flex items-center gap-4">
            {event.image_url && (
              <img
                src={event.image_url}
                alt={event.name}
                className="h-16 w-16 rounded-xl object-cover border-2 border-zinc-700"
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white">{event.name}</h1>
              <div className="mt-1 text-sm text-zinc-400">
                {starts.toLocaleDateString()} • {starts.toLocaleTimeString()} - {ends.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-px mx-auto py-12">
        <div className="max-w-2xl mx-auto">
          {/* Status Banner */}
          <div className="mb-8">
            {isActive && (
              <div className="card p-4 bg-green-900/20 border-green-700">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
                  <div className="text-green-400 font-semibold">Event is LIVE - Scan to claim your POAP!</div>
                </div>
              </div>
            )}
            {isFuture && (
              <div className="card p-4 bg-blue-900/20 border-blue-700">
                <div className="text-blue-400 font-semibold">
                  Event starts {starts.toLocaleDateString()} at {starts.toLocaleTimeString()}
                </div>
              </div>
            )}
            {isPast && (
              <div className="card p-4 bg-zinc-900/50 border-zinc-700">
                <div className="text-zinc-400">
                  This event has ended. POAPs are no longer available.
                </div>
              </div>
            )}
          </div>

          {/* QR Code Display */}
          {isActive ? (
            <div className="card p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Scan to Claim Your POAP</h2>
                <p className="text-zinc-400">
                  Use your mobile device to scan this QR code and mint your proof of attendance NFT
                </p>
              </div>
              
              <div className="flex justify-center">
                <RotatingQR eventId={eventId} intervalMs={10000} />
              </div>

              <div className="mt-6 space-y-3 text-sm text-zinc-400">
                <div className="flex items-start gap-2">
                  <span className="text-zinc-500">1.</span>
                  <span>Open the POAP app on your phone and go to the Scan page</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-zinc-500">2.</span>
                  <span>Point your camera at the QR code above</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-zinc-500">3.</span>
                  <span>Your POAP will be minted automatically to your wallet</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-12">
              <div className="text-center">
                <div className="text-6xl mb-4">🎟️</div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isFuture ? "Coming Soon" : "Event Ended"}
                </h2>
                <p className="text-zinc-400">
                  {isFuture
                    ? "Check back when the event starts to claim your POAP"
                    : "Thanks for participating! Check your wallet for your POAP."}
                </p>
              </div>
            </div>
          )}

          {/* Event Info */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="text-sm text-zinc-500 mb-1">Starts</div>
              <div className="text-white font-semibold">
                {starts.toLocaleDateString()}
              </div>
              <div className="text-sm text-zinc-400">
                {starts.toLocaleTimeString()}
              </div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-zinc-500 mb-1">Ends</div>
              <div className="text-white font-semibold">
                {ends.toLocaleDateString()}
              </div>
              <div className="text-sm text-zinc-400">
                {ends.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 bg-black/50 backdrop-blur mt-12">
        <div className="container-px mx-auto py-6 text-center text-sm text-zinc-500">
          Powered by POAP • Proof of Attendance Protocol
        </div>
      </div>
    </div>
  );
}