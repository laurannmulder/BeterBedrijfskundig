import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { GENERATIE_STAPPEN } from '@/lib/rapportage/genereer'
import type { GeneratieVoortgang } from '../../actions'
import { GeneratieVoortgangWeergave } from './generatie-voortgang'

// Elke poll vanaf de client (zie generatie-voortgang.tsx) voert precies één
// generatiestap uit — ruim binnen deze marge, maar met een veilige buffer
// t.o.v. de 300s die op dit Vercel-project daadwerkelijk beschikbaar is.
export const maxDuration = 280

export default async function GenererenPage({
  params,
}: {
  params: Promise<{ id: string; generatieId: string }>
}) {
  const { id, generatieId } = await params
  const supabase = await createClient()

  const { data: generatie } = await supabase
    .from('rapportage_generaties')
    .select('*')
    .eq('id', generatieId)
    .single()

  if (!generatie) {
    redirect(`/zaken/${id}`)
  }

  if (generatie.status === 'klaar' && generatie.rapportage_id) {
    redirect(`/zaken/${id}/rapportages/${generatie.rapportage_id}`)
  }

  const initieel: GeneratieVoortgang = {
    status: generatie.status,
    stap: generatie.stap,
    totaalStappen: GENERATIE_STAPPEN.length,
    stapNaam: GENERATIE_STAPPEN[generatie.stap]?.naam ?? null,
    rapportageId: generatie.rapportage_id,
    foutmelding: generatie.foutmelding,
  }

  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-6 p-8">
        <GeneratieVoortgangWeergave zaakId={id} generatieId={generatieId} initieel={initieel} />
      </main>
    </>
  )
}
