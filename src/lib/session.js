// src/lib/session.js
import { supabase } from './supabase'

export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}
