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
    ArrowTopRightOnSquareIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import integrationService from '../../services/integrationService';

// Block Owner Modal Component
const BlockOwnerModal = ({ isOpen, onClose, onConfirm, ownerName, isLoading }) => {
    const [reason, setReason] = useState('');
    const [blockArenas, setBlockArenas] = useState(true);
    const [notifyOwner, setNotifyOwner] = useState(true);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!reason.trim()) {
            setError('Please provide a reason for blocking this owner');
            return;
        }

        onConfirm({
            reason: reason.trim(),
            block_arenas: blockArenas,
            notify_owner: notifyOwner
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            ></div>

            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">

                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                                <NoSymbolIcon className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Block Owner</h3>
                                <p className="text-sm text-gray-500">{ownerName}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4 p-3 bg-yellow-50 rounded-lg flex items-start space-x-2">
                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-yellow-700">
                                This action will prevent the owner from logging in and their arenas will not be bookable.
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Block Reason <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => {
                                    setReason(e.target.value);
                                    setError('');
                                }}
                                placeholder="Enter reason for blocking this owner..."
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                autoFocus
                            />
                            {error && (
                                <p className="mt-1 text-sm text-red-600">{error}</p>
                            )}
                        </div>

                        <div className="mb-6 space-y-2">
                            <div className="flex items-center">
                                <input
                                    id="blockArenas"
                                    type="checkbox"
                                    checked={blockArenas}
                                    onChange={(e) => setBlockArenas(e.target.checked)}
                                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                />
                                <label htmlFor="blockArenas" className="ml-2 text-sm text-gray-700">
                                    Also block all arenas owned by this user
                                </label>
                            </div>
                            <div className="flex items-center">
                                <input
                                    id="notifyOwner"
                                    type="checkbox"
                                    checked={notifyOwner}
                                    onChange={(e) => setNotifyOwner(e.target.checked)}
                                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                />
                                <label htmlFor="notifyOwner" className="ml-2 text-sm text-gray-700">
                                    Send email notification to owner
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !reason.trim()}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Blocking...
                                    </>
                                ) : (
                                    <>
                                        <NoSymbolIcon className="h-4 w-4 mr-2" />
                                        Block Owner
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Unblock Owner Modal Component
const UnblockOwnerModal = ({ isOpen, onClose, onConfirm, ownerName, isLoading }) => {
    const [notifyOwner, setNotifyOwner] = useState(true);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            ></div>

            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">

                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Unblock Owner</h3>
                                <p className="text-sm text-gray-500">{ownerName}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="mb-6">
                        <p className="text-gray-700">
                            Are you sure you want to unblock this owner? They will be able to login again and their arenas will become bookable.
                        </p>

                        <div className="mt-4 flex items-center">
                            <input
                                id="notifyOwner"
                                type="checkbox"
                                checked={notifyOwner}
                                onChange={(e) => setNotifyOwner(e.target.checked)}
                                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                            />
                            <label htmlFor="notifyOwner" className="ml-2 text-sm text-gray-700">
                                Send email notification to owner
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm({ notify_owner: notifyOwner })}
                            disabled={isLoading}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center"
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Unblocking...
                                </>
                            ) : (
                                <>
                                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                                    Unblock Owner
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Main OwnersTab Component
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

    // Modal states
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [isUnblockModalOpen, setIsUnblockModalOpen] = useState(false);
    const [selectedOwnerForAction, setSelectedOwnerForAction] = useState(null);

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

    const handleBlockOwner = async (ownerId, ownerName, blockData) => {
        setActionLoading(true);
        try {
            const ownerArenasToBlock = arenas.filter(a => a.owner_id === ownerId);
            console.log('🔒 Blocking owner:', ownerName, 'Arenas:', ownerArenasToBlock.length);
            console.log('📦 Block data being sent:', blockData); // ADD THIS

            let successCount = 0;
            let errorCount = 0;

            // Block owner account - FIX THIS PART
            try {
                // MAKE SURE blockData has the correct structure
                const result = await integrationService.blockOwner(ownerId, {
                    reason: blockData.reason,        // This should be the reason from modal
                    block_arenas: blockData.block_arenas,  // This should be true/false
                    notify_owner: blockData.notify_owner    // This should be true/false
                });
                console.log('✅ Block owner API result:', result);
                successCount++;
            } catch (error) {
                console.error('❌ Failed to block owner account:', error);
                errorCount++;
            }

            // Block arenas if option is selected
            if (blockData.block_arenas) {
                for (const arena of ownerArenasToBlock) {
                    try {
                        await integrationService.toggleArenaBlock(arena.arena_id, {
                            action: 'block_for_non_payment',
                            reason: blockData.reason,
                            notify_owner: blockData.notify_owner
                        });
                        successCount++;
                    } catch (arenaError) {
                        console.error(`❌ Failed to block arena ${arena.arena_id}:`, arenaError);
                        errorCount++;
                    }
                }
            }

            if (errorCount === 0) {
                alert(`✅ Owner "${ownerName}" blocked successfully!`);
            } else {
                alert(`⚠️ Blocked ${successCount} items, ${errorCount} failed. Check console for details.`);
            }

            // Refresh data
            if (onBlockOwner) {
                onBlockOwner();
            }

            setIsBlockModalOpen(false);
            setSelectedOwnerForAction(null);

        } catch (error) {
            console.error('❌ Block owner error:', error);
            alert('❌ Failed to block owner: ' + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnblockOwner = async (ownerId, ownerName, unblockData) => {
        setActionLoading(true);
        try {
            const ownerArenasToUnblock = arenas.filter(a => a.owner_id === ownerId);
            console.log('🔓 Unblocking owner:', ownerName, 'Arenas:', ownerArenasToUnblock.length);

            let successCount = 0;
            let errorCount = 0;

            // Unblock owner account
            try {
                await integrationService.unblockOwner(ownerId, {
                    notify_owner: unblockData.notify_owner
                });
                successCount++;
            } catch (error) {
                console.error('❌ Failed to unblock owner account:', error);
                errorCount++;
            }

            // Unblock all arenas
            for (const arena of ownerArenasToUnblock) {
                try {
                    await integrationService.toggleArenaBlock(arena.arena_id, {
                        action: 'unblock',
                        notify_owner: unblockData.notify_owner
                    });
                    successCount++;
                } catch (arenaError) {
                    console.error(`❌ Failed to unblock arena ${arena.arena_id}:`, arenaError);
                    errorCount++;
                }
            }

            if (errorCount === 0) {
                alert(`✅ Owner "${ownerName}" unblocked successfully!`);
            } else {
                alert(`⚠️ Unblocked ${successCount} items, ${errorCount} failed. Check console for details.`);
            }

            // Refresh data
            if (onUnblockOwner) {
                onUnblockOwner();
            }

            setIsUnblockModalOpen(false);
            setSelectedOwnerForAction(null);

        } catch (error) {
            console.error('❌ Unblock owner error:', error);
            alert('❌ Failed to unblock owner: ' + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleMarkPaid = async (ownerId) => {
        if (window.confirm(`Mark all pending commission (Rs ${totalCommissionDue}) as paid for this owner?`)) {
            setActionLoading(true);
            try {
                for (const arena of ownerArenas) {
                    if (arena.pending_commission > 0) {
                        const amount = parseFloat(arena.pending_commission);

                        await integrationService.markArenaPayment(arena.arena_id, {
                            amount_paid: amount,
                            notes: `Monthly commission payment for ${selectedOwner?.arena_name || 'owner'}`,
                            payment_date: new Date().toISOString().split('T')[0]
                        });
                    }
                }

                alert('✅ All commission marked as paid!');

                if (onMarkPaid) {
                    onMarkPaid();
                }

                setSelectedOwner(null);

            } catch (error) {
                console.error('❌ Mark paid error:', error);
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
                        <div className="divide-y max-h-[600px] overflow-y-auto">
                            {filteredOwners.length > 0 ? (
                                filteredOwners.map((owner) => {
                                    const ownerHasBlockedArenas = arenas.some(a =>
                                        a.owner_id === owner.owner_id && a.is_blocked
                                    );
                                    const isOwnerBlocked = owner.is_blocked;

                                    return (
                                        <div
                                            key={owner.owner_id}
                                            onClick={() => setSelectedOwner(owner)}
                                            className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${selectedOwner?.owner_id === owner.owner_id ? 'bg-blue-50' : ''
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-4">
                                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isOwnerBlocked ? 'bg-red-100' :
                                                        ownerHasBlockedArenas ? 'bg-orange-100' : 'bg-green-100'
                                                        }`}>
                                                        <BuildingStorefrontIcon className={`h-5 w-5 ${isOwnerBlocked ? 'text-red-600' :
                                                            ownerHasBlockedArenas ? 'text-orange-600' : 'text-green-600'
                                                            }`} />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 flex items-center">
                                                            {owner.arena_name}
                                                            {isOwnerBlocked && (
                                                                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                                                                    Account Blocked
                                                                </span>
                                                            )}
                                                            {!isOwnerBlocked && ownerHasBlockedArenas && (
                                                                <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">
                                                                    Some Arenas Blocked
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-gray-500 flex items-center mt-1">
                                                            <EnvelopeIcon className="h-3 w-3 mr-1" />
                                                            {owner.email}
                                                        </div>
                                                        <div className="text-sm text-gray-500 flex items-center mt-1">
                                                            <PhoneIcon className="h-3 w-3 mr-1" />
                                                            {owner.phone_number || 'No phone'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm text-gray-500">
                                                        {owner.total_arenas || 0} arenas
                                                    </div>
                                                    <div className="text-sm font-medium text-green-600 mt-1">
                                                        Rs {(owner.revenue_from_bookings || 0).toLocaleString()}
                                                    </div>
                                                    {owner.total_pending_commission > 0 && (
                                                        <div className="text-xs text-red-600 mt-1">
                                                            Rs {owner.total_pending_commission.toLocaleString()} due
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {owner.blocked_reason && (
                                                <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                                                    <span className="font-medium">Block reason:</span> {owner.blocked_reason}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="px-6 py-8 text-center text-gray-500">
                                    No owners found
                                </div>
                            )}
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
                            <div className="p-6 max-h-[600px] overflow-y-auto">
                                {/* Owner Info */}
                                <div className="mb-6">
                                    <div className="flex items-center space-x-4 mb-4">
                                        <div className={`h-16 w-16 rounded-full flex items-center justify-center ${selectedOwner.is_blocked ? 'bg-red-100' :
                                            ownerArenas.some(a => a.is_blocked) ? 'bg-orange-100' : 'bg-green-100'
                                            }`}>
                                            <BuildingStorefrontIcon className={`h-8 w-8 ${selectedOwner.is_blocked ? 'text-red-600' :
                                                ownerArenas.some(a => a.is_blocked) ? 'text-orange-600' : 'text-green-600'
                                                }`} />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-gray-900">{selectedOwner.arena_name}</h4>
                                            <p className="text-gray-600">{selectedOwner.email}</p>
                                            {selectedOwner.is_blocked && (
                                                <span className="inline-block mt-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                                    Account Blocked
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center text-gray-600">
                                            <PhoneIcon className="h-4 w-4 mr-2" />
                                            {selectedOwner.phone_number || 'No phone provided'}
                                        </div>
                                        {selectedOwner.business_address && (
                                            <div className="flex items-center text-gray-600">
                                                <MapPinIcon className="h-4 w-4 mr-2" />
                                                <span className="truncate">{selectedOwner.business_address}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center text-gray-600">
                                            <BuildingStorefrontIcon className="h-4 w-4 mr-2" />
                                            {ownerArenas.length} arenas • {selectedOwner.number_of_courts || 0} total courts
                                        </div>
                                        <div className="flex items-center text-gray-600">
                                            <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                                            Total Revenue: Rs {(selectedOwner.total_revenue || 0).toLocaleString()}
                                        </div>
                                        {selectedOwner.blocked_reason && (
                                            <div className="mt-2 p-3 bg-red-50 rounded-lg">
                                                <p className="text-xs font-medium text-red-800 mb-1">Block Reason:</p>
                                                <p className="text-sm text-red-700">{selectedOwner.blocked_reason}</p>
                                                {selectedOwner.blocked_at && (
                                                    <p className="text-xs text-red-600 mt-1">
                                                        Blocked on: {new Date(selectedOwner.blocked_at).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        )}
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

                                    {totalCommissionDue > 0 && !selectedOwner.is_blocked && (
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
                                    <div className="space-y-3 max-h-[200px] overflow-y-auto">
                                        {ownerArenas.length > 0 ? (
                                            ownerArenas.map((arena) => (
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
                                                    {arena.blocked_reason && (
                                                        <div className="mt-2 text-xs text-red-600">
                                                            Reason: {arena.blocked_reason}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-gray-500 text-center py-2">No arenas found</p>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-3">
                                    {selectedOwner.is_blocked ? (
                                        <button
                                            onClick={() => {
                                                setSelectedOwnerForAction({
                                                    id: selectedOwner.owner_id,
                                                    name: selectedOwner.arena_name
                                                });
                                                setIsUnblockModalOpen(true);
                                            }}
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                                        >
                                            <CheckCircleIcon className="h-4 w-4 mr-2" />
                                            Unblock Owner
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setSelectedOwnerForAction({
                                                    id: selectedOwner.owner_id,
                                                    name: selectedOwner.arena_name
                                                });
                                                setIsBlockModalOpen(true);
                                            }}
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

            {/* Modals */}
            <BlockOwnerModal
                isOpen={isBlockModalOpen}
                onClose={() => {
                    setIsBlockModalOpen(false);
                    setSelectedOwnerForAction(null);
                }}
                onConfirm={(blockData) =>
                    handleBlockOwner(
                        selectedOwnerForAction?.id,
                        selectedOwnerForAction?.name,
                        blockData
                    )
                }
                ownerName={selectedOwnerForAction?.name}
                isLoading={actionLoading}
            />

            <UnblockOwnerModal
                isOpen={isUnblockModalOpen}
                onClose={() => {
                    setIsUnblockModalOpen(false);
                    setSelectedOwnerForAction(null);
                }}
                onConfirm={(unblockData) =>
                    handleUnblockOwner(
                        selectedOwnerForAction?.id,
                        selectedOwnerForAction?.name,
                        unblockData
                    )
                }
                ownerName={selectedOwnerForAction?.name}
                isLoading={actionLoading}
            />
        </div>
    );
};

export default OwnersTab;