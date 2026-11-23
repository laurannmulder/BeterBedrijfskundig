import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Staat BB in een eigen schema (bijvoorbeeld "bb" in het gedeelde MijnOliver-project),
  // zet dan NEXT_PUBLIC_SUPABASE_SCHEMA. Zonder deze variabele gebruiken we "public".
  const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public'
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema } }
  )
}
