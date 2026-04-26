'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Baby, BarChart3, Home, History, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', label: 'Hôm nay', icon: Home },
  { href: '/history', label: 'Lịch sử', icon: History },
  { href: '/stats', label: 'Thống kê', icon: BarChart3 }
]

export function AppHeader({ email }: { email: string | null }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Baby className="h-5 w-5 text-primary" />
          <span className="font-bold tracking-tight">Milk Logger</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                data-testid={`nav-${href.replace('/', '') || 'home'}`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Đăng xuất"
            onClick={logout}
            title={email ?? undefined}
            data-testid="logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </header>
  )
}
