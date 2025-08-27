'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, RefreshCw, Filter, Search, ChevronLeft, ChevronRight, SortAsc, SortDesc } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type SortOrder = 'ASC' | 'DESC'

type CreatorRow = {
  id: number
  name: string
  mobile: string
  gender: string | null
  created_at: string
  total_transactions: number
  // backend fields
  sum_income_tx: number | string | null
  users_total_income: number | string | null
  total_income_effective: number | string | null
  avg_income_amount: number | string | null
  first_income_date: string | null
  last_income_date: string | null
}

type ApiResponse = {
  creators: CreatorRow[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  filters: {
    search: string
    dateFrom: string
    dateTo: string
  }
  sorting: {
    sortBy: string
    sortOrder: SortOrder
  }
  summary: {
    totalCreators: number
    totalIncome: number
    totalTransactions: number
    avgIncomePerCreator: number
  }
}

export default function CreatorsIncomePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<CreatorRow[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState<'total_income_effective' | 'total_transactions' | 'avg_income_amount' | 'last_income_date' | 'first_income_date' | 'name' | 'mobile' | 'id'>('total_income_effective')
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC')
  const [showFilters, setShowFilters] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortOrder)
      if (search) params.set('search', search)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const base = API_BASE || ''
      const res = await fetch(`${base}/api/admin/creators-income?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: ApiResponse = await res.json()
      setRows(json.creators || [])
      setTotal(json.pagination.total)
      setTotalPages(json.pagination.totalPages)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, sortBy, sortOrder])

  const toggleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'))
    } else {
      setSortBy(column)
      setSortOrder('DESC')
    }
  }

  const formatDateTime = (val: string | null) => {
    if (!val) return '-'
    const d = new Date(val)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const toNumber = (v: any) => (v == null ? 0 : Number(v))
  const formatINR = (n: any) => `₹${Number(n || 0).toFixed(2)}`

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Creators Income</h1>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchData() } }}
                  placeholder="Search name or mobile"
                  className="pl-9 pr-3 py-2 border rounded w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button onClick={() => { setPage(1); fetchData() }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded flex items-center">
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </button>
              <button onClick={() => setShowFilters(!showFilters)} className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded flex items-center">
                <Filter className="h-4 w-4 mr-2" /> {showFilters ? 'Hide' : 'Show'} Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-gray-600">Loading creators income...</p>
        </div>
      ) : error ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="overflow-x-auto bg-white shadow rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { key: 'id', label: 'ID' },
                    { key: 'name', label: 'Name' },
                    { key: 'mobile', label: 'Mobile' },
                    { key: 'total_income_effective', label: 'Total Income (₹)' },
                    { key: 'total_transactions', label: 'Txn Count' },
                    { key: 'avg_income_amount', label: 'Avg Income (₹)' },
                    { key: 'first_income_date', label: 'First Income' },
                    { key: 'last_income_date', label: 'Last Income' },
                    { key: 'created_at', label: 'Registered On' },
                  ].map((col) => (
                    <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        className="inline-flex items-center gap-1 hover:text-gray-900"
                        onClick={() => toggleSort(col.key as any)}
                        title={`Sort by ${col.label}`}
                      >
                        <span>{col.label}</span>
                        {sortBy === (col.key as any) ? (
                          sortOrder === 'ASC' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                        ) : null}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={9}>No data found</td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">{r.id}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{r.name || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{r.mobile || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{formatINR(toNumber(r.total_income_effective) || toNumber(r.sum_income_tx) || toNumber(r.users_total_income))}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{r.total_transactions || 0}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{formatINR(toNumber(r.avg_income_amount))}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{formatDateTime(r.first_income_date)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{formatDateTime(r.last_income_date)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{formatDateTime(r.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {page} of {totalPages} · {total} creators
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 border rounded disabled:opacity-50 flex items-center"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </button>
              <select
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1) }}
                className="border rounded px-2 py-2 text-sm"
              >
                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
              </select>
              <button
                className="px-3 py-2 border rounded disabled:opacity-50 flex items-center"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
