import { createClient } from '@/lib/supabase/client'

export interface ClientUploadResultaat {
  geupload: { path: string; naam: string }[]
  mislukt: string[]
}

// Uploadt bestanden rechtstreeks vanuit de browser naar Supabase Storage —
// bewust NIET via een server action, want Vercel's serverless functions
// accepteren geen requestbody groter dan 4,5MB (een harde platformlimiet,
// los van Next.js' eigen serverActions.bodySizeLimit). Zie
// src/lib/documenten/verwerk-upload.ts voor de server-kant die het bestand
// na upload ophaalt om te classificeren.
export async function uploadBestandenNaarStorage(zaakId: string, bestanden: File[]): Promise<ClientUploadResultaat> {
  const supabase = createClient()
  const geupload: { path: string; naam: string }[] = []
  const mislukt: string[] = []

  for (const bestand of bestanden) {
    const path = `${zaakId}/${crypto.randomUUID()}/${bestand.name}`
    const { error } = await supabase.storage.from('documenten').upload(path, bestand)
    if (error) {
      mislukt.push(`${bestand.name} (${error.message})`)
    } else {
      geupload.push({ path, naam: bestand.name })
    }
  }

  return { geupload, mislukt }
}
