// File: OwnerHome.jsx - UPDATED with proper arena filtering
import React, { useState, useEffect } from "react";

const OwnerHome = ({
  userData,
  refreshData,
  refreshStats,
  isOwner,
  permissions = {},
  selectedArena = null
}) => {
  // 🔥 FIX: Handle both owner and manager data structures
  const [stats, setStats] = useState(() => {
    if (isOwner) {
      return userData?.dashboard || {};
    } else {
      // Manager - combine stats from both places
      return {
        today_bookings: userData?.stats?.today_bookings || 0,
        today_revenue: userData?.stats?.today_revenue || 0,
        monthly_revenue: userData?.stats?.monthly_revenue || 0,
        pending_requests_count: userData?.pending_requests?.length ||
          userData?.pending_bookings?.length || 0,
        total_arenas: userData?.arenas?.length || 0,
        ...userData?.stats
      };
    }
  });

  // 🔥 NEW: State for arena-specific stats
  const [arenaSpecificStats, setArenaSpecificStats] = useState({
    today_bookings: 0,
    today_revenue: 0,
    monthly_revenue: 0,
    pending_requests_count: 0
  });

  const [recentActivity, setRecentActivity] = useState(
    userData?.pending_requests || userData?.pending_bookings || []
  );
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // Permission checks
  const canViewFinancial = isOwner || permissions.view_financials;
  const canManageBookings = isOwner || permissions.manage_bookings;
  const canViewBookings = canManageBookings;

  // 🔥 DEBUG: Update arena-specific stats when selectedArena changes or stats update
  useEffect(() => {
    console.log("🔍 DEBUG: selectedArena changed:", selectedArena);
    console.log("🔍 DEBUG: userData:", userData);
    console.log("🔍 DEBUG: userData.arena_stats:", userData?.arena_stats);

    if (!selectedArena) {
      console.log("📊 No arena selected, using global stats");
      setArenaSpecificStats({
        today_bookings: stats.today_bookings || 0,
        today_revenue: stats.today_revenue || 0,
        monthly_revenue: stats.monthly_revenue || 0,
        pending_requests_count: stats.pending_requests_count || 0
      });
      return;
    }

    // Try to get arena-specific stats from userData.arena_stats
    if (userData?.arena_stats && Array.isArray(userData.arena_stats)) {
      console.log("📊 arena_stats array:", userData.arena_stats);

      const arenaStat = userData.arena_stats.find(
        stat => {
          console.log("Comparing:", stat.arena_id, "vs", selectedArena.arena_id);
          return stat.arena_id === selectedArena.arena_id;
        }
      );

      if (arenaStat) {
        console.log("✅ Found arena-specific stats:", arenaStat);
        console.log("📊 arenaStat fields:", Object.keys(arenaStat));

        setArenaSpecificStats({
          today_bookings: arenaStat.today_bookings || 0,
          today_revenue: arenaStat.today_revenue || 0,
          monthly_revenue: arenaStat.total_revenue || 0,
          pending_requests_count: arenaStat.pending_bookings || 0
        });
        return;
      } else {
        console.log("❌ No matching arena stat found for ID:", selectedArena.arena_id);
      }
    } else {
      console.log("❌ No arena_stats in userData or not an array");
    }

    // If no arena-specific stats, use filtered pending requests count
    if (userData?.pending_requests) {
      const arenaPending = userData.pending_requests.filter(
        req => req.arena_id === selectedArena.arena_id
      ).length;
      console.log(`📊 Found ${arenaPending} pending requests for this arena`);

      setArenaSpecificStats(prev => ({
        ...prev,
        pending_requests_count: arenaPending
      }));
    } else {
      // Fallback to global stats
      console.log("📊 Falling back to global stats");
      setArenaSpecificStats({
        today_bookings: stats.today_bookings || 0,
        today_revenue: stats.today_revenue || 0,
        monthly_revenue: stats.monthly_revenue || 0,
        pending_requests_count: stats.pending_requests_count || 0
      });
    }
  }, [selectedArena, userData, stats]);

  // 🔥 NEW: Filter pending requests by selected arena
  useEffect(() => {
    if (!userData) return;

    let pendingItems = userData.pending_requests || userData.pending_bookings || [];

    if (selectedArena && pendingItems.length > 0) {
      const filtered = pendingItems.filter(item =>
        item.arena_id === selectedArena.arena_id ||
        item.arenaId === selectedArena.arena_id ||
        item.arena?.id === selectedArena.arena_id
      );
      console.log(`📋 Filtered ${filtered.length} pending requests for arena ${selectedArena.arena_id}`);
      setRecentActivity(filtered);
    } else {
      setRecentActivity(pendingItems);
    }
  }, [selectedArena, userData]);

  useEffect(() => {
    if (userData) {
      // Handle different API response structures
      if (isOwner) {
        setStats(userData.dashboard || {});
      } else {
        // Manager dashboard response structure
        setStats({
          today_bookings: userData?.stats?.today_bookings || 0,
          today_revenue: userData?.stats?.today_revenue || 0,
          monthly_revenue: userData?.stats?.monthly_revenue || 0,
          pending_requests_count: userData?.pending_requests?.length ||
            userData?.pending_bookings?.length || 0,
          total_arenas: userData?.arenas?.length || 0,
          ...userData?.stats
        });
      }
    }
  }, [userData, isOwner]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
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

  const handleAcceptBooking = async (bookingId) => {
    if (!canManageBookings) {
      alert("❌ You don't have permission to accept bookings");
      return;
    }

    if (!window.confirm("Are you sure you want to accept this booking?"))
      return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole");

      const endpoint = userRole === "owner"
        ? `http://localhost:5000/api/owners/bookings/${bookingId}/accept`
        : `http://localhost:5000/api/managers/bookings/${bookingId}/accept`;

      console.log(`📤 Accepting booking at: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setRecentActivity((prev) =>
          prev.filter((b) => b.booking_id !== bookingId)
        );

        // Update arena-specific stats
        setArenaSpecificStats(prev => ({
          ...prev,
          pending_requests_count: Math.max(prev.pending_requests_count - 1, 0),
          today_bookings: prev.today_bookings + 1
        }));

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
    if (!canManageBookings) {
      alert("❌ You don't have permission to reject bookings");
      return;
    }

    if (!window.confirm("Are you sure you want to reject this booking?"))
      return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole");

      const endpoint = userRole === "owner"
        ? `http://localhost:5000/api/owners/bookings/${bookingId}/reject`
        : `http://localhost:5000/api/managers/bookings/${bookingId}/reject`;

      console.log(`📤 Rejecting booking at: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setRecentActivity((prev) =>
          prev.filter((b) => b.booking_id !== bookingId)
        );

        // Update arena-specific stats
        setArenaSpecificStats(prev => ({
          ...prev,
          pending_requests_count: Math.max(prev.pending_requests_count - 1, 0)
        }));

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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getRoleTitle = () => {
    if (isOwner) return "Dashboard Overview";
    return "Manager Dashboard";
  };

  // 🔥 Determine which stats to display - use arena-specific stats when arena is selected
  const displayStats = selectedArena ? arenaSpecificStats : stats;

  return (
    <div>
      {/* Stats Header with Refresh Button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
            {getRoleTitle()}
            {selectedArena && (
              <span className="ml-2 text-sm font-normal text-blue-600">
                • {selectedArena.name}
              </span>
            )}
          </h1>
          {!isOwner && (
            <p className="text-sm text-gray-600 mt-1">
              You have {Object.values(permissions).filter(Boolean).length} permissions
            </p>
          )}
        </div>
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
      </div>

      {/* Arena Selection Indicator */}
      {selectedArena && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-blue-700">
              Showing data for <span className="font-semibold">{selectedArena.name}</span>
            </p>
          </div>
        </div>
      )}

      {/* Stats Overview - Now showing arena-specific stats */}
      <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-2 lg:grid-cols-4 md:gap-6">
        {/* Today's Bookings */}
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
                {displayStats.today_bookings || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Today's Revenue - Only if has financial permission */}
        {(isOwner || canViewFinancial) && (
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
                  {formatCurrency(displayStats.today_revenue || 0)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Revenue - Only if has financial permission */}
        {(isOwner || canViewFinancial) && (
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
                  {formatCurrency(displayStats.monthly_revenue || 0)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pending Requests */}
        {(isOwner || canViewBookings || canManageBookings) && (
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
                  {displayStats.pending_requests_count || 0}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional Stats - Only for Owners or Managers with financial permission */}
      {(isOwner || canViewFinancial) && stats.total_lost_revenue > 0 && (
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

      {/* Pending Requests Section */}
      {(isOwner || canViewBookings || canManageBookings) && (
        <div className="bg-white rounded-xl shadow">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Pending Booking Requests
                  {selectedArena && (
                    <span className="ml-2 text-sm font-normal text-blue-600">
                      • {selectedArena.name}
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-600">
                  {canManageBookings
                    ? "Review and accept/reject new booking requests"
                    : "View pending booking requests"
                  }
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
            {recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No pending requests</h3>
                <p className="mt-1 text-sm text-gray-500">
                  All booking requests have been processed
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
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
                        {canManageBookings && (
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
                              {(isOwner || canViewFinancial) && booking.commission_amount > 0 && (
                                <div className="text-xs text-gray-500">
                                  Commission: {formatCurrency(booking.commission_amount)}
                                </div>
                              )}
                            </td>
                            {canManageBookings && (
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

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {recentActivity.map((booking) => {
                    const daysUntil = getDaysUntilBooking(booking);
                    const timePassed = isBookingTimePassed(booking);

                    return (
                      <div
                        key={booking.booking_id}
                        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                      >
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

                        <div className="space-y-2 text-sm mb-4">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Sport:</span>
                            <span className="font-medium">{booking.sport_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Arena:</span>
                            <span className="font-medium">{booking.arena_name}</span>
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
                          {daysUntil !== null && (
                            <div className={`flex justify-between ${timePassed ? 'text-red-600' : daysUntil <= 1 ? 'text-yellow-600' : 'text-green-600'}`}>
                              <span className="text-gray-500">Status:</span>
                              <span className="text-xs font-medium">
                                {timePassed ? '⏰ Time has passed' :
                                  daysUntil === 0 ? '📅 Today' :
                                    daysUntil === 1 ? '📅 Tomorrow' :
                                      `📅 In ${daysUntil} days`}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-500">Amount:</span>
                            <span className="font-semibold text-lg">
                              {formatCurrency(booking.total_amount)}
                            </span>
                          </div>
                          {(isOwner || canViewFinancial) && booking.commission_amount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Commission:</span>
                              <span className="font-medium">
                                {formatCurrency(booking.commission_amount)}
                              </span>
                            </div>
                          )}
                        </div>

                        {canManageBookings && (
                          <div className="pt-3 border-t">
                            <div className="flex flex-col space-y-2">
                              <button
                                onClick={() => handleAcceptBooking(booking.booking_id)}
                                disabled={loading}
                                className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Accept Booking
                              </button>
                              <button
                                onClick={() => handleRejectBooking(booking.booking_id)}
                                disabled={loading}
                                className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Reject Booking
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="px-4 py-3 bg-gray-50 border-t text-center">
            <p className="text-xs text-gray-500">
              {canManageBookings
                ? "Pending bookings will automatically move to the Bookings page when accepted or rejected"
                : "View only - You don't have permission to manage bookings"
              }
            </p>
          </div>
        </div>
      )}

      {/* Quick Tips */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900">
              {isOwner ? "Quick Tips for Owners" : "Quick Tips for Managers"}
            </p>
            <ul className="mt-1 text-xs text-blue-700 space-y-1">
              {isOwner ? (
                <>
                  <li>• Accept bookings promptly to confirm reservations</li>
                  <li>• Reject bookings if the time slot is unavailable</li>
                  <li>• View all accepted bookings in the "Bookings" tab</li>
                  <li>• Add managers from the "Managers" tab to delegate tasks</li>
                  {selectedArena && (
                    <li className="text-blue-800 font-medium">
                      • Currently viewing: {selectedArena.name}
                    </li>
                  )}
                </>
              ) : (
                <>
                  {canManageBookings && <li>• You can accept and reject booking requests</li>}
                  {canViewBookings && <li>• View all bookings in the "Bookings" tab</li>}
                  {permissions.manage_calendar && <li>• Manage time slots in the "Calendar" tab</li>}
                  {permissions.manage_arena && <li>• Update arena and court settings</li>}
                  {!canManageBookings && !permissions.manage_calendar && !permissions.manage_arena && (
                    <li>• You have view-only access to this dashboard</li>
                  )}
                  {selectedArena && (
                    <li className="text-blue-800 font-medium">
                      • Currently viewing: {selectedArena.name}
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerHome;