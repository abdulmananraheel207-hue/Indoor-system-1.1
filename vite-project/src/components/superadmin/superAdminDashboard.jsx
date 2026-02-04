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
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ClockIcon,
    EyeIcon,
    ArrowPathIcon,
    CalendarIcon,
    EnvelopeIcon,
    PhoneIcon,
    MapPinIcon,
    NoSymbolIcon,
    UserIcon,
    BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import integrationService from '../../services/integrationService';

// Users Tab Component
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
            {/* Search Bar */}
            <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center space-x-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search users by name, email, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="text-sm text-gray-500">
                        {filteredUsers.length} users found
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Users List */}
                <div className="lg:col-span-2">
                    <div className="bg-white border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b">
                            <h3 className="font-bold text-gray-900">All Users ({users.length})</h3>
                        </div>
                        <div className="divide-y">
                            {filteredUsers.map((user) => (
                                <div
                                    key={user.user_id}
                                    onClick={() => setSelectedUser(user)}
                                    className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${selectedUser?.user_id === user.user_id ? 'bg-blue-50' : ''
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                <UserIcon className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{user.name}</div>
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
                                            <div className="text-sm text-gray-500">
                                                {user.total_bookings || 0} bookings
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                Joined: {new Date(user.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* User Details Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white border rounded-lg sticky top-6">
                        <div className="bg-gray-50 px-6 py-4 border-b">
                            <h3 className="font-bold text-gray-900">User Details</h3>
                        </div>

                        {selectedUser ? (
                            <div className="p-6">
                                {/* User Info */}
                                <div className="mb-6">
                                    <div className="flex items-center space-x-4 mb-4">
                                        <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                                            <UserIcon className="h-8 w-8 text-blue-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-gray-900">{selectedUser.name}</h4>
                                            <p className="text-gray-600">{selectedUser.email}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {selectedUser.phone_number && (
                                            <div className="flex items-center text-gray-600">
                                                <PhoneIcon className="h-4 w-4 mr-2" />
                                                {selectedUser.phone_number}
                                            </div>
                                        )}
                                        <div className="flex items-center text-gray-600">
                                            <CalendarIcon className="h-4 w-4 mr-2" />
                                            Member since {new Date(selectedUser.created_at).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center text-gray-600">
                                            <CheckCircleIcon className={`h-4 w-4 mr-2 ${selectedUser.is_logged_in ? 'text-green-500' : 'text-gray-400'
                                                }`} />
                                            {selectedUser.is_logged_in ? 'Currently Online' : 'Offline'}
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Bookings */}
                                <div>
                                    <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                                        <CalendarIcon className="h-4 w-4 mr-2" />
                                        Recent Bookings
                                    </h5>
                                    {recentBookings[selectedUser.user_id]?.length > 0 ? (
                                        <div className="space-y-3">
                                            {recentBookings[selectedUser.user_id].slice(0, 5).map((booking) => (
                                                <div key={booking.booking_id} className="bg-gray-50 p-3 rounded-lg">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="font-medium">{booking.arena_name}</div>
                                                            <div className="text-sm text-gray-500">
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
                                        <div className="text-center py-4 text-gray-500">
                                            <XCircleIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                            <p>No bookings yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <UserIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Select a user to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Owners Tab Component
const OwnersTab = ({
    owners = [],
    arenas = [],
    onBlockOwner,
    onUnblockOwner,
    onMarkPaid
}) => {
    const [selectedOwner, setSelectedOwner] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const filteredOwners = owners.filter(owner =>
        owner.arena_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const ownerArenas = selectedOwner
        ? arenas.filter(arena => arena.owner_id === selectedOwner.owner_id)
        : [];

    const totalCommissionDue = ownerArenas.reduce((sum, arena) =>
        sum + (parseFloat(arena.pending_commission) || 0), 0
    );

    const handleBlockOwner = async (ownerId, arenaName) => {
        if (window.confirm(`Block "${arenaName}"? This will also block all their arenas.`)) {
            setActionLoading(true);
            try {
                const ownerArenasToBlock = arenas.filter(a => a.owner_id === ownerId);
                for (const arena of ownerArenasToBlock) {
                    await integrationService.toggleArenaBlock(arena.arena_id, {
                        is_blocked: true,
                        reason: 'Owner blocked by admin'
                    });
                }
                alert('✅ Owner and all arenas blocked!');
                onBlockOwner && onBlockOwner();
            } catch (error) {
                alert('❌ Failed to block owner: ' + error.message);
            } finally {
                setActionLoading(false);
            }
        }
    };

    const handleUnblockOwner = async (ownerId, arenaName) => {
        if (window.confirm(`Unblock "${arenaName}" and all their arenas?`)) {
            setActionLoading(true);
            try {
                const ownerArenasToUnblock = arenas.filter(a => a.owner_id === ownerId);
                for (const arena of ownerArenasToUnblock) {
                    await integrationService.toggleArenaBlock(arena.arena_id, {
                        action: 'unblock'
                    });
                }
                alert('✅ Owner and all arenas unblocked!');
                onUnblockOwner && onUnblockOwner();
            } catch (error) {
                alert('❌ Failed to unblock owner: ' + error.message);
            } finally {
                setActionLoading(false);
            }
        }
    };

    const handleMarkPaid = async (ownerId) => {
        if (window.confirm(`Mark all pending commission (Rs ${totalCommissionDue}) as paid for this owner?`)) {
            setActionLoading(true);
            try {
                for (const arena of ownerArenas) {
                    if (arena.pending_commission > 0) {
                        await integrationService.markArenaPayment(arena.arena_id, {
                            amount_paid: arena.pending_commission,
                            payment_date: new Date().toISOString().split('T')[0]
                        });
                    }
                }
                alert('✅ All commission marked as paid!');
                onMarkPaid && onMarkPaid();
            } catch (error) {
                alert('❌ Failed to mark as paid: ' + error.message);
            } finally {
                setActionLoading(false);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center space-x-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search owners by arena name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="text-sm text-gray-500">
                        {filteredOwners.length} owners found
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Owners List */}
                <div className="lg:col-span-2">
                    <div className="bg-white border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b">
                            <h3 className="font-bold text-gray-900">All Owners ({owners.length})</h3>
                        </div>
                        <div className="divide-y">
                            {filteredOwners.map((owner) => {
                                const ownerHasBlockedArenas = arenas.some(a =>
                                    a.owner_id === owner.owner_id && a.is_blocked
                                );

                                return (
                                    <div
                                        key={owner.owner_id}
                                        onClick={() => setSelectedOwner(owner)}
                                        className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${selectedOwner?.owner_id === owner.owner_id ? 'bg-blue-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${ownerHasBlockedArenas ? 'bg-red-100' : 'bg-green-100'
                                                    }`}>
                                                    <BuildingStorefrontIcon className={`h-5 w-5 ${ownerHasBlockedArenas ? 'text-red-600' : 'text-green-600'
                                                        }`} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 flex items-center">
                                                        {owner.arena_name}
                                                        {ownerHasBlockedArenas && (
                                                            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                                                                Blocked
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500 flex items-center mt-1">
                                                        <EnvelopeIcon className="h-3 w-3 mr-1" />
                                                        {owner.email}
                                                    </div>
                                                    <div className="text-sm text-gray-500 flex items-center mt-1">
                                                        <PhoneIcon className="h-3 w-3 mr-1" />
                                                        {owner.phone_number}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-gray-500">
                                                    {owner.total_arenas || 0} arenas
                                                </div>
                                                <div className="text-sm font-medium text-green-600 mt-1">
                                                    Rs {owner.revenue_from_bookings || 0}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Owner Details Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white border rounded-lg sticky top-6">
                        <div className="bg-gray-50 px-6 py-4 border-b">
                            <h3 className="font-bold text-gray-900">Owner Details</h3>
                        </div>

                        {selectedOwner ? (
                            <div className="p-6">
                                {/* Owner Info */}
                                <div className="mb-6">
                                    <div className="flex items-center space-x-4 mb-4">
                                        <div className={`h-16 w-16 rounded-full flex items-center justify-center ${ownerArenas.some(a => a.is_blocked) ? 'bg-red-100' : 'bg-green-100'
                                            }`}>
                                            <BuildingStorefrontIcon className={`h-8 w-8 ${ownerArenas.some(a => a.is_blocked) ? 'text-red-600' : 'text-green-600'
                                                }`} />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-gray-900">{selectedOwner.arena_name}</h4>
                                            <p className="text-gray-600">{selectedOwner.email}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center text-gray-600">
                                            <PhoneIcon className="h-4 w-4 mr-2" />
                                            {selectedOwner.phone_number}
                                        </div>
                                        {selectedOwner.business_address && (
                                            <div className="flex items-center text-gray-600">
                                                <MapPinIcon className="h-4 w-4 mr-2" />
                                                <span className="truncate">{selectedOwner.business_address}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center text-gray-600">
                                            <BuildingStorefrontIcon className="h-4 w-4 mr-2" />
                                            {ownerArenas.length} arenas • {selectedOwner.number_of_courts} total courts
                                        </div>
                                        <div className="flex items-center text-gray-600">
                                            <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                                            Total Revenue: Rs {selectedOwner.total_revenue || 0}
                                        </div>
                                    </div>
                                </div>

                                {/* Commission Status */}
                                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-semibold text-blue-900">Commission Status</h5>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${totalCommissionDue > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                            {totalCommissionDue > 0 ? 'Pending' : 'Paid'}
                                        </span>
                                    </div>
                                    <div className="text-2xl font-bold text-blue-900">
                                        Rs {totalCommissionDue.toLocaleString()}
                                    </div>
                                    <p className="text-sm text-blue-700 mt-1">
                                        Total pending commission from all arenas
                                    </p>

                                    {totalCommissionDue > 0 && (
                                        <button
                                            onClick={() => handleMarkPaid(selectedOwner.owner_id)}
                                            disabled={actionLoading}
                                            className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                                        >
                                            {actionLoading ? (
                                                'Processing...'
                                            ) : (
                                                <>
                                                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                                                    Mark All as Paid
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Arenas List */}
                                <div className="mb-6">
                                    <h5 className="font-semibold text-gray-900 mb-3">Arenas</h5>
                                    <div className="space-y-3">
                                        {ownerArenas.map((arena) => (
                                            <div key={arena.arena_id} className="bg-gray-50 p-3 rounded-lg">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-medium">{arena.name}</div>
                                                        <div className="text-sm text-gray-500">
                                                            {arena.address || 'No address'}
                                                        </div>
                                                        <div className="flex items-center mt-2 space-x-2">
                                                            {arena.is_blocked ? (
                                                                <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                                                                    Blocked
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                                                    Active
                                                                </span>
                                                            )}
                                                            {arena.pending_commission > 0 && (
                                                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                                                    Rs {arena.pending_commission} due
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-green-600">
                                                            Rs {arena.base_price_per_hour}/hr
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {arena.total_bookings || 0} bookings
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-3">
                                    {ownerArenas.some(a => a.is_blocked) ? (
                                        <button
                                            onClick={() => handleUnblockOwner(selectedOwner.owner_id, selectedOwner.arena_name)}
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                                        >
                                            <CheckCircleIcon className="h-4 w-4 mr-2" />
                                            Unblock Owner
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleBlockOwner(selectedOwner.owner_id, selectedOwner.arena_name)}
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                                        >
                                            <NoSymbolIcon className="h-4 w-4 mr-2" />
                                            Block Owner
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <BuildingStorefrontIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Select an owner to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Main SuperAdminDashboard Component
const SuperAdminDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [users, setUsers] = useState([]);
    const [owners, setOwners] = useState([]);
    const [arenas, setArenas] = useState([]);
    const [recentBookings, setRecentBookings] = useState({});
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

                // Set separate states for easier access
                setUsers(data.data.users || []);
                setOwners(data.data.owners || []);
                setArenas(data.data.arenas || []);

                // Group bookings by user for quick access
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

        console.log('📈 Updating stats with:', {
            overview,
            systemStats
        });

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

    const handleMarkPaid = async (arenaId, amount) => {
        if (window.confirm(`Mark Rs ${amount} as paid for this arena?`)) {
            try {
                await integrationService.markArenaPayment(arenaId, {
                    amount_paid: amount,
                    payment_date: new Date().toISOString().split('T')[0]
                });
                alert('✅ Payment marked as paid!');
                loadDashboard();
            } catch (error) {
                alert('❌ Failed to mark payment: ' + error.message);
            }
        }
    };

    const handleBlockArena = async (arenaId, arenaName) => {
        if (window.confirm(`Block "${arenaName}"? This will cancel all pending bookings.`)) {
            try {
                await integrationService.toggleArenaBlock(arenaId, {
                    is_blocked: true,
                    reason: 'Non-payment of commission'
                });
                alert('✅ Arena blocked!');
                loadDashboard();
            } catch (error) {
                alert('❌ Failed to block arena: ' + error.message);
            }
        }
    };

    const exportReport = () => {
        const startDate = prompt('Start date (YYYY-MM-DD):', '2024-01-01');
        const endDate = prompt('End date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);

        if (startDate && endDate) {
            window.open(
                `http://localhost:5000/api/super-admin/export/financial-report?format=excel&start_date=${startDate}&end_date=${endDate}`,
                '_blank'
            );
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading Super Admin Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900 to-blue-900 text-white">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center mb-4 md:mb-0">
                            <ShieldCheckIcon className="h-10 w-10 mr-3" />
                            <div>
                                <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
                                <p className="text-purple-200 text-sm">Complete System Control</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={loadDashboard}
                                className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors flex items-center"
                            >
                                <ArrowPathIcon className="h-4 w-4 mr-2" />
                                Refresh
                            </button>
                            <button
                                onClick={exportReport}
                                className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                            >
                                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                                Export Report
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4 mb-6">
                    {[
                        { label: 'Users', value: stats.totalUsers, icon: UsersIcon, color: 'text-blue-600', bg: 'bg-blue-100' },
                        { label: 'Owners', value: stats.totalOwners, icon: UserGroupIcon, color: 'text-green-600', bg: 'bg-green-100' },
                        { label: 'Arenas', value: stats.totalArenas, icon: BuildingStorefrontIcon, color: 'text-purple-600', bg: 'bg-purple-100' },
                        { label: 'Bookings', value: stats.totalBookings, icon: CalendarIcon, color: 'text-yellow-600', bg: 'bg-yellow-100' },
                        { label: 'Revenue', value: `Rs ${stats.totalRevenue.toLocaleString()}`, icon: CurrencyDollarIcon, color: 'text-emerald-600', bg: 'bg-emerald-100' },
                        { label: 'Commission', value: `Rs ${stats.totalCommission.toLocaleString()}`, icon: ChartBarIcon, color: 'text-indigo-600', bg: 'bg-indigo-100' },
                        { label: 'Pending', value: `Rs ${stats.pendingCommission.toLocaleString()}`, icon: ExclamationTriangleIcon, color: 'text-orange-600', bg: 'bg-orange-100' },
                        { label: 'Active', value: stats.activeArenas, icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-100' },
                        { label: 'Blocked', value: stats.blockedArenas, icon: XCircleIcon, color: 'text-red-600', bg: 'bg-red-100' }
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-white rounded-lg shadow-sm border p-4">
                            <div className={`${stat.bg} ${stat.color} h-10 w-10 rounded-lg flex items-center justify-center mb-2`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <div className="text-lg font-bold">{stat.value}</div>
                            <div className="text-xs text-gray-500">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-sm border mb-6">
                    <div className="border-b">
                        <nav className="flex space-x-2 px-6">
                            {[
                                { id: 'overview', label: 'Overview', icon: EyeIcon },
                                { id: 'users', label: 'Users', icon: UserGroupIcon },
                                { id: 'owners', label: 'Owners', icon: BuildingStorefrontIcon },
                                { id: 'pending', label: 'Pending Payments', icon: ExclamationTriangleIcon },
                                { id: 'bookings', label: 'Recent Bookings', icon: CalendarIcon },
                                { id: 'financial', label: 'Financial', icon: CurrencyDollarIcon }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg ${activeTab === tab.id
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <tab.icon className="h-4 w-4 mr-2" />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">System Overview</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="p-4 bg-blue-50 rounded-lg">
                                            <h4 className="font-semibold text-blue-800">Platform Health</h4>
                                            <p className="text-2xl font-bold text-blue-600 mt-2">Excellent</p>
                                            <p className="text-sm text-blue-600 mt-1">All systems operational</p>
                                        </div>
                                        <div className="p-4 bg-green-50 rounded-lg">
                                            <h4 className="font-semibold text-green-800">Active Today</h4>
                                            <p className="text-2xl font-bold text-green-600 mt-2">{stats.totalBookings}</p>
                                            <p className="text-sm text-green-600 mt-1">Total bookings</p>
                                        </div>
                                        <div className="p-4 bg-orange-50 rounded-lg">
                                            <h4 className="font-semibold text-orange-800">Attention Needed</h4>
                                            <p className="text-2xl font-bold text-orange-600 mt-2">
                                                {dashboardData?.pending_commissions?.length || 0}
                                            </p>
                                            <p className="text-sm text-orange-600 mt-1">Pending payments</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white border rounded-lg p-4">
                                        <h4 className="font-bold text-gray-900 mb-3">Quick Actions</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button className="p-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-center">
                                                <CurrencyDollarIcon className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                                                <div className="font-medium text-blue-800 text-sm">View Reports</div>
                                            </button>
                                            <button className="p-3 bg-red-50 hover:bg-red-100 rounded-lg text-center">
                                                <XCircleIcon className="h-6 w-6 text-red-600 mx-auto mb-2" />
                                                <div className="font-medium text-red-800 text-sm">Block Arena</div>
                                            </button>
                                            <button className="p-3 bg-green-50 hover:bg-green-100 rounded-lg text-center">
                                                <CheckCircleIcon className="h-6 w-6 text-green-600 mx-auto mb-2" />
                                                <div className="font-medium text-green-800 text-sm">Mark Paid</div>
                                            </button>
                                            <button className="p-3 bg-purple-50 hover:bg-purple-100 rounded-lg text-center">
                                                <ChartBarIcon className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                                                <div className="font-medium text-purple-800 text-sm">Analytics</div>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white border rounded-lg p-4">
                                        <h4 className="font-bold text-gray-900 mb-3">Platform Summary</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Monthly Commission</span>
                                                <span className="font-bold">Rs {stats.totalCommission.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Pending Collection</span>
                                                <span className="font-bold text-red-600">Rs {stats.pendingCommission.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Collection Rate</span>
                                                <span className="font-bold">
                                                    {stats.totalCommission > 0 ?
                                                        Math.round((stats.totalCommission / (stats.totalCommission + stats.pendingCommission)) * 100) : 0}%
                                                </span>
                                            </div>
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
                                <h3 className="text-lg font-bold text-gray-900">Pending Commission Payments</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full bg-white border rounded-lg">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Arena</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount Due</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Overdue</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {dashboardData.pending_commissions.map((commission) => (
                                                <tr key={commission.arena_id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium">{commission.arena_name}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div>{commission.owner_name}</div>
                                                        <div className="text-sm text-gray-500">{commission.owner_email}</div>
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-red-600">
                                                        Rs {commission.amount_due?.toLocaleString() || 0}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded-full text-xs ${commission.days_overdue > 30 ? 'bg-red-100 text-red-800' : commission.days_overdue > 15 ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                            {commission.days_overdue} days
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => handleMarkPaid(commission.arena_id, commission.amount_due)}
                                                                className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                                                            >
                                                                Mark Paid
                                                            </button>
                                                            <button
                                                                onClick={() => handleBlockArena(commission.arena_id, commission.arena_name)}
                                                                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                                                            >
                                                                Block Arena
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'bookings' && dashboardData?.recent_bookings && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-900">Recent Bookings</h3>
                                <div className="space-y-3">
                                    {dashboardData.recent_bookings.map((booking) => (
                                        <div key={booking.booking_id} className="bg-white border rounded-lg p-4 hover:bg-gray-50">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between">
                                                <div className="mb-3 md:mb-0">
                                                    <div className="font-bold">{booking.arena_name}</div>
                                                    <div className="text-gray-600">
                                                        {booking.user_name} • {booking.sport_name} • #{booking.booking_id}
                                                    </div>
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        {new Date(booking.booking_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xl font-bold text-green-600">
                                                        Rs {booking.total_amount}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        Commission: Rs {booking.commission_amount || 0}
                                                    </div>
                                                    <span className={`inline-flex mt-2 px-2 py-1 rounded-full text-xs ${booking.status === 'completed' ? 'bg-green-100 text-green-800' : booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
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
                                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl">
                                        <CurrencyDollarIcon className="h-10 w-10 mb-4" />
                                        <div className="text-2xl font-bold">Rs {stats.totalRevenue.toLocaleString()}</div>
                                        <div className="text-blue-100">Total Revenue</div>
                                    </div>

                                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl">
                                        <ChartBarIcon className="h-10 w-10 mb-4" />
                                        <div className="text-2xl font-bold">Rs {stats.totalCommission.toLocaleString()}</div>
                                        <div className="text-green-100">Platform Commission</div>
                                    </div>

                                    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-xl">
                                        <ExclamationTriangleIcon className="h-10 w-10 mb-4" />
                                        <div className="text-2xl font-bold">Rs {stats.pendingCommission.toLocaleString()}</div>
                                        <div className="text-red-100">Pending Collection</div>
                                    </div>
                                </div>

                                <div className="bg-white border rounded-lg p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="font-bold text-gray-900">Commission Collection</h4>
                                        <button
                                            onClick={exportReport}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center text-sm"
                                        >
                                            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                                            Export Report
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span>Collected Commission</span>
                                                <span className="font-bold">Rs {stats.totalCommission.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-3">
                                                <div
                                                    className="bg-green-600 h-3 rounded-full"
                                                    style={{
                                                        width: `${Math.min(100, stats.totalCommission > 0 ? (stats.totalCommission / (stats.totalCommission + stats.pendingCommission)) * 100 : 0)}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span>Pending Commission</span>
                                                <span className="font-bold text-red-600">Rs {stats.pendingCommission.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-3">
                                                <div
                                                    className="bg-red-600 h-3 rounded-full"
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

            {/* Footer */}
            <footer className="bg-white border-t py-4">
                <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
                    <p>© {new Date().getFullYear()} ArenaFinder Super Admin Portal</p>
                    <p className="mt-1">Last updated: {new Date().toLocaleString()}</p>
                </div>
            </footer>
        </div>
    );
};

export default SuperAdminDashboard;