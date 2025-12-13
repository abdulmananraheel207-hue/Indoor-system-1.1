import React, { useState } from 'react';

const UserBooking = () => {
    const [activeTab, setActiveTab] = useState('upcoming');

    const bookings = {
        upcoming: [
            {
                id: 1,
                arena: 'Elite Sports Arena',
                sport: 'Cricket',
                date: '2024-12-20',
                time: '14:00 - 16:00',
                court: 'Court 1',
                amount: 4000,
                status: 'confirmed',
                paymentStatus: 'paid'
            },
            {
                id: 2,
                arena: 'Pro Badminton Court',
                sport: 'Badminton',
                date: '2024-12-22',
                time: '18:00 - 19:00',
                court: 'Court 3',
                amount: 1500,
                status: 'pending',
                paymentStatus: 'pending'
            }
        ],
        past: [
            {
                id: 3,
                arena: 'City Padel Club',
                sport: 'Padel',
                date: '2024-12-15',
                time: '16:00 - 17:00',
                court: 'Court 2',
                amount: 2500,
                status: 'completed',
                paymentStatus: 'paid'
            },
            {
                id: 4,
                arena: 'Sports Hub',
                sport: 'Futsal',
                date: '2024-12-10',
                time: '20:00 - 22:00',
                court: 'Court 4',
                amount: 3000,
                status: 'completed',
                paymentStatus: 'paid'
            },
            {
                id: 5,
                arena: 'Elite Sports Arena',
                sport: 'Cricket',
                date: '2024-12-05',
                time: '10:00 - 12:00',
                court: 'Court 1',
                amount: 4000,
                status: 'cancelled',
                paymentStatus: 'refunded'
            }
        ]
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'completed': return 'bg-blue-100 text-blue-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPaymentStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'refunded': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleCancelBooking = (bookingId) => {
        if (window.confirm('Are you sure you want to cancel this booking?')) {
            console.log('Cancel booking:', bookingId);
            // Implement cancel logic
        }
    };

    const handleViewReceipt = (bookingId) => {
        console.log('View receipt for:', bookingId);
        // Implement receipt view
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">My Bookings</h1>
                <p className="text-gray-600 mb-8">Manage your upcoming and past bookings</p>

                {/* Tab Navigation */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'upcoming'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Upcoming Bookings
                        </button>
                        <button
                            onClick={() => setActiveTab('past')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'past'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Booking History
                        </button>
                    </nav>
                </div>

                {/* Bookings List */}
                <div className="space-y-6">
                    {bookings[activeTab].map((booking) => (
                        <div key={booking.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{booking.arena}</h3>
                                    <div className="flex items-center mt-2 space-x-3">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                            {booking.sport}
                                        </span>
                                        <span className="text-sm text-gray-600">Court {booking.court}</span>
                                    </div>
                                </div>
                                <div className="mt-3 md:mt-0 flex items-center space-x-3">
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                    </span>
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(booking.paymentStatus)}`}>
                                        {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="flex items-center">
                                    <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm text-gray-600">Date</p>
                                        <p className="font-medium">{booking.date}</p>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm text-gray-600">Time</p>
                                        <p className="font-medium">{booking.time}</p>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm text-gray-600">Amount</p>
                                        <p className="font-medium">Rs {booking.amount}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {activeTab === 'upcoming' && booking.status === 'pending' && (
                                    <button
                                        onClick={() => handleCancelBooking(booking.id)}
                                        className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                        Cancel Booking
                                    </button>
                                )}
                                {activeTab === 'upcoming' && booking.paymentStatus === 'pending' && (
                                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                                        Make Payment
                                    </button>
                                )}
                                <button
                                    onClick={() => handleViewReceipt(booking.id)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    View Details
                                </button>
                                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                                    Chat with Owner
                                </button>
                                {activeTab === 'past' && booking.status === 'completed' && (
                                    <button className="px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors">
                                        Write Review
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {bookings[activeTab].length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No {activeTab} bookings</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {activeTab === 'upcoming'
                                    ? 'You have no upcoming bookings. Book an arena to get started!'
                                    : 'Your past bookings will appear here.'}
                            </p>
                            {activeTab === 'upcoming' && (
                                <div className="mt-6">
                                    <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
                                        Book an Arena
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserBooking;