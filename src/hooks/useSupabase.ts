'use client'

import { useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook that creates a Supabase client only on the client-side.
 * Prevents SSR initialization errors when env vars aren't set at build time.
 */
export function useSupabase() {
  // useMemo ensures this only runs client-side after hydration
  return useMemo(() => createClient(), [])
}
