// src/components/Admin/AdminReports.jsx
import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import {
    Download, Filter, Calendar, DollarSign,
    TrendingUp, Building2, Users, BarChart3,
    FileText, RefreshCw, ChevronDown
} from 'lucide-react';
import LoadingSpinner from '../Shared/LoadingSpinner';

const AdminReports = () => {
    const [reportType, setReportType] = useState('financial');
    const [timeRange, setTimeRange] = useState('month');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);

        setStartDate(lastMonth.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            fetchReport();
        }
    }, [reportType, startDate, endDate]);

    const fetchReport = async () => {
        try {
            setLoading(true);

            let endpoint = '';
            let params = {
                start_date: startDate,
                end_date: endDate
            };

            switch (reportType) {
                case 'financial':
                    endpoint = '/admin/financial-report';
                    break;
                case 'bookings':
                    endpoint = '/admin/booking-report';
                    break;
                case 'arena-performance':
                    endpoint = '/admin/arena-performance';
                    break;
                default:
                    endpoint = '/admin/system-report';
            }

            const response = await api.get(endpoint, { params });
            if (response.data.success) {
                setData(response.data);
            }
        } catch (error) {
            console.error('Error fetching report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format = 'csv') => {
        try {
            setExporting(true);

            let endpoint = '';
            let params = {
                start_date: startDate,
                end_date: endDate,
                format: format
            };

            switch (reportType) {
                case 'financial':
                    endpoint = '/export/financial-report';
                    break;
                case 'bookings':
                    endpoint = '/export/booking-report';
                    break;
                case 'arena-performance':
                    endpoint = '/export/arena-performance';
                    break;
                default:
                    endpoint = '/export/system-report';
            }

            const response = await api.get(endpoint, {
                responseType: 'blob',
                params: params
            });

            const filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.${format}`;
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();

        } catch (error) {
            console.error('Error exporting report:', error);
        } finally {
            setExporting(false);
        }
    };

    const formatPKR = (amount) => {
        return `PKR ${Number(amount).toLocaleString('en-PK')}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-PK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Reports & Analytics</h1>
                    <p className="text-gray-600">Financial and performance reports</p>
                </div>

                <div className="flex items-center gap-3 mt-4 md:mt-0">
                    <button
                        onClick={fetchReport}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw size={18} />
                        Refresh
                    </button>

                    <div className="relative group">
                        <button
                            disabled={exporting}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            <Download size={18} />
                            {exporting ? 'Exporting...' : 'Export'}
                            <ChevronDown size={16} />
                        </button>
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border hidden group-hover:block z-10">
                            <button
                                onClick={() => handleExport('csv')}
                                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                            >
                                Export as CSV
                            </button>
                            <button
                                onClick={() => handleExport('pdf')}
                                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                            >
                                Export as PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Type Selector */}
            <div className="bg-white p-4 rounded-xl shadow border mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                        { id: 'financial', label: 'Financial Report', icon: DollarSign },
                        { id: 'bookings', label: 'Bookings Report', icon: Calendar },
                        { id: 'arena-performance', label: 'Arena Performance', icon: Building2 },
                        { id: 'system', label: 'System Overview', icon: BarChart3 }
                    ].map((type) => (
                        <button
                            key={type.id}
                            onClick={() => setReportType(type.id)}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${reportType === type.id
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <type.icon size={24} />
                            <span className="mt-2 font-medium">{type.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Date Range Selector */}
            <div className="bg-white p-4 rounded-xl shadow border mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div className="flex items-end">
                        <div className="flex gap-2">
                            {['week', 'month', 'quarter', 'year'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => {
                                        const end = new Date();
                                        const start = new Date();

                                        if (range === 'week') start.setDate(end.getDate() - 7);
                                        else if (range === 'month') start.setMonth(end.getMonth() - 1);
                                        else if (range === 'quarter') start.setMonth(end.getMonth() - 3);
                                        else if (range === 'year') start.setFullYear(end.getFullYear() - 1);

                                        setStartDate(start.toISOString().split('T')[0]);
                                        setEndDate(end.toISOString().split('T')[0]);
                                    }}
                                    className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Content */}
            <div className="bg-white rounded-xl shadow border overflow-hidden">
                {reportType === 'financial' && data && (
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Financial Report</h2>
                                <p className="text-gray-600">
                                    {formatDate(startDate)} - {formatDate(endDate)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Total Commission</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {formatPKR(data.total_commission || 0)}
                                </p>
                            </div>
                        </div>

                        {/* Financial Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-sm text-blue-700 mb-1">Total Revenue</p>
                                <p className="text-2xl font-bold text-blue-800">
                                    {formatPKR(data.total_revenue || 0)}
                                </p>
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg">
                                <p className="text-sm text-green-700 mb-1">Net Commission</p>
                                <p className="text-2xl font-bold text-green-800">
                                    {formatPKR(data.net_commission || 0)}
                                </p>
                            </div>

                            <div className="bg-amber-50 p-4 rounded-lg">
                                <p className="text-sm text-amber-700 mb-1">Pending Payments</p>
                                <p className="text-2xl font-bold text-amber-800">
                                    {formatPKR(data.pending_payments || 0)}
                                </p>
                            </div>
                        </div>

                        {/* Monthly Breakdown */}
                        {data.monthly_breakdown && data.monthly_breakdown.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4">Monthly Breakdown</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {data.monthly_breakdown.map((item) => (
                                                <tr key={item.month}>
                                                    <td className="px-4 py-3">{item.month}</td>
                                                    <td className="px-4 py-3">{item.bookings}</td>
                                                    <td className="px-4 py-3">{formatPKR(item.revenue)}</td>
                                                    <td className="px-4 py-3">{formatPKR(item.commission)}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 text-xs rounded-full ${item.payment_status === 'paid'
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-amber-100 text-amber-800'
                                                            }`}>
                                                            {item.payment_status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Top Arenas by Commission */}
                        {data.top_arenas && data.top_arenas.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-4">Top Arenas by Commission</h3>
                                <div className="space-y-3">
                                    {data.top_arenas.map((arena, index) => (
                                        <div key={arena.arena_id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-gray-800">{arena.arena_name}</h4>
                                                    <p className="text-sm text-gray-500">{arena.owner_name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-gray-800">{formatPKR(arena.commission)}</p>
                                                <p className="text-sm text-gray-500">
                                                    {arena.bookings} bookings
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {reportType === 'bookings' && data && (
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Bookings Report</h2>
                                <p className="text-gray-600">
                                    {formatDate(startDate)} - {formatDate(endDate)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Total Bookings</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {data.total_bookings || 0}
                                </p>
                            </div>
                        </div>

                        {/* Booking Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-sm text-blue-700 mb-1">Completed</p>
                                <p className="text-2xl font-bold text-blue-800">{data.completed || 0}</p>
                            </div>

                            <div className="bg-amber-50 p-4 rounded-lg">
                                <p className="text-sm text-amber-700 mb-1">Pending</p>
                                <p className="text-2xl font-bold text-amber-800">{data.pending || 0}</p>
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg">
                                <p className="text-sm text-green-700 mb-1">Accepted</p>
                                <p className="text-2xl font-bold text-green-800">{data.accepted || 0}</p>
                            </div>

                            <div className="bg-red-50 p-4 rounded-lg">
                                <p className="text-sm text-red-700 mb-1">Cancelled</p>
                                <p className="text-2xl font-bold text-red-800">{data.cancelled || 0}</p>
                            </div>
                        </div>

                        {/* Daily Bookings */}
                        {data.daily_bookings && data.daily_bookings.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4">Daily Bookings Trend</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cancellations</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {data.daily_bookings.map((day) => (
                                                <tr key={day.date}>
                                                    <td className="px-4 py-3">{formatDate(day.date)}</td>
                                                    <td className="px-4 py-3">{day.bookings}</td>
                                                    <td className="px-4 py-3">{formatPKR(day.revenue)}</td>
                                                    <td className="px-4 py-3">{formatPKR(day.commission)}</td>
                                                    <td className="px-4 py-3 text-red-600">{day.cancellations || 0}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {reportType === 'arena-performance' && data && (
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Arena Performance Report</h2>
                                <p className="text-gray-600">
                                    {formatDate(startDate)} - {formatDate(endDate)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Active Arenas</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {data.active_arenas || 0}
                                </p>
                            </div>
                        </div>

                        {/* Performance Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-sm text-blue-700 mb-1">Average Revenue per Arena</p>
                                <p className="text-2xl font-bold text-blue-800">
                                    {formatPKR(data.avg_revenue || 0)}
                                </p>
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg">
                                <p className="text-sm text-green-700 mb-1">Average Bookings per Arena</p>
                                <p className="text-2xl font-bold text-green-800">
                                    {Math.round(data.avg_bookings || 0)}
                                </p>
                            </div>

                            <div className="bg-purple-50 p-4 rounded-lg">
                                <p className="text-sm text-purple-700 mb-1">Average Commission per Arena</p>
                                <p className="text-2xl font-bold text-purple-800">
                                    {formatPKR(data.avg_commission || 0)}
                                </p>
                            </div>
                        </div>

                        {/* Arena Performance Table */}
                        {data.arenas && data.arenas.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-4">Arena Performance Details</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Arena</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilization %</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {data.arenas.map((arena) => (
                                                <tr key={arena.arena_id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-medium text-gray-800">{arena.name}</td>
                                                    <td className="px-4 py-3">{arena.owner_name}</td>
                                                    <td className="px-4 py-3">{arena.total_bookings}</td>
                                                    <td className="px-4 py-3">{formatPKR(arena.total_revenue)}</td>
                                                    <td className="px-4 py-3">{formatPKR(arena.total_commission)}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                                <div
                                                                    className="bg-green-600 h-2 rounded-full"
                                                                    style={{ width: `${Math.min(arena.utilization || 0, 100)}%` }}
                                                                ></div>
                                                            </div>
                                                            <span>{arena.utilization}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 text-xs rounded-full ${arena.is_blocked ? 'bg-red-100 text-red-800' :
                                                                !arena.is_active ? 'bg-gray-100 text-gray-800' :
                                                                    'bg-green-100 text-green-800'
                                                            }`}>
                                                            {arena.is_blocked ? 'Blocked' :
                                                                !arena.is_active ? 'Inactive' : 'Active'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {reportType === 'system' && data && (
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">System Overview Report</h2>
                                <p className="text-gray-600">
                                    {formatDate(startDate)} - {formatDate(endDate)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">System Health</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {data.system_health || 'Healthy'}
                                </p>
                            </div>
                        </div>

                        {/* System Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-sm text-blue-700 mb-1">Total Users</p>
                                <p className="text-2xl font-bold text-blue-800">
                                    {data.total_users || 0}
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                    +{data.new_users_this_period || 0} this period
                                </p>
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg">
                                <p className="text-sm text-green-700 mb-1">Total Arenas</p>
                                <p className="text-2xl font-bold text-green-800">
                                    {data.total_arenas || 0}
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                    +{data.new_arenas_this_period || 0} this period
                                </p>
                            </div>

                            <div className="bg-purple-50 p-4 rounded-lg">
                                <p className="text-sm text-purple-700 mb-1">Total Bookings</p>
                                <p className="text-2xl font-bold text-purple-800">
                                    {data.total_bookings || 0}
                                </p>
                                <p className="text-xs text-purple-600 mt-1">
                                    +{data.new_bookings_this_period || 0} this period
                                </p>
                            </div>

                            <div className="bg-amber-50 p-4 rounded-lg">
                                <p className="text-sm text-amber-700 mb-1">Active Sessions</p>
                                <p className="text-2xl font-bold text-amber-800">
                                    {data.active_sessions || 0}
                                </p>
                                <p className="text-xs text-amber-600 mt-1">
                                    Current online users
                                </p>
                            </div>
                        </div>

                        {/* Performance Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="bg-white border rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4">Platform Performance</h3>
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm text-gray-600">Server Uptime</span>
                                            <span className="text-sm font-medium text-gray-800">{data.uptime_percentage || '99.9%'}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className="bg-green-600 h-2 rounded-full" style={{ width: '99.9%' }}></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm text-gray-600">Response Time</span>
                                            <span className="text-sm font-medium text-gray-800">{data.avg_response_time || '120ms'}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '95%' }}></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm text-gray-600">Error Rate</span>
                                            <span className="text-sm font-medium text-gray-800">{data.error_rate || '0.1%'}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className="bg-red-600 h-2 rounded-full" style={{ width: '0.1%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Stats</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Pending Commissions</span>
                                        <span className="font-medium text-amber-600">
                                            {formatPKR(data.pending_commissions || 0)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Blocked Arenas</span>
                                        <span className="font-medium text-red-600">
                                            {data.blocked_arenas || 0}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Avg. Booking Value</span>
                                        <span className="font-medium text-green-600">
                                            {formatPKR(data.avg_booking_value || 0)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Conversion Rate</span>
                                        <span className="font-medium text-blue-600">
                                            {data.conversion_rate || '5.2%'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!data && (
                    <div className="p-12 text-center">
                        <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">Select a date range to generate reports</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminReports;