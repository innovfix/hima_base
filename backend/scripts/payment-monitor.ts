import { createPool } from 'mysql2/promise'
import nodemailer from 'nodemailer'
import fetch from 'node-fetch'

// Minimal monitor: checks transactions table for add_coins in last 1 hour
async function main() {
  const pool = createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || process.env.DB_USERNAME || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.DB_DATABASE || 'himabase',
    connectionLimit: 2,
  })

  const [rows]: any = await pool.query(
    "SELECT COUNT(*) as cnt FROM transactions WHERE type = 'add_coins' AND datetime >= DATE_SUB(NOW(), INTERVAL 1 HOUR)"
  )
  const cnt = Number(rows[0]?.cnt || 0)

  if (cnt === 0) {
    console.log('No payments in the last hour — sending alert')
    await sendEmailAlert(cnt)
    await sendSlackAlert(cnt)
  } else {
    console.log(`Payments in last hour: ${cnt}`)
  }

  await pool.end()
}

async function sendEmailAlert(count: number) {
  const smtpUrl = process.env.SMTP_URL // for nodemailer parse
  const to = process.env.ALERT_EMAIL_TO
  if (!to) {
    console.warn('ALERT_EMAIL_TO not set — skipping email')
    return
  }

  const transporter = smtpUrl
    ? nodemailer.createTransport(smtpUrl)
    : nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: (process.env.SMTP_SECURE || '') === 'true',
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      })

  const subject = 'ALERT: No payments received in the last hour'
  const text = `Detected ${count} payments in the last hour (threshold=0). Please investigate.`

  await transporter.sendMail({ from: process.env.ALERT_EMAIL_FROM || 'no-reply@example.com', to, subject, text })
}

async function sendSlackAlert(count: number) {
  const webhook = process.env.SLACK_WEBHOOK_URL
  if (!webhook) return
  await fetch(webhook, { method: 'POST', body: JSON.stringify({ text: `ALERT: No payments in last hour (count=${count})` }), headers: { 'Content-Type': 'application/json' } })
}

if (require.main === module) {
  main().catch(err => {
    // eslint-disable-next-line no-console
    console.error('monitor error', err instanceof Error ? err.stack || err.message : err)
    process.exit(1)
  })
}

export default main






