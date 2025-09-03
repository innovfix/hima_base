"use client"

import { useEffect, useState } from 'react'
import { Users, Download } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const DAYS_OPTIONS = [3,7,15]

export default function InactiveCreatorsPage(){
  const [days, setDays] = useState<number>(7)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [page, setPage] = useState<number>(1)
  const [limit, setLimit] = useState<number>(20)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [total, setTotal] = useState<number>(0)

  const fetchData = async () => {
    try{
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ days: String(days), page: String(page), limit: String(limit), language })
      const res = await fetch(`${API_BASE}/api/admin/inactive-creators?${params.toString()}`)
      if(!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setRows(json.creators || [])
      setLanguages(json.languages || [])
      if (json.pagination) {
        setTotal(json.pagination.total || 0)
        setTotalPages(json.pagination.totalPages || 1)
        setPage(json.pagination.page || 1)
      }
    }catch(e:any){ setError(e?.message || 'Failed') }finally{ setLoading(false) }
  }

  useEffect(()=>{ fetchData() }, [days, language, page, limit])

  const exportCsv = () => {
    const header = ['User ID','Name','Mobile','Language','Last Call','Last Audio Update','Last Video Update']
    const lines = [header]
    rows.forEach(r => {
      lines.push([r.id, r.name||'', r.mobile||'', r.language||'', r.last_call||'', r.last_audio_time_updated||'', r.last_video_time_updated||''])
    })
    const csv = lines.map(cols => cols.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inactive_creators_days_${days}_${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center"><Users className="h-6 w-6 mr-2 text-indigo-600"/>Inactive Creators</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white border rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Days</label>
            <select value={days} onChange={(e)=>setDays(parseInt(e.target.value,10))} className="px-3 py-2 border rounded">
              {DAYS_OPTIONS.map(d=> <option key={d} value={d}>{d} days</option>)}
            </select>

            <label className="text-sm font-medium">Language</label>
            <select value={language} onChange={(e)=>setLanguage(e.target.value)} className="px-3 py-2 border rounded">
              <option value="">All</option>
              {languages.map(l=> <option key={l} value={l}>{l}</option>)}
            </select>

            <label className="text-sm font-medium">Rows</label>
            <select value={limit} onChange={(e)=>{ setLimit(parseInt(e.target.value||'20',10)); setPage(1) }} className="px-3 py-2 border rounded">
              {[10,20,50,100,200].map(n => <option key={n} value={n}>{n}</option>)}
            </select>

            <button onClick={() => { setPage(1); fetchData() }} className="bg-indigo-600 text-white px-3 py-2 rounded">Apply</button>
            <button onClick={exportCsv} className="bg-emerald-600 text-white px-3 py-2 rounded inline-flex items-center gap-2"><Download className="h-4 w-4"/>Export CSV</button>
          </div>
        </div>

        <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Call</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Audio Update</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Video Update</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">Loading...</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-red-600">{error}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">No data</td></tr>
              ) : (
                rows.map((r:any)=> (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-sm text-gray-900">{r.id}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{r.name||'-'}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{r.mobile||'-'}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{r.language||'-'}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{r.last_call ? new Date(r.last_call).toLocaleString() : 'Never'}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{r.last_audio_time_updated ? new Date(r.last_audio_time_updated).toLocaleString() : '-'}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{r.last_video_time_updated ? new Date(r.last_video_time_updated).toLocaleString() : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-gray-700 bg-white mt-3">
            <div>Showing page {page} of {totalPages} ({total} results)</div>
            <div className="flex gap-2">
              <button onClick={() => { setPage((p) => Math.max(1, p - 1)) }} disabled={page <= 1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
              <button onClick={() => { setPage((p) => Math.min(totalPages, p + 1)) }} disabled={page >= totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


