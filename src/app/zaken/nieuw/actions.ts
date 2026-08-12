'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createZaak(formData: FormData) {
  const dossiernummer = String(formData.get('dossiernummer') ?? '').trim()
  const naam_betrokkene = String(formData.get('naam_betrokkene') ?? '').trim()

  if (!naam_betrokkene || !dossiernummer) {
    redirect(`/zaken/nieuw?error=${encodeURIComponent('Vul naam betrokkene en dossiernummer in')}`)
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Ongevalsdatum en ondernemingsgegevens worden niet hier ingevuld — die
  // komen binnen via geüploade documenten op de zaakpagina, zie
  // src/lib/documenten/classificeer.ts.
  const { data: zaak, error: zaakError } = await supabase
    .from('zaken')
    .insert({
      dossiernummer,
      naam_betrokkene,
      created_by: user!.id,
    })
    .select()
    .single()

  if (zaakError || !zaak) {
    redirect(`/zaken/nieuw?error=${encodeURIComponent(zaakError?.message ?? 'Aanmaken zaak mislukt')}`)
  }

  redirect(`/zaken/${zaak.id}`)
}
