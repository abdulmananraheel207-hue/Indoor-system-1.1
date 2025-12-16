// components/manager/ManagerDashboard.jsx - FIXED VERSION
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ManagerHome from "./ManagerHome";
import ManagerBookings from "./ManagerBookings";
import ManagerCalendar from "./ManagerCalender";
import ManagerProfile from "./ManagerProfile";

const ManagerDashboard = () => {
    const navigate = useNavigate();
    const [currentTab, setCurrentTab] = useState("home");
    const [managerData, setManagerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [hasPermissions, setHasPermissions] = useState({
        canViewDashboard: false,
        canViewBookings: false,
        canViewCalendar: false
    });

    useEffect(() => {
        fetchManagerData();
    }, []);

    // Calculate permissions whenever managerData changes
    useEffect(() => {
        if (managerData && managerData.permissions) {
            const permissions = managerData.permissions;
            setHasPermissions({
                canViewDashboard: permissions.view_dashboard === true,
                canViewBookings: permissions.view_bookings === true || permissions.manage_bookings === true,
                canViewCalendar: permissions.view_calendar === true || permissions.manage_calendar === true
            });
        }
    }, [managerData]);

    // Handle tab switching based on permissions - MOVED OUT OF useEffect
    const handleTabChange = (tab) => {
        if (tab === "home" && !hasPermissions.canViewDashboard) {
            if (hasPermissions.canViewBookings) {
                setCurrentTab("bookings");
            } else if (hasPermissions.canViewCalendar) {
                setCurrentTab("calendar");
            } else {
                setCurrentTab("profile");
            }
        } else if (tab === "bookings" && !hasPermissions.canViewBookings) {
            if (hasPermissions.canViewDashboard) {
                setCurrentTab("home");
            } else if (hasPermissions.canViewCalendar) {
                setCurrentTab("calendar");
            } else {
                setCurrentTab("profile");
            }
        } else if (tab === "calendar" && !hasPermissions.canViewCalendar) {
            if (hasPermissions.canViewDashboard) {
                setCurrentTab("home");
            } else if (hasPermissions.canViewBookings) {
                setCurrentTab("bookings");
            } else {
                setCurrentTab("profile");
            }
        } else {
            setCurrentTab(tab);
        }
    };

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
            } else if (response.status === 401) {
                handleLogout();
            }
        } catch (error) {
            console.error("Error fetching manager data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userRole");
        localStorage.removeItem("managerData");
        navigate("/");
    };

    if (loading || !managerData) {
        return (
            <div className="min-h-screen flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const { permissions, arenas = [] } = managerData;
    const arenaName = arenas[0]?.name || "Arena";

    // Get manager name from localStorage as fallback
    const storedManagerData = localStorage.getItem("managerData");
    const managerName = storedManagerData
        ? JSON.parse(storedManagerData).name
        : "Manager";

    // Render content based on current tab and permissions
    const renderContent = () => {
        if (currentTab === "home" && hasPermissions.canViewDashboard) {
            return <ManagerHome managerData={managerData} />;
        } else if (currentTab === "bookings" && hasPermissions.canViewBookings) {
            return <ManagerBookings />;
        } else if (currentTab === "calendar" && hasPermissions.canViewCalendar) {
            return <ManagerCalendar arenas={managerData.arenas} permissions={managerData.permissions} />;
        } else if (currentTab === "profile") {
            return <ManagerProfile managerData={managerData} />;
        } else {
            // Permission denied
            return (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-700">
                        You don't have permission to view this section.
                    </p>
                </div>
            );
        }
    };

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
                            onClick={() => handleTabChange("home")}
                            className="text-lg font-bold text-gray-900 md:text-xl"
                        >
                            Manager Portal - {arenaName}
                        </button>

                        {/* Desktop navigation */}
                        <div className="hidden md:flex items-center space-x-4">
                            <span className="text-gray-600">
                                {managerName}
                            </span>
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
                                {hasPermissions.canViewDashboard && (
                                    <button
                                        onClick={() => {
                                            handleTabChange("home");
                                            setMobileMenuOpen(false);
                                        }}
                                        className={`px-3 py-2.5 rounded-lg text-left ${currentTab === "home"
                                            ? "bg-blue-100 text-blue-700"
                                            : "text-gray-700 hover:bg-gray-100"
                                            }`}
                                    >
                                        Dashboard
                                    </button>
                                )}
                                {hasPermissions.canViewBookings && (
                                    <button
                                        onClick={() => {
                                            handleTabChange("bookings");
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
                                {hasPermissions.canViewCalendar && (
                                    <button
                                        onClick={() => {
                                            handleTabChange("calendar");
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
                                <button
                                    onClick={() => {
                                        handleTabChange("profile");
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
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex mt-4 space-x-2">
                        {hasPermissions.canViewDashboard && (
                            <button
                                onClick={() => handleTabChange("home")}
                                className={`px-3 py-2 rounded-lg text-sm ${currentTab === "home"
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                Dashboard
                            </button>
                        )}
                        {hasPermissions.canViewBookings && (
                            <button
                                onClick={() => handleTabChange("bookings")}
                                className={`px-3 py-2 rounded-lg text-sm ${currentTab === "bookings"
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                Bookings
                            </button>
                        )}
                        {hasPermissions.canViewCalendar && (
                            <button
                                onClick={() => handleTabChange("calendar")}
                                className={`px-3 py-2 rounded-lg text-sm ${currentTab === "calendar"
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                Calendar
                            </button>
                        )}
                        <button
                            onClick={() => handleTabChange("profile")}
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