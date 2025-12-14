import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OwnerHome from "./OwnerHome";
import OwnerBookings from "./OwnerBookings";
import OwnerCalendar from "./OwnerCalendar";
import OwnerManagers from "./OwnerManagers";
import OwnerProfile from "./OwnerProfile";

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState("home");
  const [ownerData, setOwnerData] = useState(null);
  const [loading, setLoading] = useState(true); // Added loading state

  useEffect(() => {
    // Fetch owner data on component mount
    fetchOwnerData();
  }, []);

  const fetchOwnerData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      // This fetch gets the full dashboard summary
      const response = await fetch(
        "http://localhost:5000/api/owners/dashboard",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        // The dashboard endpoint returns combined data (stats, recent activity, etc.)
        // We will store this whole object
        setOwnerData(data);
      } else if (response.status === 401) {
        // Handle unauthorized, likely due to expired token
        handleLogout();
      }
    } catch (error) {
      console.error("Error fetching owner data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("ownerData");
    navigate("/");
  };

  // If loading or data is null, show a spinner
  if (loading || !ownerData) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Use ownerData.owner_name (or .arena_name if that's what the owner profile has)
  const displayArenaName = ownerData.arenas?.[0]?.name || "Arena Owner";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setCurrentTab("home")}
                className="text-xl font-bold text-gray-900"
              >
                Arena Owner Portal
              </button>
              <div className="ml-8 flex space-x-4">
                <button
                  onClick={() => setCurrentTab("home")}
                  className={`px-3 py-2 rounded-lg ${
                    currentTab === "home"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentTab("bookings")}
                  className={`px-3 py-2 rounded-lg ${
                    currentTab === "bookings"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Bookings
                </button>
                <button
                  onClick={() => setCurrentTab("calendar")}
                  className={`px-3 py-2 rounded-lg ${
                    currentTab === "calendar"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => setCurrentTab("managers")}
                  className={`px-3 py-2 rounded-lg ${
                    currentTab === "managers"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Managers
                </button>
                <button
                  onClick={() => setCurrentTab("profile")}
                  className={`px-3 py-2 rounded-lg ${
                    currentTab === "profile"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Profile
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">
                {/* Fixed display name using optional chaining */}
                {ownerData?.arenas?.[0]?.name || "Arena Owner"}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {currentTab === "home" && <OwnerHome ownerData={ownerData} />}
        {currentTab === "bookings" && <OwnerBookings />}
        {currentTab === "calendar" && (
          <OwnerCalendar arenas={ownerData.arenas} />
        )}
        {currentTab === "managers" && <OwnerManagers />}
        {currentTab === "profile" && <OwnerProfile dashboardData={ownerData} />}
      </main>
    </div>
  );
};

export default OwnerDashboard;
