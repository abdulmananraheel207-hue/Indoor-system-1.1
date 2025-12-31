// File: OwnerBookings.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from "react";
import integrationService from "../../services/integrationService";

const OwnerBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending"); // all, pending, accepted, completed, rejected, cancelled
  const [typeFilter, setTypeFilter] = useState("all"); // all, upcoming, past
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchBookings();
    fetchStats();
    const interval = setInterval(fetchBookings, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, dateFrom, dateTo]);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (statusFilter !== "all") filters.status = statusFilter;
      if (typeFilter !== "all") filters.type = typeFilter;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;

      const data = await integrationService.getOwnerBookingRequests(filters);
      const bookingsData = Array.isArray(data) ? data : data.bookings || [];
      setBookings(bookingsData);
      setFilteredBookings(bookingsData);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setError(error.response?.data?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await integrationService.getOwnerBookingStats("month");
      setStats(data.period_stats || {});
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleAcceptBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to accept this booking?"))
      return;

    try {
      setLoading(true);
      await integrationService.acceptBookingRequest(bookingId);

      // Update local state
      setBookings((prev) =>
        prev.map((b) =>
          b.booking_id === bookingId ? { ...b, status: "accepted" } : b
        )
      );
      setFilteredBookings((prev) =>
        prev.map((b) =>
          b.booking_id === bookingId ? { ...b, status: "accepted" } : b
        )
      );

      alert("Booking accepted successfully!");
      fetchStats(); // Refresh stats
    } catch (error) {
      console.error("Error accepting booking:", error);
      alert(error.response?.data?.message || "Failed to accept booking");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to reject this booking?"))
      return;

    try {
      setLoading(true);
      await integrationService.rejectBookingRequest(bookingId);

      // Update local state
      setBookings((prev) =>
        prev.map((b) =>
          b.booking_id === bookingId ? { ...b, status: "rejected" } : b
        )
      );
      setFilteredBookings((prev) =>
        prev.map((b) =>
          b.booking_id === bookingId ? { ...b, status: "rejected" } : b
        )
      );

      alert("Booking rejected successfully");
      fetchStats(); // Refresh stats
    } catch (error) {
      console.error("Error rejecting booking:", error);
      alert(error.response?.data?.message || "Failed to reject booking");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteBooking = async (bookingId) => {
    if (!window.confirm("Mark this booking as completed?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/owners/bookings/${bookingId}/complete`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        // Update local state
        setBookings((prev) =>
          prev.map((b) =>
            b.booking_id === bookingId ? { ...b, status: "completed" } : b
          )
        );
        setFilteredBookings((prev) =>
          prev.map((b) =>
            b.booking_id === bookingId ? { ...b, status: "completed" } : b
          )
        );

        alert("Booking marked as completed");
        fetchStats(); // Refresh stats
      } else {
        const data = await response.json();
        alert(data.message || "Failed to complete booking");
      }
    } catch (error) {
      console.error("Error completing booking:", error);
      alert("An error occurred");
    }
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
          Booking Management
        </h1>
        <div className="text-sm text-gray-600">
          Total Revenue:{" "}
          <span className="font-bold text-green-600">
            {formatCurrency(stats.total_revenue)}
          </span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="text-sm text-gray-500">Pending</div>
          <div className="text-2xl font-bold">
            {stats.pending_bookings || 0}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="text-sm text-gray-500">Completed</div>
          <div className="text-2xl font-bold">
            {stats.completed_bookings || 0}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow mb-6">
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
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            >
              <option value="all">All Bookings</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
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

      {/* Bookings Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-600">Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No bookings found</p>
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
                      Actions
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
                          <div className="text-xs text-gray-500">
                            {booking.user_email}
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
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(booking.total_amount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Commission:{" "}
                          {formatCurrency(booking.commission_amount || 0)}
                        </div>
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
                        <div className="flex flex-col space-y-1 md:flex-row md:space-x-2 md:space-y-0">
                          {booking.status === "pending" && (
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
                          {booking.status === "accepted" && (
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
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Amount:</span>
                      <span className="font-medium">
                        {formatCurrency(booking.total_amount)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t">
                    <div className="flex flex-wrap gap-2">
                      {booking.status === "pending" && (
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
                      {booking.status === "accepted" && (
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
                </div>
              ))}
            </div>
          </>
        )}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Commission
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatCurrency(selectedBooking.commission_amount || 0)}
                  </p>
                </div>
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
