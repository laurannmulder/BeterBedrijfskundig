import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'

function relatieveTijd(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minuten = Math.round(diffMs / 60000)
  if (minuten < 1) return 'zojuist'
  if (minuten < 60) return `${minuten} min geleden`
  const uren = Math.round(minuten / 60)
  if (uren < 24) return `${uren} uur geleden`
  const dagen = Math.round(uren / 24)
  if (dagen < 30) return `${dagen} dag${dagen === 1 ? '' : 'en'} geleden`
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: zaken } = await supabase
    .from('zaken')
    .select('id, naam_betrokkene, dossiernummer, ongevalsdatum, laatst_bewerkt')
    .order('laatst_bewerkt', { ascending: false })

  const { data: documenten } = await supabase.from('documenten').select('zaak_id, verplicht, status')

  const { data: rapportages } = await supabase
    .from('rapportages')
    .select('zaak_id, status, created_at')
    .order('created_at', { ascending: false })

  const voortgangPerZaak = new Map<string, { verplicht: number; geupload: number }>()
  for (const d of documenten ?? []) {
    if (!d.verplicht) continue
    const huidig = voortgangPerZaak.get(d.zaak_id) ?? { verplicht: 0, geupload: 0 }
    huidig.verplicht += 1
    if (d.status !== 'ontbreekt') huidig.geupload += 1
    voortgangPerZaak.set(d.zaak_id, huidig)
  }

  const laatsteRapportagePerZaak = new Map<string, { status: string }>()
  for (const r of rapportages ?? []) {
    if (!laatsteRapportagePerZaak.has(r.zaak_id)) {
      laatsteRapportagePerZaak.set(r.zaak_id, { status: r.status })
    }
  }

  const aantalMetOntbrekendeDocumenten = [...voortgangPerZaak.values()].filter(
    (v) => v.geupload < v.verplicht
  ).length

  return (
    <>
      <Header userEmail={user?.email} />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Zaken</h1>
          <Link
            href="/zaken/nieuw"
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-neutral-800"
          >
            + Nieuwe zaak
          </Link>
        </div>

        <div className="flex gap-6 text-sm text-zinc-600">
          <span>
            <strong className="text-black">{zaken?.length ?? 0}</strong> zaken
          </span>
          <span>
            <strong className="text-black">{aantalMetOntbrekendeDocumenten}</strong> met ontbrekende
            documenten
          </span>
        </div>

        <ul className="flex flex-col gap-2">
          {zaken?.map((zaak) => {
            const voortgang = voortgangPerZaak.get(zaak.id)
            const rapportage = laatsteRapportagePerZaak.get(zaak.id)

            return (
              <li key={zaak.id}>
                <Link
                  href={`/zaken/${zaak.id}`}
                  className="flex items-center justify-between gap-4 rounded-md border border-zinc-200 px-4 py-3 hover:bg-zinc-50"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{zaak.naam_betrokkene}</span>
                    <span className="text-xs text-zinc-500">
                      {zaak.dossiernummer ? `Dossier ${zaak.dossiernummer} · ` : ''}
                      Ongeval {zaak.ongevalsdatum}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    {voortgang && (
                      <span
                        className={`text-xs ${
                          voortgang.geupload < voortgang.verplicht ? 'text-amber-700' : 'text-green-700'
                        }`}
                      >
                        {voortgang.geupload}/{voortgang.verplicht} documenten
                      </span>
                    )}
                    {rapportage ? (
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          rapportage.status === 'definitief'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        {rapportage.status}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">geen rapportage</span>
                    )}
                    <span className="w-24 text-right text-xs text-zinc-400">
                      {relatieveTijd(zaak.laatst_bewerkt)}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
          {zaken?.length === 0 && <p className="text-sm text-zinc-500">Nog geen zaken.</p>}
        </ul>
      </main>
    </>
  )
}
