'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { huidigeGebruiker } from '@/lib/gebruiker'

/**
 * De actie hieronder draait met de service-role client, die RLS omzeilt. De
 * beheerderscontrole moet dus in de code staan: een server action is een
 * gewoon HTTP-endpoint dat elke ingelogde gebruiker kan aanroepen, ook zonder
 * de UI.
 */
async function vereistBeheerder() {
  const gebruiker = await huidigeGebruiker()
  if (!gebruiker) redirect('/login')
  if (!gebruiker.isBeheerder) redirect('/')
  return gebruiker
}

export async function inviteUser(formData: FormData) {
  await vereistBeheerder()

  const email = String(formData.get('email') ?? '').trim()

  if (!email) {
    return { error: 'E-mailadres is verplicht' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/wachtwoord-instellen`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: `Uitnodiging verstuurd naar ${email}` }
}
