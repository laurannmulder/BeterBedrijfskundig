import { auth } from '@/auth'
import { NextResponse } from 'next/server'

// Next.js 16 renamed `middleware` to `proxy` for the network-boundary/routing convention.
export async function proxy(request: Request) {
  const session = await auth()
  const { pathname } = new URL(request.url)

  const isPublic = pathname.startsWith('/api/auth') || pathname === '/login'

  if (!session && !isPublic) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
