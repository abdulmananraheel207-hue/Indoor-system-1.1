// src/components/Admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosConfig';
import {
    Users, Building2, DollarSign, Calendar,
    TrendingUp, AlertCircle, CheckCircle,
    XCircle, Download, Receipt
} from 'lucide-react';
import LoadingSpinner from '../Shared/LoadingSpinner';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalCommission: 0,
        activeArenas: 0,
        blockedArenas: 0,
        pendingCommissions: 0,
        totalUsers: 0,
        totalOwners: 0,
        todayBookings: 0,
        totalBookings: 0
    });

    const [recentActivity, setRecentActivity] = useState([]);
    const [pendingPayments, setPendingPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('month');

    useEffect(() => {
        fetchDashboardData();
        // Refresh data every 30 seconds
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, [timeRange]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch system report
            const reportResponse = await api.get('/admin/system-report', {
                params: { start_date: getStartDate(), end_date: new Date().toISOString().split('T')[0] }
            });

            if (reportResponse.data.success) {
                setStats(reportResponse.data.overview);
                setRecentActivity(reportResponse.data.recent_activity || []);
            }

            // Fetch pending payments
            const paymentsResponse = await api.get('/admin/pending-payments');
            if (paymentsResponse.data.success) {
                setPendingPayments(paymentsResponse.data.payments || []);
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStartDate = () => {
        const now = new Date();
        if (timeRange === 'week') {
            now.setDate(now.getDate() - 7);
        } else if (timeRange === 'month') {
            now.setMonth(now.getMonth() - 1);
        } else if (timeRange === 'quarter') {
            now.setMonth(now.getMonth() - 3);
        }
        return now.toISOString().split('T')[0];
    };

    const formatPKR = (amount) => {
        return `PKR ${Number(amount).toLocaleString('en-PK')}`;
    };

    const handleExportReport = async () => {
        try {
            const response = await api.get('/export/admin-report', {
                responseType: 'blob',
                params: { time_range: timeRange }
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `admin-report-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error exporting report:', error);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                    <p className="text-gray-600">System overview and financial management</p>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                        <option value="quarter">Last 90 Days</option>
                    </select>

                    <button
                        onClick={handleExportReport}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Download size={20} />
                        Export Report
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Commission Card */}
                <div className="bg-white p-4 rounded-xl shadow border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Commission</p>
                            <h3 className="text-2xl font-bold text-gray-800">{formatPKR(stats.totalCommission)}</h3>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <DollarSign className="text-blue-600" size={24} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm">
                        <TrendingUp className="text-green-500" size={16} />
                        <span className="text-green-600">This {timeRange}</span>
                    </div>
                </div>

                {/* Arenas Card */}
                <div className="bg-white p-4 rounded-xl shadow border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Active Arenas</p>
                            <h3 className="text-2xl font-bold text-gray-800">{stats.activeArenas}</h3>
                            <p className="text-sm text-red-600 mt-1">
                                {stats.blockedArenas} blocked
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Building2 className="text-green-600" size={24} />
                        </div>
                    </div>
                    <div className="mt-4 text-sm">
                        <Link to="/admin/arenas" className="text-blue-600 hover:text-blue-800">
                            Manage arenas →
                        </Link>
                    </div>
                </div>

                {/* Users Card */}
                <div className="bg-white p-4 rounded-xl shadow border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Users</p>
                            <h3 className="text-2xl font-bold text-gray-800">{stats.totalUsers}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {stats.totalOwners} owners
                            </p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Users className="text-purple-600" size={24} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm">
                        <Calendar className="text-blue-500" size={16} />
                        <span>{stats.todayBookings} bookings today</span>
                    </div>
                </div>

                {/* Pending Payments Card */}
                <div className="bg-white p-4 rounded-xl shadow border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Pending Commissions</p>
                            <h3 className="text-2xl font-bold text-gray-800">{stats.pendingCommissions}</h3>
                            <p className="text-sm text-amber-600 mt-1">
                                Require action
                            </p>
                        </div>
                        <div className="p-3 bg-amber-100 rounded-lg">
                            <AlertCircle className="text-amber-600" size={24} />
                        </div>
                    </div>
                    <div className="mt-4 text-sm">
                        <Link to="/admin/payments" className="text-amber-600 hover:text-amber-800">
                            View details →
                        </Link>
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Pending Payments */}
                <div className="bg-white rounded-xl shadow border p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Pending Commission Payments</h2>
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">
                            {pendingPayments.length} pending
                        </span>
                    </div>

                    <div className="space-y-4">
                        {pendingPayments.length > 0 ? (
                            pendingPayments.slice(0, 5).map((payment) => (
                                <div key={payment.arena_id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <Building2 size={20} className="text-gray-500" />
                                        <div>
                                            <h4 className="font-medium text-gray-800">{payment.arena_name}</h4>
                                            <p className="text-sm text-gray-500">
                                                Due: {payment.due_date} • Amount: {formatPKR(payment.due_amount)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleMarkAsPaid(payment.arena_id)}
                                            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                                        >
                                            Mark Paid
                                        </button>
                                        <button
                                            onClick={() => handleBlockArena(payment.arena_id)}
                                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                                        >
                                            Block
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <CheckCircle size={48} className="mx-auto text-green-500 mb-2" />
                                <p>No pending payments</p>
                            </div>
                        )}

                        {pendingPayments.length > 5 && (
                            <Link
                                to="/admin/payments"
                                className="block text-center text-blue-600 hover:text-blue-800 py-2"
                            >
                                View all pending payments ({pendingPayments.length})
                            </Link>
                        )}
                    </div>
                </div>

                {/* Right Column - Recent Activity */}
                <div className="bg-white rounded-xl shadow border p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Recent System Activity</h2>
                        <span className="text-sm text-gray-500">Live</span>
                    </div>

                    <div className="space-y-4">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((activity, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 border-b last:border-b-0">
                                    <div className={`p-2 rounded-full ${activity.type.includes('registered') ? 'bg-blue-100' :
                                        activity.type.includes('booking') ? 'bg-green-100' :
                                            'bg-gray-100'
                                        }`}>
                                        {activity.type.includes('registered') ? (
                                            <Users size={16} className="text-blue-600" />
                                        ) : activity.type.includes('booking') ? (
                                            <Receipt size={16} className="text-green-600" />
                                        ) : (
                                            <Building2 size={16} className="text-gray-600" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-gray-800">{activity.title}</p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(activity.timestamp).toLocaleString('en-PK', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short'
                                            })}
                                        </p>
                                    </div>
                                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                                        {activity.type.replace('_', ' ')}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>No recent activity</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <p className="text-lg font-semibold text-gray-800">{stats.todayBookings}</p>
                                <p className="text-sm text-gray-500">Today's Bookings</p>
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-gray-800">{stats.activeArenas}</p>
                                <p className="text-sm text-gray-500">Active Arenas</p>
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-gray-800">{stats.pendingCommissions}</p>
                                <p className="text-sm text-gray-500">Pending Payments</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 bg-white rounded-xl shadow border p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Link
                        to="/admin/arenas"
                        className="flex items-center justify-center gap-2 p-4 border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                    >
                        <Building2 size={20} />
                        <span>Manage Arenas</span>
                    </Link>

                    <Link
                        to="/admin/payments"
                        className="flex items-center justify-center gap-2 p-4 border rounded-lg hover:bg-gray-50 hover:border-green-300 transition-colors"
                    >
                        <DollarSign size={20} />
                        <span>Payment Management</span>
                    </Link>

                    <Link
                        to="/admin/reports"
                        className="flex items-center justify-center gap-2 p-4 border rounded-lg hover:bg-gray-50 hover:border-purple-300 transition-colors"
                    >
                        <TrendingUp size={20} />
                        <span>View Reports</span>
                    </Link>

                    <button
                        onClick={handleExportReport}
                        className="flex items-center justify-center gap-2 p-4 border rounded-lg hover:bg-gray-50 hover:border-amber-300 transition-colors"
                    >
                        <Download size={20} />
                        <span>Export Data</span>
                    </button>
                </div>
            </div>
        </div>
    );

    async function handleMarkAsPaid(arenaId) {
        try {
            await api.put(`/admin/payments/${arenaId}/mark-paid`);
            fetchDashboardData(); // Refresh data
        } catch (error) {
            console.error('Error marking as paid:', error);
        }
    }

    async function handleBlockArena(arenaId) {
        if (window.confirm('Are you sure you want to block this arena?')) {
            try {
                await api.put(`/admin/arenas/${arenaId}/block`);
                fetchDashboardData(); // Refresh data
            } catch (error) {
                console.error('Error blocking arena:', error);
            }
        }
    }
};

export default AdminDashboard;