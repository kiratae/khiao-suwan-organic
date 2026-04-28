import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'adminToken'

/**
 * Constant-time string comparison — prevents timing attacks.
 * Uses only Web Crypto APIs so it runs on the Edge runtime.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  const maxLen = Math.max(aBytes.length, bBytes.length)
  // XOR length difference into result so mismatched lengths always fail
  let result = aBytes.length ^ bBytes.length
  for (let i = 0; i < maxLen; i++) {
    result |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0)
  }
  return result === 0
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow the login page through to avoid redirect loops
  if (pathname === '/admin/login') {
    return NextResponse.next()
  }

  const secret = process.env.ADMIN_SECRET
  if (!secret) {
    // ADMIN_SECRET not configured — block access
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  const token = request.cookies.get(COOKIE_NAME)?.value ?? ''

  if (!timingSafeEqual(token, secret)) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
