'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function vraagWachtwoordResetAan(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()

  if (!email) {
    redirect(`/wachtwoord-vergeten?error=${encodeURIComponent('Vul een e-mailadres in')}`)
  }

  const supabase = await createClient()

  // Foutafhandeling bewust weggelaten: Supabase's eigen gedrag hier lekt al
  // niet of een e-mailadres bestaat, en wij willen dat ook niet doen — dus
  // altijd dezelfde melding tonen, ongeacht of het adres bekend is.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/wachtwoord-instellen`,
  })

  redirect('/wachtwoord-vergeten?verzonden=1')
}
