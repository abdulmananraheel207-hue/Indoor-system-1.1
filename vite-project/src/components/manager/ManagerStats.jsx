import React, { useState, useEffect } from "react";
import { managerAPI } from "../../services/managerAPI";

const ManagerStats = ({ permissions }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("month");

    // Permission check
    const canViewFinancial = permissions?.view_financial;

    if (!canViewFinancial) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-700">
                    ❌ You don't have permission to view financial statistics.
                    Contact the arena owner to get access.
                </p>
            </div>
        );
    }

    useEffect(() => {
        fetchStats();
    }, [period]);

    const fetchStats = async () => {
        try {
            const response = await managerAPI.getStats({ period });
            setStats(response.data);
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold text-gray-900">
                    Statistics & Reports
                </h1>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="border rounded-lg p-2"
                >
                    <option value="day">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                </select>
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Total Bookings */}
                    <div className="bg-white p-6 rounded-xl shadow">
                        <div className="text-sm text-gray-500">Total Bookings</div>
                        <div className="text-3xl font-bold mt-2">
                            {stats.total_bookings || 0}
                        </div>
                    </div>

                    {/* Completed Bookings */}
                    <div className="bg-white p-6 rounded-xl shadow">
                        <div className="text-sm text-gray-500">Completed</div>
                        <div className="text-3xl font-bold mt-2 text-green-600">
                            {stats.completed_bookings || 0}
                        </div>
                    </div>

                    {/* Pending Bookings */}
                    <div className="bg-white p-6 rounded-xl shadow">
                        <div className="text-sm text-gray-500">Pending</div>
                        <div className="text-3xl font-bold mt-2 text-yellow-600">
                            {stats.pending_bookings || 0}
                        </div>
                    </div>

                    {/* Total Revenue */}
                    <div className="bg-white p-6 rounded-xl shadow">
                        <div className="text-sm text-gray-500">Total Revenue</div>
                        <div className="text-3xl font-bold mt-2 text-blue-600">
                            {formatCurrency(stats.total_revenue || 0)}
                        </div>
                    </div>

                    {/* Cancelled Bookings */}
                    <div className="bg-white p-6 rounded-xl shadow">
                        <div className="text-sm text-gray-500">Cancelled</div>
                        <div className="text-3xl font-bold mt-2 text-red-600">
                            {stats.cancelled_bookings || 0}
                        </div>
                    </div>

                    {/* Accepted Bookings */}
                    <div className="bg-white p-6 rounded-xl shadow">
                        <div className="text-sm text-gray-500">In Process</div>
                        <div className="text-3xl font-bold mt-2 text-purple-600">
                            {stats.accepted_bookings || 0}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerStats;