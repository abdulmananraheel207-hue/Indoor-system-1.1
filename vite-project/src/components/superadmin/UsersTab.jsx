// components/super-admin/UsersTab.jsx
import React, { useState } from 'react';
import {
    UserIcon,
    EnvelopeIcon,
    PhoneIcon,
    CalendarIcon,
    ArrowTopRightOnSquareIcon,
    CheckCircleIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';

const UsersTab = ({ users = [], recentBookings = {} }) => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone_number?.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center space-x-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search users by name, email, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="text-sm text-gray-500">
                        {filteredUsers.length} users found
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Users List */}
                <div className="lg:col-span-2">
                    <div className="bg-white border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b">
                            <h3 className="font-bold text-gray-900">All Users ({users.length})</h3>
                        </div>
                        <div className="divide-y">
                            {filteredUsers.map((user) => (
                                <div
                                    key={user.user_id}
                                    onClick={() => setSelectedUser(user)}
                                    className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${selectedUser?.user_id === user.user_id ? 'bg-blue-50' : ''
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                <UserIcon className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{user.name}</div>
                                                <div className="text-sm text-gray-500 flex items-center mt-1">
                                                    <EnvelopeIcon className="h-3 w-3 mr-1" />
                                                    {user.email}
                                                </div>
                                                {user.phone_number && (
                                                    <div className="text-sm text-gray-500 flex items-center mt-1">
                                                        <PhoneIcon className="h-3 w-3 mr-1" />
                                                        {user.phone_number}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-gray-500">
                                                {user.total_bookings || 0} bookings
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                Joined: {new Date(user.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* User Details Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white border rounded-lg sticky top-6">
                        <div className="bg-gray-50 px-6 py-4 border-b">
                            <h3 className="font-bold text-gray-900">User Details</h3>
                        </div>

                        {selectedUser ? (
                            <div className="p-6">
                                {/* User Info */}
                                <div className="mb-6">
                                    <div className="flex items-center space-x-4 mb-4">
                                        <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                                            <UserIcon className="h-8 w-8 text-blue-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-gray-900">{selectedUser.name}</h4>
                                            <p className="text-gray-600">{selectedUser.email}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {selectedUser.phone_number && (
                                            <div className="flex items-center text-gray-600">
                                                <PhoneIcon className="h-4 w-4 mr-2" />
                                                {selectedUser.phone_number}
                                            </div>
                                        )}
                                        <div className="flex items-center text-gray-600">
                                            <CalendarIcon className="h-4 w-4 mr-2" />
                                            Member since {new Date(selectedUser.created_at).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center text-gray-600">
                                            <CheckCircleIcon className={`h-4 w-4 mr-2 ${selectedUser.is_logged_in ? 'text-green-500' : 'text-gray-400'
                                                }`} />
                                            {selectedUser.is_logged_in ? 'Currently Online' : 'Offline'}
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Bookings */}
                                <div>
                                    <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                                        <CalendarIcon className="h-4 w-4 mr-2" />
                                        Recent Bookings
                                    </h5>
                                    {recentBookings[selectedUser.user_id]?.length > 0 ? (
                                        <div className="space-y-3">
                                            {recentBookings[selectedUser.user_id].slice(0, 5).map((booking) => (
                                                <div key={booking.booking_id} className="bg-gray-50 p-3 rounded-lg">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="font-medium">{booking.arena_name}</div>
                                                            <div className="text-sm text-gray-500">
                                                                {new Date(booking.booking_date).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-green-600">
                                                                Rs {booking.total_amount}
                                                            </div>
                                                            <span className={`text-xs px-2 py-1 rounded-full ${booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-red-100 text-red-800'
                                                                }`}>
                                                                {booking.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-gray-500">
                                            <XCircleIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                            <p>No bookings yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <UserIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Select a user to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UsersTab;