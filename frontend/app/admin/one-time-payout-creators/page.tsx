"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Wallet } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function OneTimePayoutCreatorsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), dateFrom, dateTo })
      const res = await fetch(`${API_BASE}/api/admin/one-time-payout-creators?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      // Ensure default ordering: latest withdrawal datetime first
      const creators: any[] = Array.isArray(json.creators) ? json.creators.slice() : []
      creators.sort((a: any, b: any) => {
        const ta = a?.datetime ? new Date(a.datetime).getTime() : 0
        const tb = b?.datetime ? new Date(b.datetime).getTime() : 0
        return tb - ta
      })
      setRows(creators)
      setTotal(json.pagination?.total || 0)
      setTotalPages(json.pagination?.totalPages || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [page, limit])

  const exportCsv = () => {
    const header = ['User ID','Name','Mobile','Language','Withdrawal ID','Amount','Withdrawal Datetime']
    const lines = [header]
    rows.forEach(r => {
      lines.push([
        r.user_id,
        r.name || '',
        r.mobile || '',
        r.language || '',
        r.withdrawal_id,
        Number(r.amount||0).toFixed(2),
        r.datetime || ''
      ].map(v => String(v).replace(/"/g, '""')))
    })
    const csv = lines.map(cols => cols.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `one_time_payout_creators_${new Date().toISOString().slice(0,10)}.csv`
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center"><Wallet className="h-6 w-6 mr-2 text-indigo-600"/>One-time Payout Creators</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white border rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className="px-3 py-2 border rounded-md w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className="px-3 py-2 border rounded-md w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rows</label>
              <select value={limit} onChange={(e)=>{ setLimit(parseInt(e.target.value||'20',10)); setPage(1) }} className="px-3 py-2 border rounded-md w-full">
                {[20,50,100,200].map(n=> <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={()=>{ setPage(1); fetchData() }} className="bg-indigo-600 text-white px-4 py-2 rounded">Apply</button>
              <button onClick={()=>{ setDateFrom(''); setDateTo(''); setPage(1); fetchData() }} className="bg-gray-600 text-white px-4 py-2 rounded">Clear</button>
              <button onClick={() => exportCsv()} className="bg-emerald-600 text-white px-4 py-2 rounded">Export CSV</button>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creator</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Language</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date / Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={5}>Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={5}>No data</td></tr>
              ) : rows.map(r => (
                <tr key={r.withdrawal_id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 text-sm text-gray-900">{r.name || '-'}</td>
                  <td className="px-3 py-3 text-sm text-gray-900">{r.mobile || '-'}</td>
                  <td className="px-3 py-3 text-sm text-gray-900">{r.language || '-'}</td>
                  <td className="px-3 py-3 text-sm text-gray-900">{Number(r.amount||0).toFixed(2)}</td>
                  <td className="px-3 py-3 text-xs text-gray-500">{r.datetime ? new Date(r.datetime).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

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


