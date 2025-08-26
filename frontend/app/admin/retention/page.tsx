'use client'

import { useEffect, useState } from 'react'
import { Users, RefreshCw, Eye, ChevronLeft, ChevronRight, Search, Filter, SortAsc, SortDesc, TrendingUp, Coins, Calendar, BarChart3 } from 'lucide-react'
import React from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || ''

interface Transaction {
  id: number
  type: string
  datetime: string
  coins: number
  amount: number
  payment_type: string
  reason: string
  method_type: string
}

interface UserRetention {
  id: number
  name: string
  mobile: string
  gender: string
  user_created: string
  last_seen: string
  status: number
  current_coins: number
  total_coins: number
  balance: number
  total_transactions: number
  total_coins_purchased: number
  total_amount_spent: number
  last_payment_date: string
  first_payment_date: string
  days_between_payments: number
  avg_payment_amount: number
  credit_payments: number
  debit_payments: number
  recent_transactions: Transaction[]
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface Summary {
  totalUsers: number
  totalRevenue: number
  totalCoinsPurchased: number
  avgUserValue: number
}

export default function UserRetentionPage() {
  const [users, setUsers] = useState<UserRetention[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [summary, setSummary] = useState<Summary>({
    totalUsers: 0,
    totalRevenue: 0,
    totalCoinsPurchased: 0,
    avgUserValue: 0
  })
  
  // Filter and sort state
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: ''
  })
  const [sorting, setSorting] = useState({
    sortBy: 'total_amount_spent',
    sortOrder: 'DESC'
  })
  const [pageSize, setPageSize] = useState(20)
  const [showFilters, setShowFilters] = useState(false)
  const [expandedUser, setExpandedUser] = useState<number | null>(null)

  const fetchUserRetention = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pageSize.toString(),
        sortBy: sorting.sortBy,
        sortOrder: sorting.sortOrder,
        search: filters.search,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo
      })
      
      const base = API_BASE || `${window.location.protocol}//${window.location.hostname}:3001`
      const response = await fetch(`${base}/api/admin/user-retention?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        setPagination(data.pagination)
        setSummary(data.summary)
      } else {
        setError(`Failed to fetch user retention data: ${response.status}`)
      }
    } catch (err) {
      console.error('Error fetching user retention data:', err)
      setError('Network error or backend is not running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserRetention()
  }, [pagination.page, pageSize, sorting, filters])

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleSort = (column: string) => {
    setSorting(prev => ({
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'ASC' ? 'DESC' : 'ASC'
    }))
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchUserRetention()
  }

  const clearFilters = () => {
    setFilters({ search: '', dateFrom: '', dateTo: '' })
    setSorting({ sortBy: 'total_amount_spent', sortOrder: 'DESC' })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatValue = (value: any, type: string) => {
    if (value === null || value === undefined || value === '') return '-'
    
    switch (type) {
      case 'boolean':
        return value ? 'Yes' : 'No'
      case 'number':
        return value.toLocaleString()
      case 'currency':
        return `₹${parseFloat(value).toFixed(2)}`
      case 'date':
        return formatDate(value)
      case 'status':
        return value === 1 ? 'Active' : 'Inactive'
      case 'gender':
        return value === 'male' ? 'Male' : 'Female'
      default:
        return String(value)
    }
  }

  const getSortIcon = (column: string) => {
    if (sorting.sortBy !== column) return null
    return sorting.sortOrder === 'ASC' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
  }

  const toggleUserExpansion = (userId: number) => {
    setExpandedUser(expandedUser === userId ? null : userId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading user retention data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
          <button
            onClick={fetchUserRetention}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">User Retention Analysis</h1>
            </div>
            <div className="flex items-center space-x-3">
              {/* Removed redundant nav buttons (Admin Panel, Retention Trends) */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded flex items-center"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
              <button
                onClick={fetchUserRetention}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Paying Users</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalUsers.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">₹{summary.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Coins className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Coins Sold</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalCoinsPurchased.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Avg User Value</p>
                <p className="text-2xl font-bold text-gray-900">₹{summary.avgUserValue.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Name or mobile..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex items-end space-x-2">
                <button
                  onClick={handleSearch}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Apply
                </button>
                <button
                  onClick={clearFilters}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Paying Users & Transaction History</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Users who have made payments (add_coins) | Page {pagination.page} of {pagination.totalPages}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <label className="text-sm text-gray-700">Page size:</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent (₹)</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Coins Bought</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">First Payment</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Last Payment</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Payment Span</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Avg Payment (₹)</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <React.Fragment key={user.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-2 py-3">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-9 w-9">
                            <div className="h-9 w-9 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-700">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 truncate max-w-[140px]">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.mobile}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatValue(user.total_amount_spent, 'currency')}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                        {user.total_transactions}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                        {formatValue(user.total_coins_purchased, 'number')}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-500 hidden lg:table-cell">
                        {formatValue(user.first_payment_date, 'date')}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-500 hidden lg:table-cell">
                        {formatValue(user.last_payment_date, 'date')}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 hidden xl:table-cell">
                        {user.days_between_payments || 0} days
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 hidden xl:table-cell">
                        {formatValue(user.avg_payment_amount, 'currency')}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-xs text-blue-600 hidden md:table-cell">
                        <button 
                          onClick={() => toggleUserExpansion(user.id)}
                          className="hover:text-blue-800"
                        >
                          {expandedUser === user.id ? 'Hide' : 'View'} Details
                        </button>
                      </td>
                    </tr>
                    {expandedUser === user.id && (
                      <tr key={`${user.id}-details`} className="hidden md:table-row">
                        <td colSpan={9} className="px-4 py-4 bg-gray-50">
                          <div className="space-y-4">
                            <h4 className="font-medium text-gray-900">Recent Transactions</h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Coins</th>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Amount (₹)</th>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Payment Type</th>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Method</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {user.recent_transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50">
                                      <td className="px-2 py-2 text-xs text-gray-900">
                                        {formatValue(tx.datetime, 'date')}
                                      </td>
                                      <td className="px-2 py-2 text-xs text-gray-900">
                                        {formatValue(tx.coins, 'number')}
                                      </td>
                                      <td className="px-2 py-2 text-xs font-medium text-green-600">
                                        {formatValue(tx.amount, 'currency')}
                                      </td>
                                      <td className="px-2 py-2 text-xs text-gray-900">
                                        {tx.payment_type || '-'}
                                      </td>
                                      <td className="px-2 py-2 text-xs text-gray-900">
                                        {tx.method_type || '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          
          {users.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No paying users found</p>
            </div>
          )}
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i
                    } else {
                      pageNum = pagination.page - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 border rounded-md text-sm font-medium ${
                          pageNum === pagination.page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
