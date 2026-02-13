// src/components/super-admin/SuperAdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
    ShieldCheckIcon,
    BuildingStorefrontIcon,
    UsersIcon,
    UserGroupIcon,
    CurrencyDollarIcon,
    ChartBarIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XCircleIcon,
    DocumentArrowDownIcon,
    ArrowPathIcon,
    CalendarIcon,
    EnvelopeIcon,
    PhoneIcon,
    MapPinIcon,
    NoSymbolIcon,
    UserIcon,
    ArrowRightOnRectangleIcon,
    HomeIcon,
    CreditCardIcon,
    ClockIcon,
    BellIcon,
    MagnifyingGlassIcon,
    EyeIcon,
    SparklesIcon,
    Cog6ToothIcon,
    ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import integrationService from '../../services/integrationService';
import OwnersTab from './OwnersTab';
import BlockOwnerModal from './BlockOwnerModal';
import UnblockOwnerModal from './UnblockOwnerModal';

// Users Tab Component - Enhanced
const UsersTab = ({ users = [], recentBookings = {} }) => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone_number?.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            {/* Enhanced Search Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users by name, email, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm bg-gray-50 px-4 py-2 rounded-lg">
                        <UsersIcon className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-gray-700">{filteredUsers.length}</span>
                        <span className="text-gray-500">users found</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Users List - Enhanced */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900 flex items-center">
                                <UsersIcon className="h-5 w-5 mr-2 text-purple-600" />
                                All Users ({users.length})
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <div
                                        key={user.user_id}
                                        onClick={() => setSelectedUser(user)}
                                        className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 ${selectedUser?.user_id === user.user_id ? 'bg-purple-50 border-l-4 border-purple-600' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="h-12 w-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center shadow-sm">
                                                    <UserIcon className="h-6 w-6 text-purple-600" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900">{user.name}</div>
                                                    <div className="text-sm text-gray-500 flex items-center mt-1">
                                                        <EnvelopeIcon className="h-3 w-3 mr-1" />
                                                        {user.email}
                                                    </div>
                                                    {user.phone_number && (
                                                        <div className="text-sm text-gray-500 flex items-center mt-1">
                                                            <PhoneIcon className="h-3 w-3 mr-1" />
                                                            {user.phone_number}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {user.total_bookings || 0} bookings
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1 flex items-center">
                                                    <CalendarIcon className="h-3 w-3 mr-1" />
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-6 py-12 text-center">
                                    <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No users found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* User Details Sidebar - Enhanced */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 sticky top-6">
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900 flex items-center">
                                <EyeIcon className="h-5 w-5 mr-2 text-purple-600" />
                                User Details
                            </h3>
                        </div>

                        {selectedUser ? (
                            <div className="p-6">
                                {/* User Info - Enhanced */}
                                <div className="mb-6">
                                    <div className="flex items-center space-x-4 mb-4">
                                        <div className="h-20 w-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center shadow-md">
                                            <UserIcon className="h-10 w-10 text-purple-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xl font-bold text-gray-900">{selectedUser.name}</h4>
                                            <p className="text-gray-600 text-sm break-all">{selectedUser.email}</p>
                                            <div className="mt-2 inline-flex items-center px-2 py-1 bg-green-100 rounded-full">
                                                <div className={`h-2 w-2 rounded-full mr-1 ${selectedUser.is_logged_in ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                                <span className="text-xs font-medium text-green-700">
                                                    {selectedUser.is_logged_in ? 'Online' : 'Offline'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                                        {selectedUser.phone_number && (
                                            <div className="flex items-center text-gray-600">
                                                <PhoneIcon className="h-4 w-4 mr-3 text-purple-500" />
                                                <span className="text-sm">{selectedUser.phone_number}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center text-gray-600">
                                            <CalendarIcon className="h-4 w-4 mr-3 text-purple-500" />
                                            <span className="text-sm">Member since {new Date(selectedUser.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Bookings - Enhanced */}
                                <div>
                                    <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                                        <CalendarIcon className="h-4 w-4 mr-2 text-purple-600" />
                                        Recent Bookings
                                    </h5>
                                    {recentBookings[selectedUser.user_id]?.length > 0 ? (
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                            {recentBookings[selectedUser.user_id].slice(0, 5).map((booking) => (
                                                <div key={booking.booking_id} className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="font-medium text-gray-900">{booking.arena_name}</div>
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                {new Date(booking.booking_date).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-green-600">
                                                                Rs {booking.total_amount}
                                                            </div>
                                                            <span className={`text-xs px-2 py-1 rounded-full ${booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-red-100 text-red-800'
                                                                }`}>
                                                                {booking.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 bg-gray-50 rounded-lg">
                                            <XCircleIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                            <p className="text-sm text-gray-500">No bookings yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <UserIcon className="h-10 w-10 text-gray-400" />
                                </div>
                                <p className="text-gray-500">Select a user to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Main SuperAdminDashboard Component - Enhanced
const SuperAdminDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [users, setUsers] = useState([]);
    const [owners, setOwners] = useState([]);
    const [arenas, setArenas] = useState([]);
    const [recentBookings, setRecentBookings] = useState({});
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [isUnblockModalOpen, setIsUnblockModalOpen] = useState(false);
    const [selectedOwnerForUnblock, setSelectedOwnerForUnblock] = useState(null);
    const [selectedOwnerForBlock, setSelectedOwnerForBlock] = useState(null);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalOwners: 0,
        totalArenas: 0,
        totalBookings: 0,
        totalRevenue: 0,
        totalCommission: 0,
        pendingCommission: 0,
        activeArenas: 0,
        blockedArenas: 0
    });

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const data = await integrationService.getSuperAdminDashboard();

            if (data.success) {
                setDashboardData(data.data);
                setUsers(data.data.users || []);
                setOwners(data.data.owners || []);
                setArenas(data.data.arenas || []);

                const bookingsByUser = {};
                (data.data.recent_bookings || []).forEach(booking => {
                    if (!bookingsByUser[booking.user_id]) {
                        bookingsByUser[booking.user_id] = [];
                    }
                    bookingsByUser[booking.user_id].push(booking);
                });
                setRecentBookings(bookingsByUser);
                updateStats(data.data);
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            alert('Failed to load dashboard data. Please login again.');
        } finally {
            setLoading(false);
        }
    };

    const updateStats = (data) => {
        const overview = data.overview || {};
        const systemStats = data.system_stats || {};

        setStats({
            totalUsers: overview.users || systemStats.total_users || 0,
            totalOwners: overview.owners || systemStats.total_owners || 0,
            totalArenas: overview.arenas || systemStats.active_arenas || 0,
            totalBookings: overview.bookings || systemStats.completed_bookings || 0,
            totalRevenue: systemStats.total_revenue || systemStats.owner_total_revenue || 0,
            totalCommission: systemStats.total_commission || 0,
            pendingCommission: systemStats.pending_commission_due || 0,
            activeArenas: systemStats.active_arenas || 0,
            blockedArenas: systemStats.blocked_arenas || 0
        });
    };

    const exportReport = async () => {
        const startDate = prompt('Start date (YYYY-MM-DD):', '2024-01-01');
        const endDate = prompt('End date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);

        if (startDate && endDate) {
            try {
                await integrationService.exportFinancialReport(startDate, endDate);
                alert('✅ Report downloaded successfully!');
            } catch (error) {
                console.error('❌ Export error:', error);
                alert('❌ Failed to export report: ' + error.message);
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-purple-600 mx-auto"></div>
                        <ShieldCheckIcon className="h-8 w-8 text-purple-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="mt-4 text-gray-600 font-medium">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    const statsCards = [
        { label: 'Total Users', value: stats.totalUsers, icon: UsersIcon, color: 'blue', bg: 'from-blue-500 to-blue-600' },
        { label: 'Total Owners', value: stats.totalOwners, icon: UserGroupIcon, color: 'green', bg: 'from-green-500 to-green-600' },
        { label: 'Total Arenas', value: stats.totalArenas, icon: BuildingStorefrontIcon, color: 'purple', bg: 'from-purple-500 to-purple-600' },
        { label: 'Total Bookings', value: stats.totalBookings, icon: CalendarIcon, color: 'yellow', bg: 'from-yellow-500 to-yellow-600' },
        { label: 'Total Revenue', value: `Rs ${stats.totalRevenue.toLocaleString()}`, icon: CurrencyDollarIcon, color: 'emerald', bg: 'from-emerald-500 to-emerald-600' },
        { label: 'Commission', value: `Rs ${stats.totalCommission.toLocaleString()}`, icon: ChartBarIcon, color: 'indigo', bg: 'from-indigo-500 to-indigo-600' },
        { label: 'Pending', value: `Rs ${stats.pendingCommission.toLocaleString()}`, icon: ExclamationTriangleIcon, color: 'orange', bg: 'from-orange-500 to-orange-600' },
        { label: 'Active Arenas', value: stats.activeArenas, icon: CheckCircleIcon, color: 'green', bg: 'from-green-500 to-green-600' },
        { label: 'Blocked Arenas', value: stats.blockedArenas, icon: XCircleIcon, color: 'red', bg: 'from-red-500 to-red-600' }
    ];

    const tabs = [
        { id: 'overview', label: 'Overview', icon: EyeIcon, color: 'purple' },
        { id: 'users', label: 'Users', icon: UsersIcon, color: 'blue' },
        { id: 'owners', label: 'Owners', icon: BuildingStorefrontIcon, color: 'green' },
        { id: 'pending', label: 'Pending Payments', icon: ExclamationTriangleIcon, color: 'orange' },
        { id: 'bookings', label: 'Recent Bookings', icon: CalendarIcon, color: 'yellow' },
        { id: 'financial', label: 'Financial', icon: CurrencyDollarIcon, color: 'emerald' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-blue-900 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center mb-4 md:mb-0">
                            <div className="h-14 w-14 bg-white/10 rounded-xl flex items-center justify-center mr-4 backdrop-blur-sm">
                                <ShieldCheckIcon className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                                    Super Admin Dashboard
                                </h1>

                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={loadDashboard}
                                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 flex items-center backdrop-blur-sm border border-white/10"
                            >
                                <ArrowPathIcon className="h-4 w-4 mr-2" />
                                Refresh
                            </button>
                            <button
                                onClick={exportReport}
                                className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg transition-all duration-200 flex items-center shadow-lg shadow-green-500/20"
                            >
                                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                                Export Report
                            </button>
                            <button
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to logout from Super Admin?')) {
                                        integrationService.adminLogout();
                                    }
                                }}
                                className="px-4 py-2.5 bg-red-500/90 hover:bg-red-600 rounded-lg transition-all duration-200 flex items-center backdrop-blur-sm border border-red-400/30"
                            >
                                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Enhanced Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-4 mb-8">
                    {statsCards.map((stat, idx) => (
                        <div
                            key={idx}
                            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 overflow-hidden"
                        >
                            <div className={`h-2 bg-gradient-to-r ${stat.bg}`}></div>
                            <div className="p-4">
                                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${stat.bg} bg-opacity-10 flex items-center justify-center mb-3`}>
                                    <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
                                </div>
                                <div className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                                    {stat.value}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Enhanced Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="border-b border-gray-100 bg-gray-50/50">
                        <nav className="flex space-x-1 px-6 overflow-x-auto py-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${activeTab === tab.id
                                        ? `bg-gradient-to-r from-${tab.color}-50 to-${tab.color}-100 text-${tab.color}-700 shadow-sm`
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <tab.icon className={`h-4 w-4 mr-2 ${activeTab === tab.id ? `text-${tab.color}-600` : 'text-gray-500'
                                        }`} />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab Content - Enhanced */}
                    <div className="p-6">
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                        <HomeIcon className="h-5 w-5 mr-2 text-purple-600" />
                                        System Overview
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold text-blue-800">Platform Health</h4>
                                                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <CheckCircleIcon className="h-4 w-4 text-blue-600" />
                                                </div>
                                            </div>
                                            <p className="text-2xl font-bold text-blue-600">Excellent</p>
                                            <p className="text-sm text-blue-600 mt-1">All systems operational</p>
                                        </div>
                                        <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold text-green-800">Today's Activity</h4>
                                                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                                                    <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
                                                </div>
                                            </div>
                                            <p className="text-2xl font-bold text-green-600">{stats.totalBookings}</p>
                                            <p className="text-sm text-green-600 mt-1">Total bookings today</p>
                                        </div>
                                        <div className="p-5 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold text-orange-800">Attention Needed</h4>
                                                <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                                    <BellIcon className="h-4 w-4 text-orange-600" />
                                                </div>
                                            </div>
                                            <p className="text-2xl font-bold text-orange-600">
                                                {dashboardData?.pending_commissions?.length || 0}
                                            </p>
                                            <p className="text-sm text-orange-600 mt-1">Pending payments</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-5 border border-purple-100">
                                        <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                                            <CreditCardIcon className="h-5 w-5 mr-2 text-purple-600" />
                                            Platform Summary
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                                                <span className="text-gray-600">Monthly Commission</span>
                                                <span className="font-bold text-purple-600">Rs {stats.totalCommission.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                                                <span className="text-gray-600">Pending Collection</span>
                                                <span className="font-bold text-red-600">Rs {stats.pendingCommission.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                                                <span className="text-gray-600">Collection Rate</span>
                                                <span className="font-bold text-green-600">
                                                    {stats.totalCommission > 0 ?
                                                        Math.round((stats.totalCommission / (stats.totalCommission + stats.pendingCommission)) * 100) : 0}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
                                        <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                                            <ClockIcon className="h-5 w-5 mr-2 text-indigo-600" />
                                            Quick Actions
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setActiveTab('pending')}
                                                className="p-3 bg-white hover:bg-purple-50 rounded-lg text-center transition-colors"
                                            >
                                                <CurrencyDollarIcon className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                                                <div className="font-medium text-purple-800 text-sm">View Pending</div>
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('owners')}
                                                className="p-3 bg-white hover:bg-red-50 rounded-lg text-center transition-colors"
                                            >
                                                <NoSymbolIcon className="h-6 w-6 text-red-600 mx-auto mb-2" />
                                                <div className="font-medium text-red-800 text-sm">Block Owner</div>
                                            </button>
                                            <button
                                                onClick={exportReport}
                                                className="p-3 bg-white hover:bg-green-50 rounded-lg text-center transition-colors"
                                            >
                                                <DocumentArrowDownIcon className="h-6 w-6 text-green-600 mx-auto mb-2" />
                                                <div className="font-medium text-green-800 text-sm">Export</div>
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('financial')}
                                                className="p-3 bg-white hover:bg-blue-50 rounded-lg text-center transition-colors"
                                            >
                                                <ChartBarIcon className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                                                <div className="font-medium text-blue-800 text-sm">Analytics</div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <UsersTab
                                users={users}
                                recentBookings={recentBookings}
                            />
                        )}

                        {activeTab === 'owners' && (
                            <OwnersTab
                                owners={owners}
                                arenas={arenas}
                                onBlockOwner={loadDashboard}
                                onUnblockOwner={loadDashboard}
                                onMarkPaid={loadDashboard}
                            />
                        )}

                        {activeTab === 'pending' && dashboardData?.pending_commissions && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                    <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-orange-600" />
                                    Pending Commission Payments
                                </h3>
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="min-w-full bg-white">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arena</th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Due</th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Overdue</th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {dashboardData.pending_commissions.map((commission) => {
                                                const owner = owners.find(o => o.owner_id === commission.owner_id);
                                                const isBlocked = owner?.is_blocked || false;

                                                return (
                                                    <tr key={commission.owner_id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-gray-900">{commission.owner_name}</div>
                                                            <div className="text-sm text-gray-500">{commission.email}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm text-gray-900">{commission.arena_details?.split(';')[0] || 'N/A'}</div>
                                                            <div className="text-xs text-gray-500">{commission.arenas_count} arena(s)</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-red-600">Rs {commission.total_pending?.toLocaleString() || 0}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${commission.max_days_overdue > 30 ? 'bg-red-100 text-red-800' :
                                                                commission.max_days_overdue > 15 ? 'bg-orange-100 text-orange-800' :
                                                                    'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                {commission.max_days_overdue || 0} days
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={async () => {
                                                                        if (window.confirm(`Mark Rs ${commission.total_pending} as paid for ${commission.owner_name}?`)) {
                                                                            try {
                                                                                const ownerArenas = arenas.filter(a => a.owner_id === commission.owner_id);
                                                                                for (const arena of ownerArenas) {
                                                                                    if (arena.pending_commission > 0) {
                                                                                        await integrationService.markArenaPayment(arena.arena_id, {
                                                                                            amount_paid: arena.pending_commission,
                                                                                            notes: `Monthly commission payment for ${commission.owner_name}`,
                                                                                            payment_date: new Date().toISOString().split('T')[0]
                                                                                        });
                                                                                    }
                                                                                }
                                                                                alert('✅ Payment marked as paid!');
                                                                                loadDashboard();
                                                                            } catch (error) {
                                                                                alert('❌ Failed to mark payment: ' + error.message);
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium transition-colors"
                                                                >
                                                                    Mark Paid
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (isBlocked) {
                                                                            setSelectedOwnerForUnblock({
                                                                                id: commission.owner_id,
                                                                                name: commission.owner_name
                                                                            });
                                                                            setIsUnblockModalOpen(true);
                                                                        } else {
                                                                            setSelectedOwnerForBlock({
                                                                                id: commission.owner_id,
                                                                                name: commission.owner_name
                                                                            });
                                                                            setIsBlockModalOpen(true);
                                                                        }
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center ${isBlocked
                                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                                        }`}
                                                                >
                                                                    {isBlocked ? (
                                                                        <>
                                                                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                                                                            Unblock
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <NoSymbolIcon className="h-4 w-4 mr-1" />
                                                                            Block
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    {dashboardData.pending_commissions.length === 0 && (
                                        <div className="text-center py-12">
                                            <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-3" />
                                            <p className="text-gray-500">No pending payments found</p>
                                        </div>
                                    )}
                                </div>

                                {/* Modals */}
                                <BlockOwnerModal
                                    isOpen={isBlockModalOpen}
                                    onClose={() => {
                                        setIsBlockModalOpen(false);
                                        setSelectedOwnerForBlock(null);
                                    }}
                                    onConfirm={async (blockData) => {
                                        try {
                                            const ownerArenasToBlock = arenas.filter(a => a.owner_id === selectedOwnerForBlock?.id);
                                            await integrationService.blockOwner(selectedOwnerForBlock?.id, {
                                                reason: blockData.reason,
                                                notify_owner: blockData.notify_owner,
                                                block_arenas: blockData.block_arenas
                                            });

                                            if (blockData.block_arenas) {
                                                for (const arena of ownerArenasToBlock) {
                                                    await integrationService.toggleArenaBlock(arena.arena_id, {
                                                        action: 'block_for_non_payment',
                                                        reason: blockData.reason,
                                                        notify_owner: blockData.notify_owner
                                                    });
                                                }
                                            }

                                            alert(`✅ Owner "${selectedOwnerForBlock?.name}" blocked successfully!`);
                                            setIsBlockModalOpen(false);
                                            setSelectedOwnerForBlock(null);
                                            loadDashboard();
                                        } catch (error) {
                                            console.error('❌ Block owner error:', error);
                                            alert('❌ Failed to block owner: ' + error.message);
                                        }
                                    }}
                                    ownerName={selectedOwnerForBlock?.name}
                                    isLoading={false}
                                />

                                <UnblockOwnerModal
                                    isOpen={isUnblockModalOpen}
                                    onClose={() => {
                                        setIsUnblockModalOpen(false);
                                        setSelectedOwnerForUnblock(null);
                                    }}
                                    onConfirm={async (unblockData) => {
                                        try {
                                            const ownerArenasToUnblock = arenas.filter(a => a.owner_id === selectedOwnerForUnblock?.id);
                                            await integrationService.unblockOwner(selectedOwnerForUnblock?.id, {
                                                notify_owner: unblockData.notify_owner
                                            });

                                            for (const arena of ownerArenasToUnblock) {
                                                await integrationService.toggleArenaBlock(arena.arena_id, {
                                                    action: 'unblock',
                                                    notify_owner: unblockData.notify_owner
                                                });
                                            }

                                            alert(`✅ Owner "${selectedOwnerForUnblock?.name}" unblocked successfully!`);
                                            setIsUnblockModalOpen(false);
                                            setSelectedOwnerForUnblock(null);
                                            loadDashboard();
                                        } catch (error) {
                                            console.error('❌ Unblock owner error:', error);
                                            alert('❌ Failed to unblock owner: ' + error.message);
                                        }
                                    }}
                                    ownerName={selectedOwnerForUnblock?.name}
                                    isLoading={false}
                                />
                            </div>
                        )}

                        {activeTab === 'bookings' && dashboardData?.recent_bookings && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                    <CalendarIcon className="h-5 w-5 mr-2 text-yellow-600" />
                                    Recent Bookings
                                </h3>
                                <div className="space-y-3">
                                    {dashboardData.recent_bookings.map((booking) => (
                                        <div key={booking.booking_id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between">
                                                <div className="mb-3 md:mb-0">
                                                    <div className="font-bold text-gray-900 text-lg">{booking.arena_name}</div>
                                                    <div className="text-gray-600 text-sm mt-1">
                                                        {booking.user_name} • {booking.sport_name} • #{booking.booking_id}
                                                    </div>
                                                    <div className="text-sm text-gray-500 mt-2 flex items-center">
                                                        <CalendarIcon className="h-4 w-4 mr-1" />
                                                        {new Date(booking.booking_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-green-600">
                                                        Rs {booking.total_amount}
                                                    </div>
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        Commission: Rs {booking.commission_amount || 0}
                                                    </div>
                                                    <span className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-medium ${booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                        }`}>
                                                        {booking.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'financial' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
                                        <CurrencyDollarIcon className="h-10 w-10 mb-4 opacity-90" />
                                        <div className="text-3xl font-bold">Rs {stats.totalRevenue.toLocaleString()}</div>
                                        <div className="text-blue-100 mt-1">Total Revenue</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
                                        <ChartBarIcon className="h-10 w-10 mb-4 opacity-90" />
                                        <div className="text-3xl font-bold">Rs {stats.totalCommission.toLocaleString()}</div>
                                        <div className="text-green-100 mt-1">Platform Commission</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl shadow-lg">
                                        <ExclamationTriangleIcon className="h-10 w-10 mb-4 opacity-90" />
                                        <div className="text-3xl font-bold">Rs {stats.pendingCommission.toLocaleString()}</div>
                                        <div className="text-red-100 mt-1">Pending Collection</div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="font-bold text-gray-900 text-lg">Commission Collection</h4>
                                        <button
                                            onClick={exportReport}
                                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 flex items-center text-sm shadow-md"
                                        >
                                            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                                            Export Report
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-gray-600">Collected Commission</span>
                                                <span className="font-bold text-gray-900">Rs {stats.totalCommission.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${Math.min(100, stats.totalCommission > 0 ? (stats.totalCommission / (stats.totalCommission + stats.pendingCommission)) * 100 : 0)}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-gray-600">Pending Commission</span>
                                                <span className="font-bold text-red-600">Rs {stats.pendingCommission.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${Math.min(100, stats.pendingCommission > 0 ? (stats.pendingCommission / (stats.totalCommission + stats.pendingCommission)) * 100 : 0)}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Enhanced Footer */}
            <footer className="bg-white border-t border-gray-200 py-6 mt-8">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                        <ShieldCheckIcon className="h-4 w-4 text-purple-500" />
                        <span>© {new Date().getFullYear()} ArenaFinder Super Admin Portal</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span>v2.0.0</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-400 flex items-center justify-center">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        Last updated: {new Date().toLocaleString()}
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default SuperAdminDashboard;