'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, Download, Search, Wallet } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const getToday = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface PayoutRow {
  id: number
  user_id: number
  name: string
  mobile: string
  language?: string | null
  amount: number
  status?: string | number | null
  method?: string | null
  txn_id?: string | null
  created_at: string
  updated_at?: string
}

export default function CreatorsPayoutsPage() {
  const [rows, setRows] = useState<PayoutRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')

  const [search, setSearch] = useState('')
  const [language, setLanguage] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [distinct, setDistinct] = useState(false)
  const [summary, setSummary] = useState<any>(null)

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
        language,
        status,
        dateFrom,
        dateTo,
        distinct: distinct ? '1' : '0'
      })
      const base = API_BASE || ''
      const res = await fetch(`${base}/api/admin/creators-payouts?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setRows(json.payouts || [])
      setTotal(json.pagination?.total || 0)
      setTotalPages(json.pagination?.totalPages || 1)
      if (Array.isArray(json.languages)) setLanguages(json.languages)
      setSummary(json.summary || null)
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

  const renderStatusBadge = (value: any) => {
    const n = Number(value)
    let label = 'Unpaid'
    let cls = 'bg-red-100 text-red-800'
    if (n === 1) { label = 'Paid'; cls = 'bg-green-100 text-green-800' }
    else if (n === 2) { label = 'Cancelled'; cls = 'bg-yellow-100 text-yellow-800' }
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cls}`}>{label}</span>
    )
  }

  const exportCsv = () => {
    const header = distinct
      ? ['User ID','Name','Mobile','Language','Payouts Count','Total Amount','First Payout','Last Payout']
      : ['ID','User ID','Name','Mobile','Language','Amount','Status','Created At']
    const lines = [header]
    rows.forEach((r: any) => {
      if (distinct) {
        lines.push([
          r.user_id,
          r.name || '',
          r.mobile || '',
          r.language || '',
          r.payouts_count ?? 0,
          r.total_amount ?? 0,
          r.first_payout_at || '',
          r.last_payout_at || '',
        ].map(v => String(v).replace(/"/g, '""')))
      } else {
        lines.push([
          r.id,
          r.user_id,
          r.name || '',
          r.mobile || '',
          r.language || '',
          r.amount ?? 0,
          r.status ?? '',
          r.created_at,
        ].map(v => String(v).replace(/"/g, '""')))
      }
    })
    const csv = lines.map(cols => cols.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `creators_payouts_${distinct ? 'distinct_' : ''}${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const SORT_LABELS_TXN: Record<string, string> = {
    id: 'ID',
    name: 'Creator',
    mobile: 'Mobile',
    language: 'Language',
    amount: 'Amount',
    status: 'Status',
    created_at: 'Created At',
  }
  const SORT_LABELS_DISTINCT: Record<string, string> = {
    user_id: 'User ID',
    name: 'Creator',
    mobile: 'Mobile',
    language: 'Language',
    payouts_count: 'Payouts',
    total_amount: 'Total Amount',
    last_payout_at: 'Last Payout',
  }
  const SORT_LABELS: Record<string, string> = distinct ? SORT_LABELS_DISTINCT : SORT_LABELS_TXN

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center"><Wallet className="h-6 w-6 mr-2 text-indigo-600"/>Creators Payouts</h1>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Distinct users</label>
              <label className="inline-flex items-center gap-2 select-none">
                <input type="checkbox" className="h-4 w-4" checked={distinct} onChange={(e) => { setPage(1); setDistinct(e.target.checked) }} />
                <span className="text-sm text-gray-700">Group by user</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select
                className="px-3 py-2 border rounded-md w-full focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="">All</option>
                {languages.map((lng) => (
                  <option key={lng} value={lng}>{lng}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="px-3 py-2 border rounded-md w-full focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="0">Unpaid</option>
                <option value="1">Paid</option>
                <option value="2">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="date" className="pl-10 pr-3 py-2 border rounded-md w-full focus:ring-indigo-500 focus:border-indigo-500"
                       value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Rows</label>
              <select
                className="px-3 py-2 border rounded-md w-full focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                value={limit}
                onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value || '20', 10)) }}
              >
                {[20,50,100,200,500,1000].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => { setPage(1); fetchData() }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">Apply</button>
            <button onClick={() => { setSearch(''); setLanguage(''); setStatus(''); setDistinct(false); setDateFrom(''); setDateTo(''); setLimit(20); setPage(1); fetchData() }} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">Clear</button>
            <button onClick={exportCsv} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded inline-flex items-center gap-2"><Download className="h-4 w-4"/>Export CSV</button>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {distinct ? (
              <>
                <div className="bg-white border rounded-lg p-4">
                  <div className="text-sm text-gray-500">Paying Users</div>
                  <div className="text-2xl font-semibold text-gray-900">{Number(summary.totalUsers || 0)}</div>
                  <div className="text-xs text-gray-500 mt-1">{summary.payingPercentage ?? '0.00'}% of total creators</div>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="text-sm text-gray-500">Total Creators</div>
                  <div className="text-2xl font-semibold text-gray-900">{Number(summary.totalAllUsers || 0)}</div>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="text-sm text-gray-500">Total Amount</div>
                  <div className="text-2xl font-semibold text-gray-900">{Number(summary.totalAmount || 0).toFixed(2)}</div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white border rounded-lg p-4">
                  <div className="text-sm text-gray-500">Total Payouts</div>
                  <div className="text-2xl font-semibold text-gray-900">{Number(summary.totalPayouts || 0)}</div>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="text-sm text-gray-500">Total Amount</div>
                  <div className="text-2xl font-semibold text-gray-900">{Number(summary.totalAmount || 0).toFixed(2)}</div>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="text-sm text-gray-500">&nbsp;</div>
                  <div className="text-2xl font-semibold text-gray-900">&nbsp;</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Table */}
        <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {Object.entries(SORT_LABELS).map(([key, label]) => (
                  <th key={key}
                      onClick={() => handleSort(key)}
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none">
                    {label}
                    {sortBy === key && (
                      <span className="ml-1 text-[10px] align-middle">{sortOrder === 'ASC' ? '▲' : '▼'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={8}>Loading...</td></tr>
              ) : error ? (
                <tr><td className="px-3 py-6 text-center text-red-600" colSpan={8}>{error}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={8}>No data</td></tr>
              ) : (
                rows.map((r: any) => (
                  <tr key={distinct ? r.user_id : r.id} className="hover:bg-gray-50">
                    {distinct ? (
                      <>
                        <td className="px-3 py-3 text-sm text-gray-900">{r.user_id}</td>
                        <td className="px-3 py-3 text-sm text-gray-900">{r.name || '-'}</td>
                        <td className="px-3 py-3 text-sm text-gray-900">{r.mobile || '-'}</td>
                        <td className="px-3 py-3 text-sm text-gray-900">{r.language || '-'}</td>
                        <td className="px-3 py-3 text-sm text-gray-900">{Number(r.payouts_count || 0)}</td>
                        <td className="px-3 py-3 text-sm text-gray-900">{Number(r.total_amount || 0).toFixed(2)}</td>
                        <td className="px-3 py-3 text-xs text-gray-500">{r.last_payout_at ? new Date(r.last_payout_at).toLocaleString() : '-'}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-3 text-sm text-gray-900">{r.id}</td>
                        <td className="px-3 py-3 text-sm text-gray-900">{r.name || '-'}</td>
                        <td className="px-3 py-3 text-sm text-gray-900">{r.mobile || '-'}</td>
                        <td className="px-3 py-3 text-sm text-gray-900">{r.language || '-'}</td>
                        <td className="px-3 py-3 text-sm text-gray-900">{Number(r.amount || 0).toFixed(2)}</td>
                        <td className="px-3 py-3 text-sm text-gray-900">{renderStatusBadge(r.status)}</td>
                        <td className="px-3 py-3 text-xs text-gray-500">{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                      </>
                    )}
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


