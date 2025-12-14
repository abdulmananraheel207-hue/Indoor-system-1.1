import React, { useState, useEffect } from "react";

// Receive the full ownerData object as a prop
const OwnerHome = ({ ownerData }) => {
  const [stats, setStats] = useState(ownerData.dashboard || {}); // Use dashboard data from props
  const [timePeriod, setTimePeriod] = useState("today");
  const [recentActivity, setRecentActivity] = useState(
    ownerData.pending_requests || []
  ); // Use initial pending requests from props

  useEffect(() => {
    // Only re-fetch if the time period changes (dashboard endpoint)
    if (timePeriod !== "today") {
      fetchDashboardStats();
    } else {
      // If "today" is selected, use the initial data passed from OwnerDashboard
      setStats(ownerData.dashboard);
      setRecentActivity(ownerData.pending_requests);
    }
  }, [timePeriod, ownerData]);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        // The backend endpoint for dashboard already handles the 'period' query
        `http://localhost:5000/api/owners/dashboard?period=${timePeriod}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setStats(data.dashboard);
        // Note: The dashboard endpoint should also return recent activity for the selected period if available.
        // For simplicity, we are only updating stats here.
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
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
      {/* Header with period selector */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimePeriod("today")}
            className={`px-4 py-2 rounded-lg ${
              timePeriod === "today"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimePeriod("weekly")}
            className={`px-4 py-2 rounded-lg ${
              timePeriod === "weekly"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimePeriod("monthly")}
            className={`px-4 py-2 rounded-lg ${
              timePeriod === "monthly"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg mr-4">
              <span className="text-2xl">📅</span>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Today's Bookings</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.today_bookings || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg mr-4">
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Today's Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.today_revenue || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg mr-4">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.monthly_revenue || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg mr-4">
              <span className="text-2xl">⏳</span>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-900">
                {recentActivity.length}{" "}
                {/* Fixed: Use the length of pending_requests */}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Recent Booking Requests
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sport
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
              {recentActivity.map((booking) => (
                <tr key={booking.booking_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {booking.user_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.user_phone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {booking.sport_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(booking.date).toLocaleDateString()}{" "}
                    {booking.start_time} - {booking.end_time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatCurrency(booking.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${
                                              booking.status === "pending"
                                                ? "bg-yellow-100 text-yellow-800"
                                                : booking.status === "accepted"
                                                ? "bg-green-100 text-green-800"
                                                : "bg-red-100 text-red-800"
                                            }`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {booking.status === "pending" && (
                      <div className="flex space-x-2">
                        <button className="text-green-600 hover:text-green-900">
                          Accept
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OwnerHome;
