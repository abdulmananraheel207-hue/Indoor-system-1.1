// components/manager/ManagerBookings.jsx
import React, { useState, useEffect } from "react";

const ManagerBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                "http://localhost:5000/api/managers/bookings",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            const data = await response.json();
            if (response.ok) {
                setBookings(data);
            }
        } catch (error) {
            console.error("Error fetching bookings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptBooking = async (bookingId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `http://localhost:5000/api/managers/bookings/${bookingId}/accept`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.ok) {
                alert("Booking accepted successfully");
                fetchBookings();
            } else {
                const data = await response.json();
                alert(data.message || "Failed to accept booking");
            }
        } catch (error) {
            console.error("Error accepting booking:", error);
            alert("An error occurred");
        }
    };

    const handleRejectBooking = async (bookingId) => {
        const reason = prompt("Please enter reason for rejection:");
        if (!reason) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `http://localhost:5000/api/managers/bookings/${bookingId}/reject`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ reason }),
                }
            );

            if (response.ok) {
                alert("Booking rejected successfully");
                fetchBookings();
            } else {
                const data = await response.json();
                alert(data.message || "Failed to reject booking");
            }
        } catch (error) {
            console.error("Error rejecting booking:", error);
            alert("An error occurred");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "pending":
                return "bg-yellow-100 text-yellow-800";
            case "accepted":
                return "bg-blue-100 text-blue-800";
            case "completed":
                return "bg-green-100 text-green-800";
            case "rejected":
                return "bg-red-100 text-red-800";
            case "cancelled":
                return "bg-gray-100 text-gray-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-PKR", {
            style: "currency",
            currency: "PKR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div>
            <h1 className="text-xl font-bold text-gray-900 mb-4 md:text-2xl md:mb-6">
                Booking Management
            </h1>

            <div className="bg-white rounded-xl shadow overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center md:p-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-sm md:text-base text-gray-600">
                            Loading bookings...
                        </p>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="p-6 text-center md:p-8">
                        <p className="text-sm md:text-base text-gray-600">
                            No bookings found
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Sport & Arena
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date & Time
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {bookings.map((booking) => (
                                    <tr key={booking.booking_id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {booking.user_name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {booking.user_phone}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900">
                                                {booking.sport_name}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {booking.arena_name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900">
                                                {new Date(booking.date).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {booking.start_time} - {booking.end_time}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-semibold text-gray-900">
                                                {formatCurrency(booking.total_amount)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                                    booking.status
                                                )}`}
                                            >
                                                {booking.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {booking.status === "pending" && (
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleAcceptBooking(booking.booking_id)}
                                                        className="text-green-600 hover:text-green-900 text-sm"
                                                    >
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectBooking(booking.booking_id)}
                                                        className="text-red-600 hover:text-red-900 text-sm"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManagerBookings;