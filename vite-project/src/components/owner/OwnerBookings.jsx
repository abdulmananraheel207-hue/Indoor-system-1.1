import React, { useState, useEffect } from "react";

const OwnerBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all"); // all, pending, accepted, completed, rejected, cancelled
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, dateFrom, dateTo]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let url = `http://localhost:5000/api/owners/bookings`;

      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setBookings(data);
        setFilteredBookings(data);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBooking = async (bookingId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/owners/bookings/${bookingId}/accept`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        alert("Booking accepted successfully");
        fetchBookings(); // Refresh list
      } else {
        const data = await response.json();
        alert(data.message || "Failed to accept booking");
      }
    } catch (error) {
      console.error("Error accepting booking:", error);
      alert("An error occurred");
    }
  };

  const handleRejectBooking = async (bookingId) => {
    const reason = prompt("Please enter reason for rejection:");
    if (!reason) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/owners/bookings/${bookingId}/reject`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (response.ok) {
        alert("Booking rejected successfully");
        fetchBookings(); // Refresh list
      } else {
        const data = await response.json();
        alert(data.message || "Failed to reject booking");
      }
    } catch (error) {
      console.error("Error rejecting booking:", error);
      alert("An error occurred");
    }
  };

  const handleCompleteBooking = async (bookingId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/bookings/${bookingId}/complete`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        alert("Booking marked as completed");
        fetchBookings(); // Refresh list
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
    }).format(amount);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Booking Management
      </h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">In Process</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Refresh Button */}
          <div className="flex items-end">
            <button
              onClick={fetchBookings}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
            <p className="mt-2 text-gray-600">Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No bookings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sport & Arena
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking.booking_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{booking.booking_id}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {booking.user_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.user_phone}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.user_email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {booking.sport_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {booking.arena_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(booking.date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {booking.start_time} - {booking.end_time}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(booking.total_amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Commission:{" "}
                        {formatCurrency(booking.commission_amount || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {booking.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                handleAcceptBooking(booking.booking_id)
                              }
                              className="text-green-600 hover:text-green-900"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() =>
                                handleRejectBooking(booking.booking_id)
                              }
                              className="text-red-600 hover:text-red-900"
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
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Mark Complete
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="text-gray-600 hover:text-gray-900"
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
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Booking Details
              </h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                      {selectedBooking.status}
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
                    {new Date(selectedBooking.date).toLocaleDateString()}
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
                <div className="flex justify-end space-x-3">
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
