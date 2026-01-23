// components/admin/PendingCommissions.jsx
import React from 'react';
import { ExclamationTriangleIcon, PhoneIcon, EnvelopeIcon, CheckCircleIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';

const PendingCommissions = ({ commissions, onMarkPaid }) => {
    const getOverdueColor = (days) => {
        if (days > 30) return 'text-red-600 bg-red-50 border border-red-200';
        if (days > 15) return 'text-orange-600 bg-orange-50 border border-orange-200';
        if (days > 7) return 'text-yellow-600 bg-yellow-50 border border-yellow-200';
        return 'text-gray-600 bg-gray-50 border border-gray-200';
    };

    const getOverdueText = (days) => {
        if (days > 30) return 'Severely overdue';
        if (days > 15) return 'Overdue';
        if (days > 7) return 'Due soon';
        return 'Recent';
    };

    if (!commissions || commissions.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Pending Commissions</h2>
                        <span className="text-sm text-gray-500">No pending payments</span>
                    </div>
                </div>
                <div className="p-8 text-center">
                    <div className="mx-auto h-12 w-12 text-gray-300 mb-3">
                        <CheckCircleIcon className="h-12 w-12" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">All commissions are paid</h3>
                    <p className="text-sm text-gray-500 mt-1">No pending commission payments at this time</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Pending Commissions</h2>
                    <span className="text-sm text-primary-600 font-medium">
                        Total: Rs {commissions.reduce((sum, c) => sum + (c.amount_due || c.total_commission_due || 0), 0).toLocaleString()}
                    </span>
                </div>
            </div>
            <div className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
                {commissions.map((commission) => {
                    const amountDue = commission.amount_due || commission.total_commission_due || 0;
                    const daysOverdue = commission.days_overdue || 0;

                    return (
                        <div key={commission.arena_id || commission.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <BuildingStorefrontIcon className="h-5 w-5 text-gray-400" />
                                        <h3 className="text-sm font-medium text-gray-900">
                                            {commission.arena_name || commission.name || 'Unnamed Arena'}
                                        </h3>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getOverdueColor(daysOverdue)}`}>
                                            {getOverdueText(daysOverdue)}
                                            {daysOverdue > 0 && ` (${daysOverdue} days)`}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <div className="flex items-center text-sm text-gray-600">
                                                <EnvelopeIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                                                <span className="truncate">{commission.owner_email || commission.email || 'No email'}</span>
                                            </div>
                                            <div className="flex items-center text-sm text-gray-600">
                                                <PhoneIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                                                <span>{commission.owner_phone || commission.phone_number || 'No phone'}</span>
                                            </div>
                                        </div>

                                        <div className="text-sm">
                                            <div className="text-gray-700">
                                                Owner: <span className="font-medium">{commission.owner_name || 'Unknown'}</span>
                                            </div>
                                            <div className="text-gray-500">
                                                Last payment: {commission.last_payment_date
                                                    ? new Date(commission.last_payment_date).toLocaleDateString()
                                                    : 'Never'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right ml-4 flex-shrink-0">
                                    <div className="text-lg font-semibold text-gray-900 mb-2">
                                        Rs {amountDue.toLocaleString()}
                                    </div>
                                    <button
                                        onClick={() => onMarkPaid(commission.arena_id || commission.id, amountDue)}
                                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center"
                                    >
                                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                                        Mark Paid
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PendingCommissions;