'use client'

import * as React from 'react'
import { Baby } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSearchParams } from 'next/navigation'

const ERROR_MESSAGES: Record<string, string> = {
  not_allowed: 'Tài khoản Google này không được phép truy cập. Liên hệ admin.',
  auth_failed: 'Đăng nhập thất bại. Vui lòng thử lại.'
}

function LoginForm() {
  const [pending, setPending] = React.useState(false)
  const searchParams = useSearchParams()
  const errorKey = searchParams.get('error') ?? ''
  const errorMsg = ERROR_MESSAGES[errorKey] ?? ''

  async function signInWithGoogle() {
    setPending(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    // signInWithOAuth redirects the page — no need to setPending(false)
  }

  return (
    <div className="grid gap-4">
      {errorMsg && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      <Button
        size="lg"
        variant="outline"
        disabled={pending}
        onClick={signInWithGoogle}
        className="gap-3"
      >
        {/* Google "G" logo */}
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {pending ? 'Đang chuyển hướng…' : 'Đăng nhập bằng Google'}
      </Button>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Baby className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Milk Logger</CardTitle>
          <p className="text-sm text-muted-foreground">
            Chỉ tài khoản được cấp quyền mới vào được.
          </p>
        </CardHeader>
        <CardContent>
          <React.Suspense fallback={null}>
            <LoginForm />
          </React.Suspense>
        </CardContent>
      </Card>
    </main>
  )
}
