// File: OwnerBookings.jsx - COMPLETE FIXED VERSION with multi-slot support
import React, { useState, useEffect } from "react";
import integrationService from "../../services/integrationService";

const OwnerBookings = ({ isOwner, permissions = {}, selectedArena = null }) => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState("upcoming");

  // 🔥 NEW: Force refresh counter
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Get arena-specific permissions from localStorage
  const [arenaPermissions, setArenaPermissions] = useState({});

  useEffect(() => {
    const storedArenaPerms = localStorage.getItem('arenaPermissions');
    if (storedArenaPerms) {
      try {
        setArenaPermissions(JSON.parse(storedArenaPerms));
      } catch (e) {
        console.error("Error parsing arena permissions:", e);
      }
    }
  }, []);

  const hasPermissionForSelectedArena = (permissionName) => {
    if (isOwner) return true;
    if (!selectedArena) return false;

    const arenaKey = `arena_${selectedArena.arena_id}`;
    const arenaPerms = arenaPermissions[arenaKey] || {};
    return arenaPerms[permissionName] || false;
  };

  const canViewBookings = isOwner || hasPermissionForSelectedArena('manage_bookings');
  const canManageBookings = isOwner || hasPermissionForSelectedArena('manage_bookings');
  const canViewFinancial = isOwner || hasPermissionForSelectedArena('view_financials');

  // 🔥 FIX: Fetch bookings whenever filters or selected arena changes
  useEffect(() => {
    if (canViewBookings && selectedArena) {
      console.log("📊 Fetching bookings for arena:", selectedArena.arena_id);
      fetchBookings();
      fetchStats();
    }
  }, [statusFilter, dateFrom, dateTo, activeTab, selectedArena, refreshCounter]);

  // 🔥 Auto-refresh every 10 seconds for pending bookings
  useEffect(() => {
    if (!canViewBookings) return;

    const interval = setInterval(() => {
      console.log("🔄 Auto-refreshing bookings...");
      setRefreshCounter(prev => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, [canViewBookings]);

  const fetchBookings = async () => {
    if (!canViewBookings) return;
    if (!selectedArena) {
      console.log("⚠️ No arena selected, skipping booking fetch");
      setBookings([]);
      setFilteredBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole");

      // Build query params
      const params = new URLSearchParams();
      params.append('arena_id', selectedArena.arena_id);

      if (statusFilter !== "all") {
        params.append('status', statusFilter);
      }

      if (dateFrom) {
        params.append('date_from', dateFrom);
      }

      if (dateTo) {
        params.append('date_to', dateTo);
      }

      console.log("🔍 Fetching with params:", params.toString());

      let endpoint;
      if (userRole === "owner") {
        endpoint = `http://localhost:5000/api/owners/bookings?${params.toString()}`;
      } else {
        endpoint = `http://localhost:5000/api/managers/bookings?${params.toString()}`;
      }

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("📥 Bookings received:", data);

      // Handle different response formats
      let bookingsData = [];
      if (Array.isArray(data)) {
        bookingsData = data;
      } else if (data.bookings && Array.isArray(data.bookings)) {
        bookingsData = data.bookings;
      } else if (data.data && Array.isArray(data.data)) {
        bookingsData = data.data;
      }

      console.log(`✅ Found ${bookingsData.length} total bookings`);

      // 🔍 DEBUG: Log the first booking to see its structure
      if (bookingsData.length > 0) {
        console.log("📋 First booking structure:", bookingsData[0]);
        console.log("🔑 Available fields in booking:", Object.keys(bookingsData[0]));
      }

      // Try multiple possible field names for arena ID
      const possibleArenaIdFields = ['arena_id', 'arenaId', 'arenaID', 'arena.id', 'arenaId.id'];

      const arenaFiltered = bookingsData.filter(b => {
        // Check each possible field
        const match = possibleArenaIdFields.some(field => {
          if (field.includes('.')) {
            // Handle nested fields like 'arena.id'
            const parts = field.split('.');
            let value = b;
            for (const part of parts) {
              if (value && value[part] !== undefined) {
                value = value[part];
              } else {
                return false;
              }
            }
            return value === selectedArena.arena_id;
          } else {
            // Direct field
            return b[field] === selectedArena.arena_id;
          }
        });

        if (match) {
          console.log(`✅ Booking ${b.booking_id} matches arena ${selectedArena.arena_id}`);
        }
        return match;
      });

      console.log(`🎯 After arena filter: ${arenaFiltered.length} bookings`);

      setBookings(arenaFiltered);

      // Apply tab filter
      if (activeTab === "upcoming") {
        const upcoming = arenaFiltered.filter(b =>
          b.status === 'pending' || b.status === 'accepted'
        );
        console.log(`📅 Upcoming bookings: ${upcoming.length}`);
        setFilteredBookings(upcoming);
      } else if (activeTab === "history") {
        const history = arenaFiltered.filter(b =>
          b.status === 'completed' || b.status === 'cancelled' || b.status === 'rejected'
        );
        console.log(`📜 History bookings: ${history.length}`);
        setFilteredBookings(history);
      }

    } catch (error) {
      console.error("❌ Error fetching bookings:", error);
      setError(error.message || "Failed to load bookings");
      setBookings([]);
      setFilteredBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!canViewFinancial || !selectedArena) return;

    try {
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole");

      let endpoint;
      if (userRole === "owner") {
        endpoint = `http://localhost:5000/api/owners/bookings/stats?period=month&arena_id=${selectedArena.arena_id}`;
      } else {
        endpoint = `http://localhost:5000/api/managers/stats?period=month&arena_id=${selectedArena.arena_id}`;
      }

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log("📊 Stats received:", data);

        if (userRole === "owner") {
          setStats(data.period_stats || {});
        } else {
          setStats(data || {});
        }
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
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
        alert("✅ Booking accepted successfully!");
        // Refresh both bookings and stats
        setRefreshCounter(prev => prev + 1);
        fetchStats();
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
        alert("✅ Booking rejected successfully");
        setRefreshCounter(prev => prev + 1);
        fetchStats();
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

  const handleCompleteBooking = async (bookingId) => {
    if (!canManageBookings) {
      alert("❌ You don't have permission to complete bookings");
      return;
    }

    if (!window.confirm("Mark this booking as completed?")) return;

    try {
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole");

      const endpoint = userRole === "owner"
        ? `http://localhost:5000/api/owners/bookings/${bookingId}/complete`
        : `http://localhost:5000/api/managers/bookings/${bookingId}/complete`;

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        alert("✅ Booking marked as completed");
        setRefreshCounter(prev => prev + 1);
        fetchStats();
      } else {
        const data = await response.json();
        alert(data.message || "Failed to complete booking");
      }
    } catch (error) {
      console.error("Error completing booking:", error);
      alert("An error occurred");
    }
  };

  const isBookingTimePassed = (booking) => {
    if (!booking.date || !booking.end_time) return false;
    const bookingDateTime = new Date(`${booking.date}T${booking.end_time}`);
    const now = new Date();
    return bookingDateTime < now;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "accepted":
        return "In Process";
      case "completed":
        return "Completed";
      case "rejected":
        return "Rejected";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
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

  if (!canViewBookings) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center">
        <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have permission to view bookings.
        </p>
      </div>
    );
  }

  if (!selectedArena) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center">
        <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">No Arena Selected</h3>
        <p className="mt-1 text-sm text-gray-500">
          Please select an arena from the dropdown above to view bookings.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
            Booking Management
            {selectedArena && (
              <span className="ml-2 text-sm font-normal text-blue-600">
                • {selectedArena.name}
              </span>
            )}
          </h1>
          {!isOwner && (
            <p className="text-sm text-gray-600 mt-1">
              {canManageBookings ? "You can accept/reject bookings" : "View-only access"}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {canViewFinancial && (
            <div className="text-sm text-gray-600">
              Total Revenue:{" "}
              <span className="font-bold text-green-600">
                {formatCurrency(stats.total_revenue || 0)}
              </span>
            </div>
          )}
          <button
            onClick={() => setRefreshCounter(prev => prev + 1)}
            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
            title="Refresh"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {canViewFinancial && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow">
            <div className="text-sm text-gray-500">Pending</div>
            <div className="text-2xl font-bold">
              {stats.pending_bookings || 0}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <div className="text-sm text-gray-500">Accepted</div>
            <div className="text-2xl font-bold">
              {stats.accepted_bookings || 0}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <div className="text-sm text-gray-500">Completed</div>
            <div className="text-2xl font-bold">
              {stats.completed_bookings || 0}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <div className="text-sm text-gray-500">Cancelled</div>
            <div className="text-2xl font-bold">
              {stats.cancelled_bookings || 0}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow mb-6">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`flex-1 px-6 py-3 text-sm font-medium ${activeTab === "upcoming"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Upcoming Bookings
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 px-6 py-3 text-sm font-medium ${activeTab === "history"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Booking History
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setRefreshCounter(prev => prev + 1)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Bookings Content */}
        <div className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-600">Loading bookings...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => setRefreshCounter(prev => prev + 1)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Try Again
              </button>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-gray-600">
                {activeTab === "upcoming"
                  ? "No upcoming bookings found"
                  : "No booking history found"}
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
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sport & Arena
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {activeTab === "upcoming" ? "Actions" : "Completed On"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBookings.map((booking) => {
                      const daysUntil = getDaysUntilBooking(booking);
                      const timePassed = isBookingTimePassed(booking);
                      const isMultiSlot = booking.is_multi_slot || booking.slot_count > 1;
                      const slotCount = booking.slot_count || 1;

                      return (
                        <tr key={booking.booking_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{booking.booking_id}
                            {isMultiSlot && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                {slotCount} slots
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {booking.user_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {booking.user_phone}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">
                              {booking.sport_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {booking.arena_name}
                              {booking.court_name && (
                                <span> • {booking.court_name}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">
                              {formatDate(booking.date)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {isMultiSlot ? (
                                <div>
                                  <div>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</div>
                                  <div className="text-purple-600 font-medium">
                                    {slotCount} consecutive slots
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                </div>
                              )}
                              {activeTab === "upcoming" && timePassed && (
                                <span className="ml-2 text-red-500">(Time Passed)</span>
                              )}
                            </div>
                            {daysUntil !== null && !timePassed && activeTab === "upcoming" && (
                              <div className={`text-xs mt-1 ${daysUntil === 0 ? 'text-yellow-600' :
                                daysUntil === 1 ? 'text-orange-600' : 'text-green-600'
                                }`}>
                                {daysUntil === 0 ? 'Today' :
                                  daysUntil === 1 ? 'Tomorrow' :
                                    `In ${daysUntil} days`}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              {formatCurrency(booking.total_amount)}
                            </div>
                            {canViewFinancial && booking.commission_amount > 0 && (
                              <div className="text-xs text-gray-500">
                                Commission: {formatCurrency(booking.commission_amount)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                booking.status
                              )}`}
                            >
                              {getStatusText(booking.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            {activeTab === "upcoming" ? (
                              <div className="flex flex-col space-y-1">
                                {booking.status === "pending" && canManageBookings && (
                                  <>
                                    <button
                                      onClick={() => handleAcceptBooking(booking.booking_id)}
                                      className="text-green-600 hover:text-green-900 text-sm text-left"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      onClick={() => handleRejectBooking(booking.booking_id)}
                                      className="text-red-600 hover:text-red-900 text-sm text-left"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                {booking.status === "accepted" && canManageBookings && (
                                  <button
                                    onClick={() => handleCompleteBooking(booking.booking_id)}
                                    className="text-blue-600 hover:text-blue-900 text-sm text-left"
                                  >
                                    Complete
                                  </button>
                                )}
                                <button
                                  onClick={() => setSelectedBooking(booking)}
                                  className="text-gray-600 hover:text-gray-900 text-sm text-left"
                                >
                                  Details
                                </button>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500">
                                {booking.cancellation_time ||
                                  booking.completed_at ||
                                  formatDate(booking.booking_date)}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 p-3">
                {filteredBookings.map((booking) => {
                  const daysUntil = getDaysUntilBooking(booking);
                  const timePassed = isBookingTimePassed(booking);
                  const isMultiSlot = booking.is_multi_slot || booking.slot_count > 1;
                  const slotCount = booking.slot_count || 1;

                  return (
                    <div
                      key={booking.booking_id}
                      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-medium text-gray-900">
                            #{booking.booking_id}
                            {isMultiSlot && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                {slotCount} slots
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {booking.user_name}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {getStatusText(booking.status)}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Sport:</span>
                          <span className="font-medium">{booking.sport_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Arena:</span>
                          <span className="font-medium">{booking.arena_name}</span>
                        </div>
                        {booking.court_name && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Court:</span>
                            <span className="font-medium">{booking.court_name}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">Date:</span>
                          <span className="font-medium">
                            {formatDate(booking.date)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Time:</span>
                          <span className="font-medium">
                            {isMultiSlot ? (
                              <div className="text-right">
                                <div>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</div>
                                <div className="text-purple-600 text-xs">{slotCount} consecutive slots</div>
                              </div>
                            ) : (
                              <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                            )}
                          </span>
                        </div>
                        {daysUntil !== null && !timePassed && activeTab === "upcoming" && (
                          <div className={`flex justify-between ${daysUntil === 0 ? 'text-yellow-600' :
                            daysUntil === 1 ? 'text-orange-600' : 'text-green-600'
                            }`}>
                            <span className="text-gray-500">When:</span>
                            <span className="font-medium">
                              {daysUntil === 0 ? 'Today' :
                                daysUntil === 1 ? 'Tomorrow' :
                                  `In ${daysUntil} days`}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">Amount:</span>
                          <span className="font-medium">
                            {formatCurrency(booking.total_amount)}
                          </span>
                        </div>
                        {canViewFinancial && booking.commission_amount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Commission:</span>
                            <span className="font-medium">
                              {formatCurrency(booking.commission_amount)}
                            </span>
                          </div>
                        )}
                      </div>

                      {activeTab === "upcoming" && (
                        <div className="mt-4 pt-3 border-t">
                          <div className="flex flex-wrap gap-2">
                            {booking.status === "pending" && canManageBookings && (
                              <>
                                <button
                                  onClick={() => handleAcceptBooking(booking.booking_id)}
                                  className="flex-1 px-3 py-1.5 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleRejectBooking(booking.booking_id)}
                                  className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {booking.status === "accepted" && canManageBookings && (
                              <button
                                onClick={() => handleCompleteBooking(booking.booking_id)}
                                className="flex-1 px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200"
                              >
                                Complete
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedBooking(booking)}
                              className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                            >
                              Details
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

        {/* Footer note */}
        <div className="px-4 py-3 bg-gray-50 border-t text-center">
          <p className="text-xs text-gray-500">
            {canManageBookings
              ? "Pending bookings can be accepted or rejected"
              : "View-only access - You cannot modify bookings"
            }
          </p>
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-3 md:p-0">
          <div className="relative top-4 mx-auto p-4 border w-full shadow-lg rounded-md bg-white md:top-20 md:p-5 md:max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-medium text-gray-900 md:text-lg">
                Booking Details {selectedBooking.is_multi_slot && `(${selectedBooking.slot_count} slots)`}
              </h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-400 hover:text-gray-500 text-lg"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto max-h-[70vh] md:max-h-none">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Booking ID
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    #{selectedBooking.booking_id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <p className="mt-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        selectedBooking.status
                      )}`}
                    >
                      {getStatusText(selectedBooking.status)}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Customer Name
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedBooking.user_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Customer Phone
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedBooking.user_phone}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Sport
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedBooking.sport_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Arena
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedBooking.arena_name}
                  </p>
                </div>
                {selectedBooking.court_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Court
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedBooking.court_name}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(selectedBooking.date)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Time Range
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatTime(selectedBooking.start_time)} - {formatTime(selectedBooking.end_time)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Total Amount
                  </label>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {formatCurrency(selectedBooking.total_amount)}
                  </p>
                </div>
                {canViewFinancial && selectedBooking.commission_amount > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Commission
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatCurrency(selectedBooking.commission_amount)}
                    </p>
                  </div>
                )}
              </div>

              {/* Multi-slot details section */}
              {selectedBooking.is_multi_slot && selectedBooking.slot_count > 1 && (
                <div className="border-t pt-4 mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    All Time Slots ({selectedBooking.slot_count} slots)
                  </label>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {selectedBooking.all_slots && selectedBooking.all_slots.length > 0 ? (
                        selectedBooking.all_slots.map((slot, index) => (
                          <div key={index} className="flex justify-between items-center text-sm border-b border-gray-200 pb-2 last:border-0">
                            <div className="text-gray-600 font-medium">Slot {index + 1}</div>
                            <div className="text-gray-800">
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </div>
                            <div className="text-gray-600">Rs {slot.price}</div>
                          </div>
                        ))
                      ) : (
                        // Fallback if all_slots is not available
                        <div className="text-sm text-gray-600">
                          <div className="flex justify-between py-1">
                            <span>Main Slot:</span>
                            <span>{formatTime(selectedBooking.start_time)} - {formatTime(selectedBooking.end_time)}</span>
                          </div>
                          <div className="text-purple-600 text-xs mt-2">
                            {selectedBooking.slot_count} consecutive slots • Total duration: {selectedBooking.slot_count} hours
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Booking creation time */}
              {selectedBooking.booking_date && (
                <div className="border-t pt-4 mt-2">
                  <p className="text-xs text-gray-500">
                    Booked on: {new Date(selectedBooking.booking_date).toLocaleString()}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="flex justify-end">
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerBookings;