import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
const hasSupabaseUrl = Boolean(supabaseUrl)
const hasSupabaseKey = Boolean(supabaseAnonKey)

if (import.meta.env.DEV) {
  console.info('[Nexus Supabase] URL configured:', Boolean(supabaseUrl))
  console.info('[Nexus Supabase] anon key configured:', hasSupabaseKey)
}

function createSupabaseClient() {
  if (!hasSupabaseUrl || !hasSupabaseKey) {
    console.error('[Nexus Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.')
    return null
  }

  try {
    return createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.error('[Nexus Supabase] Failed to create client:', error)
    return null
  }
}

export const supabase = createSupabaseClient()
