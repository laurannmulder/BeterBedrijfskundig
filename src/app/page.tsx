import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Badge, Card, LinkButton } from '@/components/ui'

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Zaken</h1>
            <p className="mt-1 text-sm text-zinc-500">
              <strong className="font-semibold text-zinc-900">{zaken?.length ?? 0}</strong> zaken ·{' '}
              <strong className="font-semibold text-zinc-900">{aantalMetOntbrekendeDocumenten}</strong> met
              ontbrekende documenten
            </p>
          </div>
          <LinkButton href="/zaken/nieuw">
            <Plus className="h-4 w-4" />
            Nieuwe zaak
          </LinkButton>
        </div>

        <div className="flex flex-col gap-3">
          {zaken?.map((zaak) => {
            const voortgang = voortgangPerZaak.get(zaak.id)
            const rapportage = laatsteRapportagePerZaak.get(zaak.id)
            const compleet = voortgang && voortgang.geupload >= voortgang.verplicht
            const percentage = voortgang ? Math.round((voortgang.geupload / voortgang.verplicht) * 100) : 0

            return (
              <Link key={zaak.id} href={`/zaken/${zaak.id}`}>
                <Card className="flex flex-col gap-4 px-5 py-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium text-zinc-900">{zaak.naam_betrokkene}</span>
                    <span className="text-xs text-zinc-500">
                      {zaak.dossiernummer ? `Dossier ${zaak.dossiernummer} · ` : ''}
                      Ongeval {zaak.ongevalsdatum}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:shrink-0 sm:gap-6">
                    {voortgang && (
                      <div className="flex w-32 flex-col gap-1">
                        <span className={`text-xs font-medium ${compleet ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {voortgang.geupload}/{voortgang.verplicht} documenten
                        </span>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className={`h-full rounded-full ${compleet ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {rapportage ? (
                      <Badge tone={rapportage.status === 'definitief' ? 'success' : 'neutral'}>
                        {rapportage.status}
                      </Badge>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        <FileText className="h-3.5 w-3.5" />
                        geen rapportage
                      </span>
                    )}
                    <span className="w-20 text-right text-xs text-zinc-400">
                      {relatieveTijd(zaak.laatst_bewerkt)}
                    </span>
                  </div>
                </Card>
              </Link>
            )
          })}
          {zaken?.length === 0 && (
            <Card className="p-8 text-center text-sm text-zinc-500">Nog geen zaken.</Card>
          )}
        </div>
      </main>
    </>
  )
}
