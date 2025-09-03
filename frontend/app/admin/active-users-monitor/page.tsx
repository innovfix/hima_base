"use client"

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Globe, Headphones, Video } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function ActiveUsersMonitorPage(){
  const getToday = () => new Date().toISOString().slice(0,10)
  const [type, setType] = useState<'audio'|'video'>('audio')
  const [groupBy, setGroupBy] = useState<'hour'|'day'|'minute'>('hour')
  const [dateFrom, setDateFrom] = useState(getToday())
  const [dateTo, setDateTo] = useState('')
  const [series, setSeries] = useState<any[]>([])
  const [periods, setPeriods] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    try{
      setLoading(true)
      const params = new URLSearchParams({ type, groupBy })
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await fetch(`${API_BASE}/api/admin/active-users-monitor?${params.toString()}`)
      const json = await res.json()
      const periodsResp = json.periods || []
      // Sort series by total value (highest -> lowest)
      const seriesResp: any[] = (json.series || []).map((s: any) => ({
        ...s,
        _total: (s.data || []).reduce((sum: number, d: any) => sum + Number(d.value || 0), 0)
      })).sort((a: any, b: any) => (b._total - a._total))
      setPeriods(periodsResp)
      setSeries(seriesResp)
    }finally{ setLoading(false) }
  }

  useEffect(()=>{ fetchData() }, [type, groupBy, dateFrom, dateTo])

  // Build recharts data: one object per period, keys per language
  const chartData = periods.map((p:string) => {
    const obj: any = { period: p }
    series.forEach(s => { const v = s.data.find((d:any)=>d.period===p); obj[s.language] = v ? v.value : 0 })
    return obj
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center"><Globe className="h-6 w-6 mr-2 text-indigo-600"/>Active Users Monitor</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white border rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Type</label>
            <select value={type} onChange={(e)=>setType(e.target.value as any)} className="px-3 py-2 border rounded">
              <option value="audio">Audio</option>
              <option value="video">Video</option>
            </select>

            <label className="text-sm font-medium">Aggregate</label>
            <select value={groupBy} onChange={(e)=>setGroupBy(e.target.value as any)} className="px-3 py-2 border rounded">
              <option value="minute">Per Minute</option>
              <option value="hour">Hourly</option>
              <option value="day">Daily</option>
            </select>

            <label className="text-sm font-medium">From</label>
            <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className="px-3 py-2 border rounded" />
            <label className="text-sm font-medium">To</label>
            <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className="px-3 py-2 border rounded" />

            <button onClick={fetchData} className="bg-indigo-600 text-white px-3 py-2 rounded">Apply</button>
          </div>
        </div>

        <div className="bg-white border rounded-lg shadow-sm p-4">
          {loading ? <div className="text-center py-20">Loading...</div> : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                {series.map(s => (
                  <Line key={s.language} type="monotone" dataKey={s.language} stroke={"#" + Math.floor(Math.random()*16777215).toString(16)} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}


