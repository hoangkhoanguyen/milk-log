'use client'

import * as React from 'react'
import { Baby } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = React.useState('')
  const [pending, setPending] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) {
      toast.error('Email không hợp lệ')
      return
    }
    setPending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true
      }
    })
    setPending(false)
    if (error) {
      // Allowlist trigger raises an exception that surfaces here.
      const msg = error.message || ''
      if (
        msg.toLowerCase().includes('không được phép') ||
        msg.toLowerCase().includes('not allowed') ||
        msg.toLowerCase().includes('database error')
      ) {
        toast.error('Email này không được phép đăng nhập. Liên hệ admin để được thêm vào.', {
          duration: 6000
        })
        return
      }
      toast.error(msg)
      return
    }
    setSent(true)
    toast.success('Đã gửi magic link, kiểm tra email của bạn.')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Baby className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Milk Logger</CardTitle>
          <p className="text-sm text-muted-foreground">
            Đăng nhập bằng email — chỉ email được cấp quyền mới vào được.
          </p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div
              className="rounded-md border border-primary/40 bg-primary/5 p-4 text-sm"
              data-testid="login-sent"
            >
              Đã gửi link đăng nhập tới <strong>{email}</strong>. Mở email để tiếp tục.
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-3">
              <Input
                type="email"
                placeholder="ban@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                data-testid="login-email"
              />
              <Button type="submit" disabled={pending} size="lg" data-testid="login-submit">
                {pending ? 'Đang gửi…' : 'Gửi magic link'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
