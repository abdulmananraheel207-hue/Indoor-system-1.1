import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const OwnerHome = ({ ownerData, upcomingBookings: propUpcomingBookings, refreshData }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(ownerData?.dashboard || {});
  const [recentActivity, setRecentActivity] = useState(ownerData?.pending_requests || []);
  const [upcomingBookings, setUpcomingBookings] = useState(propUpcomingBookings || ownerData?.upcoming_bookings || []);
  const [activeTab, setActiveTab] = useState("pending"); // pending or upcoming
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ownerData) {
      setStats(ownerData.dashboard || {});
      setRecentActivity(ownerData.pending_requests || []);
      setUpcomingBookings(ownerData.upcoming_bookings || []);
    }
  }, [ownerData]);

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
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleAcceptBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to accept this booking?")) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/owners/bookings/${bookingId}/accept`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        // Remove from pending requests
        setRecentActivity(prev => prev.filter(b => b.booking_id !== bookingId));

        // Add to upcoming bookings
        const acceptedBooking = recentActivity.find(b => b.booking_id === bookingId);
        if (acceptedBooking) {
          setUpcomingBookings(prev => [...prev, { ...acceptedBooking, status: 'accepted' }]);
        }

        // Refresh dashboard stats
        if (refreshData) refreshData();
        alert("Booking accepted successfully!");
      } else {
        const data = await response.json();
        alert(data.message || "Failed to accept booking");
      }
    } catch (error) {
      console.error("Error accepting booking:", error);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to reject this booking?")) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/owners/bookings/${bookingId}/reject`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        // Remove from pending requests
        setRecentActivity(prev => prev.filter(b => b.booking_id !== bookingId));

        // Refresh dashboard stats
        if (refreshData) refreshData();
        alert("Booking rejected successfully");
      } else {
        const data = await response.json();
        alert(data.message || "Failed to reject booking");
      }
    } catch (error) {
      console.error("Error rejecting booking:", error);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteBooking = async (bookingId) => {
    if (!window.confirm("Mark this booking as completed?")) return;

    try {
      setLoading(true);
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
        // Remove from upcoming bookings
        setUpcomingBookings(prev => prev.filter(b => b.booking_id !== bookingId));

        // Refresh dashboard stats
        if (refreshData) refreshData();
        alert("Booking marked as completed");
      } else {
        const data = await response.json();
        alert(data.message || "Failed to complete booking");
      }
    } catch (error) {
      console.error("Error completing booking:", error);
      alert("An error occurred");
    } finally {
      setLoading(false);
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
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending": return "Pending";
      case "accepted": return "Accepted";
      case "completed": return "Completed";
      case "rejected": return "Rejected";
      case "cancelled": return "Cancelled";
      default: return status;
    }
  };

  return (
    <div>
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-2 lg:grid-cols-4 md:gap-6">
        <div className="bg-white p-3 rounded-xl shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg mr-2">
              <span className="text-lg">📅</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Today's Bookings</p>
              <p className="text-lg font-bold text-gray-900">
                {stats.today_bookings || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-2">
              <span className="text-lg">💰</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Today's Revenue</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(stats.today_revenue || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg mr-2">
              <span className="text-lg">📊</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Monthly Revenue</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(stats.monthly_revenue || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg mr-2">
              <span className="text-lg">⏳</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending Requests</p>
              <p className="text-lg font-bold text-gray-900">
                {stats.pending_requests_count || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings Tabs */}
      <div className="bg-white rounded-xl shadow mb-6">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === "pending"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Pending Requests ({recentActivity.length})
            </button>
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === "upcoming"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Upcoming Bookings ({upcomingBookings.length})
            </button>
          </div>
        </div>

        {loading && (
          <div className="p-4 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}

        {activeTab === "pending" && (
          <div className="p-4">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No pending booking requests
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Customer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Details
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recentActivity.map((booking) => (
                        <tr key={booking.booking_id}>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900">
                                {booking.user_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {booking.user_phone}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">
                              {booking.sport_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(booking.date)} • {booking.start_time} - {booking.end_time}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(booking.total_amount)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleAcceptBooking(booking.booking_id)}
                                disabled={loading}
                                className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleRejectBooking(booking.booking_id)}
                                disabled={loading}
                                className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {recentActivity.map((booking) => (
                    <div key={booking.booking_id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-gray-900">
                            {booking.user_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {booking.user_phone}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                          Pending
                        </span>
                      </div>
                      <div className="text-sm mb-3">
                        <div className="font-medium">{booking.sport_name}</div>
                        <div className="text-gray-600">
                          {formatDate(booking.date)} • {booking.start_time} - {booking.end_time}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="font-semibold">
                          {formatCurrency(booking.total_amount)}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAcceptBooking(booking.booking_id)}
                            disabled={loading}
                            className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectBooking(booking.booking_id)}
                            disabled={loading}
                            className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "upcoming" && (
          <div className="p-4">
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No upcoming bookings
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Customer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Details
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Days Until
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {upcomingBookings.map((booking) => (
                        <tr key={booking.booking_id}>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900">
                                {booking.user_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {booking.user_phone}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">
                              {booking.sport_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(booking.date)} • {booking.start_time} - {booking.end_time}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className={`px-2 py-1 text-xs rounded-full ${booking.days_until === 0 ? 'bg-red-100 text-red-800' :
                              booking.days_until <= 2 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                              {booking.days_until === 0 ? 'Today' :
                                booking.days_until === 1 ? 'Tomorrow' :
                                  `${booking.days_until} days`
                              }
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(booking.total_amount)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleCompleteBooking(booking.booking_id)}
                              disabled={loading}
                              className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200"
                            >
                              Mark Complete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {upcomingBookings.map((booking) => (
                    <div key={booking.booking_id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-gray-900">
                            {booking.user_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {booking.user_phone}
                          </div>
                        </div>
                        <div className={`px-2 py-0.5 text-xs rounded-full ${booking.days_until === 0 ? 'bg-red-100 text-red-800' :
                          booking.days_until <= 2 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                          {booking.days_until === 0 ? 'Today' :
                            booking.days_until === 1 ? 'Tomorrow' :
                              `${booking.days_until} days`
                          }
                        </div>
                      </div>
                      <div className="text-sm mb-3">
                        <div className="font-medium">{booking.sport_name}</div>
                        <div className="text-gray-600">
                          {formatDate(booking.date)} • {booking.start_time} - {booking.end_time}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="font-semibold">
                          {formatCurrency(booking.total_amount)}
                        </div>
                        <button
                          onClick={() => handleCompleteBooking(booking.booking_id)}
                          disabled={loading}
                          className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
                        >
                          Complete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-medium text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/owner/calendar')}
            className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm"
          >
            View Calendar
          </button>
          <button
            onClick={() => navigate('/owner/bookings')}
            className="px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm"
          >
            Manage All Bookings
          </button>
          <button
            onClick={() => navigate('/owner/arenasettings')}
            className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-sm"
          >
            Arena Settings
          </button>
          <button
            onClick={refreshData}
            className="px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-sm"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerHome;