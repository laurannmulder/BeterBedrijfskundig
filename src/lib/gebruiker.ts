import { createClient } from './supabase/server'

export type Gebruiker = {
  id: string
  email: string
  isBeheerder: boolean
}

/**
 * De ingelogde gebruiker met zijn rol. Geeft null terug als er geen sessie is;
 * de middleware stuurt dan al door naar /login, dus in een pagina mag je na een
 * null-check gerust van een geldige gebruiker uitgaan.
 */
export async function huidigeGebruiker(): Promise<Gebruiker | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profiel } = await supabase
    .from('profielen')
    .select('is_beheerder')
    .eq('id', user.id)
    .maybeSingle()

  return {
    id: user.id,
    email: user.email ?? '',
    isBeheerder: profiel?.is_beheerder ?? false,
  }
}
