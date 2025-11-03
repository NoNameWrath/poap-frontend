import { supabase } from "../lib/supabase";

/**
 * Fetch the current user's wallet (or null if none exists)
 */
export async function getUserWallet() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("wallets")
    .select("public_key")
    .eq("user_email", user.email)
    .maybeSingle();

  if (error) {
    console.error("fetch wallet error:", error);
    return null;
  }

  return data?.public_key ?? null;
}

/**
 * Calls the wallet edge function to create the wallet.
 * The function already handles duplicates. If wallet already exists,
 * it returns { alreadyExists: true, public_key: "..." }
 */
export async function createWallet(address, secretKey) {
  const { data: { session } } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke("wallet", {
    body: { address, secretKey },
    headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
  });

  if (error) throw error;

  return data;
}
