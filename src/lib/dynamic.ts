// Prevents Next.js from statically prerendering pages that require
// the Supabase client (which needs real env vars at runtime)
export const dynamic = 'force-dynamic'
