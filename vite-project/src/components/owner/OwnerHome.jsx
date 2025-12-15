import React, { useState, useEffect } from "react";

const OwnerHome = ({ ownerData }) => {
  const [stats, setStats] = useState(ownerData.dashboard || {});
  const [timePeriod, setTimePeriod] = useState("today");
  const [recentActivity, setRecentActivity] = useState(
    ownerData.pending_requests || []
  );

  useEffect(() => {
    if (timePeriod !== "today") {
      fetchDashboardStats();
    } else {
      setStats(ownerData.dashboard);
      setRecentActivity(ownerData.pending_requests);
    }
  }, [timePeriod, ownerData]);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
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
      {/* Header with period selector - Mobile optimized */}
      <div className="flex flex-col space-y-3 md:flex-row md:justify-between md:items-center md:space-y-0 mb-4 md:mb-6">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
          Dashboard
        </h1>
        <div className="flex space-x-1 md:space-x-2">
          <button
            onClick={() => setTimePeriod("today")}
            className={`px-3 py-1.5 text-sm rounded-lg md:px-4 md:py-2 md:text-base ${
              timePeriod === "today"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimePeriod("weekly")}
            className={`px-3 py-1.5 text-sm rounded-lg md:px-4 md:py-2 md:text-base ${
              timePeriod === "weekly"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimePeriod("monthly")}
            className={`px-3 py-1.5 text-sm rounded-lg md:px-4 md:py-2 md:text-base ${
              timePeriod === "monthly"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Stats Cards - Mobile optimized */}
      <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-2 lg:grid-cols-4 md:gap-6 md:mb-8">
        <div className="bg-white p-3 rounded-xl shadow md:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg mr-2 md:p-3 md:mr-4">
              <span className="text-lg md:text-2xl">📅</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 md:text-sm">
                Today's Bookings
              </p>
              <p className="text-lg font-bold text-gray-900 md:text-2xl">
                {stats.today_bookings || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl shadow md:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-2 md:p-3 md:mr-4">
              <span className="text-lg md:text-2xl">💰</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 md:text-sm">
                Today's Revenue
              </p>
              <p className="text-lg font-bold text-gray-900 md:text-2xl">
                {formatCurrency(stats.today_revenue || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl shadow md:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg mr-2 md:p-3 md:mr-4">
              <span className="text-lg md:text-2xl">📊</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 md:text-sm">
                Monthly Revenue
              </p>
              <p className="text-lg font-bold text-gray-900 md:text-2xl">
                {formatCurrency(stats.monthly_revenue || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl shadow md:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg mr-2 md:p-3 md:mr-4">
              <span className="text-lg md:text-2xl">⏳</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 md:text-sm">
                Pending Requests
              </p>
              <p className="text-lg font-bold text-gray-900 md:text-2xl">
                {recentActivity.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity - Mobile optimized */}
      <div className="bg-white rounded-xl shadow p-3 md:p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3 md:text-xl md:mb-4">
          Recent Booking Requests
        </h2>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sport
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
              {recentActivity.map((booking) => (
                <tr key={booking.booking_id}>
                  <td className="px-4 py-3 whitespace-nowrap">
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
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {booking.sport_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {new Date(booking.date).toLocaleDateString()}{" "}
                    {booking.start_time} - {booking.end_time}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatCurrency(booking.total_amount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
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
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
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

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {recentActivity.map((booking) => (
            <div
              key={booking.booking_id}
              className="border border-gray-200 rounded-lg p-3"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium text-gray-900">
                    {booking.user_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {booking.user_phone}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full 
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
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Sport:</span>
                  <span className="font-medium">{booking.sport_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span className="font-medium">
                    {new Date(booking.date).toLocaleDateString()}
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

              {booking.status === "pending" && (
                <div className="mt-3 pt-2 border-t">
                  <div className="flex space-x-2">
                    <button className="flex-1 px-3 py-1.5 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200">
                      Accept
                    </button>
                    <button className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200">
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OwnerHome;
