// File: OwnerBookings.jsx - UPDATED for both Owner and Manager roles
import React, { useState, useEffect } from "react";
import integrationService from "../../services/integrationService";

const OwnerBookings = ({ isOwner, permissions = {} }) => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("upcoming");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState("upcoming");

  // In OwnerBookings.jsx
  const canViewBookings = isOwner || permissions.manage_bookings; // Management implies viewing
  const canManageBookings = isOwner || permissions.manage_bookings;
  const canViewFinancial = isOwner || permissions.view_financials;
  useEffect(() => {
    if (canViewBookings) {
      fetchBookings();
      fetchStats();
      const interval = setInterval(fetchBookings, 10000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, dateFrom, dateTo, activeTab, canViewBookings]);

  const fetchBookings = async () => {
    if (!canViewBookings) return;

    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (statusFilter !== "all") filters.status = statusFilter;

      // 🔥 Add arena filter if selected
      if (selectedArena) {
        filters.arena_id = selectedArena.arena_id;
      }

      if (activeTab === "upcoming") {
        filters.type = "upcoming";
      } else if (activeTab === "history") {
        filters.type = "history";
      }

      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;

      let data;
      if (isOwner) {
        data = await integrationService.getOwnerBookingRequests(filters);
      } else {
        // Manager endpoint - you'll need to implement this
        const token = localStorage.getItem("token");
        const response = await fetch(
          `http://localhost:5000/api/managers/bookings?${new URLSearchParams(filters)}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        data = await response.json();
      }

      const bookingsData = Array.isArray(data) ? data : data.bookings || [];

      if (activeTab === "upcoming") {
        const upcomingOnly = bookingsData.filter(b =>
          b.status === 'pending' || b.status === 'accepted'
        );
        setFilteredBookings(upcomingOnly);
      } else if (activeTab === "history") {
        const historyOnly = bookingsData.filter(b =>
          b.status === 'completed' || b.status === 'cancelled' || b.status === 'rejected'
        );
        setFilteredBookings(historyOnly);
      }

      setBookings(bookingsData);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setError(error.response?.data?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!canViewFinancial) return;

    try {
      if (isOwner) {
        const data = await integrationService.getOwnerBookingStats("month");
        setStats(data.period_stats || {});
      } else {
        // Manager stats endpoint
        const token = localStorage.getItem("token");
        const response = await fetch(
          "http://localhost:5000/api/managers/stats?period=month",
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const data = await response.json();
        setStats(data || {});
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

      if (isOwner) {
        await integrationService.acceptBookingRequest(bookingId);
      } else {
        const token = localStorage.getItem("token");
        await fetch(
          `http://localhost:5000/api/managers/bookings/${bookingId}/accept`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
      }

      // Update local state
      setBookings((prev) =>
        prev.map((b) =>
          b.booking_id === bookingId ? { ...b, status: "accepted" } : b
        )
      );

      if (activeTab === "upcoming") {
        setFilteredBookings((prev) =>
          prev.map((b) =>
            b.booking_id === bookingId ? { ...b, status: "accepted" } : b
          )
        );
      }

      alert("Booking accepted successfully!");
      fetchStats();
    } catch (error) {
      console.error("Error accepting booking:", error);
      alert(error.response?.data?.message || "Failed to accept booking");
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

      if (isOwner) {
        await integrationService.rejectBookingRequest(bookingId);
      } else {
        const token = localStorage.getItem("token");
        await fetch(
          `http://localhost:5000/api/managers/bookings/${bookingId}/reject`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
      }

      // Update local state
      setBookings((prev) =>
        prev.map((b) =>
          b.booking_id === bookingId ? { ...b, status: "rejected" } : b
        )
      );

      if (activeTab === "upcoming") {
        setFilteredBookings((prev) =>
          prev.filter((b) => b.booking_id !== bookingId)
        );
      }

      alert("Booking rejected successfully");
      fetchStats();
    } catch (error) {
      console.error("Error rejecting booking:", error);
      alert(error.response?.data?.message || "Failed to reject booking");
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
      const endpoint = isOwner
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
        setBookings((prev) =>
          prev.map((b) =>
            b.booking_id === bookingId ? { ...b, status: "completed" } : b
          )
        );

        if (activeTab === "upcoming") {
          setFilteredBookings((prev) =>
            prev.filter((b) => b.booking_id !== bookingId)
          );
        }

        alert("Booking marked as completed");
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

  // If user doesn't have permission to view bookings
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
        <p className="mt-2 text-xs text-gray-400">
          Required permission: view_bookings
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
            {isOwner ? "Booking Management" : "Booking Management"}
          </h1>
          {!isOwner && (
            <p className="text-sm text-gray-600 mt-1">
              {canManageBookings ? "You can accept/reject bookings" : "View-only access"}
            </p>
          )}
        </div>
        {canViewFinancial && (
          <div className="text-sm text-gray-600">
            Total Revenue:{" "}
            <span className="font-bold text-green-600">
              {formatCurrency(stats.total_revenue || 0)}
            </span>
          </div>
        )}
      </div>

      {/* Stats Overview - Only show if has financial permission */}
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

      {/* Main Tabs */}
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

        {/* Filters - Only for upcoming tab */}
        {activeTab === "upcoming" && (
          <div className="bg-white p-4 border-b">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                  onClick={() => {
                    fetchBookings();
                    fetchStats();
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bookings Content */}
        <div className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-600">Loading bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">
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
                    {filteredBookings.map((booking) => (
                      <tr key={booking.booking_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{booking.booking_id}
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
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(booking.date)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {booking.start_time} - {booking.end_time}
                            {activeTab === "upcoming" && isBookingTimePassed(booking) && (
                              <span className="ml-2 text-red-500">(Time Passed)</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(booking.total_amount)}
                          </div>
                          {canViewFinancial && booking.commission_amount > 0 && (
                            <div className="text-xs text-gray-500">
                              Commission: {formatCurrency(booking.commission_amount || 0)}
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
                            <div className="flex flex-col space-y-1 md:flex-row md:space-x-2 md:space-y-0">
                              {booking.status === "pending" && canManageBookings && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleAcceptBooking(booking.booking_id)
                                    }
                                    className="text-green-600 hover:text-green-900 text-sm"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleRejectBooking(booking.booking_id)
                                    }
                                    className="text-red-600 hover:text-red-900 text-sm"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {booking.status === "accepted" && canManageBookings && (
                                <button
                                  onClick={() =>
                                    handleCompleteBooking(booking.booking_id)
                                  }
                                  className="text-blue-600 hover:text-blue-900 text-sm"
                                >
                                  Complete
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedBooking(booking)}
                                className="text-gray-600 hover:text-gray-900 text-sm"
                              >
                                Details
                              </button>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">
                              {booking.cancellation_time || booking.booking_date}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 p-3">
                {filteredBookings.map((booking) => (
                  <div
                    key={booking.booking_id}
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          #{booking.booking_id}
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
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date:</span>
                        <span className="font-medium">
                          {formatDate(booking.date)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Time:</span>
                        <span className="font-medium">
                          {booking.start_time} - {booking.end_time}
                          {activeTab === "upcoming" && isBookingTimePassed(booking) && (
                            <span className="ml-2 text-red-500 text-xs">(Time Passed)</span>
                          )}
                        </span>
                      </div>
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
                                onClick={() =>
                                  handleAcceptBooking(booking.booking_id)
                                }
                                className="flex-1 px-3 py-1.5 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() =>
                                  handleRejectBooking(booking.booking_id)
                                }
                                className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {booking.status === "accepted" && canManageBookings && (
                            <button
                              onClick={() =>
                                handleCompleteBooking(booking.booking_id)
                              }
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
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer note - Role specific */}
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
                Booking Details
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
                    Time
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedBooking.start_time} - {selectedBooking.end_time}
                    {isBookingTimePassed(selectedBooking) && (
                      <span className="ml-2 text-red-500">(Time Has Passed)</span>
                    )}
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
                {canViewFinancial && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Commission
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatCurrency(selectedBooking.commission_amount || 0)}
                    </p>
                  </div>
                )}
              </div>
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