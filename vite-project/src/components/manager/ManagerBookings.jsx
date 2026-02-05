import React, { useState, useEffect } from "react";
import { managerAPI } from "../../services/managerAPI";

const ManagerBookings = ({ permissions }) => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    // Permission checks
    const canViewBookings = permissions?.view_bookings;
    const canManageBookings = permissions?.manage_bookings;

    // If no permission to view bookings at all
    if (!canViewBookings && !canManageBookings) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-700">
                    ❌ You don't have permission to view bookings.
                    Contact the arena owner to get access.
                </p>
            </div>
        );
    }

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const response = await managerAPI.getBookings();
            setBookings(response.data || []);
        } catch (error) {
            console.error("Error fetching bookings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptBooking = async (bookingId) => {
        if (!canManageBookings) {
            alert("You don't have permission to accept bookings");
            return;
        }

        if (window.confirm("Accept this booking?")) {
            try {
                await managerAPI.acceptBooking(bookingId);
                alert("Booking accepted!");
                fetchBookings();
            } catch (error) {
                alert("Failed to accept booking");
            }
        }
    };

    const handleRejectBooking = async (bookingId) => {
        if (!canManageBookings) {
            alert("You don't have permission to reject bookings");
            return;
        }

        const reason = prompt("Enter reason for rejection:");
        if (reason) {
            try {
                await managerAPI.rejectBooking(bookingId, reason);
                alert("Booking rejected!");
                fetchBookings();
            } catch (error) {
                alert("Failed to reject booking");
            }
        }
    };

    const handleCompleteBooking = async (bookingId) => {
        if (!canManageBookings) {
            alert("You don't have permission to complete bookings");
            return;
        }

        if (window.confirm("Mark booking as completed?")) {
            try {
                await managerAPI.completeBooking(bookingId);
                alert("Booking completed!");
                fetchBookings();
            } catch (error) {
                alert("Failed to complete booking");
            }
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold text-gray-900">
                    Booking Management
                </h1>
                {!canManageBookings && (
                    <span className="text-sm text-gray-500">
                        (View Only - Cannot accept/reject)
                    </span>
                )}
            </div>

            {/* Bookings table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Date & Time</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.map((booking) => (
                            <tr key={booking.booking_id}>
                                <td>{booking.user_name}</td>
                                <td>{booking.date} {booking.start_time}</td>
                                <td>
                                    <span className={`px-2 py-1 rounded-full text-xs ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            booking.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                                                booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    'bg-gray-100 text-gray-800'
                                        }`}>
                                        {booking.status}
                                    </span>
                                </td>
                                <td>
                                    {booking.status === 'pending' && canManageBookings && (
                                        <div className="flex space-x-2">
                                            <button onClick={() => handleAcceptBooking(booking.booking_id)}>
                                                Accept
                                            </button>
                                            <button onClick={() => handleRejectBooking(booking.booking_id)}>
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                    {booking.status === 'accepted' && canManageBookings && (
                                        <button onClick={() => handleCompleteBooking(booking.booking_id)}>
                                            Complete
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManagerBookings;