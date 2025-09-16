import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPool, Pool } from 'mysql2/promise';
import fetch from 'node-fetch';
import * as fs from 'fs'
import * as path from 'path'

@Controller('admin')
export class AdminController {
  private readonly pool: Pool;

  constructor(private readonly config: ConfigService) {
    const socketPath = this.config.get<string>('DB_SOCKET') || this.config.get<string>('MYSQL_SOCKET') || undefined;
    const host = socketPath ? undefined : (this.config.get<string>('yesDB_HOST') || this.config.get<string>('MYSQL_HOST') || 'localhost');
    const port = socketPath ? undefined : parseInt(this.config.get<string>('DB_PORT') || this.config.get<string>('MYSQL_PORT') || '3306', 10);
    const user = this.config.get<string>('DB_USERNAME') || this.config.get<string>('MYSQL_USER');
    const password = this.config.get<string>('DB_PASSWORD') || this.config.get<string>('MYSQL_PASSWORD') || '';
    const database = this.config.get<string>('DB_DATABASE') || this.config.get<string>('MYSQL_DATABASE') || this.config.get<string>('DB_NAME');

    this.pool = createPool({
      socketPath,
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  @Get('active-users-monitor')
  async getActiveUsersMonitor(
    @Query('dateFrom') dateFrom: string = '',
    @Query('dateTo') dateTo: string = '',
    @Query('groupBy') groupBy: string = 'hour', // hour | day
    @Query('type') type: string = 'audio' // audio | video
  ) {
    // Validate inputs
    const validGroupBy = groupBy === 'day' ? 'day' : (groupBy === 'minute' ? 'minute' : 'hour')
    const metric = type === 'video' ? 'video_active_users_count' : 'audio_active_users_count'

    // Default date range: last 7 days
    let where = 'WHERE 1=1'
    const params: any[] = []
    if (dateFrom) {
      // compare by DATE to include whole day when user passes YYYY-MM-DD
      where += ' AND DATE(datetime) >= ?'
      params.push(dateFrom)
    } else {
      where += ' AND datetime >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    }
    if (dateTo) {
      // compare by DATE to include whole day
      where += ' AND DATE(datetime) <= ?'
      params.push(dateTo)
    }

    // Build aggregation
    let dateExpr = ''
    let groupClause = ''
    if (validGroupBy === 'day') {
      // Use the same expression for SELECT and GROUP BY to satisfy ONLY_FULL_GROUP_BY
      dateExpr = "DATE(datetime)"
      groupClause = "DATE(datetime)"
    } else if (validGroupBy === 'minute') {
      // minute: group by minute bucket
      dateExpr = "DATE_FORMAT(datetime, '%Y-%m-%d %H:%i:00')"
      groupClause = "DATE_FORMAT(datetime, '%Y-%m-%d %H:%i:00')"
    } else {
      // hourly: group by the hour bucket string
      dateExpr = "DATE_FORMAT(datetime, '%Y-%m-%d %H:00:00')"
      groupClause = "DATE_FORMAT(datetime, '%Y-%m-%d %H:00:00')"
    }

    const [rows] = await this.pool.query(
      `SELECT ${dateExpr} as period, COALESCE(language,'Unknown') as language, SUM(${metric}) as value
       FROM creator_active_monitor
       ${where}
       GROUP BY ${groupClause}, COALESCE(language,'Unknown')
       ORDER BY period ASC`,
      params
    )

    // Transform into series per language
    const seriesMap: Record<string, Record<string, number>> = {}
    const periodsSet = new Set<string>()
    ;(rows as any[]).forEach(r => {
      const p = r.period instanceof Date ? r.period.toISOString().slice(0, validGroupBy === 'day' ? 10 : 13) : r.period
      periodsSet.add(p)
      seriesMap[r.language] = seriesMap[r.language] || {}
      seriesMap[r.language][p] = Number(r.value || 0)
    })

    const periods = Array.from(periodsSet).sort()
    const series = Object.keys(seriesMap).map(lang => ({ language: lang, data: periods.map(p => ({ period: p, value: seriesMap[lang][p] || 0 })) }))

    return { periods, series, filters: { dateFrom, dateTo, groupBy: validGroupBy, type } }
  }

  @Get('active-users-raw')
  async getActiveUsersRaw(
    @Query('dateFrom') dateFrom: string = '',
    @Query('dateTo') dateTo: string = '',
    @Query('limit') limit: string = '100'
  ) {
    const params: any[] = []
    let where = 'WHERE 1=1'
    if (dateFrom) { where += ' AND DATE(datetime) >= ?'; params.push(dateFrom) }
    if (dateTo) { where += ' AND DATE(datetime) <= ?'; params.push(dateTo) }
    const lim = Math.min(Math.max(parseInt(limit,10)||100,1),1000)
    const [rows] = await this.pool.query(
      `SELECT id, datetime, audio_active_users_count, video_active_users_count, language, created_at, updated_at FROM creator_active_monitor ${where} ORDER BY datetime ASC LIMIT ?`,
      [...params, lim]
    )
    return { rows }
  }
  @Get('users')
  async listUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('sortBy') sortBy: string = 'id',
    @Query('sortOrder') sortOrder: string = 'DESC',
    @Query('search') search: string = '',
    @Query('gender') gender: string = '',
    @Query('status') status: string = '',
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;
    
    // Validate sort order
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Build WHERE clause for filtering
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (search) {
      whereClause += ' AND (name LIKE ? OR mobile LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (gender) {
      whereClause += ' AND gender = ?';
      params.push(gender);
    }
    
    if (status !== '') {
      whereClause += ' AND status = ?';
      params.push(parseInt(status, 10));
    }
    
    // Get total count for pagination
    const [countResult] = await this.pool.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const total = (countResult as any)[0].total;
    
    // Get paginated and sorted data
    const [rows] = await this.pool.query(
      `SELECT 
        id, name, mobile, avatar_id, language, created_at, updated_at, datetime,
        coins, total_coins, interests, gender, age, describe_yourself, voice,
        status, balance, audio_status, video_status, bank, branch, ifsc,
        account_num, holder_name, total_income, last_audio_time_updated,
        last_video_time_updated, upi_id, attended_calls, missed_calls,
        avg_call_percentage, blocked, last_seen, priority, warned,
        refer_code, referred_by, total_referrals, pancard_name, pancard_number,
        busy, last_busy_updated, audio_status_type, video_status_type,
        last_auto_call_disable_time, current_version, minimum_version,
        update_type, preference_time
      FROM users 
      ${whereClause}
      ORDER BY ${sortBy} ${validSortOrder}
      LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    
    return {
      users: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      },
      filters: {
        search,
        gender,
        status
      },
      sorting: {
        sortBy,
        sortOrder: validSortOrder
      }
    };
  }

  @Get('user-retention')
  async getUserRetention(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('sortBy') sortBy: string = 'total_amount_spent',
    @Query('sortOrder') sortOrder: string = 'DESC',
    @Query('search') search: string = '',
    @Query('dateFrom') dateFrom: string = '',
    @Query('dateTo') dateTo: string = '',
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let whereClause = 'WHERE t.type = "add_coins"';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (u.name LIKE ? OR u.mobile LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (dateFrom) {
      whereClause += ' AND DATE(t.datetime) >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      whereClause += ' AND DATE(t.datetime) <= ?';
      params.push(dateTo);
    }

    const [countResult] = await this.pool.query(
      `SELECT COUNT(DISTINCT u.id) as total
       FROM users u
       INNER JOIN transactions t ON u.id = t.user_id
       ${whereClause}`,
      params
    );
    const total = (countResult as any)[0].total;

    const [rows] = await this.pool.query(
      `SELECT
        u.id,
        u.name,
        u.mobile,
        u.gender,
        u.created_at as user_created,
        u.last_seen,
        u.status,
        u.coins as current_coins,
        u.total_coins,
        u.balance,
        COUNT(t.id) as total_transactions,
        SUM(t.coins) as total_coins_purchased,
        SUM(t.amount) as total_amount_spent,
        MAX(t.datetime) as last_payment_date,
        MIN(t.datetime) as first_payment_date,
        DATEDIFF(MAX(t.datetime), MIN(t.datetime)) as days_between_payments,
        AVG(t.amount) as avg_payment_amount,
        COUNT(CASE WHEN t.payment_type = 'Credit' THEN 1 END) as credit_payments,
        COUNT(CASE WHEN t.payment_type = 'Debit' THEN 1 END) as debit_payments
      FROM users u
      INNER JOIN transactions t ON u.id = t.user_id
      ${whereClause}
      GROUP BY u.id, u.name, u.mobile, u.gender, u.created_at, u.last_seen, u.status, u.coins, u.total_coins, u.balance
      ORDER BY ${sortBy} ${validSortOrder}
      LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const usersWithTransactions = await Promise.all(
      (rows as any[]).map(async (user: any) => {
        const [transactions] = await this.pool.query(
          `SELECT
            id, type, datetime, coins, amount, payment_type, reason, method_type
           FROM transactions
           WHERE user_id = ? AND type = 'add_coins'
           ORDER BY datetime DESC
           LIMIT 10`,
          [user.id]
        );

        return {
          ...user,
          recent_transactions: transactions
        };
      })
    );

    return {
      users: usersWithTransactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      },
      filters: {
        search,
        dateFrom,
        dateTo
      },
      sorting: {
        sortBy,
        sortOrder: validSortOrder
      },
      summary: {
        totalUsers: total,
        totalRevenue: (rows as any[]).reduce((sum: number, user: any) => sum + parseFloat(user.total_amount_spent || 0), 0),
        totalCoinsPurchased: (rows as any[]).reduce((sum: number, user: any) => sum + parseInt(user.total_coins_purchased || 0), 0),
        avgUserValue: (rows as any[]).length > 0 ? (rows as any[]).reduce((sum: number, user: any) => sum + parseFloat(user.total_amount_spent || 0), 0) / (rows as any[]).length : 0
      }
    };
  }

  @Get('retention-trends')
  async getRetentionTrends(
    @Query('dateFrom') dateFrom: string = '',
    @Query('dateTo') dateTo: string = '',
    @Query('groupBy') groupBy: string = 'day', // day, week, month
    @Query('regFrom') regFrom: string = '', // filter users by created_at >= regFrom
    @Query('regTo') regTo: string = '',     // filter users by created_at <= regTo
  ) {
    let whereClause = 'WHERE t.type = "add_coins"';
    const params: any[] = [];

    if (dateFrom) {
      whereClause += ' AND DATE(t.datetime) >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      whereClause += ' AND DATE(t.datetime) <= ?';
      params.push(dateTo);
    }

    // If registered-date filters are passed, join users and add created_at bounds
    let userJoin = '';
    if (regFrom || regTo) {
      userJoin = 'INNER JOIN users u ON t.user_id = u.id';
      if (regFrom && regTo) {
        whereClause += ' AND DATE(u.created_at) >= ? AND DATE(u.created_at) <= ?';
        params.push(regFrom, regTo);
      } else if (regFrom) {
        // EXACT registration date match when only regFrom provided
        whereClause += ' AND DATE(u.created_at) = ?';
        params.push(regFrom);
      } else if (regTo) {
        whereClause += ' AND DATE(u.created_at) <= ?';
        params.push(regTo);
      }
    }

    let dateFormat: string;
    let groupByClause: string;

    switch (groupBy) {
      case 'week':
        dateFormat = 'YEARWEEK(t.datetime, 1)';
        groupByClause = 'YEARWEEK(t.datetime, 1)';
        break;
      case 'month':
        dateFormat = 'DATE_FORMAT(t.datetime, "%Y-%m")';
        groupByClause = 'DATE_FORMAT(t.datetime, "%Y-%m")';
        break;
      default: // day
        dateFormat = 'DATE(t.datetime)';
        groupByClause = 'DATE(t.datetime)';
        break;
    }

    const [rows] = await this.pool.query(
      `SELECT
        ${dateFormat} as date_period,
        COUNT(DISTINCT t.user_id) as unique_users,
        COUNT(t.id) as total_transactions,
        SUM(t.amount) as total_revenue,
        SUM(t.coins) as total_coins_sold,
        AVG(t.amount) as avg_transaction_value
      FROM transactions t
      ${userJoin}
      ${whereClause}
      GROUP BY ${groupByClause}
      ORDER BY date_period ASC`,
      params
    );

    // Get user retention metrics (users who made multiple payments)
    const [retentionData] = await this.pool.query(
      `SELECT
        ${dateFormat} as date_period,
        COUNT(DISTINCT t.user_id) as total_users,
        COUNT(DISTINCT CASE WHEN user_transaction_count > 1 THEN t.user_id END) as returning_users,
        ROUND(
          (COUNT(DISTINCT CASE WHEN user_transaction_count > 1 THEN t.user_id END) / 
           NULLIF(COUNT(DISTINCT t.user_id), 0)) * 100, 2
        ) as retention_rate
      FROM (
        SELECT 
          t.*,
          COUNT(*) OVER (PARTITION BY t.user_id) as user_transaction_count
        FROM transactions t
        ${userJoin}
        ${whereClause}
      ) t
      GROUP BY ${groupByClause}
      ORDER BY date_period ASC`,
      params
    );

    // Language-wise retention / revenue breakdown per period
    const [languageTrendsVar] = await this.pool.query(
      `SELECT
        ${dateFormat} as date_period,
        COALESCE(u.language,'Unknown') as language,
        COUNT(DISTINCT t.user_id) as unique_users,
        COALESCE(SUM(t.amount),0) as total_revenue
      FROM transactions t
      LEFT JOIN users u ON u.id = t.user_id
      ${whereClause}
      GROUP BY ${groupByClause}, COALESCE(u.language,'Unknown')
      ORDER BY ${groupByClause} ASC`,
      params
    );

    // Get new vs existing user breakdown
    const [newUserData] = await this.pool.query(
      `SELECT
        ${dateFormat} as date_period,
        COUNT(DISTINCT CASE WHEN u.created_at >= t.datetime THEN t.user_id END) as new_users,
        COUNT(DISTINCT CASE WHEN u.created_at < t.datetime THEN t.user_id END) as existing_users
      FROM transactions t
      INNER JOIN users u ON t.user_id = u.id
      ${whereClause}
      GROUP BY ${groupByClause}
      ORDER BY date_period ASC`,
      params
    );

    // Count users registered on the selected date/range
    let registeredCount = 0;
    if (regFrom || regTo) {
      if (regFrom && regTo) {
        const [regRows] = await this.pool.query(
          'SELECT COUNT(*) as cnt FROM users WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?',
          [regFrom, regTo]
        );
        registeredCount = (regRows as any)[0]?.cnt || 0;
      } else if (regFrom) {
        const [regRows] = await this.pool.query(
          'SELECT COUNT(*) as cnt FROM users WHERE DATE(created_at) = ?',
          [regFrom]
        );
        registeredCount = (regRows as any)[0]?.cnt || 0;
      } else if (regTo) {
        const [regRows] = await this.pool.query(
          'SELECT COUNT(*) as cnt FROM users WHERE DATE(created_at) <= ?',
          [regTo]
        );
        registeredCount = (regRows as any)[0]?.cnt || 0;
      }
    }

    // Build response payload expected by the frontend
    const normalizeDate = (v: any): string => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v))

    const trends = (rows as any[]).map((r: any) => ({
      date_period: normalizeDate(r.date_period),
      unique_users: Number(r.unique_users || 0),
      total_transactions: Number(r.total_transactions || 0),
      total_revenue: Number(r.total_revenue || 0),
      total_coins_sold: Number(r.total_coins_sold || 0),
      avg_transaction_value: Number(r.avg_transaction_value || 0),
    }))

    const retention = (retentionData as any[]).map((r: any) => ({
      date_period: normalizeDate(r.date_period),
      total_users: Number(r.total_users || 0),
      returning_users: Number(r.returning_users || 0),
      retention_rate: Number(r.retention_rate || 0),
    }))

    const userBreakdown = (newUserData as any[]).map((r: any) => ({
      date_period: normalizeDate(r.date_period),
      new_users: Number(r.new_users || 0),
      existing_users: Number(r.existing_users || 0),
    }))

    const languageTrends = (languageTrendsVar as any[]).map((r: any) => ({
      date_period: normalizeDate(r.date_period),
      language: r.language || 'Unknown',
      unique_users: Number(r.unique_users || 0),
      total_revenue: Number(r.total_revenue || 0),
    }))

    const summary = {
      totalPeriods: trends.length,
      totalUsers: trends.reduce((s: number, x: any) => s + Number(x.unique_users || 0), 0),
      totalRevenue: trends.reduce((s: number, x: any) => s + Number(x.total_revenue || 0), 0),
      avgRetentionRate: retention.length
        ? retention.reduce((s: number, x: any) => s + Number(x.retention_rate || 0), 0) / retention.length
        : 0,
    }

    return {
      trends,
      retention,
      userBreakdown,
      languageTrends,
      registeredCount,
      filters: { dateFrom, dateTo, groupBy, regFrom, regTo },
      summary,
    }
  }

  @Get('daily-registrations-vs-payers')
  async getDailyRegistrationsVsPayers(
    @Query('dateFrom') dateFrom: string = '',
    @Query('dateTo') dateTo: string = ''
  ) {
    // Default to last 30 days if no dates provided
    let whereDatesUsers = 'WHERE 1=1';
    let whereDatesTx = 'WHERE t.type = "add_coins"';
    const paramsUsers: any[] = [];
    const paramsTx: any[] = [];

    if (dateFrom) {
      whereDatesUsers += ' AND DATE(u.created_at) >= ?';
      paramsUsers.push(dateFrom);
      whereDatesTx += ' AND DATE(t.datetime) >= ?';
      paramsTx.push(dateFrom);
    } else {
      whereDatesUsers += ' AND DATE(u.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
      whereDatesTx += ' AND DATE(t.datetime) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    }

    if (dateTo) {
      whereDatesUsers += ' AND DATE(u.created_at) <= ?';
      paramsUsers.push(dateTo);
      whereDatesTx += ' AND DATE(t.datetime) <= ?';
      paramsTx.push(dateTo);
    }

    const [regRows] = await this.pool.query(
      `SELECT DATE(u.created_at) as date_period, COUNT(*) as registrations
       FROM users u
       ${whereDatesUsers}
       GROUP BY DATE(u.created_at)
       ORDER BY date_period ASC`,
      paramsUsers
    );

    // Cohort-based payers: only count users who registered on the SAME date they paid
    const [payerRows] = await this.pool.query(
      `SELECT DATE(t.datetime) as date_period, COUNT(DISTINCT t.user_id) as payers
       FROM transactions t
       INNER JOIN users u ON u.id = t.user_id
       ${whereDatesTx}
       AND DATE(u.created_at) = DATE(t.datetime)
       GROUP BY DATE(t.datetime)
       ORDER BY date_period ASC`,
      paramsTx
    );

    // Language-wise payers per day
    const [languagePayerRows] = await this.pool.query(
      `SELECT DATE(t.datetime) as date_period, COALESCE(u.language, 'Unknown') as language, COUNT(DISTINCT t.user_id) as payers
       FROM transactions t
       INNER JOIN users u ON u.id = t.user_id
       ${whereDatesTx}
       AND DATE(u.created_at) = DATE(t.datetime)
       GROUP BY DATE(t.datetime), COALESCE(u.language, 'Unknown')
       ORDER BY date_period ASC`,
      paramsTx
    );

    // Language-wise registrations per day
    const [languageRegRows] = await this.pool.query(
      `SELECT DATE(u.created_at) as date_period, COALESCE(u.language, 'Unknown') as language, COUNT(*) as registrations
       FROM users u
       ${whereDatesUsers}
       GROUP BY DATE(u.created_at), COALESCE(u.language, 'Unknown')
       ORDER BY date_period ASC`,
      paramsUsers
    );

    // Merge payer and registration counts into a single languageTrends array
    const langMap: Record<string, any> = {}
    ;(languagePayerRows as any[]).forEach((r: any) => {
      const key = `${r.date_period}|${r.language}`
      langMap[key] = langMap[key] || { date_period: r.date_period, language: r.language, payers: 0, registrations: 0 }
      langMap[key].payers = Number(r.payers || 0)
    })
    ;(languageRegRows as any[]).forEach((r: any) => {
      const key = `${r.date_period}|${r.language}`
      langMap[key] = langMap[key] || { date_period: r.date_period, language: r.language, payers: 0, registrations: 0 }
      langMap[key].registrations = Number(r.registrations || 0)
    })
    const mergedLanguageTrends = Object.values(langMap).sort((a: any, b: any) => (a.date_period < b.date_period ? -1 : 1))

    // Merge by date
    const map: Record<string, { date_period: string; registrations: number; payers: number }> = {};
    (regRows as any[]).forEach((r: any) => {
      const key = r.date_period instanceof Date ? r.date_period.toISOString().slice(0, 10) : r.date_period;
      map[key] = map[key] || { date_period: key, registrations: 0, payers: 0 };
      map[key].registrations = Number(r.registrations) || 0;
    });
    (payerRows as any[]).forEach((p: any) => {
      const key = p.date_period instanceof Date ? p.date_period.toISOString().slice(0, 10) : p.date_period;
      map[key] = map[key] || { date_period: key, registrations: 0, payers: 0 };
      map[key].payers = Number(p.payers) || 0;
    });

    const rows = Object.values(map).sort((a, b) => (a.date_period < b.date_period ? -1 : 1));

    return {
      data: rows,
      filters: { dateFrom, dateTo },
      languageTrends: mergedLanguageTrends,
      summary: {
        totalDays: rows.length,
        totalRegistrations: rows.reduce((s, r) => s + (r.registrations || 0), 0),
        totalPayers: rows.reduce((s, r) => s + (r.payers || 0), 0)
      }
    };
  }

  @Get('registrations-paid-by-language')
  async getRegistrationsPaidByLanguage(
    @Query('dateFrom') dateFrom: string = '',
    @Query('dateTo') dateTo: string = ''
  ) {
    // Default to today if not provided
    let startDate = dateFrom || new Date().toISOString().slice(0, 10)
    let endDate = dateTo || startDate

    // Normalize inputs to DATE strings (assume YYYY-MM-DD)
    const params: any[] = [startDate, endDate, startDate, endDate]

    // We want language-wise: registrations count, paid users (who made add_coins in same window), and total paid amount
    const [rows] = await this.pool.query(
      `SELECT COALESCE(u.language,'Unknown') as language,
              COUNT(DISTINCT u.id) as registrations,
              COUNT(DISTINCT CASE WHEN t.id IS NOT NULL THEN u.id END) as paid_users,
              COALESCE(SUM(t.amount),0) as total_paid
       FROM users u
       LEFT JOIN transactions t ON t.user_id = u.id AND t.type = 'add_coins' AND DATE(t.datetime) >= ? AND DATE(t.datetime) <= ?
       WHERE DATE(u.created_at) >= ? AND DATE(u.created_at) <= ?
       GROUP BY COALESCE(u.language,'Unknown')
       ORDER BY registrations DESC`,
      params
    )

    const data = (rows as any[]).map(r => ({
      language: r.language,
      registrations: Number(r.registrations || 0),
      paidUsers: Number(r.paid_users || 0),
      totalPaid: Number(r.total_paid || 0)
    }))

    return { data, filters: { dateFrom: startDate, dateTo: endDate } }
  }

  @Get('repeat-payers-by-time')
  async getRepeatPayersByTime(
    @Query('date') date: string = ''
  ) {
    // Default to today if not provided
    const targetDate = date || new Date().toISOString().slice(0, 10)

    // For the given date, compute per-hour totals and repeat stats
    const [rows] = await this.pool.query(
      `WITH payments AS (
         SELECT t.user_id,
                HOUR(t.datetime) as hour,
                DATE(t.datetime) as d
         FROM transactions t
         WHERE t.type = 'add_coins' AND DATE(t.datetime) = ?
       ),
       user_counts AS (
         SELECT user_id, COUNT(*) as cnt
         FROM payments
         GROUP BY user_id
       )
       SELECT p.hour,
              COUNT(*) as total_payments,
              SUM(CASE WHEN uc.cnt > 1 THEN 1 ELSE 0 END) as repeat_payments,
              COUNT(DISTINCT CASE WHEN uc.cnt > 1 THEN p.user_id END) as repeat_payers
       FROM payments p
       JOIN user_counts uc ON uc.user_id = p.user_id
       GROUP BY p.hour
       ORDER BY p.hour`,
      [targetDate]
    )

    const data = (rows as any[]).map(r => ({
      hour: Number(r.hour || 0),
      total_payments: Number(r.total_payments || 0),
      repeat_payments: Number(r.repeat_payments || 0),
      repeat_payers: Number(r.repeat_payers || 0)
    }))

    const summary = data.reduce((acc:any, r:any) => {
      acc.totalPayments += r.total_payments
      acc.repeatPayments += r.repeat_payments
      acc.repeatPayersSet = acc.repeatPayersSet || new Set<number>()
      return acc
    }, { totalPayments: 0, repeatPayments: 0 })

    return { data, summary: { totalPayments: summary.totalPayments, repeatPayments: summary.repeatPayments, repeatPayers: 0 }, filters: { date: targetDate } }
  }

  @Get('creators-income')
  async getCreatorsIncome(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('sortBy') sortBy: string = 'total_income',
    @Query('sortOrder') sortOrder: string = 'DESC',
    @Query('search') search: string = '',
    @Query('dateFrom') dateFrom: string = '',
    @Query('dateTo') dateTo: string = ''
  ) {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);
    const offset = (pageNum - 1) * limitNum;

    // Whitelist sortable columns (effective total maps to alias below)
    const sortableColumns = new Set([
      'total_income_effective',
      'total_transactions',
      'avg_income_amount',
      'last_income_date',
      'first_income_date',
      'name',
      'mobile',
      'id'
    ]);
    const safeSortBy = sortableColumns.has(sortBy) ? sortBy : 'total_income_effective';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Build WHERE for users; add tx filters in JOIN to keep LEFT JOIN
    let whereUsers = 'WHERE 1=1';
    const paramsList: any[] = [];

    if (search) {
      whereUsers += ' AND (u.name LIKE ? OR u.mobile LIKE ?)';
      paramsList.push(`%${search}%`, `%${search}%`);
    }

    // Date filters applied in JOIN
    const joinConds: string[] = ["t.user_id = u.id", "t.type = 'income'"];
    if (dateFrom) {
      joinConds.push('DATE(t.datetime) >= ?');
      paramsList.push(dateFrom);
    }
    if (dateTo) {
      joinConds.push('DATE(t.datetime) <= ?');
      paramsList.push(dateTo);
    }

    const joinClause = `LEFT JOIN transactions t ON ${joinConds.join(' AND ')}`;

    // Count creators with income either via tx sum or users.total_income
    const [countRows] = await this.pool.query(
      `SELECT COUNT(*) as total FROM (
        SELECT u.id,
               COALESCE(SUM(CASE WHEN t.id IS NOT NULL THEN t.amount ELSE 0 END), 0) as sum_tx,
               MAX(u.total_income) as users_total_income
        FROM users u
        ${joinClause}
        ${whereUsers}
        GROUP BY u.id
        HAVING (sum_tx > 0) OR (users_total_income > 0)
      ) as c`,
      paramsList
    );
    const total = (countRows as any)[0]?.total || 0;

    // Fetch paginated data
    const [rows] = await this.pool.query(
      `SELECT 
        u.id,
        u.name,
        u.mobile,
        u.gender,
        u.created_at,
        COUNT(t.id) as total_transactions,
        COALESCE(SUM(t.amount), 0) as sum_income_tx,
        AVG(t.amount) as avg_income_amount,
        MIN(t.datetime) as first_income_date,
        MAX(t.datetime) as last_income_date,
        u.total_income as users_total_income,
        /* Effective total income preferring tx sum, falling back to users.total_income */
        CASE 
          WHEN COALESCE(SUM(t.amount), 0) > 0 THEN COALESCE(SUM(t.amount), 0)
          ELSE COALESCE(u.total_income, 0)
        END as total_income_effective
      FROM users u
      ${joinClause}
      ${whereUsers}
      GROUP BY u.id, u.name, u.mobile, u.gender, u.created_at, u.total_income
      HAVING total_income_effective > 0
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?`,
      [...paramsList, limitNum, offset]
    );

    return {
      creators: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      },
      filters: {
        search,
        dateFrom,
        dateTo
      },
      sorting: {
        sortBy: safeSortBy,
        sortOrder: safeSortOrder
      },
      summary: {
        totalCreators: total,
        totalIncome: (rows as any[]).reduce((s: number, r: any) => s + Number(r.total_income_effective || 0), 0),
        totalTransactions: (rows as any[]).reduce((s: number, r: any) => s + Number(r.total_transactions || 0), 0),
        avgIncomePerCreator: (rows as any[]).length > 0
          ? (rows as any[]).reduce((s: number, r: any) => s + Number(r.total_income_effective || 0), 0) / (rows as any[]).length
          : 0
      }
    };
  }

  @Get('creators-avg-call-time')
  async getCreatorsByAvgCallTime(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('sortBy') sortBy: string = 'avg_duration_seconds',
    @Query('sortOrder') sortOrder: string = 'DESC',
    @Query('dateFrom') dateFrom: string = '',
    @Query('dateTo') dateTo: string = '',
    @Query('minCalls') minCalls: string = '1',
    @Query('search') search: string = ''
  ) {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1)
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200)
    const offset = (pageNum - 1) * limitNum

    const sortableColumns = new Set([
      'avg_duration_seconds',
      'total_duration_seconds',
      'total_calls',
      'first_call_time',
      'last_call_time',
      'name',
      'language',
      'audio_status',
      'video_status',
      'mobile',
      'id'
    ])
    const safeSortBy = sortableColumns.has(sortBy) ? sortBy : 'avg_duration_seconds'
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    // Duration expression: prefer started_time/ended_time (TIME), fallback to datetime/update_current_endedtime (DATETIME)
    const durationExpr = `
      CASE 
        WHEN c.started_time IS NOT NULL AND c.ended_time IS NOT NULL THEN TIME_TO_SEC(TIMEDIFF(c.ended_time, c.started_time))
        WHEN c.datetime IS NOT NULL AND c.update_current_endedtime IS NOT NULL THEN TIMESTAMPDIFF(SECOND, c.datetime, c.update_current_endedtime)
        ELSE NULL
      END
    `

    // Filters
    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (dateFrom) {
      whereClause += ' AND DATE(c.datetime) >= ?'
      params.push(dateFrom)
    }
    if (dateTo) {
      whereClause += ' AND DATE(c.datetime) <= ?'
      params.push(dateTo)
    }
    if (search) {
      whereClause += ' AND (u.name LIKE ? OR u.mobile LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    const minCallsNum = Math.max(parseInt(minCalls, 10) || 1, 1)

    const baseSubquery = `
      SELECT 
        u.id,
        u.name,
        u.mobile,
        u.language,
        u.audio_status,
        u.video_status,
        COUNT(c.id) AS total_calls,
        AVG(${durationExpr}) AS avg_duration_seconds,
        SUM(${durationExpr}) AS total_duration_seconds,
        MIN(COALESCE(c.datetime, NOW())) AS first_call_time,
        MAX(COALESCE(c.update_current_endedtime, c.datetime)) AS last_call_time
      FROM user_calls c
      INNER JOIN users u ON u.id = c.call_user_id
      ${whereClause}
      GROUP BY u.id, u.name, u.mobile, u.language, u.audio_status, u.video_status
      HAVING total_calls >= ?
    `

    // Count total creators matching filters
    const [countRows] = await this.pool.query(
      `SELECT COUNT(*) AS total FROM (${baseSubquery}) as x`,
      [...params, minCallsNum]
    )
    const total = (countRows as any[])[0]?.total || 0

    // Fetch page
    const [rows] = await this.pool.query(
      `${baseSubquery}
       ORDER BY ${safeSortBy} ${safeSortOrder}
       LIMIT ? OFFSET ?`,
      [...params, minCallsNum, limitNum, offset]
    )

    return {
      creators: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      },
      filters: { dateFrom, dateTo, minCalls: minCallsNum, search },
      sorting: { sortBy: safeSortBy, sortOrder: safeSortOrder }
    }
  }

  @Get('creators-weekly-avg')
  async getCreatorsWeeklyAvg(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('sortBy') sortBy: string = 'weekly_avg_seconds',
    @Query('sortOrder') sortOrder: string = 'DESC',
    @Query('dateFrom') dateFrom: string = '',
    @Query('dateTo') dateTo: string = '',
    @Query('minCalls') minCalls: string = '1',
    @Query('search') search: string = '',
    @Query('week') week: string = 'current' // 'current' | 'last' | 'custom'
  ) {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1)
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200)
    const offset = (pageNum - 1) * limitNum

    try {
      const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
      // Whitelist sortable columns for this endpoint. Map weekly_avg_seconds to total_seconds_week for SQL ordering
      const sortableColumns = new Set([
        'weekly_avg_seconds',
        'total_seconds_week',
        'total_calls_week',
        'name',
        'language',
        'audio_status',
        'video_status',
        'mobile',
        'id'
      ])
      let safeSortBy = sortableColumns.has(sortBy) ? sortBy : 'weekly_avg_seconds'
      if (safeSortBy === 'weekly_avg_seconds') safeSortBy = 'total_seconds_week'

    // Duration expression similar to creators-avg-call-time
    const durationExpr = `
      CASE 
        WHEN c.started_time IS NOT NULL AND c.ended_time IS NOT NULL THEN TIME_TO_SEC(TIMEDIFF(c.ended_time, c.started_time))
        WHEN c.datetime IS NOT NULL AND c.update_current_endedtime IS NOT NULL THEN TIMESTAMPDIFF(SECOND, c.datetime, c.update_current_endedtime)
        ELSE NULL
      END
    `

    // Filters
    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    // If custom date range provided, use that. Otherwise allow week selector.
    if (dateFrom) {
      whereClause += ' AND DATE(c.datetime) >= ?'
      params.push(dateFrom)
    }
    if (dateTo) {
      whereClause += ' AND DATE(c.datetime) <= ?'
      params.push(dateTo)
    }
    // If no explicit dateFrom/dateTo, support week filter: current or last (Mon-Sun using YEARWEEK mode 1)
    if (!dateFrom && !dateTo) {
      if (week === 'current') {
        whereClause += ' AND YEARWEEK(c.datetime, 1) = YEARWEEK(CURDATE(), 1)'
      } else if (week === 'last') {
        whereClause += ' AND YEARWEEK(c.datetime, 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), 1)'
      }
      // if week === 'custom' do nothing here and expect dateFrom/dateTo to be set
    }
    if (search) {
      whereClause += ' AND (u.name LIKE ? OR u.mobile LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    const minCallsNum = Math.max(parseInt(minCalls, 10) || 1, 1)

    // Weekly aggregation: compute total seconds and calls in last 7 days per creator, then avg per call
    const baseSubquery = `
      SELECT
        u.id,
        u.name,
        u.mobile,
        u.language,
        u.audio_status,
        u.video_status,
        COUNT(c.id) AS total_calls_week,
        SUM(${durationExpr}) AS total_seconds_week
      FROM user_calls c
      INNER JOIN users u ON u.id = c.call_user_id
      ${whereClause}
      GROUP BY u.id, u.name, u.mobile, u.language, u.audio_status, u.video_status
      HAVING total_calls_week >= ?
    `

    // Count total creators matching filters
    const [countRows] = await this.pool.query(`SELECT COUNT(*) AS total FROM (${baseSubquery}) as x`, [...params, minCallsNum])
    const total = (countRows as any[])[0]?.total || 0

    // Fetch page
    const [rows] = await this.pool.query(
      `${baseSubquery}
       ORDER BY ${safeSortBy} ${validSortOrder}
       LIMIT ? OFFSET ?`,
      [...params, minCallsNum, limitNum, offset]
    )

    // Determine number of days in the selected window. If custom dateFrom/dateTo provided, use that range (inclusive).
    // Otherwise (current/last week) default to 7 days (Mon-Sun)
    let daysCount = 7
    if (dateFrom && dateTo) {
      try {
        const from = new Date(dateFrom)
        const to = new Date(dateTo)
        const diff = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
        daysCount = Math.max(1, diff + 1)
      } catch (e) {
        daysCount = 7
      }
    }

    // Compute weekly average as total_seconds_week divided by daysCount (seconds per day)
    const creators = (rows as any[]).map((r: any) => {
      const totalSec = Number(r.total_seconds_week || 0)
      return {
        ...r,
        weekly_avg_seconds: daysCount > 0 ? totalSec / daysCount : 0
      }
    })

      return {
        creators,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1
        },
        filters: { dateFrom, dateTo, minCalls: minCallsNum, search },
        sorting: { sortBy, sortOrder: validSortOrder }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('getCreatorsWeeklyAvg error:', err instanceof Error ? err.stack || err.message : err)
      throw err
    }
  }

  @Get('dashboard-stats')
  async getDashboardQuickStats() {
    // Total users
    const [totalRows] = await this.pool.query(`SELECT COUNT(*) as total FROM users`)
    const totalUsers = (totalRows as any[])[0]?.total || 0

    // Users registered today (server date)
    const [todayRegRows] = await this.pool.query(
      `SELECT COUNT(*) as cnt FROM users WHERE DATE(created_at) = CURDATE()`
    )
    const todayRegistered = (todayRegRows as any[])[0]?.cnt || 0

    // Users who registered today and paid today (cohort-based)
    const [todayPaidRows] = await this.pool.query(
      `SELECT COUNT(DISTINCT t.user_id) as cnt
       FROM transactions t
       INNER JOIN users u ON u.id = t.user_id
       WHERE t.type = 'add_coins'
         AND DATE(u.created_at) = CURDATE()
         AND DATE(t.datetime) = CURDATE()`
    )
    const todayRegisteredPaid = (todayPaidRows as any[])[0]?.cnt || 0

    return {
      totalUsers,
      todayRegistered,
      todayRegisteredPaid,
      date: new Date().toISOString().slice(0, 10)
    }
  }

  @Get('creators-payouts')
  async getCreatorsPayouts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('sortBy') sortBy: string = 'created_at',
    @Query('sortOrder') sortOrder: string = 'DESC',
    @Query('search') search: string = '',
    @Query('language') language: string = '',
    @Query('status') status: string = '',
    @Query('dateFrom') dateFrom: string = '',
    @Query('dateTo') dateTo: string = '',
    @Query('distinct') distinct: string = '0',
    @Query('firstTime') firstTime: string = '0'
  ) {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1)
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200)
    const offset = (pageNum - 1) * limitNum

    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    const params: any[] = []
    let whereClause = 'WHERE 1=1'
    if (search) {
      whereClause += ' AND (u.name LIKE ? OR u.mobile LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }
    if (language) {
      whereClause += ' AND u.language = ?'
      params.push(language)
    }
    if (status !== '') {
      whereClause += ' AND w.status = ?'
      params.push(parseInt(status, 10))
    }
    if (dateFrom) {
      whereClause += ' AND DATE(w.datetime) >= ?'
      params.push(dateFrom)
    }
    if (dateTo) {
      whereClause += ' AND DATE(w.datetime) <= ?'
      params.push(dateTo)
    }

    const isDistinct = distinct === '1' || distinct === 'true'
    const onlyFirstTime = firstTime === '1' || firstTime === 'true'

    // Normalize ORDER BY to fully-qualified/alias column names to avoid
    // ambiguous column errors when joins include columns with the same name
    // (e.g. `created_at`). We build separate mappings for distinct/grouped
    // mode and non-distinct mode.
    const sortableNonDistinct = new Set(['id','user_id','name','mobile','language','amount','status','created_at'])
    const safeSortByNonDistinct = sortableNonDistinct.has(sortBy) ? sortBy : 'created_at'
    const orderByColumn = safeSortByNonDistinct === 'id' ? 'w.id'
      : safeSortByNonDistinct === 'user_id' ? 'w.user_id'
      : safeSortByNonDistinct === 'name' ? 'u.name'
      : safeSortByNonDistinct === 'mobile' ? 'u.mobile'
      : safeSortByNonDistinct === 'language' ? "COALESCE(u.language,'Unknown')"
      : safeSortByNonDistinct === 'amount' ? 'w.amount'
      : safeSortByNonDistinct === 'status' ? 'w.status'
      : 'w.datetime'

    const sortableDistinct = new Set([
      'user_id', 'name', 'mobile', 'language', 'payouts_count', 'total_amount', 'first_payout_at', 'last_payout_at'
    ])
    const safeSortByDistinct = sortableDistinct.has(sortBy) ? sortBy : 'last_payout_at'
    const orderByDistinct = safeSortByDistinct === 'user_id' ? 'u.id'
      : safeSortByDistinct === 'name' ? 'u.name'
      : safeSortByDistinct === 'mobile' ? 'u.mobile'
      : safeSortByDistinct === 'language' ? "language"
      : safeSortByDistinct === 'payouts_count' ? 'payouts_count'
      : safeSortByDistinct === 'total_amount' ? 'total_amount'
      : safeSortByDistinct === 'first_payout_at' ? 'first_payout_at'
      : 'last_payout_at'

    if (isDistinct) {
      // Group by user (optionally filter only first-time paid users)
      // We'll join a derived table that contains each user's historical paid withdrawal count
      // and then filter where that paid count = 1 when onlyFirstTime is requested.
      const paidHistoryJoin = `LEFT JOIN (
        SELECT w2.user_id, COUNT(*) AS paid_history_count
        FROM withdrawals w2
        WHERE (w2.status = 1 OR w2.status = '1' OR LOWER(COALESCE(w2.status, '')) = 'paid')
        GROUP BY w2.user_id
      ) ph ON ph.user_id = u.id`
      const paidHistoryWhere = onlyFirstTime ? ' AND COALESCE(ph.paid_history_count,0) = 1' : ''

      // Count total users matching the grouped criteria
      const [countRows] = await this.pool.query(
        `SELECT COUNT(DISTINCT u.id) as totalUsers
         FROM withdrawals w
         INNER JOIN users u ON u.id = w.user_id
         ${paidHistoryJoin}
         ${whereClause}
         ${paidHistoryWhere}`,
        params
      )
      let totalUsers = (countRows as any[])[0]?.totalUsers || 0

      // Whitelist sortable columns for distinct/grouped mode and map to safe SQL aliases
      const sortableDistinct = new Set([
        'user_id', 'name', 'mobile', 'language', 'payouts_count', 'total_amount', 'first_payout_at', 'last_payout_at'
      ])
      const safeSortByDistinct = sortableDistinct.has(sortBy) ? sortBy : 'last_payout_at'

      // Build filter for first-time via joined paid-history table
      // Enforce strictly: (1) the count of paid rows returned in this window = 1
      // and (2) the user's total paid withdrawals in history = 1 (subquery) to avoid join/alias issues.
      const havingClause = onlyFirstTime
        ? `HAVING SUM(CASE WHEN w.status = 1 OR w.status = '1' OR LOWER(COALESCE(w.status, '')) = 'paid' THEN 1 ELSE 0 END) = 1 AND (SELECT COUNT(*) FROM withdrawals w2 WHERE w2.user_id = u.id AND (w2.status = 1 OR w2.status = '1' OR LOWER(COALESCE(w2.status, '')) = 'paid')) = 1`
        : ''

      const [rows] = await this.pool.query(
        `SELECT u.id as user_id, u.name, u.mobile, COALESCE(u.language,'Unknown') as language, COALESCE(ph.paid_history_count,0) as paid_history_count,
                -- count only payouts considered "Paid" as payouts_count (handle numeric and string forms)
                SUM(CASE WHEN w.status = 1 OR w.status = '1' OR LOWER(COALESCE(w.status, '')) = 'paid' THEN 1 ELSE 0 END) as payouts_count,
                COUNT(w.id) as payouts_total_count,
                COALESCE(SUM(w.amount),0) as total_amount,
                MIN(w.datetime) as first_payout_at, MAX(w.datetime) as last_payout_at
         FROM withdrawals w
         INNER JOIN users u ON u.id = w.user_id
         ${paidHistoryJoin}
         ${whereClause}
         GROUP BY u.id, u.name, u.mobile, u.language
         ${havingClause}
         ORDER BY ${orderByDistinct} ${validSortOrder}
         LIMIT ? OFFSET ?`,
        [...params, limitNum, offset]
      )

      // Summary: total payout users and total amount (respecting first-time filter)
      let totalAllUsers = 0
      let totalAmount = 0
      if (onlyFirstTime) {
        const [sumRow] = await this.pool.query(
          `SELECT COUNT(*) as totalUsers, COALESCE(SUM(total_amount),0) as totalAmount FROM (
             SELECT u.id, COALESCE(SUM(w.amount),0) as total_amount
             FROM withdrawals w
             INNER JOIN users u ON u.id = w.user_id
             ${paidHistoryJoin}
             ${whereClause}
             ${paidHistoryWhere}
             GROUP BY u.id
           ) t`,
          params
        )
        totalAllUsers = (sumRow as any[])[0]?.totalUsers || 0
        totalAmount = (sumRow as any[])[0]?.totalAmount || 0
      } else {
        const [sumRow] = await this.pool.query(
          `SELECT COUNT(DISTINCT w.user_id) as totalUsers, COALESCE(SUM(w.amount),0) as totalAmount
           FROM withdrawals w
           INNER JOIN users u ON u.id = w.user_id
           ${whereClause}`,
          params
        )
        totalAllUsers = (sumRow as any[])[0]?.totalUsers || 0
        totalAmount = (sumRow as any[])[0]?.totalAmount || 0
      }

      return {
        payouts: rows,
        pagination: { page: pageNum, limit: limitNum, total: totalUsers, totalPages: Math.ceil(totalUsers / limitNum), hasNext: pageNum < Math.ceil(totalUsers / limitNum), hasPrev: pageNum > 1 },
        filters: { search, language, status, dateFrom, dateTo, distinct, firstTime: onlyFirstTime ? '1' : '0' },
        sorting: { sortBy, sortOrder: validSortOrder },
        summary: { totalUsers, totalAllUsers, totalAmount },
        languages: await (async () => {
          const [langs] = await this.pool.query(`SELECT DISTINCT COALESCE(language,'Unknown') as language FROM users ORDER BY language`)
          return (langs as any[]).map(l => l.language)
        })()
      }
    } else {
      // Non-distinct: list each withdrawal
      const [countRows] = await this.pool.query(
        `SELECT COUNT(*) as total FROM withdrawals w INNER JOIN users u ON u.id = w.user_id ${whereClause}`,
        params
      )
      const total = (countRows as any[])[0]?.total || 0

      const [rows] = await this.pool.query(
        `SELECT w.id, w.user_id, u.name, u.mobile, COALESCE(u.language,'Unknown') as language, w.amount, w.status, w.datetime
         FROM withdrawals w
         INNER JOIN users u ON u.id = w.user_id
         ${whereClause}
         ORDER BY ${orderByColumn} ${validSortOrder}
         LIMIT ? OFFSET ?`,
        [...params, limitNum, offset]
      )

      const [sumRow] = await this.pool.query(
        `SELECT COUNT(*) as totalPayouts, COALESCE(SUM(amount),0) as totalAmount FROM withdrawals w INNER JOIN users u ON u.id = w.user_id ${whereClause}`,
        params
      )

      const totalPayouts = (sumRow as any[])[0]?.totalPayouts || 0
      const totalAmount = (sumRow as any[])[0]?.totalAmount || 0

      return {
        payouts: rows,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum), hasNext: pageNum < Math.ceil(total / limitNum), hasPrev: pageNum > 1 },
        filters: { search, language, status, dateFrom, dateTo, distinct },
        sorting: { sortBy, sortOrder: validSortOrder },
        summary: { totalPayouts, totalAmount },
        languages: await (async () => {
          const [langs] = await this.pool.query(`SELECT DISTINCT COALESCE(language,'Unknown') as language FROM users ORDER BY language`)
          return (langs as any[]).map(l => l.language)
        })()
      }
    }
  }

  @Get('inactive-creators')
  async getInactiveCreators(
    @Query('days') days: string = '7',
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('search') search: string = '',
    @Query('language') language: string = '',
    @Query('sortBy') sortBy: string = 'last_call',
    @Query('sortOrder') sortOrder: string = 'DESC'
  ) {
    const allowedDays = new Set(['3','7','15'])
    const daysVal = allowedDays.has(days) ? parseInt(days, 10) : 7
    const pageNum = Math.max(parseInt(page, 10) || 1, 1)
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200)
    const offset = (pageNum - 1) * limitNum

    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    const params: any[] = []

    let where = 'WHERE u.status = 2'
    if (search) {
      where += ' AND (u.name LIKE ? OR u.mobile LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }
    if (language) {
      where += ' AND u.language = ?'
      params.push(language)
    }

    // Base grouped query
    const baseSubquery = `
      SELECT
        u.id,
        u.name,
        u.mobile,
        COALESCE(u.language,'Unknown') as language,
        u.last_audio_time_updated,
        u.last_video_time_updated,
        MAX(c.datetime) as last_call
      FROM users u
      LEFT JOIN user_calls c ON c.call_user_id = u.id
      ${where}
      GROUP BY u.id, u.name, u.mobile, u.language, u.last_audio_time_updated, u.last_video_time_updated
      HAVING (MAX(c.datetime) IS NULL OR MAX(c.datetime) < DATE_SUB(CURDATE(), INTERVAL ? DAY))
    `

    // Count
    const [countRows] = await this.pool.query(`SELECT COUNT(*) as total FROM (${baseSubquery}) as x`, [...params, daysVal])
    const total = (countRows as any[])[0]?.total || 0

    // Whitelist sort columns and map to real SQL
    const sortable = new Set(['id','name','mobile','language','last_call','last_audio_time_updated'])
    const safeSortBy = sortable.has(sortBy) ? sortBy : 'last_call'
    // For order by, reference the alias names used in the select

    const [rows] = await this.pool.query(
      `${baseSubquery}
       ORDER BY ${safeSortBy} ${validSortOrder}
       LIMIT ? OFFSET ?`,
      [...params, daysVal, limitNum, offset]
    )

    // Languages list for filters
    const [langs] = await this.pool.query(`SELECT DISTINCT COALESCE(language,'Unknown') as language FROM users ORDER BY language`)

    return {
      creators: rows,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum), hasNext: pageNum < Math.ceil(total / limitNum), hasPrev: pageNum > 1 },
      filters: { days: daysVal, search, language },
      sorting: { sortBy: safeSortBy, sortOrder: validSortOrder },
      languages: (langs as any[]).map(l => l.language)
    }
  }

  @Get('creators-ftu-calls')
  async getCreatorsFtuCalls(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('sortBy') sortBy: string = 'avg_ftu_duration_seconds',
    @Query('sortOrder') sortOrder: string = 'DESC',
    @Query('dateFrom') dateFrom: string = '',
    @Query('dateTo') dateTo: string = '',
    @Query('search') search: string = ''
  ) {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1)
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200)
    const offset = (pageNum - 1) * limitNum

    // Derive the first call per (user_id, creator_id) pair using the earliest call datetime
    // Then count it as FTU only if that first-call row has a non-null end time
    const firstCallsSubquery = `
      SELECT c.call_user_id AS creator_id, c.user_id, MIN(c.datetime) AS first_dt
      FROM user_calls c
      GROUP BY c.call_user_id, c.user_id
    `

    // Duration expression for the selected first-call row (c2)
    const durationExpr = `
      CASE 
        WHEN c2.started_time IS NOT NULL AND c2.ended_time IS NOT NULL THEN TIME_TO_SEC(TIMEDIFF(c2.ended_time, c2.started_time))
        WHEN c2.datetime IS NOT NULL AND c2.update_current_endedtime IS NOT NULL THEN TIMESTAMPDIFF(SECOND, c2.datetime, c2.update_current_endedtime)
        ELSE NULL
      END
    `

    const whereClauses: string[] = [
      '(c2.ended_time IS NOT NULL OR c2.update_current_endedtime IS NOT NULL)'
    ]
    const params: any[] = []
    if (dateFrom) { whereClauses.push('DATE(fc.first_dt) >= ?'); params.push(dateFrom) }
    if (dateTo) { whereClauses.push('DATE(fc.first_dt) <= ?'); params.push(dateTo) }
    // Optional search by creator id or name
    if (search) {
      const asNumber = parseInt(search, 10)
      if (!isNaN(asNumber)) {
        whereClauses.push('(fc.creator_id = ? OR COALESCE(u.name, "") LIKE ?)')
        params.push(asNumber, `%${search}%`)
      } else {
        whereClauses.push('COALESCE(u.name, "") LIKE ?')
        params.push(`%${search}%`)
      }
    }
    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''

    // Count creators satisfying the criteria
    const [countRows] = await this.pool.query(
      `SELECT COUNT(*) AS total FROM (
         SELECT fc.creator_id
         FROM (${firstCallsSubquery}) fc
         JOIN user_calls c2
           ON c2.call_user_id = fc.creator_id
          AND c2.user_id = fc.user_id
          AND c2.datetime = fc.first_dt
         LEFT JOIN users u ON u.id = fc.creator_id
         ${where}
         GROUP BY fc.creator_id
       ) t`,
      params
    )
    const total = (countRows as any[])[0]?.total || 0

    // Whitelist sortable columns and map to safe SQL expressions (use aggregate expressions directly
    // for ordering to avoid relying on aliases in ORDER BY which can be ambiguous).
    const sortable = new Set(['ftu_calls_count', 'avg_ftu_duration_seconds', 'creator_name', 'creator_id'])
    const safeSortBy = sortable.has(sortBy) ? sortBy : 'avg_ftu_duration_seconds'
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    const orderByExpr =
      safeSortBy === 'avg_ftu_duration_seconds'
        ? `AVG(${durationExpr})`
        : safeSortBy === 'ftu_calls_count'
        ? 'COUNT(DISTINCT fc.user_id)'
        : safeSortBy === 'creator_name'
        ? "COALESCE(u.name,'')"
        : 'fc.creator_id'

    // Build the grouped base query (no final ORDER/LIMIT) and then wrap it so we can ORDER by
    // computed aggregates reliably.
    const baseGroupedQuery = `
      SELECT fc.creator_id,
             COALESCE(u.name,'') as creator_name,
             COUNT(DISTINCT fc.user_id) AS ftu_calls_count,
             AVG(${durationExpr}) AS avg_ftu_duration_seconds
      FROM (${firstCallsSubquery}) fc
      JOIN user_calls c2
        ON c2.call_user_id = fc.creator_id
       AND c2.user_id = fc.user_id
       AND c2.datetime = fc.first_dt
      LEFT JOIN users u ON u.id = fc.creator_id
      ${where}
      GROUP BY fc.creator_id, COALESCE(u.name,'')
    `

    // Map safeSortBy to columns available on the wrapped subquery
    const outerOrderBy =
      safeSortBy === 'avg_ftu_duration_seconds' ?
        // Push null/negative averages to the bottom when sorting DESC by mapping
        // them to -1 so they never outrank valid positive values.
        "CASE WHEN t.avg_ftu_duration_seconds IS NULL OR t.avg_ftu_duration_seconds < 0 THEN -1 ELSE t.avg_ftu_duration_seconds END"
        : safeSortBy === 'ftu_calls_count' ? 'ftu_calls_count'
        : safeSortBy === 'creator_name' ? 'creator_name'
        : 'creator_id'

    const [rows] = await this.pool.query(
      `SELECT * FROM (
         ${baseGroupedQuery}
       ) t
       ORDER BY t.${outerOrderBy} ${safeSortOrder}, t.ftu_calls_count DESC, t.creator_id ASC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    )

    // Compute average FTU per day based on provided date range
    let daysInRange = 1
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom)
      const to = new Date(dateTo)
      const diffMs = Math.abs(to.getTime() - from.getTime())
      daysInRange = Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1)
    } else if (dateFrom || dateTo) {
      daysInRange = 1
    }

    const withAvg = (rows as any[]).map(r => ({
      ...r,
      avg_ftu_per_day: Number((Number(r.ftu_calls_count || 0) / daysInRange).toFixed(2)),
      avg_ftu_duration_seconds: Number(r.avg_ftu_duration_seconds || 0)
    }))

    return {
      creators: withAvg,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      },
      filters: { dateFrom, dateTo }
    }
  }

  @Post('send-daily-report')
  async sendDailyReport() {
    // Total collection today (server date)
    const [totalRows]: any = await this.pool.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'add_coins' AND DATE(datetime) = CURDATE()`
    )
    const total = Number(totalRows[0]?.total || 0)

    // Language-wise breakdown
    const [langRows]: any = await this.pool.query(
      `SELECT COALESCE(u.language,'Unknown') as language, COALESCE(SUM(t.amount),0) as total_amount, COUNT(t.id) as transactions_count
       FROM transactions t
       LEFT JOIN users u ON u.id = t.user_id
       WHERE t.type = 'add_coins' AND DATE(t.datetime) = CURDATE()
       GROUP BY COALESCE(u.language,'Unknown') ORDER BY total_amount DESC`
    )

    const reportLines: string[] = []
    reportLines.push(`Daily collection report for ${new Date().toISOString().slice(0,10)}`)
    reportLines.push(`Total collection: ₹${total}`)
    reportLines.push('By language:');
    ;(langRows as any[]).forEach((r: any) => {
      reportLines.push(`- ${r.language}: ₹${Number(r.total_amount||0)} (${r.transactions_count} tx)`)
    })

    const text = reportLines.join('\n')

    const webhook = this.config.get<string>('SLACK_WEBHOOK_URL') || process.env.SLACK_WEBHOOK_URL
    if (!webhook) {
      return { ok: false, message: 'SLACK_WEBHOOK_URL not configured', report: text }
    }

    try {
      const res = await fetch(webhook, { method: 'POST', body: JSON.stringify({ text }), headers: { 'Content-Type': 'application/json' } })
      if (!res.ok) {
        const body = await res.text()
        return { ok: false, message: `Slack webhook error: ${res.status} ${res.statusText}`, body }
      }
    } catch (err) {
      return { ok: false, message: 'Failed to call Slack webhook', error: err instanceof Error ? err.message : String(err) }
    }

    return { ok: true, message: 'Report sent', report: text }
  }

  @Post('client-error')
  async reportClientError(@Body() payload: any) {
    try {
      // Write to a server-side log so ops can inspect later
      const logDir = process.cwd()
      const file = path.join(logDir, 'client-errors.log')
      const entry = { ts: new Date().toISOString(), payload }
      fs.appendFile(file, JSON.stringify(entry) + '\n', err => {
        if (err) console.error('failed to write client error', err)
      })
    } catch (err) {
      // swallow
      // eslint-disable-next-line no-console
      console.error('reportClientError error', err)
    }

    return { ok: true }
  }
}


