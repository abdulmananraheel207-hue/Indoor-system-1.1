import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { bookingAPI, userAPI } from "../../services/api";

const UserDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const isGuest = localStorage.getItem("isGuest") === "true";

  useEffect(() => {
    if (!isGuest) {
      fetchUserData();
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [isGuest]);

  const fetchUserData = async () => {
    try {
      const response = await userAPI.getProfile();
      setUser(response.data);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Get booking stats
      const statsResponse = await bookingAPI.getBookingStats();
      setStats(statsResponse.data);

      // Get recent bookings
      const bookingsResponse = await bookingAPI.getUserBookings({ limit: 5 });
      setRecentBookings(bookingsResponse.data.bookings || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userData");
    localStorage.removeItem("isGuest");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {isGuest ? "Guest!" : user?.name || "User"}!
              </h1>
              <p className="text-gray-600 text-sm">
                {isGuest
                  ? "👋 You're browsing as a guest. Sign up to book arenas and more!"
                  : "Your sports arena booking dashboard"}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {isGuest ? (
                <button
                  onClick={() => navigate("/auth/user")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Sign Up / Login
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Guest Banner */}
      {isGuest && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center mb-4 md:mb-0">
                <span className="text-4xl mr-4">🎯</span>
                <div>
                  <h3 className="text-lg font-semibold">You're viewing as a guest</h3>
                  <p className="text-blue-100">Create a free account to book courts, create teams, and more!</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/auth/user")}
                className="px-6 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50"
              >
                Sign Up Free
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isGuest ? (
          <>
            {/* Stats Cards - Only for authenticated users */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg mr-4">
                    <span className="text-2xl">📅</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Bookings</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.total_bookings || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg mr-4">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Completed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.completed_bookings || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg mr-4">
                    <span className="text-2xl">⏳</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.pending_bookings || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg mr-4">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Spent</p>
                    <p className="text-2xl font-bold text-gray-900">
                      Rs {stats.total_spent || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Guest placeholder stats */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="bg-white rounded-xl shadow-sm p-6 opacity-75">
                <div className="flex items-center">
                  <div className="p-3 bg-gray-100 rounded-lg mr-4">
                    <span className="text-2xl text-gray-400">
                      {item === 1 && "📅"}
                      {item === 2 && "✅"}
                      {item === 3 && "⏳"}
                      {item === 4 && "💰"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">
                      {item === 1 && "Total Bookings"}
                      {item === 2 && "Completed"}
                      {item === 3 && "Pending"}
                      {item === 4 && "Total Spent"}
                    </p>
                    <p className="text-2xl font-bold text-gray-300">
                      {item === 4 ? "Rs 0" : "0"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions - Available for everyone */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => navigate("/user")}
            className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="p-3 bg-primary-100 rounded-lg mr-4">
                <span className="text-2xl text-primary-600">🔍</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Find Arenas</h3>
                <p className="text-sm text-gray-600">
                  Browse and book sports arenas
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => isGuest ? navigate("/auth/user") : navigate("/user/bookings")}
            className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg mr-4">
                <span className="text-2xl text-green-600">📋</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">My Bookings</h3>
                <p className="text-sm text-gray-600">
                  {isGuest ? "Login to view your bookings" : "View and manage your bookings"}
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => isGuest ? navigate("/auth/user") : navigate("/user/profile")}
            className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg mr-4">
                <span className="text-2xl text-blue-600">👤</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Profile</h3>
                <p className="text-sm text-gray-600">
                  {isGuest ? "Login to manage your profile" : "Update your profile information"}
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Bookings
            </h2>
            {!isGuest && (
              <button
                onClick={() => navigate("/user/bookings")}
                className="text-primary-600 hover:text-primary-700 text-sm"
              >
                View All
              </button>
            )}
          </div>

          {isGuest ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Sign up to see your booking history</p>
              <button
                onClick={() => navigate("/auth/user")}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Sign Up / Login
              </button>
            </div>
          ) : recentBookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No recent bookings</p>
              <button
                onClick={() => navigate("/user")}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Book Your First Arena
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div
                  key={booking.booking_id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {booking.arena_name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {new Date(booking.date).toLocaleDateString()} •{" "}
                        {booking.start_time} - {booking.end_time}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${booking.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : booking.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;