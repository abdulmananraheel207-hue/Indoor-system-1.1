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
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // New state for mobile menu

  useEffect(() => {
    fetchOwnerData();
  }, []);

  const fetchOwnerData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
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
        setOwnerData(data);
      } else if (response.status === 401) {
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

  if (loading || !ownerData) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const displayArenaName = ownerData.arenas?.[0]?.name || "Arena Owner";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Updated for mobile */}
      <header className="bg-white shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>

            <button
              onClick={() => {
                setCurrentTab("home");
                setMobileMenuOpen(false);
              }}
              className="text-lg font-bold text-gray-900 md:text-xl"
            >
              Arena Owner Portal
            </button>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-gray-600">{displayArenaName}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm md:text-base"
              >
                Logout
              </button>
            </div>

            {/* Mobile logout button */}
            <button
              onClick={handleLogout}
              className="md:hidden px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Logout
            </button>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t">
              <div className="flex flex-col space-y-2 pt-4">
                <button
                  onClick={() => {
                    setCurrentTab("home");
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2.5 rounded-lg text-left ${
                    currentTab === "home"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    setCurrentTab("bookings");
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2.5 rounded-lg text-left ${
                    currentTab === "bookings"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Bookings
                </button>
                <button
                  onClick={() => {
                    setCurrentTab("calendar");
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2.5 rounded-lg text-left ${
                    currentTab === "calendar"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => {
                    setCurrentTab("managers");
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2.5 rounded-lg text-left ${
                    currentTab === "managers"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Managers
                </button>
                <button
                  onClick={() => {
                    setCurrentTab("profile");
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2.5 rounded-lg text-left ${
                    currentTab === "profile"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Profile
                </button>
                <div className="pt-2 mt-2 border-t">
                  <div className="px-3 py-2 text-sm text-gray-600">
                    Signed in as: {displayArenaName}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Navigation */}
          <div className="hidden md:flex mt-4 space-x-2">
            <button
              onClick={() => setCurrentTab("home")}
              className={`px-3 py-2 rounded-lg text-sm ${
                currentTab === "home"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentTab("bookings")}
              className={`px-3 py-2 rounded-lg text-sm ${
                currentTab === "bookings"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Bookings
            </button>
            <button
              onClick={() => setCurrentTab("calendar")}
              className={`px-3 py-2 rounded-lg text-sm ${
                currentTab === "calendar"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setCurrentTab("managers")}
              className={`px-3 py-2 rounded-lg text-sm ${
                currentTab === "managers"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Managers
            </button>
            <button
              onClick={() => setCurrentTab("profile")}
              className={`px-3 py-2 rounded-lg text-sm ${
                currentTab === "profile"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Profile
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-3 py-6 md:px-4 md:py-8 max-w-7xl mx-auto">
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
