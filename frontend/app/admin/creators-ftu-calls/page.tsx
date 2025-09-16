'use client'

// Force this route to always render fresh HTML and avoid any caching
export const revalidate = 0
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { BarChart3, RefreshCw, Filter } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || ''

type Row = { creator_id: number; creator_name?: string; ftu_calls_count: number; avg_ftu_per_day?: number; avg_ftu_duration_seconds?: number }

export default function CreatorsFtuCallsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      // Always request sorting by average FTU duration (seconds) desc so list shows creators with
      // highest average duration first.
      params.set('sortBy', 'avg_ftu_duration_seconds')
      params.set('sortOrder', 'DESC')
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      if (search) params.set('search', search)
      const base = API_BASE || `${window.location.protocol}//${window.location.hostname}:3001`
      const res = await fetch(`${base}/api/admin/creators-ftu-calls?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setRows(json.creators || [])
      setTotal(json.pagination?.total || 0)
      setTotalPages(json.pagination?.totalPages || 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit])

  const formatDuration = (seconds: number) => {
    // seconds -> Hh Mm Ss
    const s = Math.floor(seconds)
    if (!s || s <= 0) return '-' 
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}h ${m}m ${sec}s`
    if (m > 0) return `${m}m ${sec}s`
    return `${sec}s`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Creators FTU Calls</h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowFilters(!showFilters)} className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded flex items-center">
                <Filter className="h-4 w-4 mr-2" /> {showFilters ? 'Hide' : 'Show'} Filters
              </button>
              <button onClick={() => fetchData()} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded flex items-center">
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchData() } }}
                  placeholder="Creator name or ID"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full border rounded px-3 py-2" />
              </div>
              <div className="flex items-end">
                <button onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); setPage(1); fetchData() }} className="w-full bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded">Clear</button>
              </div>
              <div className="flex items-end">
                <button onClick={() => { setPage(1); fetchData() }} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded">Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><p className="text-gray-600">Loading...</p></div>
      ) : error ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div></div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="overflow-x-auto bg-white shadow rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creator ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creator</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FTU Calls Count</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg FTU/Day</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Duration</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.length === 0 ? (
                  <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={2}>No data</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.creator_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{r.creator_id}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{r.creator_name || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{r.ftu_calls_count}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{typeof r.avg_ftu_per_day === 'number' ? r.avg_ftu_per_day.toFixed(2) : '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{typeof r.avg_ftu_duration_seconds === 'number' && r.avg_ftu_duration_seconds > 0 ? formatDuration(r.avg_ftu_duration_seconds) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">Page {page} of {totalPages} · {total} creators</div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 border rounded disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
              <select value={limit} onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1) }} className="border rounded px-2 py-2 text-sm">
                {[10,20,50,100].map(n => <option key={n} value={n}>{n}/page</option>)}
              </select>
              <button className="px-3 py-2 border rounded disabled:opacity-50" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


