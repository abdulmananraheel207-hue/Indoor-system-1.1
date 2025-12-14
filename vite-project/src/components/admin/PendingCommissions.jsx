import React from 'react';
import { ExclamationTriangleIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

const PendingCommissions = ({ commissions }) => {
    const getOverdueColor = (days) => {
        if (days > 7) return 'text-red-600 bg-red-50';
        if (days > 3) return 'text-yellow-600 bg-yellow-50';
        return 'text-gray-600 bg-gray-50';
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Pending Commissions</h2>
                    <button className="text-sm text-primary-600 hover:text-primary-500">
                        View All
                    </button>
                </div>
            </div>
            <div className="divide-y divide-gray-200">
                {commissions.map((commission) => (
                    <div key={commission.arena_id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                                    <h3 className="text-sm font-medium text-gray-900">{commission.arena_name}</h3>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getOverdueColor(commission.days_overdue)}`}>
                                        {commission.days_overdue > 0 ? `${commission.days_overdue} days overdue` : 'Due soon'}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center space-x-4">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <EnvelopeIcon className="h-4 w-4 mr-1" />
                                        {commission.owner_email}
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <PhoneIcon className="h-4 w-4 mr-1" />
                                        {commission.owner_phone}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-semibold text-gray-900">Rs {commission.amount_due.toLocaleString()}</p>
                                <button className="mt-2 px-3 py-1 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors">
                                    Mark Paid
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PendingCommissions;