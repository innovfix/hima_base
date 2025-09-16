'use client'

// Force this route to always render fresh HTML and avoid any caching
export const revalidate = 0
export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { BarChart3, RefreshCw, Filter, SortAsc, SortDesc } from 'lucide-react'

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
  // Sorting: default to Avg Duration DESC
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  // Local paging when we need to sort the entire dataset client-side
  const [allRows, setAllRows] = useState<Row[] | null>(null)
  const manualFetchRef = useRef(false)
  // Minimum FTU calls (unique users) to include per creator
  const [minCalls, setMinCalls] = useState<number>(10)

  const fetchData = async (fetchAll = false, overrideSort?: 'ASC' | 'DESC') => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      // Request backend ordering by average FTU duration seconds
      params.set('sortBy', 'avg_ftu_duration_seconds')
      params.set('sortOrder', overrideSort || sortOrder)
      params.set('page', String(fetchAll ? 1 : page))
      params.set('limit', String(fetchAll ? 100000 : limit))
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      if (search) params.set('search', search)
      params.set('minCalls', String(minCalls))
      // Add cache-busting param to ensure the browser doesn't serve a stale response when toggling sort
      params.set('_', String(Date.now()))
      const base = API_BASE || `${window.location.protocol}//${window.location.hostname}:3001`
      const res = await fetch(`${base}/api/admin/creators-ftu-calls?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const list: Row[] = json.creators || []
      if (fetchAll) {
        setAllRows(list)
        setTotal(list.length)
        setTotalPages(Math.max(1, Math.ceil(list.length / limit)))
        const start = (page - 1) * limit
        setRows(list.slice(start, start + limit))
      } else {
        setAllRows(null)
        setRows(list)
        setTotal(json.pagination?.total || list.length || 0)
        setTotalPages(json.pagination?.totalPages || Math.max(1, Math.ceil((list.length || 0) / limit)))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
      manualFetchRef.current = false
    }
  }

  useEffect(() => {
    // If we already fetched full dataset for sorting, just paginate locally
    if (allRows && !manualFetchRef.current) {
      const start = (page - 1) * limit
      setRows(allRows.slice(start, start + limit))
      setTotal(allRows.length)
      setTotalPages(Math.max(1, Math.ceil(allRows.length / limit)))
      return
    }
    if (manualFetchRef.current) return
    fetchData(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, dateFrom, dateTo, search, sortOrder, minCalls])

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
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Min FTU Calls</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={minCalls}
                  onChange={(e) => { setMinCalls(parseInt(e.target.value, 10) || 0); setPage(1) }}
                >
                  {[1,5,10,20,50].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
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
                <button onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); setMinCalls(10); setPage(1); fetchData() }} className="w-full bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded">Clear</button>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <span>Avg Duration</span>
                      <button
                        type="button"
                        aria-label="Sort ascending"
                        className={`p-1 rounded ${sortOrder === 'ASC' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                        onClick={() => {
                          if (sortOrder !== 'ASC') {
                            setPage(1)
                            setSortOrder('ASC')
                            // Fetch all to apply sort across full dataset and locally paginate
                            manualFetchRef.current = true
                            fetchData(true, 'ASC')
                          }
                        }}
                      >
                        <SortAsc className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Sort descending"
                        className={`p-1 rounded ${sortOrder === 'DESC' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                        onClick={() => {
                          if (sortOrder !== 'DESC') {
                            setPage(1)
                            setSortOrder('DESC')
                            manualFetchRef.current = true
                            fetchData(true, 'DESC')
                          }
                        }}
                      >
                        <SortDesc className="h-4 w-4" />
                      </button>
                    </div>
                  </th>
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
                    <td className="px-4 py-2 text-sm">
                      {typeof r.avg_ftu_duration_seconds === 'number' ? (
                        r.avg_ftu_duration_seconds < 0 ? (
                          <span className="px-2 py-1 text-sm text-red-700 bg-red-100 rounded">{formatDuration(Math.abs(r.avg_ftu_duration_seconds))} (neg)</span>
                        ) : r.avg_ftu_duration_seconds > 0 ? (
                          <span className="px-2 py-1 text-sm text-gray-900">{formatDuration(r.avg_ftu_duration_seconds)}</span>
                        ) : (
                          '-'
                        )
                      ) : (
                        '-'
                      )}
                    </td>
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


