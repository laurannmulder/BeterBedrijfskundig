import { auth, signOut } from '@/auth'

export default async function Home() {
  const session = await auth()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">BeterBedrijfskundig</h1>
      <p className="text-zinc-600">Ingelogd als {session?.user?.email}</p>
      <form
        action={async () => {
          'use server'
          await signOut()
        }}
      >
        <button type="submit" className="text-sm text-zinc-500 underline">
          Uitloggen
        </button>
      </form>
    </main>
  )
}
