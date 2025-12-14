import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    HomeIcon,
    UsersIcon,
    BuildingStorefrontIcon,
    UserGroupIcon,
    CurrencyDollarIcon,
    ChartBarIcon,
    ArrowRightOnRectangleIcon,
    Bars3Icon,
    XMarkIcon,
    ExclamationCircleIcon,
    WalletIcon,
    DocumentTextIcon,
    Cog6ToothIcon
} from '@heroicons/react/24/outline';

const AdminLayout = ({ onLogout }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

    const navigation = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
        { name: 'Arenas', href: '/admin/arenas', icon: BuildingStorefrontIcon },
        { name: 'Users', href: '/admin/users', icon: UsersIcon },
        { name: 'Owners', href: '/admin/owners', icon: UserGroupIcon },
        { name: 'Financial Reports', href: '/admin/financial-reports', icon: ChartBarIcon },
        { name: 'Commission Payments', href: '/admin/commission-payments', icon: WalletIcon },
        { name: 'System Settings', href: '/admin/settings', icon: Cog6ToothIcon },
    ];


    const handleLogout = () => {
        onLogout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile sidebar */}
            <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
                <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
                <div className="fixed inset-y-0 left-0 flex w-64">
                    <div className="relative flex w-full flex-col bg-gray-900">
                        <div className="flex items-center justify-between px-4 py-6">
                            <span className="text-xl font-bold text-white">ArenaFinder Admin</span>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <nav className="flex-1 space-y-1 px-4 pb-4">
                            {navigation.map((item) => {
                                const isActive = location.pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg ${isActive
                                            ? 'bg-primary-600 text-white'
                                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                            }`}
                                    >
                                        <item.icon className="mr-3 h-5 w-5" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className="border-t border-gray-700 px-4 py-4">
                            <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                                    <span className="text-primary-700 font-semibold">A</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-white">{adminUser.name || 'Admin'}</p>
                                    <p className="text-xs text-gray-400">{adminUser.email || 'admin@arenafinder.com'}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="text-gray-400 hover:text-white ml-2"
                                    title="Logout"
                                >
                                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
                <div className="flex min-h-0 flex-1 flex-col bg-gray-900">
                    <div className="flex flex-1 flex-col overflow-y-auto pt-6 pb-4">
                        <div className="flex items-center px-6">
                            <span className="text-xl font-bold text-white">ArenaFinder Admin</span>
                        </div>
                        <nav className="mt-8 flex-1 space-y-1 px-4">
                            {navigation.map((item) => {
                                const isActive = location.pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg ${isActive
                                            ? 'bg-primary-600 text-white'
                                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                            }`}
                                    >
                                        <item.icon className="mr-3 h-5 w-5" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className="mt-auto px-4 py-6">
                            <div className="border-t border-gray-700 pt-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                                            <span className="text-primary-700 font-semibold">A</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{adminUser.name || 'Admin'}</p>
                                            <p className="text-xs text-gray-400">{adminUser.email || 'admin@arenafinder.com'}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="text-gray-400 hover:text-white"
                                        title="Logout"
                                    >
                                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Top navbar */}
                <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
                    <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden text-gray-700 hover:text-gray-900 mr-3"
                            >
                                <Bars3Icon className="h-6 w-6" />
                            </button>
                            <h1 className="text-lg font-semibold text-gray-900">
                                {navigation.find(item => item.href === location.pathname)?.name || 'Admin Dashboard'}
                            </h1>
                        </div>

                        <div className="flex items-center space-x-3">
                            <div className="hidden md:flex items-center space-x-3">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">{adminUser.name || 'Admin'}</p>
                                    <p className="text-xs text-gray-500">System Administrator</p>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                                    <span className="text-primary-700 font-semibold text-sm">A</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className="py-6 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>

                {/* Footer */}
                <footer className="bg-white border-t border-gray-200 py-4 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-500">
                            <div className="mb-2 md:mb-0">
                                © {new Date().getFullYear()} ArenaFinder Admin Portal. All rights reserved.
                            </div>
                            <div className="flex items-center space-x-4">
                                <span>Version 1.0.0</span>
                                <span className="hidden md:inline">•</span>
                                <span className="hidden md:inline">Test Environment</span>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default AdminLayout;