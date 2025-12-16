// components/manager/ManagerHome.jsx
import React from "react";

const ManagerHome = ({ managerData }) => {
    const { permissions, stats = {} } = managerData;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    return (
        <div>
            <h1 className="text-xl font-bold text-gray-900 mb-4 md:text-2xl md:mb-6">
                Manager Dashboard
            </h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-3 mb-6 md:grid-cols-2 lg:grid-cols-4 md:gap-6">
                {permissions.view_dashboard && (
                    <>
                        <div className="bg-white p-3 rounded-xl shadow md:p-6">
                            <div className="flex items-center">
                                <div className="p-2 bg-blue-100 rounded-lg mr-2 md:p-3 md:mr-4">
                                    <span className="text-lg md:text-2xl">📅</span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 md:text-sm">
                                        Today's Bookings
                                    </p>
                                    <p className="text-lg font-bold text-gray-900 md:text-2xl">
                                        {stats.today_bookings || 0}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {permissions.view_financial && (
                            <div className="bg-white p-3 rounded-xl shadow md:p-6">
                                <div className="flex items-center">
                                    <div className="p-2 bg-green-100 rounded-lg mr-2 md:p-3 md:mr-4">
                                        <span className="text-lg md:text-2xl">💰</span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 md:text-sm">
                                            Today's Revenue
                                        </p>
                                        <p className="text-lg font-bold text-gray-900 md:text-2xl">
                                            {formatCurrency(stats.today_revenue)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Pending Requests */}
                {(permissions.view_bookings || permissions.manage_bookings) && (
                    <div className="bg-white p-3 rounded-xl shadow md:p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-yellow-100 rounded-lg mr-2 md:p-3 md:mr-4">
                                <span className="text-lg md:text-2xl">⏳</span>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 md:text-sm">
                                    Pending Requests
                                </p>
                                <p className="text-lg font-bold text-gray-900 md:text-2xl">
                                    {managerData.pending_requests?.length || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Available Arenas */}
                <div className="bg-white p-3 rounded-xl shadow md:p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg mr-2 md:p-3 md:mr-4">
                            <span className="text-lg md:text-2xl">🏢</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 md:text-sm">
                                Available Arenas
                            </p>
                            <p className="text-lg font-bold text-gray-900 md:text-2xl">
                                {managerData.arenas?.length || 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Permissions Overview */}
            <div className="bg-white rounded-xl shadow p-3 md:p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3 md:text-xl">
                    Your Permissions
                </h2>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                    {Object.entries(permissions).map(([key, value]) => (
                        <div key={key} className="flex items-center p-2 bg-gray-50 rounded-lg">
                            <div className={`h-3 w-3 rounded-full mr-2 ${value ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-sm capitalize">
                                {key.replace(/_/g, ' ')}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 bg-white rounded-xl shadow p-3 md:p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3 md:text-xl">
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {permissions.manage_bookings && (
                        <button
                            onClick={() => {/* Navigate to bookings */ }}
                            className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 text-left"
                        >
                            <div className="font-medium text-blue-700">Review Pending Bookings</div>
                            <div className="text-xs text-blue-600 md:text-sm">
                                {managerData.pending_requests?.length || 0} requests pending
                            </div>
                        </button>
                    )}
                    {permissions.manage_calendar && (
                        <button
                            onClick={() => {/* Navigate to calendar */ }}
                            className="p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 text-left"
                        >
                            <div className="font-medium text-green-700">Manage Time Slots</div>
                            <div className="text-xs text-green-600 md:text-sm">
                                Update availability and pricing
                            </div>
                        </button>
                    )}
                    <button
                        onClick={() => {/* Navigate to profile */ }}
                        className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 text-left"
                    >
                        <div className="font-medium text-gray-700">View Profile</div>
                        <div className="text-xs text-gray-600 md:text-sm">
                            Update your contact information
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManagerHome;