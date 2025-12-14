import React from 'react';
import { ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const RecentBookings = ({ bookings }) => {
    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
            case 'pending':
                return <ClockIcon className="h-4 w-4 text-yellow-500" />;
            case 'cancelled':
                return <XCircleIcon className="h-4 w-4 text-red-500" />;
            default:
                return <ClockIcon className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
                    <button className="text-sm text-primary-600 hover:text-primary-500">
                        View All
                    </button>
                </div>
            </div>
            <div className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                    <div key={booking.booking_id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center space-x-2">
                                    <h3 className="text-sm font-medium text-gray-900">#{booking.booking_id}</h3>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                        {getStatusIcon(booking.status)}
                                        <span className="ml-1">{booking.status}</span>
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{booking.user_name} • {booking.arena_name}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {booking.sport_name} • Rs {booking.total_amount}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">{new Date(booking.booking_date).toLocaleDateString()}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {new Date(booking.booking_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecentBookings;