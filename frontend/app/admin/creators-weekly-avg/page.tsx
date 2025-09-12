"use client"

import { useEffect, useMemo, useState } from 'react'
import { Search, Calendar, Clock, User } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const getToday = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface CreatorRow {
  id: number
  name: string
  mobile: string
  language?: string | null
  audio_status?: number | null
  video_status?: number | null
  total_calls_week: number
  weekly_avg_seconds: number
  total_seconds_week: number
}

export default function CreatorsWeeklyAvgPage() {
  const [rows, setRows] = useState<CreatorRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [sortBy, setSortBy] = useState('weekly_avg_seconds')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')

  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState(getToday())
  const [dateTo, setDateTo] = useState('')
  const [minCalls, setMinCalls] = useState(1)
  const [weekSelector, setWeekSelector] = useState<'current'|'last'|'custom'>('current')

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
        search,
        dateFrom: weekSelector === 'custom' ? dateFrom : '',
        dateTo: weekSelector === 'custom' ? dateTo : '',
        minCalls: String(minCalls)
      })
      if (weekSelector !== 'custom') params.set('week', weekSelector)
      const base = API_BASE || `${window.location.protocol}//${window.location.hostname}:3001`
      const res = await fetch(`${base}/api/admin/creators-weekly-avg?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setRows(json.creators || [])
      setTotal(json.pagination?.total || 0)
      setTotalPages(json.pagination?.totalPages || 1)
    } catch (e: any) {
      setError(e?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, sortBy, sortOrder])

  const handleSort = (key: string) => {
    if (sortBy === key) setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
    else {
      setSortBy(key)
      setSortOrder('DESC')
    }
  }

  const formatDuration = (seconds: number) => {
    const s = Math.max(Math.floor(seconds || 0), 0)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}h ${m}m ${sec}s`
    if (m > 0) return `${m}m ${sec}s`
    return `${sec}s`
  }

  const renderStatus = (value: any) => {
    const n = Number(value)
    const active = n === 1
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {active ? 'Active' : 'Inactive'}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center"><Clock className="h-6 w-6 mr-2 text-indigo-600"/>Creators Weekly Average Call Time</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white border rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  className="pl-10 pr-3 py-2 border rounded-md w-full focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Name or mobile"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchData() } }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="date" className="pl-10 pr-3 py-2 border rounded-md w-full focus:ring-indigo-500 focus:border-indigo-500"
                       value={dateFrom} onChange={(e) => setDateFrom(e.target.value || getToday())} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="date" className="pl-10 pr-3 py-2 border rounded-md w-full focus:ring-indigo-500 focus:border-indigo-500"
                       value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Calls</label>
              <input type="number" min={1} className="px-3 py-2 border rounded-md w-full focus:ring-indigo-500 focus:border-indigo-500"
                     value={minCalls} onChange={(e) => setMinCalls(parseInt(e.target.value || '1', 10))} />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
              <select value={weekSelector} onChange={(e) => setWeekSelector(e.target.value as any)} className="px-3 py-2 border rounded-md w-full">
                <option value="current">Current (Mon–Sun)</option>
                <option value="last">Last Week (Mon–Sun)</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => { setPage(1); fetchData() }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">Apply</button>
            <button onClick={() => { setSearch(''); setDateFrom(getToday()); setDateTo(''); setMinCalls(1); setPage(1); fetchData() }} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">Clear</button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creator</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calls (Mon–Sun)</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg per day (7d)</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Duration (7d)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={7}>Loading...</td></tr>
              ) : error ? (
                <tr><td className="px-3 py-6 text-center text-red-600" colSpan={7}>{error}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={7}>No data</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-sm text-gray-900">{r.id}</td>
                    <td className="px-3 py-3 text-sm text-gray-900 flex items-center gap-2"><User className="h-4 w-4 text-gray-400"/>{r.name || '-'}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{r.mobile || '-'}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{r.language || '-'}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{r.total_calls_week}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{formatDuration(r.weekly_avg_seconds)}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{formatDuration(r.total_seconds_week)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-gray-700">
              <div>Showing page {page} of {totalPages} ({total} results)</div>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


