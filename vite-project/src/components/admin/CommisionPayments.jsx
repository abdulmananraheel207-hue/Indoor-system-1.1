import React, { useState, useEffect } from 'react';
import {
    CurrencyDollarIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    BuildingStorefrontIcon,
    UserGroupIcon,
    CalendarIcon,
    CheckBadgeIcon,
    MagnifyingGlassIcon,
    FunnelIcon
} from '@heroicons/react/24/outline';

const CommissionPayments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showMarkModal, setShowMarkModal] = useState(false);

    useEffect(() => {
        // Mock data
        const mockPayments = [
            {
                payment_id: 1,
                arena_id: 1,
                arena_name: 'Elite Sports Arena',
                owner_name: 'Sports Co.',
                amount_due: 12500,
                amount_paid: 0,
                due_date: '2024-01-25',
                payment_date: null,
                late_fee_amount: 375,
                status: 'overdue',
                days_overdue: 3,
                created_at: '2024-01-15'
            },
            {
                payment_id: 2,
                arena_id: 2,
                arena_name: 'Pro Badminton Court',
                owner_name: 'Badminton Pro',
                amount_due: 8500,
                amount_paid: 0,
                due_date: '2024-01-28',
                payment_date: null,
                late_fee_amount: 255,
                status: 'pending',
                days_overdue: 0,
                created_at: '2024-01-18'
            },
            {
                payment_id: 3,
                arena_id: 3,
                arena_name: 'City Padel Club',
                owner_name: 'Padel Masters',
                amount_due: 18750,
                amount_paid: 18750,
                due_date: '2024-01-20',
                payment_date: '2024-01-19',
                late_fee_amount: 0,
                status: 'paid',
                days_overdue: 0,
                created_at: '2024-01-10'
            },
            {
                payment_id: 4,
                arena_id: 4,
                arena_name: 'Sky Basketball Arena',
                owner_name: 'Basketball Inc',
                amount_due: 3200,
                amount_paid: 0,
                due_date: '2024-01-15',
                payment_date: null,
                late_fee_amount: 480,
                status: 'blocked',
                days_overdue: 5,
                created_at: '2024-01-05'
            }
        ];

        setTimeout(() => {
            setPayments(mockPayments);
            setLoading(false);
        }, 1000);
    }, []);

    const filteredPayments = payments.filter(payment => {
        const matchesSearch = payment.arena_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.owner_name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'overdue':
                return 'bg-orange-100 text-orange-800';
            case 'blocked':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'paid':
                return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
            case 'pending':
                return <ClockIcon className="h-5 w-5 text-yellow-500" />;
            case 'overdue':
                return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
            case 'blocked':
                return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
            default:
                return <ClockIcon className="h-5 w-5 text-gray-500" />;
        }
    };

    const handleMarkPaid = (payment) => {
        setSelectedPayment(payment);
        setShowMarkModal(true);
    };

    const confirmMarkPaid = () => {
        if (selectedPayment) {
            setPayments(payments.map(p =>
                p.payment_id === selectedPayment.payment_id
                    ? { ...p, status: 'paid', amount_paid: p.amount_due, payment_date: new Date().toISOString().split('T')[0] }
                    : p
            ));
            setShowMarkModal(false);
            setSelectedPayment(null);
        }
    };

    const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount_due, 0);
    const totalOverdue = payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount_due, 0);
    const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount_paid, 0);

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
                <h1 className="text-2xl font-bold text-gray-900">Commission Payments</h1>
                <p className="text-gray-600">Manage and track commission payments from arena owners</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center mr-4">
                            <ClockIcon className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Pending</p>
                            <p className="text-2xl font-semibold text-gray-900">Rs {totalPending.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center mr-4">
                            <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Overdue</p>
                            <p className="text-2xl font-semibold text-gray-900">Rs {totalOverdue.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center mr-4">
                            <CheckCircleIcon className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Paid</p>
                            <p className="text-2xl font-semibold text-gray-900">Rs {totalPaid.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center mr-4">
                            <BuildingStorefrontIcon className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Blocked Arenas</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {payments.filter(p => p.status === 'blocked').length}
                            </p>
                        </div>
                    </div>
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
                                placeholder="Search by arena or owner name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="overdue">Overdue</option>
                            <option value="paid">Paid</option>
                            <option value="blocked">Blocked</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Payment Details
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Arena & Owner
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount Details
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Due Date
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
                            {filteredPayments.map((payment) => (
                                <tr key={payment.payment_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-blue-100 flex items-center justify-center">
                                                <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    Payment #{payment.payment_id}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    Created: {new Date(payment.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center text-sm text-gray-900">
                                                <BuildingStorefrontIcon className="h-4 w-4 mr-2" />
                                                {payment.arena_name}
                                            </div>
                                            <div className="flex items-center text-sm text-gray-500">
                                                <UserGroupIcon className="h-4 w-4 mr-2" />
                                                {payment.owner_name}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="text-sm">
                                                <span className="text-gray-600">Due:</span>{' '}
                                                <span className="font-medium text-gray-900">Rs {payment.amount_due.toLocaleString()}</span>
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-gray-600">Paid:</span>{' '}
                                                <span className="font-medium text-green-600">Rs {payment.amount_paid.toLocaleString()}</span>
                                            </div>
                                            {payment.late_fee_amount > 0 && (
                                                <div className="text-sm">
                                                    <span className="text-gray-600">Late fee:</span>{' '}
                                                    <span className="font-medium text-red-600">Rs {payment.late_fee_amount}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center text-sm text-gray-900">
                                                <CalendarIcon className="h-4 w-4 mr-2" />
                                                {new Date(payment.due_date).toLocaleDateString()}
                                            </div>
                                            {payment.payment_date && (
                                                <div className="text-sm text-green-600">
                                                    Paid on: {new Date(payment.payment_date).toLocaleDateString()}
                                                </div>
                                            )}
                                            {payment.days_overdue > 0 && (
                                                <div className="text-sm text-red-600">
                                                    {payment.days_overdue} days overdue
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                                                {getStatusIcon(payment.status)}
                                                <span className="ml-1">{payment.status}</span>
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            {payment.status !== 'paid' && (
                                                <button
                                                    onClick={() => handleMarkPaid(payment)}
                                                    className="px-3 py-1 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
                                                >
                                                    Mark Paid
                                                </button>
                                            )}
                                            {payment.status === 'overdue' && (
                                                <button className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors">
                                                    Block Arena
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mark Payment Modal */}
            {showMarkModal && selectedPayment && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Mark Payment as Paid</h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600">Arena:</p>
                                    <p className="font-medium text-gray-900">{selectedPayment.arena_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Owner:</p>
                                    <p className="font-medium text-gray-900">{selectedPayment.owner_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Amount Due:</p>
                                    <p className="text-2xl font-bold text-gray-900">Rs {selectedPayment.amount_due.toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Payment Date
                                    </label>
                                    <input
                                        type="date"
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowMarkModal(false)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmMarkPaid}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                Confirm Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommissionPayments;