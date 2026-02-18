// File: OwnerDashboard.jsx - UPDATED with better arena handling
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OwnerHome from "./OwnerHome";
import OwnerBookings from "./OwnerBookings";
import OwnerCalendar from "./OwnerCalendar";
import OwnerManagers from "./OwnerManagers";
import OwnerProfile from "./OwnerProfile";
import OwnerArenaSettings from "./OwnerArenaSettings";
import ArenaSelector from "./ArenaSelector";

const TAB_PERMISSIONS = {
  home: null,
  bookings: "manage_bookings",
  calendar: "manage_calendar",
  arenasettings: "manage_arena",
  managers: null,
  profile: null,
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

  // 🔥 IMPROVED: Selected arena state with better handling
  const [selectedArena, setSelectedArena] = useState(() => {
    const savedArena = localStorage.getItem('selectedArena');
    return savedArena ? JSON.parse(savedArena) : null;
  });

  const userRole = localStorage.getItem("userRole");
  const isOwner = userRole === "owner";
  const isManager = userRole === "manager";

  // Save selected arena to localStorage whenever it changes
  useEffect(() => {
    if (selectedArena) {
      localStorage.setItem('selectedArena', JSON.stringify(selectedArena));
    }
  }, [selectedArena]);

  // In OwnerDashboard.jsx - Replace the getPermissions function

  // In OwnerDashboard.jsx - Update getPermissions function

  const getPermissions = () => {
    if (isOwner) {
      return {
        view_financials: true,
        manage_bookings: true,
        manage_calendar: true,
        manage_arena: true,
      };
    } else if (isManager) {
      const userDataStr = localStorage.getItem("userData");
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
          console.log("📋 User data from localStorage:", userData);

          // Get BOTH flattened and arena-specific permissions
          const permissions = userData.permissions || {}; // Flattened
          const arenaPermissions = userData.arena_permissions || {}; // Arena-specific

          // Store arena permissions in localStorage for later use
          localStorage.setItem('arenaPermissions', JSON.stringify(arenaPermissions));

          return permissions;
        } catch (e) {
          console.error("Error parsing manager permissions:", e);
          return {};
        }
      }
    }
    return {};
  };
  const permissions = getPermissions();

  const canAccessTab = (tab) => {
    if (isOwner) return true;
    if (tab === "home") return true;
    if (tab === "managers") return false;
    if (tab === "profile") return true;

    const requiredPermission = TAB_PERMISSIONS[tab];
    return requiredPermission ? permissions[requiredPermission] || false : true;
  };

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
    if (!canAccessTab(currentTab)) {
      const firstAvailable = availableTabs[0]?.id || "profile";
      setCurrentTab(firstAvailable);
    }
  }, [currentTab, permissions]);

  useEffect(() => {
    fetchUserData();

    const interval = setInterval(() => {
      if (currentTab === "home") {
        fetchUserData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [currentTab, userRole]);

  // In OwnerDashboard.jsx - Update the fetchUserData function

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let endpoint = "";

      if (isOwner) {
        endpoint = "http://localhost:5000/api/owners/dashboard";
      } else if (isManager) {
        endpoint = "http://localhost:5000/api/managers/dashboard";
      } else {
        throw new Error("Unknown user role");
      }

      console.log("📡 Fetching dashboard from:", endpoint);

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("📥 Dashboard response:", data);

      if (response.ok) {
        setUserData(data);

        // Handle arena selection
        if (data.arenas && data.arenas.length > 0) {
          console.log("🏟️ Arenas available:", data.arenas);

          // Check if previously selected arena still exists
          if (selectedArena) {
            const stillExists = data.arenas.some(a => a.arena_id === selectedArena.arena_id);
            if (!stillExists) {
              // Previously selected arena no longer exists, select first available
              setSelectedArena(data.arenas[0]);
            }
          } else {
            // No arena selected, select first one
            setSelectedArena(data.arenas[0]);
          }
        } else {
          console.log("⚠️ No arenas found in response");
          setSelectedArena(null);
        }

        // Update dashboard stats
        if (isOwner && data.dashboard) {
          const statsToSave = {
            ...data.dashboard,
            lastUpdated: new Date().toISOString()
          };
          localStorage.setItem('dashboardStats', JSON.stringify(statsToSave));
          setDashboardStats(statsToSave);
        } else if (isManager && data.stats) {
          const statsToSave = {
            ...data.stats,
            lastUpdated: new Date().toISOString()
          };
          localStorage.setItem('dashboardStats', JSON.stringify(statsToSave));
          setDashboardStats(statsToSave);
        }
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
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
    localStorage.removeItem('selectedArena'); // 🔥 Clear selected arena
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
        return;
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

  const handleArenaChange = (arena) => {
    setSelectedArena(arena);
    // Refresh data when arena changes
    fetchUserData();
  };

  const getDisplayName = () => {
    if (isOwner) {
      return userData?.owner_name || "Arena Owner";
    } else if (isManager) {
      const userDataStr = localStorage.getItem("userData");
      if (userDataStr) {
        try {
          const managerData = JSON.parse(userDataStr);
          return managerData.name || "Arena Manager";
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
      <header className="bg-white shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
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

            <div className="hidden md:flex items-center space-x-4">
              <span className="text-gray-600">
                {displayName}
                <span className={`ml-2 text-xs px-2 py-1 rounded-full ${isOwner ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"
                  }`}>
                  {userRoleDisplay}
                </span>
              </span>

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

            <button
              onClick={handleLogout}
              className="md:hidden px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Logout
            </button>
          </div>

          {/* 🔥 IMPROVED: Arena Selector with better visibility */}
          {userData?.arenas && userData.arenas.length > 0 && (
            <div className="mt-4">
              <ArenaSelector
                arenas={userData.arenas}
                selectedArena={selectedArena}
                onArenaChange={handleArenaChange}
              />
            </div>
          )}

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

      <main className="px-3 py-6 md:px-4 md:py-8 max-w-7xl mx-auto">
        {currentTab === "home" && (
          <OwnerHome
            userData={userData}
            refreshData={fetchUserData}
            refreshStats={refreshStats}
            isOwner={isOwner}
            permissions={permissions}
            selectedArena={selectedArena}
          />
        )}
        {currentTab === "bookings" && (
          <OwnerBookings
            isOwner={isOwner}
            permissions={permissions}
            selectedArena={selectedArena}
          />
        )}
        {currentTab === "calendar" && (
          <OwnerCalendar
            arenas={userData?.arenas || []}
            isOwner={isOwner}
            permissions={permissions}
            selectedArena={selectedArena}
          />
        )}
        {currentTab === "arenasettings" && (
          <OwnerArenaSettings
            dashboardData={userData}
            isOwner={isOwner}
            permissions={permissions}
            selectedArena={selectedArena}
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