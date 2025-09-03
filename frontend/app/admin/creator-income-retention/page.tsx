'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, RefreshCw, Filter } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TrendData {
  date_period: string
  unique_creators: number
  total_transactions?: number
  call_income_amount?: number
}

interface RetentionData {
  date_period: string
  total_creators: number
  returning_creators: number
  retention_rate: number
}

interface ApiResponse {
  trends: TrendData[]
  retention?: RetentionData[]
  registeredCount?: number
  filters: { regFrom?: string }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || ''

export default function CreatorIncomeRetentionPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ regFrom: '' })

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (filters.regFrom) params.set('regFrom', filters.regFrom)
      const base = API_BASE || `${window.location.protocol}//${window.location.hostname}:3001`
      const res = await fetch(`${base}/api/admin/creator-income-retention?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.regFrom])

  const formatDate = (d: string) => {
    try {
      const dd = new Date(d)
      return dd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch { return d }
  }

  const chartData = useMemo(() => data?.trends || [], [data])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading creator income retention...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
          <button onClick={fetchData} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Retry</button>
        </div>
      </div>
    )
  }

  // Gate until a registration date is chosen
  if (!filters.regFrom) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">Creator Income Retention</h1>
              </div>
              <div className="flex items-center space-x-3">
                <button onClick={() => setShowFilters(!showFilters)} className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? 'Hide' : 'Show'} Filters
                </button>
                <button disabled className="bg-blue-600 text-white px-4 py-2 rounded opacity-50 cursor-not-allowed">
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
                  <input type="date" value={filters.regFrom} onChange={(e) => setFilters({ regFrom: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-end">
                  <button onClick={() => setFilters({ regFrom: '' })} className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">Clear Filters</button>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Creator Income Retention</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={() => setShowFilters(!showFilters)} className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
              <button onClick={fetchData} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
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
                <input type="date" value={filters.regFrom} onChange={(e) => setFilters({ regFrom: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-end">
                <button onClick={() => setFilters({ regFrom: '' })} className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">Clear Filters</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {typeof data?.registeredCount === 'number' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
            <span className="font-semibold">Creators registered on {filters.regFrom}:</span> {data.registeredCount}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Creators with Transactions Over Time</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date_period" tickFormatter={(v) => formatDate(v)} angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip 
                labelFormatter={(v) => formatDate(v as string)}
                formatter={(value: any, name: any, props: any) => {
                  const row = props && props.payload as TrendData
                  const extra = row?.call_income_amount !== undefined ? `, Call income: ₹${Number(row.call_income_amount).toFixed(2)}` : ''
                  if (name === 'Total Creators') {
                    return [`${value}${extra}`, 'Total Creators']
                  }
                  return [value, name]
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="unique_creators" stroke="#3B82F6" strokeWidth={2} name="Total Creators" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}


