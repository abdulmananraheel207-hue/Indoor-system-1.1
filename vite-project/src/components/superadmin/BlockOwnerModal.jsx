// components/super-admin/BlockOwnerModal.jsx
import React, { useState } from 'react';
import {
    NoSymbolIcon,
    XMarkIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

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
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">

                    {/* Header */}
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

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        {/* Warning */}
                        <div className="mb-4 p-3 bg-yellow-50 rounded-lg flex items-start space-x-2">
                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-yellow-700">
                                This action will prevent the owner from logging in and their arenas will not be bookable.
                            </p>
                        </div>

                        {/* Reason Input */}
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

                        {/* Options */}
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

                        {/* Actions */}
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

export default BlockOwnerModal;