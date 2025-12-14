import React, { useState, useEffect } from 'react';
import {
    UserGroupIcon,
    BuildingStorefrontIcon,
    CurrencyDollarIcon,
    CalendarIcon,
    CheckCircleIcon,
    XCircleIcon,
    EyeIcon,
    PhoneIcon,
    EnvelopeIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const OwnersManagement = () => {
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterActive, setFilterActive] = useState('all');

    useEffect(() => {
        // Mock data
        const mockOwners = [
            {
                owner_id: 1,
                arena_name: 'Sports Co.',
                email: 'owner@sports.com',
                phone_number: '+1234567890',
                total_arenas: 3,
                total_bookings: 156,
                total_revenue: 1250000,
                is_active: true,
                created_at: '2024-01-01'
            },
            {
                owner_id: 2,
                arena_name: 'Badminton Pro',
                email: 'badminton@pro.com',
                phone_number: '+0987654321',
                total_arenas: 1,
                total_bookings: 89,
                total_revenue: 670000,
                is_active: true,
                created_at: '2024-01-05'
            },
            {
                owner_id: 3,
                arena_name: 'Padel Masters',
                email: 'padel@masters.com',
                phone_number: '+1122334455',
                total_arenas: 2,
                total_bookings: 234,
                total_revenue: 1870000,
                is_active: true,
                created_at: '2024-01-10'
            },
            {
                owner_id: 4,
                arena_name: 'Basketball Inc',
                email: 'basketball@inc.com',
                phone_number: '+5566778899',
                total_arenas: 1,
                total_bookings: 45,
                total_revenue: 320000,
                is_active: false,
                created_at: '2023-12-15'
            }
        ];

        setTimeout(() => {
            setOwners(mockOwners);
            setLoading(false);
        }, 1000);
    }, []);

    const filteredOwners = owners.filter(owner => {
        const matchesSearch = owner.arena_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            owner.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesActive = filterActive === 'all' ||
            (filterActive === 'active' ? owner.is_active : !owner.is_active);

        return matchesSearch && matchesActive;
    });

    const toggleOwnerStatus = (ownerId) => {
        setOwners(owners.map(owner =>
            owner.owner_id === ownerId
                ? { ...owner, is_active: !owner.is_active }
                : owner
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
                <h1 className="text-2xl font-bold text-gray-900">Owners Management</h1>
                <p className="text-gray-600">Manage all arena owners on the platform</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Total Owners</p>
                    <p className="text-2xl font-semibold text-gray-900">{owners.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Active Owners</p>
                    <p className="text-2xl font-semibold text-green-600">{owners.filter(o => o.is_active).length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Total Arenas</p>
                    <p className="text-2xl font-semibold text-gray-900">{owners.reduce((sum, o) => sum + o.total_arenas, 0)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-semibold text-gray-900">
                        Rs {(owners.reduce((sum, o) => sum + o.total_revenue, 0) / 100000).toFixed(1)}L
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
                                placeholder="Search owners by name or email..."
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
                            <option value="all">All Owners</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Owners Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Owner Details
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contact Information
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Business Statistics
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
                            {filteredOwners.map((owner) => (
                                <tr key={owner.owner_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center">
                                                <UserGroupIcon className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{owner.arena_name}</div>
                                                <div className="text-sm text-gray-500">Owner ID: #{owner.owner_id}</div>
                                                <div className="text-xs text-gray-400">Since: {new Date(owner.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center text-sm text-gray-900">
                                                <EnvelopeIcon className="h-4 w-4 mr-2" />
                                                {owner.email}
                                            </div>
                                            <div className="flex items-center text-sm text-gray-900">
                                                <PhoneIcon className="h-4 w-4 mr-2" />
                                                {owner.phone_number}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center text-sm text-gray-900">
                                                <BuildingStorefrontIcon className="h-4 w-4 mr-2" />
                                                {owner.total_arenas} arenas
                                            </div>
                                            <div className="flex items-center text-sm text-gray-900">
                                                <CalendarIcon className="h-4 w-4 mr-2" />
                                                {owner.total_bookings} bookings
                                            </div>
                                            <div className="flex items-center text-sm text-gray-900">
                                                <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                                                Rs {owner.total_revenue.toLocaleString()} revenue
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${owner.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}>
                                                {owner.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            <button className="p-1 text-gray-600 hover:text-gray-900" title="View Details">
                                                <EyeIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => toggleOwnerStatus(owner.owner_id)}
                                                className={`p-1 ${owner.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                                                title={owner.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                {owner.is_active ? <XCircleIcon className="h-5 w-5" /> : <CheckCircleIcon className="h-5 w-5" />}
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

export default OwnersManagement;