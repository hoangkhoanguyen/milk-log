import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/auth/callback', '/auth/error']

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        // @supabase/ssr 0.10+: setAll now receives a `headers` map
        // (e.g. Cache-Control: private, no-store) that must be forwarded
        // on the response so CDN/proxies never cache auth cookies.
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value)
          )
        }
      }
    }
  )

  // getClaims() verifies the JWT locally via JWKS (no round-trip to Supabase
  // Auth server for most tokens) — faster than getUser() while still
  // triggering session refresh when the access token has expired.
  const { data } = await supabase.auth.getClaims()
  const isAuthenticated = !!data?.claims

  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(p + '/')
  )

  if (!isAuthenticated && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isAuthenticated && path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}
