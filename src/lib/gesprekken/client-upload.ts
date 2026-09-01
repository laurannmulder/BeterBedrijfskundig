import { createClient } from '@/lib/supabase/client'

// Zelfde patroon als src/lib/documenten/client-upload.ts: rechtstreeks vanuit
// de browser naar Supabase Storage, bewust niet via een server action
// (Vercel's 4,5MB-body-limiet) — bij een opname van rond een uur is dat
// sowieso relevant. Audio hergebruikt de bestaande "documenten"-bucket onder
// een eigen pad, geen nieuwe bucket nodig.
export async function uploadGesprekNaarStorage(zaakId: string, opname: Blob): Promise<string> {
  const supabase = createClient()
  const path = `${zaakId}/gesprekken/${crypto.randomUUID()}.webm`

  const { error } = await supabase.storage.from('documenten').upload(path, opname, {
    contentType: opname.type || 'audio/webm',
  })

  if (error) {
    throw new Error(`Uploaden van de opname is mislukt: ${error.message}`)
  }

  return path
}
