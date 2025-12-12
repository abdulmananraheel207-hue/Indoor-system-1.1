import React from 'react';
import { useNavigate } from 'react-router-dom';

const LoginSelector = () => {
    const navigate = useNavigate();

    const roles = [
        {
            id: 'user',
            label: 'Player',
            description: 'Book courts & play matches',
            icon: '⚽',
            route: '/login/user',
            color: 'from-blue-500 to-blue-600',
            textColor: 'text-blue-600'
        },
        {
            id: 'owner',
            label: 'Arena Owner',
            description: 'Manage your venue & bookings',
            icon: '🏟️',
            route: '/login/owner',
            color: 'from-green-500 to-green-600',
            textColor: 'text-green-600'
        },
        {
            id: 'admin',
            label: 'Admin',
            description: 'System control & management',
            icon: '⚙️',
            route: '/login/admin',
            color: 'from-purple-500 to-purple-600',
            textColor: 'text-purple-600'
        },
        {
            id: 'manager',
            label: 'Manager',
            description: 'Staff access & operations',
            icon: '👔',
            route: '/login/manager',
            color: 'from-orange-500 to-orange-600',
            textColor: 'text-orange-600'
        },
        {
            id: 'guest',
            label: 'Guest',
            description: 'Browse without account',
            icon: '👤',
            route: '/guest',
            color: 'from-gray-500 to-gray-600',
            textColor: 'text-gray-600'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
            {/* Header */}
            <div className="bg-white shadow-sm">
                <div className="container mx-auto px-4 py-6">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                            <span className="text-3xl text-white">🏟️</span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Sports Arena Booking
                        </h1>
                        <p className="text-gray-600">Select your role to continue</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                onClick={() => navigate(role.route)}
                                className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200"
                            >
                                {/* Gradient top bar */}
                                <div className={`h-2 bg-gradient-to-r ${role.color}`}></div>

                                <div className="p-6">
                                    <div className="flex items-start space-x-4">
                                        {/* Icon */}
                                        <div className={`w-14 h-14 rounded-lg ${role.textColor} bg-opacity-10 flex items-center justify-center text-2xl`}>
                                            {role.icon}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 text-left">
                                            <h3 className={`text-lg font-bold ${role.textColor} mb-1`}>
                                                {role.label}
                                            </h3>
                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                {role.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <div className="mt-4 flex justify-end">
                                        <div className={`w-10 h-10 rounded-full ${role.textColor} bg-opacity-10 flex items-center justify-center group-hover:bg-opacity-20 transition-all`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Footer note */}
                    <div className="mt-12 text-center">
                        <p className="text-gray-500 text-sm">
                            Need help?{' '}
                            <button className="text-blue-600 hover:text-blue-800 font-medium">
                                Contact Support
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginSelector;