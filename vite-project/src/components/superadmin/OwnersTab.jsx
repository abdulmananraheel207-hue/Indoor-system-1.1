// components/super-admin/OwnersTab.jsx
import React, { useState } from 'react';
import {
    BuildingStorefrontIcon,
    EnvelopeIcon,
    PhoneIcon,
    MapPinIcon,
    CurrencyDollarIcon,
    CheckCircleIcon,
    XCircleIcon,
    NoSymbolIcon,
    ExclamationTriangleIcon,
    ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import integrationService from '../../services/integrationService';

const OwnersTab = ({
    owners = [],
    arenas = [],
    onBlockOwner,
    onUnblockOwner,
    onMarkPaid
}) => {
    const [selectedOwner, setSelectedOwner] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const filteredOwners = owners.filter(owner =>
        owner.arena_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const ownerArenas = selectedOwner
        ? arenas.filter(arena => arena.owner_id === selectedOwner.owner_id)
        : [];

    const totalCommissionDue = ownerArenas.reduce((sum, arena) =>
        sum + (parseFloat(arena.pending_commission) || 0), 0
    );

    const handleBlockOwner = async (ownerId, arenaName) => {
        if (window.confirm(`Block "${arenaName}"? This will also block all their arenas.`)) {
            setActionLoading(true);
            try {
                // Block all arenas of this owner
                const ownerArenasToBlock = arenas.filter(a => a.owner_id === ownerId);
                for (const arena of ownerArenasToBlock) {
                    await integrationService.toggleArenaBlock(arena.arena_id, {
                        is_blocked: true,
                        reason: 'Owner blocked by admin'
                    });
                }
                alert('✅ Owner and all arenas blocked!');
                onBlockOwner && onBlockOwner();
            } catch (error) {
                alert('❌ Failed to block owner: ' + error.message);
            } finally {
                setActionLoading(false);
            }
        }
    };

    const handleUnblockOwner = async (ownerId, arenaName) => {
        if (window.confirm(`Unblock "${arenaName}" and all their arenas?`)) {
            setActionLoading(true);
            try {
                const ownerArenasToUnblock = arenas.filter(a => a.owner_id === ownerId);
                for (const arena of ownerArenasToUnblock) {
                    await integrationService.toggleArenaBlock(arena.arena_id, {
                        action: 'unblock'
                    });
                }
                alert('✅ Owner and all arenas unblocked!');
                onUnblockOwner && onUnblockOwner();
            } catch (error) {
                alert('❌ Failed to unblock owner: ' + error.message);
            } finally {
                setActionLoading(false);
            }
        }
    };

    const handleMarkPaid = async (ownerId) => {
        if (window.confirm(`Mark all pending commission (Rs ${totalCommissionDue}) as paid for this owner?`)) {
            setActionLoading(true);
            try {
                // Mark payment for each arena
                for (const arena of ownerArenas) {
                    if (arena.pending_commission > 0) {
                        await integrationService.markArenaPayment(arena.arena_id, {
                            action: 'mark_paid',
                            amount_paid: arena.pending_commission,
                            notes: `Monthly commission payment for owner: ${selectedOwner.arena_name}`,
                            payment_date: new Date().toISOString().split('T')[0]
                        });
                    }
                }

                alert('✅ All commission marked as paid!');

                // Refresh data
                if (onMarkPaid) {
                    onMarkPaid();
                }

                // Clear selected owner to force refresh
                setSelectedOwner(null);

            } catch (error) {
                alert('❌ Failed to mark as paid: ' + error.message);
            } finally {
                setActionLoading(false);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center space-x-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search owners by arena name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="text-sm text-gray-500">
                        {filteredOwners.length} owners found
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Owners List */}
                <div className="lg:col-span-2">
                    <div className="bg-white border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b">
                            <h3 className="font-bold text-gray-900">All Owners ({owners.length})</h3>
                        </div>
                        <div className="divide-y">
                            {filteredOwners.map((owner) => {
                                const ownerHasBlockedArenas = arenas.some(a =>
                                    a.owner_id === owner.owner_id && a.is_blocked
                                );

                                return (
                                    <div
                                        key={owner.owner_id}
                                        onClick={() => setSelectedOwner(owner)}
                                        className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${selectedOwner?.owner_id === owner.owner_id ? 'bg-blue-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${ownerHasBlockedArenas ? 'bg-red-100' : 'bg-green-100'
                                                    }`}>
                                                    <BuildingStorefrontIcon className={`h-5 w-5 ${ownerHasBlockedArenas ? 'text-red-600' : 'text-green-600'
                                                        }`} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 flex items-center">
                                                        {owner.arena_name}
                                                        {ownerHasBlockedArenas && (
                                                            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                                                                Blocked
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500 flex items-center mt-1">
                                                        <EnvelopeIcon className="h-3 w-3 mr-1" />
                                                        {owner.email}
                                                    </div>
                                                    <div className="text-sm text-gray-500 flex items-center mt-1">
                                                        <PhoneIcon className="h-3 w-3 mr-1" />
                                                        {owner.phone_number}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-gray-500">
                                                    {owner.total_arenas || 0} arenas
                                                </div>
                                                <div className="text-sm font-medium text-green-600 mt-1">
                                                    Rs {owner.revenue_from_bookings || 0}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Owner Details Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white border rounded-lg sticky top-6">
                        <div className="bg-gray-50 px-6 py-4 border-b">
                            <h3 className="font-bold text-gray-900">Owner Details</h3>
                        </div>

                        {selectedOwner ? (
                            <div className="p-6">
                                {/* Owner Info */}
                                <div className="mb-6">
                                    <div className="flex items-center space-x-4 mb-4">
                                        <div className={`h-16 w-16 rounded-full flex items-center justify-center ${ownerArenas.some(a => a.is_blocked) ? 'bg-red-100' : 'bg-green-100'
                                            }`}>
                                            <BuildingStorefrontIcon className={`h-8 w-8 ${ownerArenas.some(a => a.is_blocked) ? 'text-red-600' : 'text-green-600'
                                                }`} />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-gray-900">{selectedOwner.arena_name}</h4>
                                            <p className="text-gray-600">{selectedOwner.email}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center text-gray-600">
                                            <PhoneIcon className="h-4 w-4 mr-2" />
                                            {selectedOwner.phone_number}
                                        </div>
                                        {selectedOwner.business_address && (
                                            <div className="flex items-center text-gray-600">
                                                <MapPinIcon className="h-4 w-4 mr-2" />
                                                <span className="truncate">{selectedOwner.business_address}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center text-gray-600">
                                            <BuildingStorefrontIcon className="h-4 w-4 mr-2" />
                                            {ownerArenas.length} arenas • {selectedOwner.number_of_courts} total courts
                                        </div>
                                        <div className="flex items-center text-gray-600">
                                            <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                                            Total Revenue: Rs {selectedOwner.total_revenue || 0}
                                        </div>
                                    </div>
                                </div>

                                {/* Commission Status */}
                                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-semibold text-blue-900">Commission Status</h5>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${totalCommissionDue > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                            {totalCommissionDue > 0 ? 'Pending' : 'Paid'}
                                        </span>
                                    </div>
                                    <div className="text-2xl font-bold text-blue-900">
                                        Rs {totalCommissionDue.toLocaleString()}
                                    </div>
                                    <p className="text-sm text-blue-700 mt-1">
                                        Total pending commission from all arenas
                                    </p>

                                    {totalCommissionDue > 0 && (
                                        <button
                                            onClick={() => handleMarkPaid(selectedOwner.owner_id)}
                                            disabled={actionLoading}
                                            className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                                        >
                                            {actionLoading ? (
                                                'Processing...'
                                            ) : (
                                                <>
                                                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                                                    Mark All as Paid
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Arenas List */}
                                <div className="mb-6">
                                    <h5 className="font-semibold text-gray-900 mb-3">Arenas</h5>
                                    <div className="space-y-3">
                                        {ownerArenas.map((arena) => (
                                            <div key={arena.arena_id} className="bg-gray-50 p-3 rounded-lg">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-medium">{arena.name}</div>
                                                        <div className="text-sm text-gray-500">
                                                            {arena.address || 'No address'}
                                                        </div>
                                                        <div className="flex items-center mt-2 space-x-2">
                                                            {arena.is_blocked ? (
                                                                <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                                                                    Blocked
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                                                    Active
                                                                </span>
                                                            )}
                                                            {arena.pending_commission > 0 && (
                                                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                                                    Rs {arena.pending_commission} due
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-green-600">
                                                            Rs {arena.base_price_per_hour}/hr
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {arena.total_bookings || 0} bookings
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-3">
                                    {ownerArenas.some(a => a.is_blocked) ? (
                                        <button
                                            onClick={() => handleUnblockOwner(selectedOwner.owner_id, selectedOwner.arena_name)}
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                                        >
                                            <CheckCircleIcon className="h-4 w-4 mr-2" />
                                            Unblock Owner
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleBlockOwner(selectedOwner.owner_id, selectedOwner.arena_name)}
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                                        >
                                            <NoSymbolIcon className="h-4 w-4 mr-2" />
                                            Block Owner
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <BuildingStorefrontIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Select an owner to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OwnersTab;