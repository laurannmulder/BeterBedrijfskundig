'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function setPassword(formData: FormData) {
  const password = String(formData.get('password') ?? '')

  if (password.length < 8) {
    redirect(
      `/wachtwoord-instellen?error=${encodeURIComponent('Wachtwoord moet minimaal 8 tekens zijn')}`
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect(`/wachtwoord-instellen?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/')
}
