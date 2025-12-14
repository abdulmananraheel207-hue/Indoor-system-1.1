import React, { useState, useEffect } from 'react';
import {
    CurrencyDollarIcon,
    CalendarIcon,
    ArrowDownTrayIcon,
    ChartBarIcon,
    BuildingStorefrontIcon,
    UsersIcon,
    FunnelIcon,
    CalendarDaysIcon
} from '@heroicons/react/24/outline';

const FinancialReports = () => {
    const [reports, setReports] = useState({
        daily_reports: [],
        arena_commission_report: [],
        summary: {}
    });
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start_date: '',
        end_date: ''
    });

    useEffect(() => {
        // Mock data
        const mockDailyReports = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return {
                date: date.toISOString().split('T')[0],
                total_bookings: Math.floor(Math.random() * 50) + 20,
                total_revenue: Math.floor(Math.random() * 100000) + 50000,
                total_commission: Math.floor(Math.random() * 5000) + 2000,
                unique_customers: Math.floor(Math.random() * 30) + 10,
                active_arenas: Math.floor(Math.random() * 20) + 5
            };
        }).reverse();

        const mockArenaCommissionReport = [
            {
                arena_id: 1,
                arena_name: 'Elite Sports Arena',
                owner_name: 'Sports Co.',
                pending_commission: 12500,
                total_bookings: 156,
                total_commission_paid: 62500,
                last_payment_date: '2024-01-15'
            },
            {
                arena_id: 2,
                arena_name: 'Pro Badminton Court',
                owner_name: 'Badminton Pro',
                pending_commission: 8500,
                total_bookings: 89,
                total_commission_paid: 42500,
                last_payment_date: '2024-01-10'
            },
            {
                arena_id: 3,
                arena_name: 'City Padel Club',
                owner_name: 'Padel Masters',
                pending_commission: 18750,
                total_bookings: 234,
                total_commission_paid: 93750,
                last_payment_date: '2024-01-05'
            }
        ];

        const mockSummary = {
            total_days: 7,
            total_bookings: mockDailyReports.reduce((sum, r) => sum + r.total_bookings, 0),
            total_revenue: mockDailyReports.reduce((sum, r) => sum + r.total_revenue, 0),
            total_commission: mockDailyReports.reduce((sum, r) => sum + r.total_commission, 0),
            total_pending_commission: mockArenaCommissionReport.reduce((sum, a) => sum + a.pending_commission, 0)
        };

        setTimeout(() => {
            setReports({
                daily_reports: mockDailyReports,
                arena_commission_report: mockArenaCommissionReport,
                summary: mockSummary
            });
            setLoading(false);
        }, 1000);
    }, []);

    const handleDateChange = (e) => {
        setDateRange({
            ...dateRange,
            [e.target.name]: e.target.value
        });
    };

    const handleExport = (format) => {
        alert(`Exporting report in ${format.toUpperCase()} format...`);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
                <p className="text-gray-600">View and analyze platform financial performance</p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center mr-4">
                            <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Revenue</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                Rs {reports.summary.total_revenue.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center mr-4">
                            <ChartBarIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Platform Commission</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                Rs {reports.summary.total_commission.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center mr-4">
                            <BuildingStorefrontIcon className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Pending Commission</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                Rs {reports.summary.total_pending_commission.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center mr-4">
                            <UsersIcon className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Bookings</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {reports.summary.total_bookings}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Export */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="date"
                                name="start_date"
                                value={dateRange.start_date}
                                onChange={handleDateChange}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            <input
                                type="date"
                                name="end_date"
                                value={dateRange.end_date}
                                onChange={handleDateChange}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                            <option>Daily Summary</option>
                            <option>Weekly Summary</option>
                            <option>Monthly Summary</option>
                            <option>Arena-wise Report</option>
                        </select>
                    </div>
                    <div className="flex items-end space-x-3">
                        <button className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
                            Generate Report
                        </button>
                        <button
                            onClick={() => handleExport('csv')}
                            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                            CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Daily Reports Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Daily Financial Summary</h2>
                        <div className="flex items-center space-x-2">
                            <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                            <span className="text-sm text-gray-600">Last 7 days</span>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Bookings
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Revenue
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Commission
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Customers
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Active Arenas
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reports.daily_reports.map((report) => (
                                <tr key={report.date} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {new Date(report.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{report.total_bookings}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            Rs {report.total_revenue.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-green-600">
                                            Rs {report.total_commission.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{report.unique_customers}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{report.active_arenas}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Arena Commission Report */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Arena Commission Status</h2>
                        <span className="text-sm text-gray-600">
                            Total Pending: Rs {reports.summary.total_pending_commission.toLocaleString()}
                        </span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Arena
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Owner
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Bookings
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Commission Paid
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Pending Commission
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Payment
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reports.arena_commission_report.map((arena) => (
                                <tr key={arena.arena_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{arena.arena_name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">{arena.owner_name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">{arena.total_bookings}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-green-600">
                                            Rs {arena.total_commission_paid.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-red-600">
                                            Rs {arena.pending_commission.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">
                                            {arena.last_payment_date ? new Date(arena.last_payment_date).toLocaleDateString() : 'Never'}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FinancialReports;