// components/ManagerDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const ManagerDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [managerData, setManagerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [activeTab, setActiveTab] = useState("dashboard");

    // Manager profile props
    const [profileProps, setProfileProps] = useState({
        name: "",
        email: "",
        phone: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    // Operational control props
    const [operationalProps, setOperationalProps] = useState({
        bookings: [],
        statusFilter: "all",
        searchQuery: "",
        timeRange: "today",
        blockedSlots: [],
    });

    // Booking trends data
    const [trendsData, setTrendsData] = useState({
        peakHours: [],
        popularSports: [],
        revenueTrends: [],
    });

    useEffect(() => {
        if (location.state?.loginSuccess) {
            setShowSuccessMessage(true);
            const timer = setTimeout(() => {
                setShowSuccessMessage(false);
                navigate(location.pathname, { replace: true, state: {} });
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [location.state, navigate, location.pathname]);

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = () => {
        try {
            const token = localStorage.getItem("token");
            const manager = localStorage.getItem("manager");
            const role = localStorage.getItem("role");

            if (token && manager && role === "manager") {
                const parsedManager = JSON.parse(manager);
                setManagerData(parsedManager);
                setProfileProps(prev => ({
                    ...prev,
                    name: parsedManager.name || "",
                    email: parsedManager.email || "",
                    phone: parsedManager.phone_number || "",
                }));
            } else {
                navigate("/manager/login");
            }
        } catch (error) {
            console.error("Error checking auth status:", error);
            navigate("/manager/login");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("manager");
        localStorage.removeItem("role");
        navigate("/");
    };

    // Profile update handlers
    const handleProfileUpdate = () => {
        console.log("Profile update with:", profileProps);
        // In real app: API call to update profile
    };

    const handlePasswordChange = () => {
        console.log("Password change requested");
        // In real app: API call to change password
    };

    // Operational control handlers
    const handleBookingStatusFilter = (status) => {
        setOperationalProps(prev => ({ ...prev, statusFilter: status }));
        // In real app: filter bookings
    };

    const handleTimeRangeChange = (range) => {
        setOperationalProps(prev => ({ ...prev, timeRange: range }));
        // In real app: fetch data for time range
    };

    const handleBlockSlot = (date, time, reason) => {
        const newBlockedSlot = { date, time, reason, manager: managerData?.name };
        setOperationalProps(prev => ({
            ...prev,
            blockedSlots: [...prev.blockedSlots, newBlockedSlot]
        }));
        // In real app: API call to block slot
    };

    const handleUnblockSlot = (slotId) => {
        setOperationalProps(prev => ({
            ...prev,
            blockedSlots: prev.blockedSlots.filter(slot => slot.id !== slotId)
        }));
        // In real app: API call to unblock slot
    };

    // Initialize sample data
    useEffect(() => {
        if (managerData) {
            // Sample bookings data
            const sampleBookings = [
                { id: 1, customer: "Ali Ahmed", sport: "Badminton", court: "Court 1", date: "2024-03-15", time: "18:00-19:00", status: "completed", amount: 2000 },
                { id: 2, customer: "Sara Khan", sport: "Cricket", court: "Main Ground", date: "2024-03-15", time: "20:00-22:00", status: "in-process", amount: 5000 },
                { id: 3, customer: "Mohammad Raza", sport: "Futsal", court: "Court 2", date: "2024-03-16", time: "16:00-17:00", status: "pending", amount: 3000 },
                { id: 4, customer: "Fatima Noor", sport: "Tennis", court: "Court 3", date: "2024-03-16", time: "14:00-15:30", status: "pending", amount: 2500 },
            ];

            // Sample trends data
            const sampleTrends = {
                peakHours: [
                    { hour: "16:00-17:00", bookings: 12 },
                    { hour: "18:00-19:00", bookings: 15 },
                    { hour: "20:00-21:00", bookings: 18 },
                ],
                popularSports: [
                    { sport: "Cricket", bookings: 45 },
                    { sport: "Badminton", bookings: 38 },
                    { sport: "Futsal", bookings: 32 },
                    { sport: "Tennis", bookings: 25 },
                ],
                revenueTrends: [
                    { day: "Mon", revenue: 24000 },
                    { day: "Tue", revenue: 18000 },
                    { day: "Wed", revenue: 32000 },
                    { day: "Thu", revenue: 21000 },
                    { day: "Fri", revenue: 45000 },
                ]
            };

            setOperationalProps(prev => ({ ...prev, bookings: sampleBookings }));
            setTrendsData(sampleTrends);
        }
    }, [managerData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center">
                        <div className="text-2xl font-bold text-orange-600 mr-2">👔</div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">
                                Manager Dashboard
                            </h1>
                            <p className="text-xs text-gray-500">Arena: {managerData?.owner_id || "Main Arena"}</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-800">
                                Welcome, {managerData?.name || "Manager"}!
                            </p>
                            <p className="text-xs text-gray-500">{managerData?.email}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Success Message */}
            {showSuccessMessage && (
                <div className="container mx-auto px-4 pt-6">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center">
                            <span className="text-green-600 mr-2">✅</span>
                            <p className="text-green-700 font-medium">
                                Login successful!
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Navigation Tabs */}
            <div className="container mx-auto px-4 py-4">
                <div className="flex border-b">
                    <button
                        onClick={() => setActiveTab("dashboard")}
                        className={`px-4 py-3 font-medium ${activeTab === "dashboard"
                                ? "text-orange-600 border-b-2 border-orange-600"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Operational Control
                    </button>
                    <button
                        onClick={() => setActiveTab("profile")}
                        className={`px-4 py-3 font-medium ${activeTab === "profile"
                                ? "text-orange-600 border-b-2 border-orange-600"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        My Profile
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="container mx-auto px-4 py-8">
                {/* Operational Control Tab */}
                {activeTab === "dashboard" && (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                                Operational Control
                            </h2>
                            <p className="text-gray-600 mb-6">
                                View bookings, analyze trends, and manage schedule.
                            </p>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Today's Bookings</h3>
                                    <p className="text-2xl font-bold text-gray-800">12</p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Actions</h3>
                                    <p className="text-2xl font-bold text-orange-600">3</p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Peak Hour</h3>
                                    <p className="text-2xl font-bold text-gray-800">18:00-19:00</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Booking Management */}
                                <div className="space-y-6">
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-semibold">Booking Management</h3>
                                            <div className="flex space-x-2">
                                                <select
                                                    value={operationalProps.timeRange}
                                                    onChange={(e) => handleTimeRangeChange(e.target.value)}
                                                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                                                >
                                                    <option value="today">Today</option>
                                                    <option value="week">This Week</option>
                                                    <option value="month">This Month</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Status Filters */}
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {["all", "pending", "in-process", "completed"].map((status) => (
                                                <button
                                                    key={status}
                                                    onClick={() => handleBookingStatusFilter(status)}
                                                    className={`px-3 py-1 rounded-lg text-sm capitalize ${operationalProps.statusFilter === status
                                                            ? "bg-orange-600 text-white"
                                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                        }`}
                                                >
                                                    {status}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Bookings List */}
                                        <div className="space-y-3">
                                            {operationalProps.bookings.length > 0 ? (
                                                operationalProps.bookings.map((booking) => (
                                                    <div key={booking.id} className="p-4 border border-gray-200 rounded-lg">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-medium">{booking.customer}</h4>
                                                                <p className="text-sm text-gray-600">{booking.sport} - {booking.court}</p>
                                                                <p className="text-sm text-gray-500">{booking.date} | {booking.time}</p>
                                                            </div>
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                    booking.status === 'in-process' ? 'bg-blue-100 text-blue-800' :
                                                                        'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                {booking.status}
                                                            </span>
                                                        </div>
                                                        <div className="mt-3 flex justify-between items-center">
                                                            <span className="font-medium">₨ {booking.amount?.toLocaleString()}</span>
                                                            <div className="space-x-2">
                                                                <button className="text-orange-600 hover:text-orange-800 text-sm">
                                                                    Update Status
                                                                </button>
                                                                <button className="text-gray-600 hover:text-gray-800 text-sm">
                                                                    View Details
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-gray-500 text-center py-4">No bookings found</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Block Time Slots */}
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <h3 className="text-lg font-semibold mb-4">Block Unavailable Slots</h3>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                                    <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                                    <input type="time" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                                                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                                    <option value="">Select reason</option>
                                                    <option value="maintenance">Maintenance</option>
                                                    <option value="cleaning">Cleaning</option>
                                                    <option value="private_event">Private Event</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                            <button
                                                onClick={() => handleBlockSlot("2024-03-16", "14:00-15:00", "Maintenance")}
                                                className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700"
                                            >
                                                Block Time Slot
                                            </button>
                                        </div>

                                        {/* Blocked Slots List */}
                                        <div className="mt-6">
                                            <h4 className="font-medium mb-3">Currently Blocked Slots</h4>
                                            {operationalProps.blockedSlots.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {operationalProps.blockedSlots.map((slot, index) => (
                                                        <li key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                                            <div>
                                                                <p className="font-medium">{slot.date} {slot.time}</p>
                                                                <p className="text-sm text-gray-500">{slot.reason}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleUnblockSlot(slot.id)}
                                                                className="text-red-600 hover:text-red-800"
                                                            >
                                                                Unblock
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-gray-500">No slots blocked</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Booking Trends Analysis */}
                                <div className="space-y-6">
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <h3 className="text-lg font-semibold mb-4">Booking Trends</h3>

                                        {/* Peak Hours */}
                                        <div className="mb-6">
                                            <h4 className="font-medium mb-3">Peak Hours</h4>
                                            <div className="space-y-2">
                                                {trendsData.peakHours.map((hour, index) => (
                                                    <div key={index} className="flex items-center">
                                                        <span className="w-24 text-sm">{hour.hour}</span>
                                                        <div className="flex-1">
                                                            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-orange-500"
                                                                    style={{ width: `${Math.min(hour.bookings * 5, 100)}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                        <span className="ml-2 text-sm font-medium">{hour.bookings} bookings</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Popular Sports */}
                                        <div className="mb-6">
                                            <h4 className="font-medium mb-3">Popular Sports</h4>
                                            <div className="space-y-3">
                                                {trendsData.popularSports.map((sport, index) => (
                                                    <div key={index} className="flex justify-between items-center">
                                                        <span className="text-sm">{sport.sport}</span>
                                                        <div className="flex items-center">
                                                            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden mr-3">
                                                                <div
                                                                    className="h-full bg-orange-500"
                                                                    style={{ width: `${(sport.bookings / 50) * 100}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-sm font-medium">{sport.bookings}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Revenue Trends */}
                                        <div>
                                            <h4 className="font-medium mb-3">Revenue Trends (This Week)</h4>
                                            <div className="space-y-2">
                                                {trendsData.revenueTrends.map((day, index) => (
                                                    <div key={index} className="flex items-center">
                                                        <span className="w-16 text-sm">{day.day}</span>
                                                        <div className="flex-1">
                                                            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-green-500"
                                                                    style={{ width: `${(day.revenue / 50000) * 100}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                        <span className="ml-2 text-sm font-medium">₨ {day.revenue.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button className="p-4 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition">
                                                <div className="text-lg font-bold">12</div>
                                                <div className="text-sm">Pending Bookings</div>
                                            </button>
                                            <button className="p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition">
                                                <div className="text-lg font-bold">3</div>
                                                <div className="text-sm">Blocked Slots</div>
                                            </button>
                                            <button className="p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition">
                                                <div className="text-lg font-bold">28</div>
                                                <div className="text-sm">Today's Revenue</div>
                                            </button>
                                            <button className="p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition">
                                                <div className="text-lg font-bold">45</div>
                                                <div className="text-sm">Total Bookings</div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Profile Tab */}
                {activeTab === "profile" && (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                                My Profile
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Update your personal information and change password.
                            </p>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Personal Information */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                            <input
                                                type="text"
                                                value={profileProps.name}
                                                onChange={(e) => setProfileProps(prev => ({ ...prev, name: e.target.value }))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                            <input
                                                type="email"
                                                value={profileProps.email}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                                readOnly
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Contact owner to change email</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                            <input
                                                type="tel"
                                                value={profileProps.phone}
                                                onChange={(e) => setProfileProps(prev => ({ ...prev, phone: e.target.value }))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                            />
                                        </div>
                                        <button
                                            onClick={handleProfileUpdate}
                                            className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700"
                                        >
                                            Update Profile
                                        </button>
                                    </div>
                                </div>

                                {/* Change Password */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                            <input
                                                type="password"
                                                value={profileProps.currentPassword}
                                                onChange={(e) => setProfileProps(prev => ({ ...prev, currentPassword: e.target.value }))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                            <input
                                                type="password"
                                                value={profileProps.newPassword}
                                                onChange={(e) => setProfileProps(prev => ({ ...prev, newPassword: e.target.value }))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                            <input
                                                type="password"
                                                value={profileProps.confirmPassword}
                                                onChange={(e) => setProfileProps(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                            />
                                        </div>
                                        <button
                                            onClick={handlePasswordChange}
                                            className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700"
                                        >
                                            Change Password
                                        </button>
                                    </div>

                                    {/* Account Information */}
                                    <div className="mt-6 pt-6 border-t">
                                        <h4 className="font-medium mb-3">Account Information</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Role:</span>
                                                <span className="font-medium">{managerData?.role || "Manager"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Arena ID:</span>
                                                <span className="font-medium">{managerData?.owner_id || "N/A"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Permissions:</span>
                                                <span className="font-medium">
                                                    {managerData?.permissions?.join(", ") || "View bookings, Manage schedule"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Member Since:</span>
                                                <span className="font-medium">March 15, 2024</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t py-6 mt-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="mb-4 md:mb-0">
                            <p className="text-gray-600">Manager Dashboard</p>
                            <p className="text-sm text-gray-500">Arena Management System</p>
                        </div>
                        <div className="text-sm text-gray-500">
                            Logged in as: {managerData?.name} • Role: Manager
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ManagerDashboard;