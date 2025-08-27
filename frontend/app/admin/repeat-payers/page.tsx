'use client'

import { useEffect, useState } from 'react'
import { LineChart as LC, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import { Calendar, RefreshCw, LineChart } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || ''

interface Point {
  hour: number
  total_payments: number
  repeat_payments: number
  repeat_payers: number
}

export default function RepeatPayersPage() {
  const [date, setDate] = useState('')
  const [data, setData] = useState<Point[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState({ total: 0, repeatPayments: 0, repeatPayers: 0 })

  useEffect(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    setDate(`${yyyy}-${mm}-${dd}`)
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ date })
      const base = API_BASE || ''
      const res = await fetch(`${base}/api/admin/repeat-payers-by-time?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json.data || [])
      setSummary({
        total: json.summary?.totalPayments || 0,
        repeatPayments: json.summary?.repeatPayments || 0,
        repeatPayers: json.summary?.repeatPayers || 0
      })
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (date) fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center"><LineChart className="h-6 w-6 mr-2 text-indigo-600"/>Repeat Payers by Time</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white border rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="pl-10 pr-3 py-2 border rounded-md w-full focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchData} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded flex items-center"><RefreshCw className="h-4 w-4 mr-2"/>Refresh</button>
            </div>
            <div className="text-sm text-gray-700">Total payments: <b>{summary.total}</b></div>
            <div className="text-sm text-gray-700">Repeat payers: <b>{summary.repeatPayers}</b> | Repeat payments: <b>{summary.repeatPayments}</b></div>
          </div>
        </div>

        <div className="bg-white border rounded-lg shadow-sm p-4">
          {error ? (
            <div className="text-red-600">{error}</div>
          ) : loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : (
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <LC data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
                  <YAxis allowDecimals={false} />
                  <Tooltip labelFormatter={(h) => `Hour ${h}:00`} />
                  <Legend />
                  <Line type="monotone" dataKey="total_payments" name="Total payments" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="repeat_payments" name="Repeat payments" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="repeat_payers" name="Repeat payers" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LC>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


