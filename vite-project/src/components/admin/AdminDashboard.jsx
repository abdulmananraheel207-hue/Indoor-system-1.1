import React, { useState, useEffect } from 'react';
import {
    BuildingStorefrontIcon,
    UsersIcon,
    UserGroupIcon,
    CurrencyDollarIcon,
    ChartBarIcon,
    ArrowTrendingUpIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import RecentBookings from './RecentBooking';
import PendingCommissions from './PendingCommissions';

const AdminDashboard = () => {
    const [dashboardData, setDashboardData] = useState({
        monthlyCommission: 124500,
        activeArenas: 128,
        pendingCommissionsCount: 12,
        totalUsers: 2345,
        totalOwners: 89,
        totalBookings: 15678,
        totalRevenue: 3456700,
        totalPlatformCommission: 172835,
        recentBookings: [],
        pendingCommissions: []
    });

    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    useEffect(() => {
        // Direct test data - just like in UserBooking.jsx
        const testRecentBookings = [
            {
                booking_id: 1001,
                user_name: 'Ali Khan',
                arena_name: 'Elite Sports Arena',
                owner_name: 'Sports Co.',
                sport_name: 'Cricket',
                booking_date: '2024-01-20 14:30:00',
                total_amount: 2500,
                status: 'completed'
            },
            {
                booking_id: 1002,
                user_name: 'Fatima Ahmed',
                arena_name: 'Pro Badminton Court',
                owner_name: 'Badminton Pro',
                sport_name: 'Badminton',
                booking_date: '2024-01-20 13:00:00',
                total_amount: 1500,
                status: 'completed'
            },
            {
                booking_id: 1003,
                user_name: 'Usman Ali',
                arena_name: 'City Padel Club',
                owner_name: 'Padel Masters',
                sport_name: 'Padel',
                booking_date: '2024-01-20 11:30:00',
                total_amount: 3000,
                status: 'pending'
            },
            {
                booking_id: 1004,
                user_name: 'Zainab Shah',
                arena_name: 'Sky Basketball Arena',
                owner_name: 'Basketball Inc',
                sport_name: 'Basketball',
                booking_date: '2024-01-20 10:00:00',
                total_amount: 2000,
                status: 'cancelled'
            },
            {
                booking_id: 1005,
                user_name: 'Bilal Raza',
                arena_name: 'Royal Tennis Court',
                owner_name: 'Tennis Pro',
                sport_name: 'Tennis',
                booking_date: '2024-01-19 16:00:00',
                total_amount: 1800,
                status: 'completed'
            }
        ];

        const testPendingCommissions = [
            {
                arena_id: 1,
                arena_name: 'Elite Sports Arena',
                owner_email: 'owner@sports.com',
                owner_phone: '+923001234567',
                amount_due: 12500,
                days_overdue: 3
            },
            {
                arena_id: 2,
                arena_name: 'Pro Badminton Court',
                owner_email: 'badminton@pro.com',
                owner_phone: '+923001234568',
                amount_due: 8500,
                days_overdue: 7
            },
            {
                arena_id: 3,
                arena_name: 'City Padel Club',
                owner_email: 'padel@masters.com',
                owner_phone: '+923001234569',
                amount_due: 18750,
                days_overdue: 1
            }
        ];

        setTimeout(() => {
            setDashboardData(prev => ({
                ...prev,
                recentBookings: testRecentBookings,
                pendingCommissions: testPendingCommissions
            }));
            setLoading(false);
        }, 500);
    }, []);

    const refreshData = () => {
        setLoading(true);
        setTimeout(() => {
            setDashboardData(prev => ({
                ...prev,
                monthlyCommission: 124500 + Math.floor(Math.random() * 10000),
                activeArenas: 128 + Math.floor(Math.random() * 10),
                pendingCommissionsCount: 12 + Math.floor(Math.random() * 5)
            }));
            setLastUpdated(new Date());
            setLoading(false);
        }, 500);
    };

    const stats = [
        {
            name: 'Monthly Commission',
            value: `Rs ${dashboardData.monthlyCommission.toLocaleString()}`,
            icon: CurrencyDollarIcon,
            change: '+12.5%',
            changeType: 'positive',
            color: 'bg-green-500'
        },
        {
            name: 'Active Arenas',
            value: dashboardData.activeArenas,
            icon: BuildingStorefrontIcon,
            change: '+8',
            changeType: 'positive',
            color: 'bg-blue-500'
        },
        {
            name: 'Total Users',
            value: dashboardData.totalUsers,
            icon: UsersIcon,
            change: '+234',
            changeType: 'positive',
            color: 'bg-purple-500'
        },
        {
            name: 'Total Owners',
            value: dashboardData.totalOwners,
            icon: UserGroupIcon,
            change: '+5',
            changeType: 'positive',
            color: 'bg-yellow-500'
        },
        {
            name: 'Pending Commissions',
            value: dashboardData.pendingCommissionsCount,
            icon: ExclamationTriangleIcon,
            change: '+2',
            changeType: 'negative',
            color: 'bg-red-500'
        },
        {
            name: 'Total Revenue',
            value: `Rs ${(dashboardData.totalRevenue / 100000).toFixed(1)}L`,
            icon: ChartBarIcon,
            change: '+15.2%',
            changeType: 'positive',
            color: 'bg-indigo-500'
        }
    ];

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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                    <p className="text-gray-600">Welcome back! Here's what's happening with your platform today.</p>
                    <p className="text-xs text-gray-400 mt-1">
                        Last updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <button
                    onClick={refreshData}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
                >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Refresh
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.map((stat) => (
                    <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                                <p className="text-2xl font-semibold text-gray-900 mt-2">{stat.value}</p>
                                <div className="flex items-center mt-2">
                                    <span className={`text-sm ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                                        {stat.change}
                                    </span>
                                    <span className="text-gray-500 text-sm ml-2">from last month</span>
                                </div>
                            </div>
                            <div className={`${stat.color} p-3 rounded-lg`}>
                                <stat.icon className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Revenue Overview</h2>
                        <button className="text-sm text-primary-600 hover:text-primary-500">
                            View Details
                        </button>
                    </div>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                        <div className="text-center">
                            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-500">Revenue chart will appear here</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Booking Trends</h2>
                        <button className="text-sm text-primary-600 hover:text-primary-500">
                            View Details
                        </button>
                    </div>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                        <div className="text-center">
                            <ArrowTrendingUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-500">Booking trends chart will appear here</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Bookings & Pending Commissions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecentBookings bookings={dashboardData.recentBookings} />
                <PendingCommissions commissions={dashboardData.pendingCommissions} />
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button className="flex flex-col items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                        <BuildingStorefrontIcon className="h-8 w-8 text-gray-600 mb-2" />
                        <span className="text-sm font-medium text-gray-900">Add Arena</span>
                        <span className="text-xs text-gray-500 mt-1">Register new arena</span>
                    </button>
                    <button className="flex flex-col items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                        <CurrencyDollarIcon className="h-8 w-8 text-gray-600 mb-2" />
                        <span className="text-sm font-medium text-gray-900">Process Payment</span>
                        <span className="text-xs text-gray-500 mt-1">Mark commission paid</span>
                    </button>
                    <button className="flex flex-col items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                        <ExclamationTriangleIcon className="h-8 w-8 text-gray-600 mb-2" />
                        <span className="text-sm font-medium text-gray-900">Block Arena</span>
                        <span className="text-xs text-gray-500 mt-1">Block non-compliant</span>
                    </button>
                    <button className="flex flex-col items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                        <ChartBarIcon className="h-8 w-8 text-gray-600 mb-2" />
                        <span className="text-sm font-medium text-gray-900">Generate Report</span>
                        <span className="text-xs text-gray-500 mt-1">Download financials</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;