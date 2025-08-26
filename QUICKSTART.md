# 🚀 Quick Start Guide

## ⚡ Get Running in 5 Minutes

### 1. Database Setup
```bash
# If using XAMPP (which you have):
# 1. Start XAMPP Control Panel
# 2. Start Apache and MySQL
# 3. Open phpMyAdmin: http://localhost/phpmyadmin
# 4. Import setup-database.sql or run the SQL commands
```

### 2. Environment Setup
```bash
# Copy environment file
cp backend/env.example backend/.env

# Edit backend/.env with your database credentials:
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=          # Leave empty for XAMPP default
DB_DATABASE=analytics_demo
JWT_SECRET=your-secret-key-here
```

### 3. Start the Application
```bash
# Start both servers
npm run dev

# Or start separately:
npm run dev:backend    # Backend on http://localhost:3001
npm run dev:frontend   # Frontend on http://localhost:3000
```

### 4. Access the Dashboard
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api

### 5. Login with Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | admin123 |
| Manager | manager@demo.com | manager123 |
| Analyst | analyst@demo.com | analyst123 |
| Viewer | viewer@demo.com | viewer123 |

## 🔧 Troubleshooting

### Common Issues:
1. **Port already in use**: Change ports in `.env` files
2. **Database connection failed**: Check XAMPP MySQL is running
3. **CORS errors**: Ensure backend is running on port 3001

### If Backend Won't Start:
```bash
cd backend
npm install
npm run start:dev
```

### If Frontend Won't Start:
```bash
cd frontend
npm install
npm run dev
```

## 📱 What You'll See

- **Beautiful Login Page** with demo credentials
- **Responsive Dashboard** with multiple charts
- **Role-based Access** (all demo users see the same data)
- **Interactive Charts**: Sales trends, categories, products, traffic
- **Modern UI** built with Tailwind CSS

## 🚀 Next Steps

1. **Connect to your real MySQL database** on DigitalOcean
2. **Customize the analytics data** in `backend/src/analytics/analytics.service.ts`
3. **Add more user roles** and permissions
4. **Deploy to production** on DigitalOcean

---

**🎉 You're all set! The dashboard is ready to use.**
