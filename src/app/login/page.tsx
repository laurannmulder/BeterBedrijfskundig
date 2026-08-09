import { signIn } from '@/auth'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl font-semibold">BeterBedrijfskundig</h1>
      <form
        action={async () => {
          'use server'
          await signIn('microsoft-entra-id')
        }}
      >
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-white hover:bg-neutral-800"
        >
          Inloggen met Microsoft
        </button>
      </form>
    </main>
  )
}
