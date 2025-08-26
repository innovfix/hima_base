'use client'

import { useEffect, useState } from 'react'
import { 
  Users,
  UserPlus,
  Wallet,
  RefreshCw
} from 'lucide-react'

// Prefer env; otherwise hit same-origin Nginx proxy at /api
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''

interface QuickStats {
  totalUsers: number
  todayRegistered: number
  todayRegisteredPaid: number
  date: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<QuickStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const base = API_BASE || ''
      const res = await fetch(`${base}/api/admin/dashboard-stats`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setStats(json)
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Dashboard Error</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={fetchStats} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg">Try Again</button>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-indigo-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Internal Dashboard</h1>
            </div>
            <button onClick={fetchStats} className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-3 py-2 rounded">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border rounded-lg shadow-sm p-5">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg shadow-sm p-5">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <UserPlus className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today Registered</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayRegistered.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg shadow-sm p-5">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Wallet className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today Registered & Paid</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayRegisteredPaid.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-6">As of {stats.date}</p>
      </main>
    </div>
  )
}

