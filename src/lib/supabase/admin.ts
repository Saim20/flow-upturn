import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase admin client with service role/secret key.
 * This bypasses RLS and should ONLY be used in server-side API routes
 * for specific public/unauthenticated operations after proper verification.
 * 
 * NEVER expose this client to the browser.
 * 
 * Supports both old and new Supabase key naming conventions:
 * - Old: SUPABASE_SERVICE_ROLE_KEY
 * - New: SUPABASE_SECRET_KEY
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  // Support both old (SERVICE_ROLE_KEY) and new (SECRET_KEY) naming conventions
  const secretKey = process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL')
  }

  if (!secretKey) {
    throw new Error('Missing Supabase Secret Key. Set SUPABASE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
