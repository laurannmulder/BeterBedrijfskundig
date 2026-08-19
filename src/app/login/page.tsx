import Image from 'next/image'
import Link from 'next/link'
import { login } from './actions'
import { Card, inputClass } from '@/components/ui'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 p-8">
      <Image src="/logo.svg" alt="oliver.bb" width={152} height={40} priority className="h-10 w-auto" />
      <Card className="w-full max-w-sm p-6">
        <form action={login} className="flex flex-col gap-3">
          <input
            name="email"
            type="email"
            placeholder="E-mailadres"
            required
            autoComplete="email"
            className={inputClass}
          />
          <input
            name="password"
            type="password"
            placeholder="Wachtwoord"
            required
            autoComplete="current-password"
            className={inputClass}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="mt-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700"
          >
            Inloggen
          </button>
        </form>
      </Card>
      <Link href="/wachtwoord-vergeten" className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline">
        Wachtwoord vergeten?
      </Link>
    </main>
  )
}
