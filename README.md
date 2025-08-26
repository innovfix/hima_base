# 🚀 Analytics Dashboard Demo

A modern, full-stack analytics dashboard built with **NestJS** backend and **Next.js 15** frontend, featuring beautiful charts, multiple user roles, and secure authentication.

## ✨ Features

- 🔐 **Multi-User Authentication** - JWT-based login with role-based access
- 📊 **Beautiful Analytics Charts** - Line charts, pie charts, bar charts using Recharts
- 👥 **Role-Based Access Control** - Admin, Manager, Analyst, and Viewer roles
- 📱 **Responsive Design** - Modern UI built with Tailwind CSS
- 🚀 **Real-time Data** - Sample analytics data for demonstration
- 🔒 **Secure API** - Protected routes with JWT authentication

## 🛠️ Tech Stack

### Backend
- **NestJS** - Enterprise-grade Node.js framework
- **TypeORM** - Database ORM with MySQL support
- **JWT** - Secure authentication
- **Passport** - Authentication strategies
- **MySQL** - Database (DigitalOcean compatible)

### Frontend
- **Next.js 15** - React framework with App Router
- **Recharts** - Beautiful, responsive charts
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **Zustand** - Lightweight state management

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MySQL database (local or DigitalOcean)
- npm or yarn

### 1. Install Dependencies
```bash
# Install all dependencies (backend + frontend)
npm run install:all
```

### 2. Database Setup
1. Create a MySQL database named `analytics_demo`
2. Copy `backend/env.example` to `backend/.env`
3. Update database credentials in `backend/.env`

### 3. Start Development Servers
```bash
# Start both backend and frontend
npm run dev

# Or start separately:
npm run dev:backend    # Backend on http://localhost:3001
npm run dev:frontend   # Frontend on http://localhost:3000
```

## 🔑 Demo Credentials

The system comes with pre-configured demo users:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@demo.com | admin123 |
| **Manager** | manager@demo.com | manager123 |
| **Analyst** | analyst@demo.com | analyst123 |
| **Viewer** | viewer@demo.com | viewer123 |

## 📊 Dashboard Features

### Analytics Overview
- **Sales Metrics** - Total sales, profit, growth rate
- **Order Statistics** - Total orders, customer satisfaction
- **User Analytics** - Active users, new users, churn rate

### Interactive Charts
- **Monthly Sales Trend** - Line chart showing sales vs profit
- **Category Distribution** - Pie chart of sales by category
- **Top Products** - Horizontal bar chart of revenue
- **Traffic Sources** - Area chart of visitor sources

## 🏗️ Project Structure

```
analytics-dashboard/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── auth/          # Authentication system
│   │   ├── users/         # User management
│   │   ├── analytics/     # Analytics data & API
│   │   └── main.ts        # Application entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # Next.js frontend
│   ├── app/               # App Router pages
│   │   ├── page.tsx       # Login page
│   │   └── dashboard/     # Dashboard page
│   ├── package.json
│   └── tailwind.config.js
└── package.json            # Root package.json
```

## 🔧 Configuration

### Backend Environment Variables
```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=analytics_demo
JWT_SECRET=your-secret-key
PORT=3001
```

### Frontend Configuration
- Backend API URL: `http://localhost:3001/api`
- CORS enabled for development
- Responsive breakpoints configured

## 🚀 Deployment

### DigitalOcean Setup
1. **Database**: Use DigitalOcean Managed MySQL
2. **Backend**: Deploy to DigitalOcean App Platform or Droplet
3. **Frontend**: Deploy to DigitalOcean App Platform or Vercel

### Production Considerations
- Change JWT secret
- Use environment variables for all configs
- Enable HTTPS
- Set up proper CORS origins
- Database connection pooling
- Redis for caching (optional)

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test
```

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Analytics (Protected)
- `GET /api/analytics/dashboard` - Dashboard overview
- `GET /api/analytics/sales` - Sales data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

If you encounter any issues:
1. Check the console for error messages
2. Verify database connection
3. Ensure all environment variables are set
4. Check that both servers are running

---

**Built with ❤️ using NestJS + Next.js**
