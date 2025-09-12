"use client"

import { useState, useEffect } from 'react'

export default function SendReportPage() {
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)

  async function sendReport() {
    setLoading(true)
    setStatus('')
    try {
      // Call backend directly (same host, backend runs on port 3001)
      const backendBase = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : ''
      const res = await fetch(backendBase + '/api/admin/send-daily-report', { method: 'POST' })
      let json: any = {}
      try {
        json = await res.json()
      } catch (e) {
        // non-JSON response
        json = { message: res.statusText }
      }
      if (res.ok) setStatus('Report sent')
      else setStatus('Error: ' + (json?.message || res.statusText))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setStatus('Network error: ' + msg)
      setErrorDetails(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    function onError(ev: ErrorEvent) {
      const msg = `${ev.message} at ${ev.filename}:${ev.lineno}:${ev.colno}`
      setErrorDetails(msg + (ev.error && ev.error.stack ? '\n' + ev.error.stack : ''))
      // report to backend
      try {
        fetch((typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : '') + '/api/admin/client-error', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'error', message: msg, stack: ev.error && ev.error.stack ? ev.error.stack : null, userAgent: navigator.userAgent })
        })
      } catch (e) {}
    }
    function onRejection(ev: PromiseRejectionEvent) {
      const r = ev.reason
      const msg = typeof r === 'string' ? r : (r && r.message) || JSON.stringify(r)
      const stack = r && r.stack ? '\n' + r.stack : ''
      setErrorDetails('UnhandledRejection: ' + msg + stack)
      try {
        fetch((typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : '') + '/api/admin/client-error', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'unhandledrejection', message: msg, stack: r && r.stack ? r.stack : null, userAgent: navigator.userAgent })
        })
      } catch (e) {}
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <h2>Send Daily Payments Report</h2>
      <p>Click the button to send today's collection and language-wise breakdown to Slack.</p>
      <button onClick={sendReport} disabled={loading} style={{ padding: '8px 12px', marginTop: 8 }}>
        {loading ? 'Sending…' : 'Send Report Now'}
      </button>
      {status && <div style={{ marginTop: 12 }}>{status}</div>}
      {errorDetails && (
        <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap', color: 'crimson' }}>{errorDetails}</pre>
      )}
    </div>
  )
}


