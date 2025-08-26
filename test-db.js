const mysql = require('mysql2/promise');
require('dotenv').config({ path: '/var/www/himabase/backend/.env' });
(async () => {
  try {
    const conn = await mysql.createConnection({
      socketPath: process.env.DB_SOCKET || undefined,
      host: process.env.DB_SOCKET ? undefined : process.env.DB_HOST,
      port: process.env.DB_SOCKET ? undefined : Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: true,
    });
    const [rows] = await conn.query('SELECT COUNT(*) AS c FROM users');
    console.log('DB OK, users count =', rows[0].c);
    await conn.end();
  } catch (e) {
    console.error('DB ERROR:', e && e.code, e && e.errno, e && e.sqlState, e && e.sqlMessage || e && e.message);
    process.exit(1);
  }
})();
