'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function inviteUser(formData: FormData) {
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
