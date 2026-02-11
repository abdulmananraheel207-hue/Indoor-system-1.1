// components/manager/ManagerDashboard.jsx - UPDATED TO MATCH OWNER
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ManagerHome from "./ManagerHome";
import ManagerBookings from "./ManagerBookings";
import ManagerCalendar from "./ManagerCalender";
import ManagerProfile from "./ManagerProfile";
import ManagerArenaSettings from "./ManagerArenaSettings";

const ManagerDashboard = () => {
    const navigate = useNavigate();
    const [currentTab, setCurrentTab] = useState("home");
    const [managerData, setManagerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [dashboardStats, setDashboardStats] = useState(() => {
        const savedStats = localStorage.getItem('managerDashboardStats');
        return savedStats ? JSON.parse(savedStats) : null;
    });

    // Permission state
    const [permissions, setPermissions] = useState({
        view_dashboard: false,
        view_bookings: false,
        manage_bookings: false,
        view_calendar: false,
        manage_calendar: false,
        view_reports: false,
        manage_arena: false,
        view_financial: false
    });

    useEffect(() => {
        fetchManagerData();
        const interval = setInterval(() => {
            if (currentTab === "home") {
                fetchManagerData();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [currentTab]);

    const fetchManagerData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                "http://localhost:5000/api/managers/dashboard",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            const data = await response.json();
            if (response.ok) {
                setManagerData(data);

                // Extract and set permissions
                const managerPermissions = data.permissions || {};
                setPermissions(managerPermissions);

                // Save stats if available
                if (data.stats) {
                    const statsToSave = {
                        ...data.stats,
                        lastUpdated: new Date().toISOString()
                    };
                    localStorage.setItem('managerDashboardStats', JSON.stringify(statsToSave));
                    setDashboardStats(statsToSave);
                }
            } else if (response.status === 401) {
                handleLogout();
            }
        } catch (error) {
            console.error("Error fetching manager data:", error);
            // Use cached stats if available
            if (dashboardStats) {
                setManagerData(prev => ({
                    ...prev,
                    stats: dashboardStats
                }));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userRole");
        localStorage.removeItem("managerData");
        localStorage.removeItem('managerDashboardStats');
        navigate("/");
    };

    const refreshStats = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                "http://localhost:5000/api/managers/stats?period=month",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            if (response.ok) {
                const data = await response.json();
                if (data) {
                    const updatedStats = {
                        ...data,
                        lastUpdated: new Date().toISOString()
                    };
                    localStorage.setItem('managerDashboardStats', JSON.stringify(updatedStats));
                    setDashboardStats(updatedStats);

                    setManagerData(prev => ({
                        ...prev,
                        stats: updatedStats
                    }));
                }
            }
        } catch (error) {
            console.error("Error refreshing stats:", error);
        }
    };

    if (loading || !managerData) {
        return (
            <div className="min-h-screen flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const arenaName = managerData.arenas?.[0]?.name || "Arena";
    const storedManagerData = localStorage.getItem("managerData");
    const managerName = storedManagerData ? JSON.parse(storedManagerData).name : "Manager";

    // Permission-based render logic
    const renderContent = () => {
        switch (currentTab) {
            case "home":
                return permissions.view_dashboard ? (
                    <ManagerHome
                        managerData={managerData}
                        permissions={permissions}
                        refreshData={fetchManagerData}
                        refreshStats={refreshStats}
                    />
                ) : (
                    <PermissionDenied message="You need view_dashboard permission to access the dashboard" />
                );
            case "bookings":
                return (permissions.view_bookings || permissions.manage_bookings) ? (
                    <ManagerBookings permissions={permissions} />
                ) : (
                    <PermissionDenied message="You need view_bookings permission to access bookings" />
                );
            case "calendar":
                return (permissions.view_calendar || permissions.manage_calendar) ? (
                    <ManagerCalendar arenas={managerData.arenas} permissions={permissions} />
                ) : (
                    <PermissionDenied message="You need view_calendar permission to access calendar" />
                );
            case "arenasettings":
                return (permissions.manage_arena) ? (
                    <ManagerArenaSettings permissions={permissions} />
                ) : (
                    <PermissionDenied message="You need manage_arena permission to access arena settings" />
                );
            case "profile":
                return <ManagerProfile managerData={managerData} />;
            default:
                return <PermissionDenied message="Page not found" />;
        }
    };

    // Permission Denied Component
    const PermissionDenied = ({ message }) => (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <div className="text-yellow-600 mb-2">⚠️</div>
            <h3 className="text-lg font-medium text-yellow-800">Permission Denied</h3>
            <p className="text-yellow-600 mt-2">{message}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header - MATCHES OWNER DASHBOARD */}
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
                            onClick={() => setCurrentTab("home")}
                            className="text-lg font-bold text-gray-900 md:text-xl"
                        >
                            {arenaName} - Manager Portal
                        </button>

                        {/* Desktop navigation */}
                        <div className="hidden md:flex items-center space-x-4">
                            <span className="text-gray-600">{managerName}</span>
                            {permissions.view_dashboard && (
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
                                {permissions.view_dashboard && (
                                    <button
                                        onClick={() => {
                                            setCurrentTab("home");
                                            setMobileMenuOpen(false);
                                            fetchManagerData();
                                        }}
                                        className={`px-3 py-2.5 rounded-lg text-left ${currentTab === "home"
                                            ? "bg-blue-100 text-blue-700"
                                            : "text-gray-700 hover:bg-gray-100"
                                            }`}
                                    >
                                        Dashboard
                                    </button>
                                )}

                                {(permissions.view_bookings || permissions.manage_bookings) && (
                                    <button
                                        onClick={() => {
                                            setCurrentTab("bookings");
                                            setMobileMenuOpen(false);
                                        }}
                                        className={`px-3 py-2.5 rounded-lg text-left ${currentTab === "bookings"
                                            ? "bg-blue-100 text-blue-700"
                                            : "text-gray-700 hover:bg-gray-100"
                                            }`}
                                    >
                                        Bookings
                                    </button>
                                )}

                                {(permissions.view_calendar || permissions.manage_calendar) && (
                                    <button
                                        onClick={() => {
                                            setCurrentTab("calendar");
                                            setMobileMenuOpen(false);
                                        }}
                                        className={`px-3 py-2.5 rounded-lg text-left ${currentTab === "calendar"
                                            ? "bg-blue-100 text-blue-700"
                                            : "text-gray-700 hover:bg-gray-100"
                                            }`}
                                    >
                                        Calendar
                                    </button>
                                )}

                                {permissions.manage_arena && (
                                    <button
                                        onClick={() => {
                                            setCurrentTab("arenasettings");
                                            setMobileMenuOpen(false);
                                        }}
                                        className={`px-3 py-2.5 rounded-lg text-left ${currentTab === "arenasettings"
                                            ? "bg-blue-100 text-blue-700"
                                            : "text-gray-700 hover:bg-gray-100"
                                            }`}
                                    >
                                        Arena Settings
                                    </button>
                                )}

                                <button
                                    onClick={() => {
                                        setCurrentTab("profile");
                                        setMobileMenuOpen(false);
                                    }}
                                    className={`px-3 py-2.5 rounded-lg text-left ${currentTab === "profile"
                                        ? "bg-blue-100 text-blue-700"
                                        : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    Profile
                                </button>

                                <div className="pt-2 mt-2 border-t">
                                    <div className="px-3 py-2 text-sm text-gray-600">
                                        Signed in as: {managerName}
                                    </div>
                                    {permissions.view_dashboard && (
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
                        {permissions.view_dashboard && (
                            <button
                                onClick={() => {
                                    setCurrentTab("home");
                                    fetchManagerData();
                                }}
                                className={`px-3 py-2 rounded-lg text-sm ${currentTab === "home"
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                Dashboard
                            </button>
                        )}

                        {(permissions.view_bookings || permissions.manage_bookings) && (
                            <button
                                onClick={() => setCurrentTab("bookings")}
                                className={`px-3 py-2 rounded-lg text-sm ${currentTab === "bookings"
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                Bookings
                            </button>
                        )}

                        {(permissions.view_calendar || permissions.manage_calendar) && (
                            <button
                                onClick={() => setCurrentTab("calendar")}
                                className={`px-3 py-2 rounded-lg text-sm ${currentTab === "calendar"
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                Calendar
                            </button>
                        )}

                        {permissions.manage_arena && (
                            <button
                                onClick={() => setCurrentTab("arenasettings")}
                                className={`px-3 py-2 rounded-lg text-sm ${currentTab === "arenasettings"
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                Arena Settings
                            </button>
                        )}

                        <button
                            onClick={() => setCurrentTab("profile")}
                            className={`px-3 py-2 rounded-lg text-sm ${currentTab === "profile"
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
                {renderContent()}
            </main>
        </div>
    );
};

export default ManagerDashboard;