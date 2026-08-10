'use server'

import { redirect } from 'next/navigation'
import { type EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Verification only happens here, behind an explicit user click — not on the
// GET request the invite link resolves to. That GET gets auto-visited by
// mail security scanners (e.g. Microsoft Safe Links), which would otherwise
// burn the single-use token before the real person clicks.
export async function confirmInvite(formData: FormData) {
  const token_hash = String(formData.get('token_hash') ?? '')
  const type = formData.get('type') as EmailOtpType | null
  const next = String(formData.get('next') ?? '/wachtwoord-instellen')

  if (!token_hash || !type) {
    redirect(`/login?error=${encodeURIComponent('Uitnodigingslink is ongeldig of verlopen')}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent('Uitnodiging is al gebruikt of verlopen — vraag een nieuwe aan')}`
    )
  }

  redirect(next)
}
