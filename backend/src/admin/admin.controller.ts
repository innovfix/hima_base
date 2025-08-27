import { Controller, Get, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPool, Pool } from 'mysql2/promise';

@Controller('admin')
export class AdminController {
  private readonly pool: Pool;

  constructor(private readonly config: ConfigService) {
    const socketPath = this.config.get<string>('DB_SOCKET') || this.config.get<string>('MYSQL_SOCKET') || undefined;
    const host = socketPath ? undefined : (this.config.get<string>('DB_HOST') || this.config.get<string>('MYSQL_HOST') || 'localhost');
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

    return {
      trends: rows,
      retention: retentionData,
      userBreakdown: newUserData,
      registeredCount,
      filters: {
        dateFrom,
        dateTo,
        regFrom,
        regTo,
        groupBy
      },
      summary: {
        totalPeriods: (rows as any[]).length,
        totalUsers: (rows as any[]).reduce((sum: number, row: any) => sum + parseInt(row.unique_users || 0), 0),
        totalRevenue: (rows as any[]).reduce((sum: number, row: any) => sum + parseFloat(row.total_revenue || 0), 0),
        avgRetentionRate: (retentionData as any[]).length > 0 ? 
          (retentionData as any[]).reduce((sum: number, row: any) => sum + parseFloat(row.retention_rate || 0), 0) / (retentionData as any[]).length : 0
      }
    };
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
      summary: {
        totalDays: rows.length,
        totalRegistrations: rows.reduce((s, r) => s + (r.registrations || 0), 0),
        totalPayers: rows.reduce((s, r) => s + (r.payers || 0), 0)
      }
    };
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
}


