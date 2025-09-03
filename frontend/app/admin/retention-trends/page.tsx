'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, RefreshCw, Filter } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TrendData {
  date_period: string
  unique_users: number
  total_transactions: number
  total_revenue: number
  total_coins_sold: number
  avg_transaction_value: number
}

interface RetentionData {
  date_period: string
  total_users: number
  returning_users: number
  retention_rate: number
}

interface UserBreakdownData {
  date_period: string
  new_users: number
  existing_users: number
}

interface RetentionTrendsResponse {
  trends: TrendData[]
  retention: RetentionData[]
  userBreakdown: UserBreakdownData[]
  languageTrends?: { date_period: string; language: string; unique_users: number; total_revenue: number }[]
  registeredCount?: number
  filters: {
    dateFrom: string
    dateTo: string
    groupBy: string
    regFrom?: string
    regTo?: string
  }
  summary: {
    totalPeriods: number
    totalUsers: number
    totalRevenue: number
    avgRetentionRate: number
  }
}

// Prefer env if provided; fallback to same host on :3001
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || ''

// (rolled back helpers not needed)

export default function RetentionTrendsPage() {
  const [data, setData] = useState<RetentionTrendsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    regFrom: ''
  })

  const fetchRetentionTrends = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (filters.regFrom) params.set('regFrom', filters.regFrom)

      const base = API_BASE || `${window.location.protocol}//${window.location.hostname}:3001`
      const response = await fetch(`${base}/api/admin/retention-trends?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRetentionTrends()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.regFrom])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    try {
      const dayDate = new Date(dateStr)
      return dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const formatCurrency = (value: number) => {
    return `₹${parseFloat(value.toString()).toFixed(2)}`
  }

  const filteredTrends = useMemo(() => {
    if (!data || !filters.regFrom) return data?.trends || []
    const start = new Date(filters.regFrom)
    return (data.trends || []).filter((row) => {
      const d = new Date(row.date_period as unknown as string)
      return d >= start
    })
  }, [data, filters.regFrom])

  // Build language-wise data series
  const { languageData, languages } = useMemo(() => {
    const rows = (data?.languageTrends || []) as any[]
    if (!rows || rows.length === 0) return { languageData: [], languages: [] as string[] }
    const langsSet = new Set<string>()
    const map: Record<string, any> = {}
    rows.forEach((r: any) => {
      const lang = r.language || 'Unknown'
      langsSet.add(lang)
      const key = typeof r.date_period === 'string' ? r.date_period : new Date(r.date_period).toISOString().slice(0, 10)
      map[key] = map[key] || { date_period: key }
      map[key][lang] = Number(r.unique_users) || 0
      map[key][`rev__${lang}`] = Number(r.total_revenue) || 0
    })
    let arr = Object.values(map)
    if (filters.regFrom) {
      const start = new Date(filters.regFrom)
      arr = arr.filter((row: any) => new Date(row.date_period) >= start)
    }
    arr.sort((a: any, b: any) => (a.date_period < b.date_period ? -1 : 1))
    return { languageData: arr, languages: Array.from(langsSet) }
  }, [data, filters.regFrom])

  const colorPalette = ['#2563EB', '#16A34A', '#DC2626', '#7C3AED', '#EA580C', '#0891B2', '#B91C1C', '#4F46E5', '#0EA5E9', '#22C55E']
  const colorFor = (idx: number) => colorPalette[idx % colorPalette.length]

  const CustomLanguageTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const row: any = payload[0]?.payload || {}
      return (
        <div className="bg-white border border-gray-200 shadow rounded p-3">
          <p className="font-semibold mb-2">{formatDate(label)}</p>
          <div className="space-y-1">
            {languages.map((lang, idx) => {
              const users = row[lang] || 0
              const rev = row[`rev__${lang}`] || 0
              if (!users && !rev) return null
              return (
                <div key={lang} className="flex items-center text-sm">
                  <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: colorFor(idx) }} />
                  <span className="font-medium mr-1">{lang}:</span>
                  <span className="text-blue-700 mr-2">Users {users}</span>
                  <span className="text-green-700">Revenue {formatCurrency(rev)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )
    }
    return null
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const row = payload[0]?.payload as TrendData
      return (
        <div className="bg-white border border-gray-200 shadow rounded p-3">
          <p className="font-semibold mb-1">{formatDate(label)}</p>
          <p className="text-blue-700">Paying Users : {row?.unique_users ?? '-'}</p>
          <p className="text-green-700">Total Revenue : {formatCurrency(row?.total_revenue ?? 0)}</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading retention trends...</p>
        </div>
      </div>
    )
  }

  if (!filters.regFrom) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">Retention Trends Analytics</h1>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded flex items-center"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? 'Hide' : 'Show'} Filters
                </button>
                <button
                  onClick={fetchRetentionTrends}
                  className="bg-blue-600 text-white px-4 py-2 rounded opacity-50 cursor-not-allowed"
                  disabled
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registered on</label>
                  <input
                    type="date"
                    value={filters.regFrom}
                    onChange={(e) => setFilters({ regFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => setFilters({ regFrom: '' })}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <p className="text-lg text-gray-700">Select a Registered on date to load the chart.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
          <button
            onClick={fetchRetentionTrends}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Retention Trends Analytics</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded flex items-center"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
              <button
                onClick={fetchRetentionTrends}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registered on</label>
                <input
                  type="date"
                  value={filters.regFrom}
                  onChange={(e) => setFilters({ regFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ regFrom: '' })}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registered count */}
      {data.registeredCount !== undefined && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
            <span className="font-semibold">Registered on {filters.regFrom}:</span> {data.registeredCount} users
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* User Count Over Time Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Paying Users and Revenue Over Time</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={filteredTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date_period" 
                tickFormatter={(value) => formatDate(value)}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="unique_users" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Paying Users"
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Language-wise Users Over Time */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Paying Users by Language</h3>
          {languageData.length === 0 ? (
            <div className="text-gray-500 py-16 text-center">No language-wise data for the selected date.</div>
          ) : (
            <ResponsiveContainer width="100%" height={420}>
              <LineChart data={languageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date_period" 
                  tickFormatter={(value) => formatDate(value)}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip content={<CustomLanguageTooltip />} />
                <Legend />
                {languages.map((lang, i) => (
                  <Line
                    key={lang}
                    type="monotone"
                    dataKey={lang}
                    name={lang}
                    stroke={colorFor(i)}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
