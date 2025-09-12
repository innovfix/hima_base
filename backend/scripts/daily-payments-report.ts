import { createPool } from 'mysql2/promise'
import fetch from 'node-fetch'

async function main() {
  const pool = createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || process.env.DB_USERNAME || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.DB_DATABASE || 'himabase',
    connectionLimit: 2,
  })

  // Total collection today (server date)
  const [totalRows]: any = await pool.query(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'add_coins' AND DATE(datetime) = CURDATE()`
  )
  const total = Number(totalRows[0]?.total || 0)

  // Language-wise breakdown
  const [langRows]: any = await pool.query(
    `SELECT COALESCE(u.language,'Unknown') as language, COALESCE(SUM(t.amount),0) as total_amount, COUNT(t.id) as transactions_count
     FROM transactions t
     LEFT JOIN users u ON u.id = t.user_id
     WHERE t.type = 'add_coins' AND DATE(t.datetime) = CURDATE()
     GROUP BY COALESCE(u.language,'Unknown') ORDER BY total_amount DESC`
  )

  const reportLines = []
  reportLines.push(`Daily collection report for ${new Date().toISOString().slice(0,10)}`)
  reportLines.push(`Total collection: ₹${total}`)
  reportLines.push('By language:')
  langRows.forEach((r: any) => {
    reportLines.push(`- ${r.language}: ₹${Number(r.total_amount||0)} (${r.transactions_count} tx)`)
  })

  const text = reportLines.join('\n')

  const webhook = process.env.SLACK_WEBHOOK_URL
  if (!webhook) {
    console.warn('SLACK_WEBHOOK_URL not set — skipping Slack report')
    await pool.end()
    return
  }

  await fetch(webhook, { method: 'POST', body: JSON.stringify({ text }), headers: { 'Content-Type': 'application/json' } })

  await pool.end()
}

if (require.main === module) {
  main().catch(err => {
    // eslint-disable-next-line no-console
    console.error('daily report error', err instanceof Error ? err.stack || err.message : err)
    process.exit(1)
  })
}

export default main






