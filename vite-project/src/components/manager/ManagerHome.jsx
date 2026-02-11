// components/manager/ManagerHome.jsx - UPDATED TO MATCH OWNER HOME
import React, { useState, useEffect } from "react";

const ManagerHome = ({
    managerData,
    permissions,
    refreshData,
    refreshStats
}) => {
    const [stats, setStats] = useState(managerData?.stats || {});
    const [recentActivity, setRecentActivity] = useState(
        managerData?.pending_requests || []
    );
    const [loading, setLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);

    useEffect(() => {
        if (managerData) {
            setStats(managerData.stats || {});
            setRecentActivity(managerData.pending_requests || []);
        }
    }, [managerData]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return "";
        const time = new Date(`2000-01-01T${timeStr}`);
        return time.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    // Only if manager has manage_bookings permission
    const handleAcceptBooking = async (bookingId) => {
        if (!permissions.manage_bookings) {
            alert("You don't have permission to manage bookings");
            return;
        }

        if (!window.confirm("Are you sure you want to accept this booking?"))
            return;

        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const response = await fetch(
                `http://localhost:5000/api/managers/bookings/${bookingId}/accept`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.ok) {
                setRecentActivity((prev) =>
                    prev.filter((b) => b.booking_id !== bookingId)
                );

                const updatedStats = {
                    ...stats,
                    pending_requests_count: (stats.pending_requests_count || 1) - 1,
                    today_bookings: (stats.today_bookings || 0) + 1
                };
                setStats(updatedStats);

                const statsToSave = {
                    ...updatedStats,
                    lastUpdated: new Date().toISOString()
                };
                localStorage.setItem('managerDashboardStats', JSON.stringify(statsToSave));

                alert("✅ Booking accepted successfully!");

                if (refreshData) refreshData();
                if (refreshStats) refreshStats();
            } else {
                const data = await response.json();
                alert(`❌ ${data.message || "Failed to accept booking"}`);
            }
        } catch (error) {
            console.error("Error accepting booking:", error);
            alert("❌ An error occurred while accepting the booking");
        } finally {
            setLoading(false);
        }
    };

    const handleRejectBooking = async (bookingId) => {
        if (!permissions.manage_bookings) {
            alert("You don't have permission to manage bookings");
            return;
        }

        if (!window.confirm("Are you sure you want to reject this booking?"))
            return;

        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const response = await fetch(
                `http://localhost:5000/api/managers/bookings/${bookingId}/reject`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ reason: "Rejected by manager" })
                }
            );

            if (response.ok) {
                setRecentActivity((prev) =>
                    prev.filter((b) => b.booking_id !== bookingId)
                );

                const updatedStats = {
                    ...stats,
                    pending_requests_count: (stats.pending_requests_count || 1) - 1
                };
                setStats(updatedStats);

                const statsToSave = {
                    ...updatedStats,
                    lastUpdated: new Date().toISOString()
                };
                localStorage.setItem('managerDashboardStats', JSON.stringify(statsToSave));

                alert("✅ Booking rejected successfully");

                if (refreshData) refreshData();
                if (refreshStats) refreshStats();
            } else {
                const data = await response.json();
                alert(`❌ ${data.message || "Failed to reject booking"}`);
            }
        } catch (error) {
            console.error("Error rejecting booking:", error);
            alert("❌ An error occurred while rejecting the booking");
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshAll = async () => {
        setStatsLoading(true);
        try {
            if (refreshData) await refreshData();
            if (refreshStats) await refreshStats();
        } finally {
            setStatsLoading(false);
        }
    };

    const isBookingTimePassed = (booking) => {
        if (!booking.date || !booking.end_time) return false;
        const bookingDateTime = new Date(`${booking.date}T${booking.end_time}:00`);
        const now = new Date();
        return bookingDateTime < now;
    };

    const getDaysUntilBooking = (booking) => {
        if (!booking.date) return null;
        const bookingDate = new Date(booking.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        bookingDate.setHours(0, 0, 0, 0);
        const diffTime = bookingDate - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    if (!permissions.view_dashboard) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <div className="text-yellow-600 mb-2">⚠️</div>
                <h3 className="text-lg font-medium text-yellow-800">Dashboard Access Restricted</h3>
                <p className="text-yellow-600 mt-2">You need view_dashboard permission to access this section</p>
            </div>
        );
    }

    return (
        <div>
            {/* Stats Header with Refresh Button */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
                    Dashboard Overview
                </h1>
                {permissions.view_dashboard && (
                    <button
                        onClick={handleRefreshAll}
                        disabled={statsLoading}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {statsLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Refreshing...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh All
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Stats Overview - PERMISSION GATED */}
            <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-2 lg:grid-cols-4 md:gap-6">
                {/* Today's Bookings - Always visible if view_dashboard */}
                <div className="bg-white p-4 rounded-xl shadow">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg mr-3">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Today's Bookings</p>
                            <p className="text-xl font-bold text-gray-900">
                                {stats.today_bookings || 0}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Today's Revenue - Only if view_financial */}
                {permissions.view_financial && (
                    <div className="bg-white p-4 rounded-xl shadow">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg mr-3">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Today's Revenue</p>
                                <p className="text-xl font-bold text-gray-900">
                                    {formatCurrency(stats.today_revenue || 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Monthly Revenue - Only if view_financial */}
                {permissions.view_financial && (
                    <div className="bg-white p-4 rounded-xl shadow">
                        <div className="flex items-center">
                            <div className="p-2 bg-purple-100 rounded-lg mr-3">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Monthly Revenue</p>
                                <p className="text-xl font-bold text-gray-900">
                                    {formatCurrency(stats.monthly_revenue || 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pending Requests - Only if view_bookings or manage_bookings */}
                {(permissions.view_bookings || permissions.manage_bookings) && (
                    <div className="bg-white p-4 rounded-xl shadow">
                        <div className="flex items-center">
                            <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Pending Requests</p>
                                <p className="text-xl font-bold text-gray-900">
                                    {stats.pending_requests_count || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Lost Revenue - Only if view_financial */}
            {permissions.view_financial && stats.total_lost_revenue > 0 && (
                <div className="bg-white p-4 rounded-xl shadow mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="p-2 bg-red-100 rounded-lg mr-3">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Lost Revenue (Cancellations)</p>
                                <p className="text-lg font-bold text-red-600">
                                    {formatCurrency(stats.total_lost_revenue || 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Requests Section - Only if view_bookings or manage_bookings */}
            {(permissions.view_bookings || permissions.manage_bookings) && recentActivity.length > 0 && (
                <div className="bg-white rounded-xl shadow mb-6">
                    <div className="p-4 border-b">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Pending Booking Requests
                                </h2>
                                <p className="text-sm text-gray-600">
                                    Review and accept/reject new booking requests
                                </p>
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800">
                                    {recentActivity.length} requests
                                </span>
                            </div>
                        </div>
                    </div>

                    {loading && (
                        <div className="p-4 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="mt-2 text-sm text-gray-600">Processing...</p>
                        </div>
                    )}

                    <div className="p-4">
                        {/* Same table structure as OwnerHome */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Customer Details
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Booking Details
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Time & Date
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        {permissions.manage_bookings && (
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {recentActivity.map((booking) => {
                                        const daysUntil = getDaysUntilBooking(booking);
                                        const timePassed = isBookingTimePassed(booking);

                                        return (
                                            <tr key={booking.booking_id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <div className="font-medium text-gray-900">
                                                            {booking.user_name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {booking.user_phone}
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                            {booking.user_email}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-900">
                                                        <span className="font-medium">{booking.sport_name}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {booking.arena_name}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {formatDate(booking.date)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                                    </div>
                                                    {daysUntil !== null && (
                                                        <div className={`mt-1 text-xs ${timePassed ? 'text-red-600' : daysUntil <= 1 ? 'text-yellow-600' : 'text-green-600'}`}>
                                                            {timePassed ? '⏰ Time has passed' :
                                                                daysUntil === 0 ? '📅 Today' :
                                                                    daysUntil === 1 ? '📅 Tomorrow' :
                                                                        `📅 In ${daysUntil} days`}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-lg font-semibold text-gray-900">
                                                        {formatCurrency(booking.total_amount)}
                                                    </div>
                                                    {booking.commission_amount > 0 && permissions.view_financial && (
                                                        <div className="text-xs text-gray-500">
                                                            Commission: {formatCurrency(booking.commission_amount)}
                                                        </div>
                                                    )}
                                                </td>
                                                {permissions.manage_bookings && (
                                                    <td className="px-4 py-3">
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => handleAcceptBooking(booking.booking_id)}
                                                                disabled={loading}
                                                                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
                                                            >
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                Accept
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectBooking(booking.booking_id)}
                                                                disabled={loading}
                                                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
                                                            >
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                                Reject
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile view */}
                        <div className="md:hidden space-y-3">
                            {recentActivity.map((booking) => {
                                const daysUntil = getDaysUntilBooking(booking);
                                const timePassed = isBookingTimePassed(booking);

                                return (
                                    <div key={booking.booking_id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                        {/* Same card structure as OwnerHome */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {booking.user_name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {booking.user_phone}
                                                </div>
                                            </div>
                                            <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                                Pending
                                            </span>
                                        </div>

                                        {/* Booking details */}
                                        <div className="space-y-2 text-sm mb-4">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Sport:</span>
                                                <span className="font-medium">{booking.sport_name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Date:</span>
                                                <span className="font-medium">{formatDate(booking.date)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Time:</span>
                                                <span className="font-medium">
                                                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Amount:</span>
                                                <span className="font-semibold text-lg">
                                                    {formatCurrency(booking.total_amount)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions if manage_bookings permission */}
                                        {permissions.manage_bookings && (
                                            <div className="pt-3 border-t">
                                                <div className="flex flex-col space-y-2">
                                                    <button
                                                        onClick={() => handleAcceptBooking(booking.booking_id)}
                                                        disabled={loading}
                                                        className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                                                    >
                                                        Accept Booking
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectBooking(booking.booking_id)}
                                                        disabled={loading}
                                                        className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                                                    >
                                                        Reject Booking
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Tips - Only if has any booking-related permission */}
            {(permissions.view_bookings || permissions.manage_bookings) && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-blue-900">Quick Tips</p>
                            <ul className="mt-1 text-xs text-blue-700 space-y-1">
                                {permissions.manage_bookings && (
                                    <>
                                        <li>• Accept bookings promptly to confirm reservations</li>
                                        <li>• Reject bookings if the time slot is unavailable</li>
                                    </>
                                )}
                                <li>• View all accepted bookings in the "Bookings" tab</li>
                                <li>• Check booking history in the "Bookings" page under History tab</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerHome;