// components/super-admin/UnblockOwnerModal.jsx
import React, { useState } from 'react';
import {
    CheckCircleIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

const UnblockOwnerModal = ({ isOpen, onClose, onConfirm, ownerName, isLoading }) => {
    const [notifyOwner, setNotifyOwner] = useState(true);

    if (!isOpen) return null;

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

                    {/* Content */}
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

export default UnblockOwnerModal;