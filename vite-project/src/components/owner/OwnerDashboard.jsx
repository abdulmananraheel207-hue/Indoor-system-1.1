// File: OwnerDashboard.jsx - FIXED dashboard access for managers
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OwnerHome from "./OwnerHome";
import OwnerBookings from "./OwnerBookings";
import OwnerCalendar from "./OwnerCalendar";
import OwnerManagers from "./OwnerManagers";
import OwnerProfile from "./OwnerProfile";
import OwnerArenaSettings from "./OwnerArenaSettings";

// 🔥 FIX: Updated permission mapping - dashboard is ALWAYS accessible
const TAB_PERMISSIONS = {
  home: null, // Always accessible for both owner and manager
  bookings: "manage_bookings",
  calendar: "manage_calendar",
  arenasettings: "manage_arena",
  managers: null, // Managers should NEVER see this tab
  profile: null,  // Profile is always accessible
};

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState("home");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(() => {
    const savedStats = localStorage.getItem('dashboardStats');
    return savedStats ? JSON.parse(savedStats) : null;
  });

  // Detect user role from localStorage
  const userRole = localStorage.getItem("userRole");
  const isOwner = userRole === "owner";
  const isManager = userRole === "manager";

  // Get permissions based on role
  const getPermissions = () => {
    if (isOwner) {
      // Owners have ALL permissions
      return {
        view_financials: true,
        manage_bookings: true,
        manage_calendar: true,
        manage_arena: true,
      };
    } else if (isManager) {
      // Get manager permissions from stored user data
      const userDataStr = localStorage.getItem("userData");
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
          return userData.permissions || {};
        } catch (e) {
          console.error("Error parsing manager permissions:", e);
          return {};
        }
      }
    }
    return {};
  };

  const permissions = getPermissions();

  // Check if current tab is accessible
  const canAccessTab = (tab) => {
    if (isOwner) return true; // Owners can access everything

    // 🔥 FIX: Dashboard (home) is ALWAYS accessible for managers
    if (tab === "home") return true;

    // Managers: NEVER see managers tab
    if (tab === "managers") return false;

    // Profile always accessible
    if (tab === "profile") return true;

    // Check permission for other tabs
    const requiredPermission = TAB_PERMISSIONS[tab];
    return requiredPermission ? permissions[requiredPermission] || false : true;
  };

  // Get available tabs based on role/permissions
  const getAvailableTabs = () => {
    const allTabs = [
      { id: "home", label: "Dashboard", icon: "📊" },
      { id: "bookings", label: "Bookings", icon: "📅" },
      { id: "calendar", label: "Calendar", icon: "🗓️" },
      { id: "arenasettings", label: "Arena Settings", icon: "⚙️" },
      { id: "managers", label: "Managers", icon: "👥" },
      { id: "profile", label: "Profile", icon: "👤" },
    ];

    return allTabs.filter(tab => canAccessTab(tab.id));
  };

  const availableTabs = getAvailableTabs();

  useEffect(() => {
    // Redirect if trying to access unauthorized tab
    if (!canAccessTab(currentTab)) {
      // Find first available tab (always at least "home" and "profile")
      const firstAvailable = availableTabs[0]?.id || "profile";
      setCurrentTab(firstAvailable);
    }
  }, [currentTab, permissions]);

  useEffect(() => {
    fetchUserData();

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      if (currentTab === "home") {
        fetchUserData();
      }
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, userRole]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let endpoint = "";

      // Different endpoints based on role
      if (isOwner) {
        endpoint = "http://localhost:5000/api/owners/dashboard";
      } else if (isManager) {
        endpoint = "http://localhost:5000/api/managers/dashboard";
      } else {
        throw new Error("Unknown user role");
      }

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setUserData(data);

        // Save stats based on response structure
        let statsToSave = null;

        if (isOwner && data.dashboard) {
          statsToSave = {
            ...data.dashboard,
            lastUpdated: new Date().toISOString()
          };
        } else if (isManager && data.stats) {
          statsToSave = {
            ...data.stats,
            lastUpdated: new Date().toISOString()
          };
        }

        if (statsToSave) {
          localStorage.setItem('dashboardStats', JSON.stringify(statsToSave));
          setDashboardStats(statsToSave);
        }
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Use cached stats if available
      if (dashboardStats) {
        console.log("Using cached dashboard stats");
        setUserData(prev => ({
          ...prev,
          dashboard: dashboardStats
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userData");
    localStorage.removeItem("ownerData");
    localStorage.removeItem("managerData");
    localStorage.removeItem('dashboardStats');
    navigate("/");
  };

  const refreshStats = async () => {
    try {
      const token = localStorage.getItem("token");
      let endpoint = "";

      if (isOwner) {
        endpoint = "http://localhost:5000/api/owners/bookings/stats?period=month";
      } else if (isManager && permissions.view_financials) {
        endpoint = "http://localhost:5000/api/managers/stats?period=month";
      } else {
        return; // No permission to view stats
      }

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        let updatedStats = null;

        if (isOwner && data.period_stats) {
          updatedStats = {
            ...data.period_stats,
            lastUpdated: new Date().toISOString()
          };
        } else if (isManager && data) {
          updatedStats = {
            ...data,
            lastUpdated: new Date().toISOString()
          };
        }

        if (updatedStats) {
          localStorage.setItem('dashboardStats', JSON.stringify(updatedStats));
          setDashboardStats(updatedStats);

          setUserData(prev => ({
            ...prev,
            dashboard: updatedStats
          }));
        }
      }
    } catch (error) {
      console.error("Error refreshing stats:", error);
    }
  };

  // Get display name based on role
  const getDisplayName = () => {
    if (isOwner) {
      return userData?.arenas?.[0]?.name || "Arena Owner";
    } else if (isManager) {
      const userDataStr = localStorage.getItem("userData");
      if (userDataStr) {
        try {
          const managerData = JSON.parse(userDataStr);
          return managerData.arena_name || managerData.name || "Arena Manager";
        } catch (e) {
          return "Arena Manager";
        }
      }
      return "Arena Manager";
    }
    return "User";
  };

  if (loading || !userData) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const displayName = getDisplayName();
  const userRoleDisplay = isOwner ? "Owner" : "Manager";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            <button
              onClick={() => {
                setCurrentTab("home");
                setMobileMenuOpen(false);
                fetchUserData();
              }}
              className="text-lg font-bold text-gray-900 md:text-xl"
            >
              {isOwner ? "Arena Owner Portal" : "Arena Manager Portal"}
            </button>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-gray-600">
                {displayName}
                <span className={`ml-2 text-xs px-2 py-1 rounded-full ${isOwner ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"
                  }`}>
                  {userRoleDisplay}
                </span>
              </span>

              {/* Only show refresh button if user has permission to view stats */}
              {(isOwner || permissions.view_financials) && (
                <button
                  onClick={refreshStats}
                  className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                  title="Refresh Stats"
                >
                  🔄
                </button>
              )}

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
                {availableTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setCurrentTab(tab.id);
                      setMobileMenuOpen(false);
                      if (tab.id === "home") fetchUserData();
                    }}
                    className={`px-3 py-2.5 rounded-lg text-left flex items-center space-x-2 ${currentTab === tab.id
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}

                <div className="pt-2 mt-2 border-t">
                  <div className="px-3 py-2 text-sm text-gray-600">
                    <span className="font-medium">Signed in as:</span>
                    <div className="flex items-center mt-1">
                      <span>{displayName}</span>
                      <span className={`ml-2 text-xs px-2 py-1 rounded-full ${isOwner ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"
                        }`}>
                        {userRoleDisplay}
                      </span>
                    </div>
                  </div>

                  {(isOwner || permissions.view_financials) && (
                    <button
                      onClick={() => {
                        refreshStats();
                        setMobileMenuOpen(false);
                      }}
                      className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      Refresh Stats
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Desktop Navigation */}
          <div className="hidden md:flex mt-4 space-x-2">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setCurrentTab(tab.id);
                  if (tab.id === "home") fetchUserData();
                }}
                className={`px-3 py-2 rounded-lg text-sm flex items-center space-x-1 ${currentTab === tab.id
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
                  }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content - Pass permissions to child components */}
      <main className="px-3 py-6 md:px-4 md:py-8 max-w-7xl mx-auto">
        {currentTab === "home" && (
          <OwnerHome
            userData={userData}
            refreshData={fetchUserData}
            refreshStats={refreshStats}
            isOwner={isOwner}
            permissions={permissions}
          />
        )}
        {currentTab === "bookings" && (
          <OwnerBookings
            isOwner={isOwner}
            permissions={permissions}
          />
        )}
        {currentTab === "calendar" && (
          <OwnerCalendar
            arenas={userData?.arenas || []}
            isOwner={isOwner}
            permissions={permissions}
          />
        )}
        {currentTab === "arenasettings" && (
          <OwnerArenaSettings
            dashboardData={userData}
            isOwner={isOwner}
            permissions={permissions}
          />
        )}
        {currentTab === "managers" && isOwner && (
          <OwnerManagers />
        )}
        {currentTab === "profile" && (
          <OwnerProfile
            dashboardData={userData}
            isOwner={isOwner}
            permissions={permissions}
          />
        )}
      </main>
    </div>
  );
};

export default OwnerDashboard;