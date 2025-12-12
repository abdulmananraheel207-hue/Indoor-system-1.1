// components/OwnerDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const OwnerDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [ownerData, setOwnerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [activeTab, setActiveTab] = useState("dashboard");

    // Props for different features
    const [analyticsProps, setAnalyticsProps] = useState({
        timeRange: "weekly", // "daily", "weekly", "monthly"
        bookingData: [], // Will contain booking analytics
        financialOverview: {}, // Financial data
    });

    const [bookingManagementProps, setBookingManagementProps] = useState({
        bookings: [], // All bookings
        statusFilter: "all", // "pending", "in-process", "completed"
        searchQuery: "",
    });

    const [scheduleControlProps, setScheduleControlProps] = useState({
        blockedSlots: [], // Blocked time slots
        holidays: [], // Holiday dates
        workingHours: {}, // Daily working hours
    });

    const [staffManagementProps, setStaffManagementProps] = useState({
        staffMembers: [], // All staff
        newStaff: { name: "", email: "", phone: "", role: "", permissions: [] },
        permissionOptions: [], // Available permissions
    });

    const [reportsProps, setReportsProps] = useState({
        availableReports: [], // Available report types
        generatedReports: [], // Previously generated reports
        commissionData: {}, // Platform commission info
    });

    useEffect(() => {
        if (location.state?.loginSuccess || location.state?.registerSuccess) {
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
            const owner = localStorage.getItem("owner");
            const role = localStorage.getItem("role");

            if (token && owner && role === "owner") {
                setOwnerData(JSON.parse(owner));
            } else {
                navigate("/owner/login");
            }
        } catch (error) {
            console.error("Error checking auth status:", error);
            navigate("/owner/login");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("owner");
        localStorage.removeItem("role");
        navigate("/");
    };

    // Feature handlers (props update functions)
    const handleTimeRangeChange = (range) => {
        setAnalyticsProps(prev => ({ ...prev, timeRange: range }));
        // In real app: fetch analytics data for selected range
    };

    const handleBookingStatusFilter = (status) => {
        setBookingManagementProps(prev => ({ ...prev, statusFilter: status }));
        // In real app: filter bookings by status
    };

    const handleBlockSlot = (date, time) => {
        const newBlockedSlot = { date, time, reason: "" };
        setScheduleControlProps(prev => ({
            ...prev,
            blockedSlots: [...prev.blockedSlots, newBlockedSlot]
        }));
        // In real app: API call to block slot
    };

    const handleAddHoliday = (date, description) => {
        const newHoliday = { date, description };
        setScheduleControlProps(prev => ({
            ...prev,
            holidays: [...prev.holidays, newHoliday]
        }));
        // In real app: API call to add holiday
    };

    const handleAddStaff = (staffData) => {
        setStaffManagementProps(prev => ({
            ...prev,
            staffMembers: [...prev.staffMembers, { ...staffData, id: Date.now() }]
        }));
        // In real app: API call to add staff
    };

    const handleGenerateReport = (reportType, dateRange) => {
        const newReport = {
            type: reportType,
            dateRange,
            generatedAt: new Date().toISOString(),
            downloadUrl: "#"
        };
        setReportsProps(prev => ({
            ...prev,
            generatedReports: [...prev.generatedReports, newReport]
        }));
        // In real app: API call to generate report
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
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
                        <div className="text-2xl font-bold text-green-600 mr-2">👑</div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">
                                {ownerData?.arena_name || "Arena Owner Dashboard"}
                            </h1>
                            <p className="text-xs text-gray-500">Owner Panel</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-800">
                                Welcome, Owner!
                            </p>
                            <p className="text-xs text-gray-500">{ownerData?.email}</p>
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
                            <span className="text-green-600 mr-2">
                                {location.state?.loginSuccess ? "✅" : "🎉"}
                            </span>
                            <p className="text-green-700 font-medium">
                                {location.state?.loginSuccess
                                    ? "Login successful!"
                                    : "Registration successful! Welcome to owner dashboard."}
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
                            ? "text-green-600 border-b-2 border-green-600"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Dashboard & Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab("bookings")}
                        className={`px-4 py-3 font-medium ${activeTab === "bookings"
                            ? "text-green-600 border-b-2 border-green-600"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Booking Management
                    </button>
                    <button
                        onClick={() => setActiveTab("schedule")}
                        className={`px-4 py-3 font-medium ${activeTab === "schedule"
                            ? "text-green-600 border-b-2 border-green-600"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Schedule Control
                    </button>
                    <button
                        onClick={() => setActiveTab("staff")}
                        className={`px-4 py-3 font-medium ${activeTab === "staff"
                            ? "text-green-600 border-b-2 border-green-600"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Staff Management
                    </button>
                    <button
                        onClick={() => setActiveTab("reports")}
                        className={`px-4 py-3 font-medium ${activeTab === "reports"
                            ? "text-green-600 border-b-2 border-green-600"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Reports
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="container mx-auto px-4 py-8">
                {/* Dashboard & Analytics Tab */}
                {activeTab === "dashboard" && (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                                Dashboard & Analytics
                            </h2>
                            <p className="text-gray-600 mb-6">
                                View booking data and financial overview of your arena.
                            </p>

                            {/* Time Range Selector */}
                            <div className="flex space-x-2 mb-6">
                                {["daily", "weekly", "monthly"].map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => handleTimeRangeChange(range)}
                                        className={`px-4 py-2 rounded-lg capitalize ${analyticsProps.timeRange === range
                                            ? "bg-green-600 text-white"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            }`}
                                    >
                                        {range}
                                    </button>
                                ))}
                            </div>

                            {/* Analytics Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Total Revenue</h3>
                                    <p className="text-2xl font-bold text-gray-800">₨ {analyticsProps.financialOverview.totalRevenue?.toLocaleString() || "0"}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Total Bookings</h3>
                                    <p className="text-2xl font-bold text-gray-800">{analyticsProps.financialOverview.totalBookings || "0"}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Lost Revenue</h3>
                                    <p className="text-2xl font-bold text-red-600">₨ {analyticsProps.financialOverview.lostRevenue?.toLocaleString() || "0"}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Platform Commission</h3>
                                    <p className="text-2xl font-bold text-orange-600">₨ {analyticsProps.financialOverview.platformCommission?.toLocaleString() || "0"}</p>
                                </div>
                            </div>

                            {/* Chart Placeholder */}
                            <div className="bg-white rounded-lg shadow p-6 mb-8">
                                <h3 className="text-lg font-semibold mb-4">Booking Analytics ({analyticsProps.timeRange})</h3>
                                <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                                    <p className="text-gray-500">Chart will display {analyticsProps.timeRange} booking data</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Booking Management Tab */}
                {activeTab === "bookings" && (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                                Booking Management
                            </h2>
                            <p className="text-gray-600 mb-6">
                                View all bookings sorted by status. Get notifications for new bookings and cancellations.
                            </p>

                            {/* Status Filters */}
                            <div className="flex space-x-2 mb-6">
                                {["all", "pending", "in-process", "completed", "cancelled"].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => handleBookingStatusFilter(status)}
                                        className={`px-4 py-2 rounded-lg capitalize ${bookingManagementProps.statusFilter === status
                                            ? "bg-green-600 text-white"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>

                            {/* Search Bar */}
                            <div className="mb-6">
                                <input
                                    type="text"
                                    placeholder="Search bookings by customer name, sport, or court..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    value={bookingManagementProps.searchQuery}
                                    onChange={(e) => setBookingManagementProps(prev => ({ ...prev, searchQuery: e.target.value }))}
                                />
                            </div>

                            {/* Bookings Table */}
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sport</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Court</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {bookingManagementProps.bookings.length > 0 ? (
                                            bookingManagementProps.bookings.map((booking) => (
                                                <tr key={booking.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">{booking.customer}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{booking.sport}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{booking.court}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{booking.date} {booking.time}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                            booking.status === 'in-process' ? 'bg-blue-100 text-blue-800' :
                                                                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-red-100 text-red-800'
                                                            }`}>
                                                            {booking.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">₨ {booking.amount?.toLocaleString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <button className="text-green-600 hover:text-green-800 mr-3">View</button>
                                                        <button className="text-blue-600 hover:text-blue-800">Update</button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                                    No bookings found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Schedule Control Tab */}
                {activeTab === "schedule" && (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                                Schedule Control
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Block time slots and set holidays for your arena.
                            </p>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Block Time Slots */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Block Time Slots</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                            <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot</label>
                                            <input type="time" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
                                            <input type="text" placeholder="Maintenance, Private event, etc." className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                                        </div>
                                        <button
                                            onClick={() => handleBlockSlot("2024-03-20", "14:00-15:00")}
                                            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                                        >
                                            Block Slot
                                        </button>
                                    </div>

                                    {/* Blocked Slots List */}
                                    <div className="mt-6">
                                        <h4 className="font-medium mb-3">Blocked Slots</h4>
                                        {scheduleControlProps.blockedSlots.length > 0 ? (
                                            <ul className="space-y-2">
                                                {scheduleControlProps.blockedSlots.map((slot, index) => (
                                                    <li key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                                        <span>{slot.date} {slot.time}</span>
                                                        <button className="text-red-600 hover:text-red-800">Remove</button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-gray-500">No slots blocked</p>
                                        )}
                                    </div>
                                </div>

                                {/* Set Holidays */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Set Holidays</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Date</label>
                                            <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                            <input type="text" placeholder="Eid, Christmas, Annual maintenance, etc." className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                                        </div>
                                        <button
                                            onClick={() => handleAddHoliday("2024-04-10", "Eid Holiday")}
                                            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                                        >
                                            Add Holiday
                                        </button>
                                    </div>

                                    {/* Holidays List */}
                                    <div className="mt-6">
                                        <h4 className="font-medium mb-3">Scheduled Holidays</h4>
                                        {scheduleControlProps.holidays.length > 0 ? (
                                            <ul className="space-y-2">
                                                {scheduleControlProps.holidays.map((holiday, index) => (
                                                    <li key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                                        <span>{holiday.date} - {holiday.description}</span>
                                                        <button className="text-red-600 hover:text-red-800">Remove</button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-gray-500">No holidays scheduled</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Staff Management Tab */}
                {activeTab === "staff" && (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                                Staff Management
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Add staff accounts and control their permissions.
                            </p>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Add Staff Form */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Add New Staff</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                value={staffManagementProps.newStaff.name}
                                                onChange={(e) => setStaffManagementProps(prev => ({
                                                    ...prev,
                                                    newStaff: { ...prev.newStaff, name: e.target.value }
                                                }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input
                                                type="email"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                value={staffManagementProps.newStaff.email}
                                                onChange={(e) => setStaffManagementProps(prev => ({
                                                    ...prev,
                                                    newStaff: { ...prev.newStaff, email: e.target.value }
                                                }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                            <input
                                                type="tel"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                value={staffManagementProps.newStaff.phone}
                                                onChange={(e) => setStaffManagementProps(prev => ({
                                                    ...prev,
                                                    newStaff: { ...prev.newStaff, phone: e.target.value }
                                                }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                            <select
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                value={staffManagementProps.newStaff.role}
                                                onChange={(e) => setStaffManagementProps(prev => ({
                                                    ...prev,
                                                    newStaff: { ...prev.newStaff, role: e.target.value }
                                                }))}
                                            >
                                                <option value="">Select Role</option>
                                                <option value="manager">Manager</option>
                                                <option value="receptionist">Receptionist</option>
                                                <option value="cleaner">Cleaner</option>
                                                <option value="coach">Coach</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Permissions</label>
                                            <div className="space-y-2">
                                                {staffManagementProps.permissionOptions.map((permission) => (
                                                    <label key={permission.id} className="flex items-center">
                                                        <input type="checkbox" className="mr-2" />
                                                        <span className="text-sm">{permission.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAddStaff(staffManagementProps.newStaff)}
                                            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                                        >
                                            Add Staff Member
                                        </button>
                                    </div>
                                </div>

                                {/* Staff List */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Staff Members</h3>
                                    {staffManagementProps.staffMembers.length > 0 ? (
                                        <div className="space-y-4">
                                            {staffManagementProps.staffMembers.map((staff) => (
                                                <div key={staff.id} className="p-4 border border-gray-200 rounded-lg">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-medium">{staff.name}</h4>
                                                            <p className="text-sm text-gray-500">{staff.email}</p>
                                                            <p className="text-sm text-gray-500">{staff.phone}</p>
                                                            <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                                                {staff.role}
                                                            </span>
                                                        </div>
                                                        <button className="text-red-600 hover:text-red-800">Remove</button>
                                                    </div>
                                                    <div className="mt-2">
                                                        <p className="text-sm font-medium">Permissions:</p>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {staff.permissions.map((perm, idx) => (
                                                                <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                                                    {perm}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">No staff members added yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reports Tab */}
                {activeTab === "reports" && (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                                Reports
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Download booking and financial reports. View platform commission.
                            </p>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Generate Reports */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Generate Reports</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                                            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                                <option value="">Select Report Type</option>
                                                <option value="booking">Booking Report</option>
                                                <option value="financial">Financial Report</option>
                                                <option value="attendance">Staff Attendance</option>
                                                <option value="inventory">Inventory Report</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                                            <div className="flex space-x-2">
                                                <input type="date" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg" />
                                                <span className="py-2">to</span>
                                                <input type="date" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg" />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleGenerateReport("booking", "2024-03-01 to 2024-03-31")}
                                            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                                        >
                                            Generate & Download CSV
                                        </button>
                                    </div>

                                    {/* Commission Info */}
                                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <h4 className="font-medium mb-2">Platform Commission</h4>
                                        <p className="text-sm text-gray-600">
                                            Commission rate: 5% of total revenue
                                        </p>
                                        <p className="text-lg font-bold mt-2">
                                            Total Commission: ₨ {reportsProps.commissionData.total?.toLocaleString() || "0"}
                                        </p>
                                    </div>
                                </div>

                                {/* Generated Reports */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Previously Generated Reports</h3>
                                    {reportsProps.generatedReports.length > 0 ? (
                                        <div className="space-y-3">
                                            {reportsProps.generatedReports.map((report, index) => (
                                                <div key={index} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                                                    <div>
                                                        <p className="font-medium capitalize">{report.type} Report</p>
                                                        <p className="text-sm text-gray-500">{report.dateRange}</p>
                                                        <p className="text-xs text-gray-400">Generated: {new Date(report.generatedAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <a
                                                        href={report.downloadUrl}
                                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                                    >
                                                        Download
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">No reports generated yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default OwnerDashboard;