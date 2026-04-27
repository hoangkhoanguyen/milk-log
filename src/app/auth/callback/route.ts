import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Comma-separated list of emails allowed to access the app.
// Set in .env.local: ALLOWED_EMAILS=alice@gmail.com,bob@gmail.com
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const email = data.user.email?.toLowerCase() ?? ''

      // Allowlist check — if ALLOWED_EMAILS is empty, deny everyone (misconfiguration guard)
      if (!ALLOWED_EMAILS.includes(email)) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?error=not_allowed`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
