import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Using the classic `middleware.ts` name (rather than Next.js 16's `proxy.ts`
// rename) — Vercel's deploy pipeline appeared not to route any requests at
// all under `proxy.ts` (every path 404'd at the edge with zero function
// invocations, despite a clean build). `middleware.ts` remains fully
// supported in Next.js 16, just deprecated in favor of `proxy.ts`.
const PUBLIC_PATHS = ['/login', '/auth', '/wachtwoord-vergeten']

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = new URL(request.url)

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path))

  if (!user && !isPublic) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
