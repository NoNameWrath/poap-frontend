// supabase/functions/events-delete/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Content-Type": "application/json",
};

const PROJECT_URL = Deno.env.get("project_url")!;
const ANON_KEY = Deno.env.get("product_anon_key")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST" && req.method !== "DELETE") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { 
      status: 405, 
      headers: cors 
    });
  }

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(PROJECT_URL, ANON_KEY, { 
      global: { headers: { Authorization: auth } } 
    });

    // Check if user is authenticated and is an admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: cors 
      });
    }

    // Verify admin status
    const { data: adminRow } = await supabase
      .from("admins")
      .select("email")
      .eq("email", user.email)
      .maybeSingle();

    if (!adminRow) {
      return new Response(JSON.stringify({ error: "Forbidden - admin access required" }), { 
        status: 403, 
        headers: cors 
      });
    }

    const body = await req.json();
    const { event_id } = body ?? {};
    
    if (!event_id) {
      return new Response(JSON.stringify({ error: "event_id required" }), { 
        status: 400, 
        headers: cors 
      });
    }

    // Delete related QR keys first (foreign key constraint)
    const { error: qrErr } = await supabase
      .from("qr_keys")
      .delete()
      .eq("event_id", event_id);

    if (qrErr) {
      console.error("QR keys deletion error:", qrErr);
      return new Response(JSON.stringify({ 
        error: "Failed to delete QR keys", 
        detail: qrErr.message 
      }), { 
        status: 500, 
        headers: cors 
      });
    }

    // Delete the event
    const { error: eventErr } = await supabase
      .from("events")
      .delete()
      .eq("id", event_id);

    if (eventErr) {
      console.error("Event deletion error:", eventErr);
      return new Response(JSON.stringify({ 
        error: "Failed to delete event", 
        detail: eventErr.message 
      }), { 
        status: 500, 
        headers: cors 
      });
    }

    // Optional: Clean up storage files
    try {
      const paths = [
        `events/${event_id}/image.jpg`,
        `events/${event_id}/image.png`,
        `events/${event_id}/image.webp`,
        `events/${event_id}/metadata.json`
      ];
      
      for (const path of paths) {
        await supabase.storage.from("poap").remove([path]);
      }
    } catch (storageErr) {
      console.log("Storage cleanup (non-critical):", storageErr);
      // Don't fail the request if storage cleanup fails
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      deleted_event_id: event_id 
    }), { 
      status: 200, 
      headers: cors 
    });

  } catch (e) {
    console.error("Deletion error:", e);
    return new Response(JSON.stringify({ 
      error: "Unhandled", 
      detail: String(e?.message ?? e) 
    }), { 
      status: 500, 
      headers: cors 
    });
  }
});