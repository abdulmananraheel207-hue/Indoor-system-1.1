// components/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [adminData, setAdminData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [activeTab, setActiveTab] = useState("activity");

    // Activity monitoring props
    const [activityProps, setActivityProps] = useState({
        timeRange: "monthly",
        statistics: {},
        arenas: [],
    });

    // Financial management props
    const [financialProps, setFinancialProps] = useState({
        commissions: [],
        totalCommission: 0,
        pendingPayments: [],
        searchQuery: "",
    });

    // Payment enforcement props
    const [paymentProps, setPaymentProps] = useState({
        overduePayments: [],
        blockedArenas: [],
        paymentHistory: [],
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

        // Initialize sample data
        initializeSampleData();
    }, [location.state, navigate, location.pathname]);

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const initializeSampleData = () => {
        // Sample activity statistics
        const sampleStats = {
            totalBookings: 1250,
            activeUsers: 342,
            totalArenas: 28,
            revenue: 2500000,
            commissionEarned: 125000,
            growthRate: 15.5,
        };

        // Sample arenas data
        const sampleArenas = [
            { id: 1, name: "Sports Arena 1", bookings: 145, revenue: 450000, commission: 22500 },
            { id: 2, name: "City Sports Complex", bookings: 98, revenue: 320000, commission: 16000 },
            { id: 3, name: "Elite Sports Center", bookings: 76, revenue: 280000, commission: 14000 },
            { id: 4, name: "Pro Sports Arena", bookings: 112, revenue: 380000, commission: 19000 },
            { id: 5, name: "Community Sports Hub", bookings: 65, revenue: 220000, commission: 11000 },
        ];

        // Sample commission data
        const sampleCommissions = [
            { id: 1, arena: "Sports Arena 1", owner: "Ali Khan", amount: 22500, status: "paid", dueDate: "2024-03-10", paidDate: "2024-03-05" },
            { id: 2, arena: "City Sports Complex", owner: "Sara Ahmed", amount: 16000, status: "paid", dueDate: "2024-03-10", paidDate: "2024-03-08" },
            { id: 3, arena: "Elite Sports Center", owner: "Raza Malik", amount: 14000, status: "overdue", dueDate: "2024-03-10", overdueDays: 5 },
            { id: 4, arena: "Pro Sports Arena", owner: "Fatima Noor", amount: 19000, status: "pending", dueDate: "2024-03-15" },
            { id: 5, arena: "Community Sports Hub", owner: "Bilal Shah", amount: 11000, status: "paid", dueDate: "2024-03-15", paidDate: "2024-03-12" },
        ];

        // Sample overdue payments
        const sampleOverdue = [
            { id: 3, arena: "Elite Sports Center", owner: "Raza Malik", amount: 14000, overdueDays: 5, contact: "03001234567" },
        ];

        // Sample blocked arenas
        const sampleBlocked = [
            { id: 6, arena: "Sunset Sports Arena", owner: "Kamran Ali", blockedSince: "2024-02-15", reason: "Non-payment" },
        ];

        setActivityProps({
            timeRange: "monthly",
            statistics: sampleStats,
            arenas: sampleArenas,
        });

        setFinancialProps({
            commissions: sampleCommissions,
            totalCommission: 125000,
            pendingPayments: sampleCommissions.filter(c => c.status === "pending" || c.status === "overdue"),
            searchQuery: "",
        });

        setPaymentProps({
            overduePayments: sampleOverdue,
            blockedArenas: sampleBlocked,
            paymentHistory: sampleCommissions.filter(c => c.status === "paid"),
        });
    };

    const checkAuthStatus = () => {
        try {
            const token = localStorage.getItem("token");
            const admin = localStorage.getItem("admin");
            const role = localStorage.getItem("role");

            if (token && admin && role === "admin") {
                setAdminData(JSON.parse(admin));
            } else {
                navigate("/admin/login");
            }
        } catch (error) {
            console.error("Error checking auth status:", error);
            navigate("/admin/login");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("admin");
        localStorage.removeItem("role");
        navigate("/");
    };

    // Activity monitoring handlers
    const handleTimeRangeChange = (range) => {
        setActivityProps(prev => ({ ...prev, timeRange: range }));
        // In real app: fetch data for selected time range
    };

    // Financial management handlers
    const handleExportReport = (reportType) => {
        console.log(`Exporting ${reportType} report`);
        // In real app: Generate and download report
    };

    const handleMarkAsPaid = (commissionId) => {
        setFinancialProps(prev => ({
            ...prev,
            commissions: prev.commissions.map(c =>
                c.id === commissionId ? { ...c, status: "paid", paidDate: new Date().toISOString().split('T')[0] } : c
            ),
            pendingPayments: prev.pendingPayments.filter(p => p.id !== commissionId)
        }));
        // In real app: API call to mark as paid
    };

    // Payment enforcement handlers
    const handleBlockArena = (arenaId) => {
        const arena = activityProps.arenas.find(a => a.id === arenaId);
        if (arena) {
            const newBlocked = {
                id: arenaId,
                arena: arena.name,
                owner: "Owner Name",
                blockedSince: new Date().toISOString().split('T')[0],
                reason: "Non-payment"
            };
            setPaymentProps(prev => ({
                ...prev,
                blockedArenas: [...prev.blockedArenas, newBlocked]
            }));
            // In real app: API call to block arena
        }
    };

    const handleUnblockArena = (arenaId) => {
        setPaymentProps(prev => ({
            ...prev,
            blockedArenas: prev.blockedArenas.filter(a => a.id !== arenaId)
        }));
        // In real app: API call to unblock arena
    };

    const handleSendReminder = (ownerId) => {
        console.log(`Sending reminder to owner ${ownerId}`);
        // In real app: Send email/SMS reminder
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
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
                        <div className="text-2xl font-bold text-purple-600 mr-2">🛡️</div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">
                                Admin Dashboard
                            </h1>
                            <p className="text-xs text-gray-500">System Administration Panel</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-800">
                                {adminData?.is_super_admin ? "Super Admin" : "Admin"}
                            </p>
                            <p className="text-xs text-gray-500">{adminData?.email}</p>
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
                                Admin login successful!
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Navigation Tabs */}
            <div className="container mx-auto px-4 py-4">
                <div className="flex border-b">
                    <button
                        onClick={() => setActiveTab("activity")}
                        className={`px-4 py-3 font-medium ${activeTab === "activity"
                                ? "text-purple-600 border-b-2 border-purple-600"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Activity Monitoring
                    </button>
                    <button
                        onClick={() => setActiveTab("financial")}
                        className={`px-4 py-3 font-medium ${activeTab === "financial"
                                ? "text-purple-600 border-b-2 border-purple-600"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Financial Management
                    </button>
                    <button
                        onClick={() => setActiveTab("payment")}
                        className={`px-4 py-3 font-medium ${activeTab === "payment"
                                ? "text-purple-600 border-b-2 border-purple-600"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Payment Enforcement
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="container mx-auto px-4 py-8">
                {/* Activity Monitoring Tab */}
                {activeTab === "activity" && (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                                Activity Monitoring
                            </h2>
                            <p className="text-gray-600 mb-6">
                                View overall booking statistics and arena performance.
                            </p>

                            {/* Time Range Selector */}
                            <div className="flex space-x-2 mb-6">
                                {["daily", "weekly", "monthly", "yearly"].map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => handleTimeRangeChange(range)}
                                        className={`px-4 py-2 rounded-lg capitalize ${activityProps.timeRange === range
                                                ? "bg-purple-600 text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            }`}
                                    >
                                        {range}
                                    </button>
                                ))}
                            </div>

                            {/* Statistics Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Total Bookings</h3>
                                    <p className="text-2xl font-bold text-gray-800">
                                        {activityProps.statistics.totalBookings?.toLocaleString() || "0"}
                                    </p>
                                    <p className="text-sm text-green-600 mt-1">↑ {activityProps.statistics.growthRate || "0"}% growth</p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Active Users</h3>
                                    <p className="text-2xl font-bold text-gray-800">
                                        {activityProps.statistics.activeUsers?.toLocaleString() || "0"}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Total Arenas</h3>
                                    <p className="text-2xl font-bold text-gray-800">
                                        {activityProps.statistics.totalArenas || "0"}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Total Revenue</h3>
                                    <p className="text-2xl font-bold text-gray-800">
                                        ₨ {activityProps.statistics.revenue?.toLocaleString() || "0"}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Commission Earned</h3>
                                    <p className="text-2xl font-bold text-purple-600">
                                        ₨ {activityProps.statistics.commissionEarned?.toLocaleString() || "0"}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Time Range</h3>
                                    <p className="text-xl font-bold text-gray-800 capitalize">
                                        {activityProps.timeRange}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">Current view</p>
                                </div>
                            </div>

                            {/* Visual Charts Placeholder */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Booking Trends</h3>
                                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                                        <p className="text-gray-500">Line chart showing booking trends over time</p>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Revenue Distribution</h3>
                                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                                        <p className="text-gray-500">Pie chart showing revenue distribution by arena</p>
                                    </div>
                                </div>
                            </div>

                            {/* Top Performing Arenas */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-semibold">Top Performing Arenas</h3>
                                    <button
                                        onClick={() => handleExportReport("arena-performance")}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                    >
                                        Export Report
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Arena</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {activityProps.arenas.map((arena) => (
                                                <tr key={arena.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">{arena.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{arena.bookings}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">₨ {arena.revenue.toLocaleString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">₨ {arena.commission.toLocaleString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-green-500"
                                                                style={{ width: `${(arena.bookings / 150) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Financial Management Tab */}
                {activeTab === "financial" && (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                                Financial Management
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Track commissions and manage financial reports.
                            </p>

                            {/* Financial Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Total Commission</h3>
                                    <p className="text-2xl font-bold text-purple-600">
                                        ₨ {financialProps.totalCommission?.toLocaleString() || "0"}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">This month</p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Payments</h3>
                                    <p className="text-2xl font-bold text-orange-600">
                                        {financialProps.pendingPayments?.length || "0"}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">Awaiting clearance</p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Export Reports</h3>
                                    <div className="flex space-x-2 mt-2">
                                        <button
                                            onClick={() => handleExportReport("monthly")}
                                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
                                        >
                                            Monthly
                                        </button>
                                        <button
                                            onClick={() => handleExportReport("quarterly")}
                                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
                                        >
                                            Quarterly
                                        </button>
                                        <button
                                            onClick={() => handleExportReport("annual")}
                                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
                                        >
                                            Annual
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Commission Tracking */}
                            <div className="bg-white rounded-lg shadow p-6 mb-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-semibold">Commission Tracking</h3>
                                    <div className="flex space-x-2">
                                        <input
                                            type="text"
                                            placeholder="Search arenas or owners..."
                                            className="px-4 py-2 border border-gray-300 rounded-lg"
                                            value={financialProps.searchQuery}
                                            onChange={(e) => setFinancialProps(prev => ({ ...prev, searchQuery: e.target.value }))}
                                        />
                                        <button
                                            onClick={() => handleExportReport("commission")}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                        >
                                            Export CSV
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Arena</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {financialProps.commissions.map((commission) => (
                                                <tr key={commission.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">{commission.arena}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{commission.owner}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">₨ {commission.amount.toLocaleString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${commission.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                                commission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-red-100 text-red-800'
                                                            }`}>
                                                            {commission.status}
                                                            {commission.overdueDays && ` (${commission.overdueDays} days)`}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{commission.dueDate}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {commission.status !== 'paid' && (
                                                            <button
                                                                onClick={() => handleMarkAsPaid(commission.id)}
                                                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 mr-2"
                                                            >
                                                                Mark Paid
                                                            </button>
                                                        )}
                                                        {commission.status === 'overdue' && (
                                                            <button
                                                                onClick={() => handleSendReminder(commission.id)}
                                                                className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                                                            >
                                                                Send Reminder
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Report Generation */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold mb-4">Generate Financial Reports</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-4 border border-gray-200 rounded-lg">
                                        <h4 className="font-medium mb-2">Monthly Report</h4>
                                        <p className="text-sm text-gray-600 mb-3">Detailed monthly financial summary</p>
                                        <button
                                            onClick={() => handleExportReport("monthly-detailed")}
                                            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                        >
                                            Generate & Download
                                        </button>
                                    </div>
                                    <div className="p-4 border border-gray-200 rounded-lg">
                                        <h4 className="font-medium mb-2">Commission Report</h4>
                                        <p className="text-sm text-gray-600 mb-3">Commission tracking by arena</p>
                                        <button
                                            onClick={() => handleExportReport("commission-detailed")}
                                            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                        >
                                            Generate & Download
                                        </button>
                                    </div>
                                    <div className="p-4 border border-gray-200 rounded-lg">
                                        <h4 className="font-medium mb-2">Custom Report</h4>
                                        <p className="text-sm text-gray-600 mb-3">Custom date range report</p>
                                        <div className="flex space-x-2">
                                            <input type="date" className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm" />
                                            <input type="date" className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm" />
                                        </div>
                                        <button className="w-full mt-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                                            Generate Custom
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Payment Enforcement Tab */}
                {activeTab === "payment" && (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                                Payment Enforcement
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Manage overdue payments and block arenas for non-payment.
                            </p>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Overdue Payments */}
                                <div className="space-y-6">
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-semibold">Overdue Payments</h3>
                                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                                                {paymentProps.overduePayments.length} overdue
                                            </span>
                                        </div>

                                        {paymentProps.overduePayments.length > 0 ? (
                                            <div className="space-y-4">
                                                {paymentProps.overduePayments.map((payment) => (
                                                    <div key={payment.id} className="p-4 border border-red-200 bg-red-50 rounded-lg">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-medium">{payment.arena}</h4>
                                                                <p className="text-sm text-gray-600">{payment.owner}</p>
                                                                <p className="text-sm text-red-600 mt-1">
                                                                    Overdue by {payment.overdueDays} days
                                                                </p>
                                                            </div>
                                                            <span className="text-lg font-bold">₨ {payment.amount.toLocaleString()}</span>
                                                        </div>
                                                        <div className="mt-4 flex space-x-2">
                                                            <button
                                                                onClick={() => handleMarkAsPaid(payment.id)}
                                                                className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                                            >
                                                                Mark as Paid
                                                            </button>
                                                            <button
                                                                onClick={() => handleSendReminder(payment.id)}
                                                                className="flex-1 px-3 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                                                            >
                                                                Send Reminder
                                                            </button>
                                                            <button
                                                                onClick={() => handleBlockArena(payment.id)}
                                                                className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                                                            >
                                                                Block Arena
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center">
                                                <div className="text-green-500 text-4xl mb-2">✓</div>
                                                <p className="text-gray-600">No overdue payments</p>
                                                <p className="text-sm text-gray-500 mt-1">All payments are up to date</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Payment History */}
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <h3 className="text-lg font-semibold mb-4">Recent Payment History</h3>
                                        <div className="space-y-3">
                                            {paymentProps.paymentHistory.slice(0, 5).map((payment) => (
                                                <div key={payment.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                                                    <div>
                                                        <p className="font-medium text-sm">{payment.arena}</p>
                                                        <p className="text-xs text-gray-500">Paid on {payment.paidDate}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold">₨ {payment.amount.toLocaleString()}</p>
                                                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                                            Paid
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Blocked Arenas */}
                                <div className="space-y-6">
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-semibold">Blocked Arenas</h3>
                                            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                                                {paymentProps.blockedArenas.length} blocked
                                            </span>
                                        </div>

                                        {paymentProps.blockedArenas.length > 0 ? (
                                            <div className="space-y-4">
                                                {paymentProps.blockedArenas.map((arena) => (
                                                    <div key={arena.id} className="p-4 border border-gray-200 rounded-lg">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-medium">{arena.arena}</h4>
                                                                <p className="text-sm text-gray-600">{arena.owner}</p>
                                                                <p className="text-sm text-red-600 mt-1">
                                                                    Blocked since {arena.blockedSince}
                                                                </p>
                                                                <p className="text-sm text-gray-500">Reason: {arena.reason}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleUnblockArena(arena.id)}
                                                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                                            >
                                                                Unblock
                                                            </button>
                                                        </div>
                                                        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded">
                                                            <p className="text-sm text-red-700">
                                                                This arena is not visible to users. All bookings are suspended.
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center">
                                                <div className="text-green-500 text-4xl mb-2">✓</div>
                                                <p className="text-gray-600">No blocked arenas</p>
                                                <p className="text-sm text-gray-500 mt-1">All arenas are active</p>
                                            </div>
                                        )}

                                        {/* Block Arena Form */}
                                        <div className="mt-6 pt-6 border-t">
                                            <h4 className="font-medium mb-3">Block Arena Manually</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Arena Name</label>
                                                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                                        <option value="">Select arena to block</option>
                                                        {activityProps.arenas.map((arena) => (
                                                            <option key={arena.id} value={arena.id}>{arena.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Non-payment, Terms violation, etc."
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                    />
                                                </div>
                                                <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                                                    Block Arena
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Enforcement Statistics */}
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <h3 className="text-lg font-semibold mb-4">Enforcement Statistics</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-blue-50 rounded-lg">
                                                <p className="text-sm text-gray-600">Total Collected</p>
                                                <p className="text-xl font-bold">₨ {financialProps.totalCommission?.toLocaleString() || "0"}</p>
                                            </div>
                                            <div className="p-3 bg-green-50 rounded-lg">
                                                <p className="text-sm text-gray-600">On-time Payments</p>
                                                <p className="text-xl font-bold">85%</p>
                                            </div>
                                            <div className="p-3 bg-yellow-50 rounded-lg">
                                                <p className="text-sm text-gray-600">Average Delay</p>
                                                <p className="text-xl font-bold">2.5 days</p>
                                            </div>
                                            <div className="p-3 bg-red-50 rounded-lg">
                                                <p className="text-sm text-gray-600">Recovery Rate</p>
                                                <p className="text-xl font-bold">92%</p>
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
                            <p className="text-gray-600">Admin Dashboard</p>
                            <p className="text-sm text-gray-500">System Administration Control Panel</p>
                        </div>
                        <div className="text-sm text-gray-500">
                            {adminData?.is_super_admin ? "Super Admin" : "Admin"} • {new Date().toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default AdminDashboard;