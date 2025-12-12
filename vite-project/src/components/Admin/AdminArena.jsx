// src/components/Admin/AdminArenas.jsx
import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import {
    Search, Filter, Building2, CheckCircle,
    XCircle, MoreVertical, Eye, Ban, Check,
    DollarSign, Phone, MapPin, Calendar
} from 'lucide-react';
import LoadingSpinner from '../Shared/LoadingSpinner';

const AdminArenas = () => {
    const [arenas, setArenas] = useState([]);
    const [filteredArenas, setFilteredArenas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        status: 'all',
        paymentStatus: 'all'
    });
    const [selectedArena, setSelectedArena] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchArenas();
        // Refresh every 60 seconds
        const interval = setInterval(fetchArenas, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        applyFilters();
    }, [arenas, searchTerm, filters]);

    const fetchArenas = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/arenas');
            if (response.data.success) {
                setArenas(response.data.arenas);
            }
        } catch (error) {
            console.error('Error fetching arenas:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...arenas];

        // Apply search
        if (searchTerm) {
            filtered = filtered.filter(arena =>
                arena.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                arena.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                arena.phone_number.includes(searchTerm)
            );
        }

        // Apply status filter
        if (filters.status !== 'all') {
            filtered = filtered.filter(arena =>
                filters.status === 'active' ? arena.is_active && !arena.is_blocked :
                    filters.status === 'blocked' ? arena.is_blocked :
                        !arena.is_active
            );
        }

        // Apply payment status filter
        if (filters.paymentStatus !== 'all') {
            filtered = filtered.filter(arena =>
                filters.paymentStatus === 'paid' ? arena.payment_status === 'paid' :
                    arena.payment_status === 'pending'
            );
        }

        setFilteredArenas(filtered);
    };

    const handleStatusChange = async (arenaId, action) => {
        try {
            if (action === 'block') {
                await api.put(`/admin/arenas/${arenaId}/block`);
            } else if (action === 'unblock') {
                await api.put(`/admin/arenas/${arenaId}/unblock`);
            } else if (action === 'activate') {
                await api.put(`/admin/arenas/${arenaId}/activate`);
            } else if (action === 'deactivate') {
                await api.put(`/admin/arenas/${arenaId}/deactivate`);
            }
            fetchArenas();
        } catch (error) {
            console.error('Error updating arena status:', error);
        }
    };

    const handleViewDetails = (arena) => {
        setSelectedArena(arena);
        setShowModal(true);
    };

    const formatPKR = (amount) => {
        return `PKR ${Number(amount).toLocaleString('en-PK')}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-PK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Arena Management</h1>
                    <p className="text-gray-600">Manage all registered arenas</p>
                </div>

                <div className="mt-4 md:mt-0">
                    <p className="text-sm text-gray-500">
                        Total: {arenas.length} • Active: {arenas.filter(a => a.is_active && !a.is_blocked).length} •
                        Blocked: {arenas.filter(a => a.is_blocked).length}
                    </p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-xl shadow border mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search arenas by name, owner, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="blocked">Blocked</option>
                        <option value="inactive">Inactive</option>
                    </select>

                    {/* Payment Filter */}
                    <select
                        value={filters.paymentStatus}
                        onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Payment Status</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Payment Pending</option>
                    </select>
                </div>
            </div>

            {/* Arenas List */}
            <div className="bg-white rounded-xl shadow border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Arena Details
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Owner Info
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Financials
                                </th>
                                <th className="px6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredArenas.map((arena) => (
                                <tr key={arena.arena_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0">
                                                <Building2 className="h-10 w-10 text-gray-400" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {arena.name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {arena.address}
                                                </div>
                                                <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                                                    <Calendar size={14} />
                                                    Joined: {formatDate(arena.created_at)}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">{arena.owner_name}</div>
                                        <div className="flex items-center gap-1 text-sm text-gray-500">
                                            <Phone size={14} />
                                            {arena.phone_number}
                                        </div>
                                        <div className="text-sm text-gray-500">{arena.email}</div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1">
                                                <DollarSign size={14} className="text-green-600" />
                                                <span className="text-sm font-medium text-gray-900">
                                                    {formatPKR(arena.total_revenue || 0)}
                                                </span>
                                                <span className="text-xs text-gray-500">revenue</span>
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-gray-600">Due: </span>
                                                <span className={`font-medium ${(arena.due_amount || 0) > 0 ? 'text-red-600' : 'text-green-600'
                                                    }`}>
                                                    {formatPKR(arena.due_amount || 0)}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Payment: {arena.payment_status || 'unknown'}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="space-y-2">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${arena.is_blocked ? 'bg-red-100 text-red-800' :
                                                    !arena.is_active ? 'bg-gray-100 text-gray-800' :
                                                        'bg-green-100 text-green-800'
                                                }`}>
                                                {arena.is_blocked ? 'Blocked' :
                                                    !arena.is_active ? 'Inactive' : 'Active'}
                                            </span>

                                            {arena.payment_status === 'pending' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                    Payment Due
                                                </span>
                                            )}

                                            <div className="text-xs text-gray-500">
                                                Courts: {arena.total_courts || 0}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleViewDetails(arena)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                title="View Details"
                                            >
                                                <Eye size={18} />
                                            </button>

                                            {arena.is_blocked ? (
                                                <button
                                                    onClick={() => handleStatusChange(arena.arena_id, 'unblock')}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                                    title="Unblock Arena"
                                                >
                                                    <Check size={18} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleStatusChange(arena.arena_id, 'block')}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                    title="Block Arena"
                                                >
                                                    <Ban size={18} />
                                                </button>
                                            )}

                                            {arena.is_active ? (
                                                <button
                                                    onClick={() => handleStatusChange(arena.arena_id, 'deactivate')}
                                                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                                                    title="Deactivate"
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleStatusChange(arena.arena_id, 'activate')}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                                    title="Activate"
                                                >
                                                    <CheckCircle size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredArenas.length === 0 && (
                    <div className="text-center py-12">
                        <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">No arenas found</p>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="mt-2 text-blue-600 hover:text-blue-800"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Arena Details Modal */}
            {showModal && selectedArena && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">{selectedArena.name}</h2>
                                    <p className="text-gray-600">Arena Details</p>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Arena Information */}
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Arena Information</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Status:</span>
                                                <span className={`font-medium ${selectedArena.is_blocked ? 'text-red-600' :
                                                        !selectedArena.is_active ? 'text-gray-600' :
                                                            'text-green-600'
                                                    }`}>
                                                    {selectedArena.is_blocked ? 'Blocked' :
                                                        !selectedArena.is_active ? 'Inactive' : 'Active'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Address:</span>
                                                <span className="text-gray-800">{selectedArena.address}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Courts:</span>
                                                <span className="text-gray-800">{selectedArena.total_courts || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Registration Date:</span>
                                                <span className="text-gray-800">{formatDate(selectedArena.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Financial Information */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Financial Details</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Total Revenue:</span>
                                                <span className="font-medium text-gray-800">
                                                    {formatPKR(selectedArena.total_revenue || 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Total Commission:</span>
                                                <span className="font-medium text-gray-800">
                                                    {formatPKR(selectedArena.total_commission || 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Pending Amount:</span>
                                                <span className={`font-medium ${(selectedArena.due_amount || 0) > 0 ? 'text-red-600' : 'text-green-600'
                                                    }`}>
                                                    {formatPKR(selectedArena.due_amount || 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Payment Status:</span>
                                                <span className={`font-medium ${selectedArena.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'
                                                    }`}>
                                                    {selectedArena.payment_status || 'unknown'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Owner Information */}
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Owner Information</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Name:</span>
                                                <span className="text-gray-800">{selectedArena.owner_name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Phone:</span>
                                                <span className="text-gray-800">{selectedArena.phone_number}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Email:</span>
                                                <span className="text-gray-800">{selectedArena.email}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Business Name:</span>
                                                <span className="text-gray-800">{selectedArena.arena_name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Quick Actions</h3>
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => {
                                                    handleStatusChange(selectedArena.arena_id,
                                                        selectedArena.is_blocked ? 'unblock' : 'block');
                                                    setShowModal(false);
                                                }}
                                                className={`w-full py-2 px-4 rounded-lg font-medium ${selectedArena.is_blocked
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                    }`}
                                            >
                                                {selectedArena.is_blocked ? 'Unblock Arena' : 'Block Arena'}
                                            </button>

                                            {selectedArena.payment_status === 'pending' && (
                                                <button
                                                    onClick={() => {
                                                        // Handle mark as paid
                                                        setShowModal(false);
                                                    }}
                                                    className="w-full py-2 px-4 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200"
                                                >
                                                    Mark Payment as Completed
                                                </button>
                                            )}

                                            <button
                                                onClick={() => window.open(`/admin/reports/arena/${selectedArena.arena_id}`, '_blank')}
                                                className="w-full py-2 px-4 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200"
                                            >
                                                View Detailed Report
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminArenas;