'use client'

import { useEffect, useState } from 'react'
import { BarChart3, RefreshCw } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || ''

export default function RegsPaidByLanguagePage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))

  const fetchData = async () => {
    try {
      setLoading(true)
      const base = API_BASE || `${window.location.protocol}//${window.location.hostname}:3001`
      const res = await fetch(`${base}/api/admin/registrations-paid-by-language?dateFrom=${date}&dateTo=${date}`)
      if (!res.ok) throw new Error('API error')
      const json = await res.json()
      setData(json.data || [])
    } catch (err) {
      console.error(err)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [date])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Registrations Paid Today (by language)</h1>
            </div>
            <div className="flex items-center space-x-3">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border px-2 py-1 rounded" />
              <button onClick={fetchData} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded flex items-center">
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-16">Loading...</div>
        ) : data.length === 0 ? (
          <div className="text-center py-16">No data for selected date</div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="language" type="category" />
                <Tooltip />
                <Legend />
                <Bar dataKey="registrations" fill="#60A5FA" name="Registrations" />
                <Bar dataKey="paidUsers" fill="#34D399" name="Paid Users" />
                <Bar dataKey="totalPaid" fill="#F97316" name="Total Paid (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}




