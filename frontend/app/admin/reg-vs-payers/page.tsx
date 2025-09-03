'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { BarChart3, RefreshCw, Filter } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Row {
  date_period: string
  registrations: number
  payers: number
}

interface ApiResponse {
  data: Row[]
  filters: { dateFrom?: string; dateTo?: string }
  summary: { totalDays: number; totalRegistrations: number; totalPayers: number }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || ''

export default function RegVsPayersPage() {
  const [showFilters, setShowFilters] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [languageTrends, setLanguageTrends] = useState<any[]>([])
  const [tableDate, setTableDate] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(20)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const base = API_BASE || `${window.location.protocol}//${window.location.hostname}:3001`
      const res = await fetch(`${base}/api/admin/daily-registrations-vs-payers?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: any = await res.json()
      setRows(json.data || [])
      setLanguageTrends((json as any).languageTrends || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null
    const registrations = Number(payload.find((p: any) => p.dataKey === 'registrations')?.value ?? 0)
    const payers = Number(payload.find((p: any) => p.dataKey === 'payers')?.value ?? 0)
    const pct = registrations > 0 ? ((payers / registrations) * 100).toFixed(2) : '0.00'
    return (
      <div className="bg-white border rounded-lg shadow p-3">
        <div className="text-gray-900 font-medium mb-1">{label}</div>
        <div className="text-emerald-600 text-sm">Registered users : {registrations}</div>
        <div className="text-blue-600 text-sm">Paying users : {payers}</div>
        <div className="text-gray-600 text-xs mt-1">{pct}% of registered</div>
      </div>
    )
  }

  const formatted = useMemo(() => {
    return (rows || []).map(r => ({
      ...r,
      label: new Date(r.date_period).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }))
  }, [rows])

  const languageSeries = useMemo(() => {
    // languageTrends: [{ date_period, language, payers }]
    const found = new Set(languageTrends.map(l => l.language))
    const preferred = ['Tamil','Telugu','Kannada','Malayalam','Hindi','Punjabi']
    const langs = [
      ...preferred.filter(p => found.has(p)),
      ...Array.from(found).filter(l => !preferred.includes(l))
    ]
    const normalizeDateKey = (val: any) => {
      try {
        const d = new Date(val)
        if (!isNaN(d.getTime())) return d.toISOString().slice(0,10)
      } catch (e) {}
      return String(val)
    }

    // collect all dates from rows (normalized to YYYY-MM-DD)
    const dates = (rows || []).map(r => normalizeDateKey(r.date_period))
    const map: Record<string, any> = {}
    dates.forEach(d => {
      map[d] = { date_period: d }
      // initialize zeros for all languages so chart scales correctly
      langs.forEach(l => { map[d][l] = 0 })
    })
    languageTrends.forEach((item: any) => {
      const key = normalizeDateKey(item.date_period)
      map[key] = map[key] || { date_period: key }
      map[key][item.language] = Number(item.payers || 0)
      // also expose registrations and percent if provided
      if (typeof item.registrations !== 'undefined') map[key][`${item.language}_registrations`] = Number(item.registrations || 0)
      if (typeof item.registrations !== 'undefined') {
        const regs = Number(item.registrations || 0)
        const pays = Number(item.payers || 0)
        map[key][`${item.language}_pay_percent`] = regs > 0 ? ((pays / regs) * 100).toFixed(2) : '0.00'
      }
    })
    // produce array with label
    const out = Object.values(map).sort((a: any, b: any) => (a.date_period < b.date_period ? -1 : 1)).map((r: any) => ({
      ...r,
      label: new Date(r.date_period).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }))
    return { langs, data: out }
  }, [languageTrends, rows])

  const LANG_PALETTE = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#A78BFA']
  const getLangColor = (lng: string) => {
    const idx = (languageSeries.langs || []).indexOf(lng)
    return LANG_PALETTE[idx % LANG_PALETTE.length] || '#6B7280'
  }
  const pctClass = (pct: number) => {
    // User requested: percentage below 10 => red, 10 or above => green
    if (pct < 10) return 'bg-red-100 text-red-800'
    return 'bg-green-100 text-green-800'
  }

  const displayedLangData = useMemo(() => {
    let data = (languageSeries.data || []).slice()
    // sort by date descending (recent first)
    data.sort((a: any, b: any) => (a.date_period < b.date_period ? 1 : -1))
    if (tableDate) {
      return data.filter((r: any) => String(r.date_period) === String(tableDate)).slice(0, rowsPerPage)
    }
    if (rowsPerPage) {
      return data.slice(0, rowsPerPage)
    }
    return data
  }, [languageSeries, tableDate, rowsPerPage])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading registrations vs payers...</p>
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
          <button onClick={fetchData} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Retry</button>
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
              <h1 className="text-2xl font-bold text-gray-900">Registrations vs Paying Users</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded flex items-center"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
              <button onClick={fetchData} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                <RefreshCw className="h-4 w-4 mr-2 inline" /> Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date from (optional)</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date to (optional)</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-end">
                <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">Clear</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily counts</h3>
          <ResponsiveContainer width="100%" height={420}>
            <LineChart data={formatted}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="registrations" stroke="#10B981" strokeWidth={2} name="Registered users" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="payers" stroke="#3B82F6" strokeWidth={2} name="Paying users" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Language-wise paying users as table */}
        <div className="bg-white shadow rounded-lg p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Paying users by Language</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Date</label>
                <input type="date" value={tableDate} onChange={(e) => setTableDate(e.target.value)} className="px-2 py-1 border rounded" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Rows</label>
                <select value={rowsPerPage} onChange={(e) => setRowsPerPage(parseInt(e.target.value || '20', 10))} className="px-2 py-1 border rounded">
                  {[10,20,50,100].map(n => (<option key={n} value={n}>{n}</option>))}
                </select>
              </div>
              <button onClick={() => {
                // export CSV of displayed data (handled below)
                const header = ['Date', ...languageSeries.langs]
                const lines = [header]
                const dataToExport = displayedLangData
                dataToExport.forEach((r: any) => {
                  const row = [r.label, ...languageSeries.langs.map((l: string) => String(r[l] ?? 0))]
                  lines.push(row)
                })
                const csv = lines.map(cols => cols.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `reg_vs_payers_by_language_${new Date().toISOString().slice(0,10)}.csv`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
              }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded">Export CSV</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th rowSpan={2} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  {languageSeries.langs.map((lng: string) => (
                    <th key={lng} colSpan={3} className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider"
                        style={{ backgroundColor: getLangColor(lng), color: '#fff' }}>
                      {lng}
                    </th>
                  ))}
                </tr>
                <tr>
                  {languageSeries.langs.map((lng: string) => (
                    <>
                      <th key={`${lng}-count`} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                      <th key={`${lng}-regs`} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regs</th>
                      <th key={`${lng}-pct`} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">%</th>
                    </>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedLangData.length === 0 ? (
                  <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={Math.max(1, languageSeries.langs.length + 1)}>No data</td></tr>
                ) : (
                  displayedLangData.map((r: any) => (
                    <tr key={r.date_period} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-900">{r.label}</td>
                      {languageSeries.langs.map((lng: string, idx: number) => {
                        const pct = Number(r[`${lng}_pay_percent`] ?? 0)
                        return (
                          <React.Fragment key={lng}>
                            <td className="px-3 py-2 text-sm text-gray-900"><span style={{color:getLangColor(lng),fontWeight:600}}>{Number(r[lng] ?? 0)}</span></td>
                            <td className="px-3 py-2 text-sm text-gray-900">{Number(r[`${lng}_registrations`] ?? 0)}</td>
                            <td className="px-3 py-2 text-sm"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${pctClass(pct)}`}>{pct}%</span></td>
                          </React.Fragment>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
