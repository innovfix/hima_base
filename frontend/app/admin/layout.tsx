'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, LayoutGrid, Users, TrendingUp, BarChart3, LineChart, Wallet, Globe } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Internal Dashboard', icon: LayoutGrid },
  { href: '/admin/users', label: 'Admin Panel', icon: Users },
  { href: '/admin/retention', label: 'User Retention', icon: TrendingUp },
  { href: '/admin/retention-trends', label: 'Retention Trends', icon: LineChart },
  { href: '/admin/reg-vs-payers', label: 'Reg vs Payers', icon: BarChart3 },
  // Creators group header + links
  { isHeader: true, label: 'Creators' },
  { href: '/admin/creators-income', label: 'Creators Income', icon: Wallet },
  { href: '/admin/creators-avg-time', label: 'Creators Avg Time', icon: BarChart3 },
  { href: '/admin/creators-weekly-avg', label: 'Creators Weekly Avg', icon: BarChart3 },
  { href: '/admin/creator-income-retention', label: 'Creator Income Retention', icon: BarChart3 },
  { href: '/admin/creators-payouts', label: 'Creators Payouts', icon: Wallet },
  { href: '/admin/one-time-payout-creators', label: 'One-time Payout Creators', icon: Wallet },
  { href: '/admin/creators-ftu-calls', label: 'Creators FTU Calls', icon: BarChart3 },
  { href: '/admin/inactive-creators', label: 'Inactive Creators', icon: Users },
  { href: '/admin/active-users-monitor', label: 'Active Users Monitor', icon: Globe },
  { href: '/admin/send-report', label: 'Send Daily Report', icon: BarChart3 },
  { href: '/admin/registrations-paid-by-language', label: 'Regs Paid Today (by language)', icon: Wallet },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const items = useMemo(() => navItems, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-semibold text-gray-900">Admin</span>
          </div>
        </div>
      </div>

      {/* Sidebar (desktop) */}
      <div className="md:flex">
        <aside className="hidden md:block md:w-64 md:flex-shrink-0 border-r bg-white">
          <div className="h-[calc(100vh-56px)] sticky top-14 overflow-y-auto p-4">
            <nav className="space-y-1">
              {items.map((item) => {
                const it = item as any
                // Render group headers as non-clickable separators
                if (it.isHeader) {
                  return (
                    <div key={`hdr-${it.label}`} className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {it.label}
                    </div>
                  )
                }
                // Guard: ensure href exists before passing to Link (satisfy TS)
                if (!it.href) return null
                const Icon = it.icon
                const active = pathname === it.href
                const href = String(it.href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={
                      `group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ` +
                      (active
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900')
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{it.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Sidebar Drawer (mobile) */}
        {open && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold">Menu</span>
                <button onClick={() => setOpen(false)} aria-label="Close sidebar" className="p-2 rounded hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="space-y-1">
                {items.map((item) => {
                  const it = item as any
                  if (it.isHeader) {
                    return (
                      <div key={`hdr-m-${it.label}`} className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {it.label}
                      </div>
                    )
                  }
                  if (!it.href) return null
                  const Icon = it.icon
                  const active = pathname === it.href
                  const href = String(it.href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={
                        `group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ` +
                        (active
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900')
                      }
                    >
                      <Icon className="h-4 w-4" />
                      <span className="truncate">{it.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 md:ml-0">
          {/* Provide spacing to breathe under the topbar */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
