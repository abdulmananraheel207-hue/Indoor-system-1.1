import React, { useState, useEffect } from 'react';
import {
    UsersIcon,
    UserIcon,
    CalendarIcon,
    HeartIcon,
    MagnifyingGlassIcon,
    EyeIcon,
    NoSymbolIcon
} from '@heroicons/react/24/outline';

const UsersManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterActive, setFilterActive] = useState('all');

    useEffect(() => {
        // Mock data
        const mockUsers = [
            {
                user_id: 1,
                name: 'John Doe',
                email: 'john@example.com',
                phone_number: '+1234567890',
                total_bookings: 12,
                favorite_arenas_count: 5,
                is_logged_in: true,
                last_login: '2024-01-20 14:30:00',
                created_at: '2024-01-15'
            },
            {
                user_id: 2,
                name: 'Jane Smith',
                email: 'jane@example.com',
                phone_number: '+0987654321',
                total_bookings: 8,
                favorite_arenas_count: 3,
                is_logged_in: false,
                last_login: '2024-01-19 10:15:00',
                created_at: '2024-01-10'
            },
            {
                user_id: 3,
                name: 'Mike Johnson',
                email: 'mike@example.com',
                phone_number: '+1122334455',
                total_bookings: 25,
                favorite_arenas_count: 8,
                is_logged_in: true,
                last_login: '2024-01-20 16:45:00',
                created_at: '2024-01-05'
            },
            {
                user_id: 4,
                name: 'Sarah Williams',
                email: 'sarah@example.com',
                phone_number: '+5566778899',
                total_bookings: 3,
                favorite_arenas_count: 2,
                is_logged_in: false,
                last_login: '2024-01-18 09:30:00',
                created_at: '2023-12-28'
            }
        ];

        setTimeout(() => {
            setUsers(mockUsers);
            setLoading(false);
        }, 1000);
    }, []);

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesActive = filterActive === 'all' ||
            (filterActive === 'active' ? user.is_logged_in : !user.is_logged_in);

        return matchesSearch && matchesActive;
    });

    const toggleUserStatus = (userId) => {
        setUsers(users.map(user =>
            user.user_id === userId
                ? { ...user, is_logged_in: !user.is_logged_in }
                : user
        ));
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
                <p className="text-gray-600">Manage all registered users on the platform</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Active Now</p>
                    <p className="text-2xl font-semibold text-green-600">{users.filter(u => u.is_logged_in).length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-semibold text-gray-900">{users.reduce((sum, u) => sum + u.total_bookings, 0)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Avg. Bookings/User</p>
                    <p className="text-2xl font-semibold text-gray-900">
                        {(users.reduce((sum, u) => sum + u.total_bookings, 0) / users.length).toFixed(1)}
                    </p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div>
                        <select
                            value={filterActive}
                            onChange={(e) => setFilterActive(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="all">All Users</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contact Info
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Activity
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map((user) => (
                                <tr key={user.user_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary-100 flex items-center justify-center">
                                                <UserIcon className="h-6 w-6 text-primary-600" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                <div className="text-sm text-gray-500">ID: #{user.user_id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">{user.email}</div>
                                        <div className="text-sm text-gray-500">{user.phone_number}</div>
                                        <div className="text-xs text-gray-400">Joined: {new Date(user.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center text-sm text-gray-900">
                                                <CalendarIcon className="h-4 w-4 mr-1" />
                                                {user.total_bookings} bookings
                                            </div>
                                            <div className="flex items-center text-sm text-gray-900">
                                                <HeartIcon className="h-4 w-4 mr-1" />
                                                {user.favorite_arenas_count} favorites
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.is_logged_in
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {user.is_logged_in ? 'Online' : 'Offline'}
                                            </span>
                                            <div className="ml-2 text-xs text-gray-500">
                                                {user.last_login && `Last: ${new Date(user.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            <button className="p-1 text-gray-600 hover:text-gray-900" title="View Profile">
                                                <EyeIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => toggleUserStatus(user.user_id)}
                                                className={`p-1 ${user.is_logged_in ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                                                title={user.is_logged_in ? 'Block User' : 'Activate User'}
                                            >
                                                <NoSymbolIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UsersManagement;