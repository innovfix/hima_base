import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticsService {
  // Sample analytics data for demo
  getSalesData() {
    return {
      monthly: [
        { month: 'Jan', sales: 12000, profit: 8000 },
        { month: 'Feb', sales: 15000, profit: 10000 },
        { month: 'Mar', sales: 18000, profit: 12000 },
        { month: 'Apr', sales: 22000, profit: 15000 },
        { month: 'May', sales: 25000, profit: 18000 },
        { month: 'Jun', sales: 28000, profit: 20000 },
      ],
      categories: [
        { name: 'Electronics', value: 35, color: '#8884d8' },
        { name: 'Clothing', value: 25, color: '#82ca9d' },
        { name: 'Books', value: 20, color: '#ffc658' },
        { name: 'Home', value: 15, color: '#ff7300' },
        { name: 'Sports', value: 5, color: '#00ff00' },
      ],
      topProducts: [
        { name: 'iPhone 15', sales: 1250, revenue: 1250000 },
        { name: 'MacBook Pro', sales: 890, revenue: 1780000 },
        { name: 'AirPods Pro', sales: 2100, revenue: 420000 },
        { name: 'iPad Air', sales: 750, revenue: 450000 },
        { name: 'Apple Watch', sales: 1100, revenue: 440000 },
      ],
      userStats: {
        totalUsers: 15420,
        activeUsers: 12350,
        newUsers: 1250,
        churnRate: 2.3,
      },
      traffic: [
        { source: 'Direct', visitors: 4500, conversion: 3.2 },
        { source: 'Organic Search', visitors: 8900, conversion: 2.8 },
        { source: 'Social Media', visitors: 3200, conversion: 1.9 },
        { source: 'Email', visitors: 1800, conversion: 4.1 },
        { source: 'Referral', visitors: 1200, conversion: 2.5 },
      ],
    };
  }

  getDashboardStats() {
    const salesData = this.getSalesData();
    const totalSales = salesData.monthly.reduce((sum, month) => sum + month.sales, 0);
    const totalProfit = salesData.monthly.reduce((sum, month) => sum + month.profit, 0);
    const avgMonthlyGrowth = ((salesData.monthly[salesData.monthly.length - 1].sales - salesData.monthly[0].sales) / salesData.monthly[0].sales * 100 / salesData.monthly.length).toFixed(1);

    return {
      totalSales,
      totalProfit,
      avgMonthlyGrowth: parseFloat(avgMonthlyGrowth),
      totalOrders: 45678,
      customerSatisfaction: 4.8,
      ...salesData,
    };
  }
}
