import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui'

export type StapStatus = 'klaar' | 'huidig' | 'open'

export interface ProcesStap {
  nummer: number
  titel: string
  status: StapStatus
  hint?: string
}

// Zaakmanagement-balk bovenaan de zaakpagina: de 7 stappen van een zaak, met
// per stap of hij klaar is (vanzelf afgeleid uit de gegevens, of handmatig
// afgevinkt bij stap 5/6), welke stap nu aan de beurt is, en een korte hint.
// De stappen zijn ankers naar de bijbehorende sectie — er wordt geen
// volgorde afgedwongen.
export function ZaakProces({ stappen }: { stappen: ProcesStap[] }) {
  const klaar = stappen.filter((s) => s.status === 'klaar').length

  return (
    <Card className="px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Zaakproces</h2>
        <span className="text-xs text-zinc-500">
          {klaar} van {stappen.length} stappen klaar
        </span>
      </div>
      <ol className="flex gap-1 overflow-x-auto pb-1 lg:grid lg:grid-cols-7 lg:overflow-visible">
        {stappen.map((stap, i) => (
          <li key={stap.nummer} className="min-w-[8.5rem] flex-1 lg:min-w-0">
            <a
              href={`#stap-${stap.nummer}`}
              className={`group flex h-full flex-col gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
                stap.status === 'huidig'
                  ? 'border-[#12756A] bg-[#12756A]/5'
                  : 'border-transparent hover:bg-zinc-50'
              }`}
              aria-current={stap.status === 'huidig' ? 'step' : undefined}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    stap.status === 'klaar'
                      ? 'bg-[#12756A] text-white'
                      : stap.status === 'huidig'
                        ? 'border-2 border-[#12756A] bg-white text-[#12756A]'
                        : 'border border-zinc-300 bg-white text-zinc-400'
                  }`}
                >
                  {stap.status === 'klaar' ? <Check className="h-3.5 w-3.5" /> : stap.nummer}
                </span>
                {i < stappen.length - 1 && <span className="hidden h-px flex-1 bg-zinc-200 lg:block" />}
              </span>
              <span
                className={`text-xs font-medium leading-snug ${
                  stap.status === 'open' ? 'text-zinc-500' : 'text-zinc-900'
                }`}
              >
                {stap.titel}
              </span>
              {stap.hint && <span className="text-[11px] leading-snug text-zinc-500">{stap.hint}</span>}
            </a>
          </li>
        ))}
      </ol>
    </Card>
  )
}

// Eén sectie van de zaakpagina, gekoppeld aan een stap in de balk hierboven.
export function StapSectie({
  nummer,
  titel,
  status,
  uitleg,
  children,
}: {
  nummer: number
  titel: string
  status: StapStatus
  uitleg?: ReactNode
  children: ReactNode
}) {
  return (
    <section id={`stap-${nummer}`} className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            status === 'klaar'
              ? 'bg-[#12756A] text-white'
              : status === 'huidig'
                ? 'border-2 border-[#12756A] bg-white text-[#12756A]'
                : 'border border-zinc-300 bg-white text-zinc-400'
          }`}
        >
          {status === 'klaar' ? <Check className="h-3.5 w-3.5" /> : nummer}
        </span>
        <div>
          <h2 className="text-base font-semibold text-zinc-900">{titel}</h2>
          {uitleg && <p className="mt-0.5 text-xs text-zinc-500">{uitleg}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-4 pl-0 sm:pl-9">{children}</div>
    </section>
  )
}
