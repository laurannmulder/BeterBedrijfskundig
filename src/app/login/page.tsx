import Image from 'next/image'
import Link from 'next/link'
import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <Image src="/logo.svg" alt="BeterBedrijfskundig" width={205} height={50} priority />
      <form action={login} className="flex w-full max-w-sm flex-col gap-3">
        <input
          name="email"
          type="email"
          placeholder="E-mailadres"
          required
          autoComplete="email"
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
        <input
          name="password"
          type="password"
          placeholder="Wachtwoord"
          required
          autoComplete="current-password"
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-white hover:bg-neutral-800"
        >
          Inloggen
        </button>
      </form>
      <Link href="/wachtwoord-vergeten" className="text-sm underline">
        Wachtwoord vergeten?
      </Link>
    </main>
  )
}
