'use client'

// Force this route to always render fresh HTML and avoid any caching
export const revalidate = 0
export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { BarChart3, RefreshCw, Filter, SortAsc, SortDesc } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || ''

type Row = {
  creator_id: number
  creator_name?: string
  language?: string
  audio_status?: number | null
  video_status?: number | null
  ftu_calls_count: number
  avg_ftu_per_day?: number
  avg_ftu_duration_seconds?: number
  repeat_callers_count?: number
}

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
  // Sorting
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [sortBy, setSortBy] = useState<'avg_ftu_duration_seconds' | 'ftu_calls_count' | 'repeat_callers_count' | 'avg_ftu_per_day'>('avg_ftu_duration_seconds')
  // Local paging when we need to sort the entire dataset client-side
  const [allRows, setAllRows] = useState<Row[] | null>(null)
  const manualFetchRef = useRef(false)
  // Minimum FTU calls (unique users) to include per creator
  const [minCalls, setMinCalls] = useState<number>(10)
  const [language, setLanguage] = useState<string>('All')
  const [type, setType] = useState<string>('audio')
  const [languages, setLanguages] = useState<string[]>([])
  // Applied filter snapshot (used for all requests)
  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedDateFrom, setAppliedDateFrom] = useState('')
  const [appliedDateTo, setAppliedDateTo] = useState('')
  const [appliedMinCalls, setAppliedMinCalls] = useState<number>(10)
  const [appliedLanguage, setAppliedLanguage] = useState<string>('All')
  const [appliedType, setAppliedType] = useState<string>('audio')

  const fetchData = async (
    fetchAll = false,
    overrideSort?: 'ASC' | 'DESC',
    overrideLimit?: number,
    overrideSortBy?: 'avg_ftu_duration_seconds' | 'ftu_calls_count' | 'repeat_callers_count' | 'avg_ftu_per_day'
  ) => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      // Determine effective sortBy for API (map avg_ftu_per_day to ftu_calls_count)
      const desiredSortBy = overrideSortBy || sortBy
      const apiSortBy = desiredSortBy === 'avg_ftu_per_day' ? 'ftu_calls_count' : desiredSortBy
      params.set('sortBy', apiSortBy)
      params.set('sortOrder', overrideSort || sortOrder)
      const effectiveLimit = overrideLimit ?? limit
      // When sorting by avg duration we optionally fetch all to allow local pagination across fully sorted list
      const shouldFetchAll = fetchAll || (desiredSortBy === 'avg_ftu_duration_seconds' && fetchAll)
      params.set('page', String(shouldFetchAll ? 1 : page))
      params.set('limit', String(shouldFetchAll ? 100000 : effectiveLimit))
      if (appliedDateFrom) params.set('dateFrom', appliedDateFrom)
      if (appliedDateTo) params.set('dateTo', appliedDateTo)
      if (appliedSearch) params.set('search', appliedSearch)
      params.set('minCalls', String(appliedMinCalls))
      if (appliedLanguage && appliedLanguage !== 'All') params.set('language', appliedLanguage)
      if (appliedType && appliedType !== 'all') params.set('type', appliedType)
      // Add cache-busting param to ensure the browser doesn't serve a stale response when toggling sort
      params.set('_', String(Date.now()))
      const base = API_BASE || `${window.location.protocol}//${window.location.hostname}:3001`
      const res = await fetch(`${base}/api/admin/creators-ftu-calls?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const list: Row[] = json.creators || []
      // Load language options when present
      if (Array.isArray(json.languages)) setLanguages(json.languages)
      if (shouldFetchAll) {
        setAllRows(list)
        setTotal(list.length)
        setTotalPages(Math.max(1, Math.ceil(list.length / effectiveLimit)))
        const start = (page - 1) * effectiveLimit
        setRows(list.slice(start, start + effectiveLimit))
      } else {
        setAllRows(null)
        setRows(list)
        const totalCount = Number(json.pagination?.total || 0) || list.length || 0
        setTotal(totalCount)
        // Always compute totalPages on the client using the current limit to avoid mismatches
        setTotalPages(Math.max(1, Math.ceil(totalCount / effectiveLimit)))
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
  }, [page, limit, sortOrder, sortBy, appliedSearch, appliedDateFrom, appliedDateTo, appliedMinCalls, appliedLanguage])
  
  // ensure we have languages list on first load
  useEffect(() => { if (languages.length === 0 && !loading) fetchData(false) }, [])

  // sync appliedType when user changes selector and clicks Apply
  useEffect(() => { setAppliedType(type) }, [type])

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

  const renderStatus = (value: any) => {
    const n = Number(value)
    const active = n === 1
    return (
      <span className={`inline-flex items-center justify-center w-8 h-6 text-xs font-semibold rounded ${active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
        {active ? 'On' : 'Off'}
      </span>
    )
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
                  placeholder="Creator name or ID"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min FTU Calls</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={minCalls}
                  onChange={(e) => { const v = parseInt(e.target.value, 10) || 0; setMinCalls(v) }}
                >
                  {[1,5,10,20,50].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={language}
                  onChange={(e) => { setLanguage(e.target.value) }}
                >
                  <option value="All">All</option>
                  {languages.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={type}
                  onChange={(e) => { setType(e.target.value) }}
                >
                  <option value="audio">Audio</option>
                  <option value="video">Video</option>
                  <option value="all">All</option>
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
                <button
                  onClick={() => {
                    // Reset inputs and applied filters to defaults
                    setSearch('')
                    setDateFrom('')
                    setDateTo('')
                    setMinCalls(10)
                    setLanguage('All')
                    setAppliedSearch('')
                    setAppliedDateFrom('')
                    setAppliedDateTo('')
                    setAppliedMinCalls(10)
                    setAppliedLanguage('All')
                    setPage(1)
                    setAllRows(null)
                    manualFetchRef.current = true
                    fetchData(false)
                  }}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded"
                >
                  Clear
                </button>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    // Apply current inputs
                    setAppliedSearch(search)
                    setAppliedDateFrom(dateFrom)
                    setAppliedDateTo(dateTo)
                    setAppliedMinCalls(minCalls)
                    setAppliedLanguage(language)
                    setAppliedType(type)
                    setPage(1)
                    setAllRows(null)
                    manualFetchRef.current = true
                    fetchData(false)
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded"
                >
                  Apply
                </button>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Audio</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Video</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <span>FTU Calls Count</span>
                      <button
                        type="button"
                        aria-label="Sort FTU calls asc"
                        className={`p-1 rounded ${sortBy==='ftu_calls_count' && sortOrder==='ASC' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                        onClick={() => { setSortBy('ftu_calls_count'); setSortOrder('ASC'); setPage(1); manualFetchRef.current = true; fetchData(false, 'ASC', undefined, 'ftu_calls_count') }}
                      >
                        <SortAsc className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Sort FTU calls desc"
                        className={`p-1 rounded ${sortBy==='ftu_calls_count' && sortOrder==='DESC' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                        onClick={() => { setSortBy('ftu_calls_count'); setSortOrder('DESC'); setPage(1); manualFetchRef.current = true; fetchData(false, 'DESC', undefined, 'ftu_calls_count') }}
                      >
                        <SortDesc className="h-4 w-4" />
                      </button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <span>Avg FTU/Day</span>
                      <button
                        type="button"
                        aria-label="Sort Avg FTU/Day asc"
                        className={`p-1 rounded ${sortBy==='avg_ftu_per_day' && sortOrder==='ASC' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                        onClick={() => { setSortBy('avg_ftu_per_day'); setSortOrder('ASC'); setPage(1); manualFetchRef.current = true; fetchData(false, 'ASC', undefined, 'avg_ftu_per_day') }}
                      >
                        <SortAsc className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Sort Avg FTU/Day desc"
                        className={`p-1 rounded ${sortBy==='avg_ftu_per_day' && sortOrder==='DESC' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                        onClick={() => { setSortBy('avg_ftu_per_day'); setSortOrder('DESC'); setPage(1); manualFetchRef.current = true; fetchData(false, 'DESC', undefined, 'avg_ftu_per_day') }}
                      >
                        <SortDesc className="h-4 w-4" />
                      </button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <span>Repeat Callers</span>
                      <button
                        type="button"
                        aria-label="Sort Repeat Callers asc"
                        className={`p-1 rounded ${sortBy==='repeat_callers_count' && sortOrder==='ASC' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                        onClick={() => { setSortBy('repeat_callers_count'); setSortOrder('ASC'); setPage(1); manualFetchRef.current = true; fetchData(false, 'ASC', undefined, 'repeat_callers_count') }}
                      >
                        <SortAsc className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Sort Repeat Callers desc"
                        className={`p-1 rounded ${sortBy==='repeat_callers_count' && sortOrder==='DESC' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                        onClick={() => { setSortBy('repeat_callers_count'); setSortOrder('DESC'); setPage(1); manualFetchRef.current = true; fetchData(false, 'DESC', undefined, 'repeat_callers_count') }}
                      >
                        <SortDesc className="h-4 w-4" />
                      </button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <span>Avg Duration</span>
                      <button
                        type="button"
                        aria-label="Sort ascending"
                        className={`p-1 rounded ${sortBy==='avg_ftu_duration_seconds' && sortOrder === 'ASC' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                        onClick={() => {
                          if (sortBy !== 'avg_ftu_duration_seconds' || sortOrder !== 'ASC') {
                            setPage(1)
                            setSortBy('avg_ftu_duration_seconds')
                            setSortOrder('ASC')
                            manualFetchRef.current = true
                            fetchData(true, 'ASC', undefined, 'avg_ftu_duration_seconds')
                          }
                        }}
                      >
                        <SortAsc className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Sort descending"
                        className={`p-1 rounded ${sortBy==='avg_ftu_duration_seconds' && sortOrder === 'DESC' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                        onClick={() => {
                          if (sortBy !== 'avg_ftu_duration_seconds' || sortOrder !== 'DESC') {
                            setPage(1)
                            setSortBy('avg_ftu_duration_seconds')
                            setSortOrder('DESC')
                            manualFetchRef.current = true
                            fetchData(true, 'DESC', undefined, 'avg_ftu_duration_seconds')
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
                    <td className="px-4 py-2 text-sm text-gray-900">{r.language || '-'}</td>
                    <td className="px-4 py-2 text-sm">{renderStatus(r.audio_status)}</td>
                    <td className="px-4 py-2 text-sm">{renderStatus(r.video_status)}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{r.ftu_calls_count}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{typeof r.avg_ftu_per_day === 'number' ? r.avg_ftu_per_day.toFixed(2) : '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{typeof r.repeat_callers_count === 'number' ? r.repeat_callers_count : '-'}</td>
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
              <select
                value={limit}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10)
                  setLimit(n)
                  setPage(1)
                  // Always refetch from server for page-size changes to keep counts/pages consistent
                  setAllRows(null)
                  manualFetchRef.current = true
                  fetchData(false, undefined, n)
                }}
                className="border rounded px-2 py-2 text-sm"
              >
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


