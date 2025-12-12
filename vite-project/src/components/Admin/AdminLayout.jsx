// src/components/Admin/AdminLayout.jsx
import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
    BarChart3, Building2, Home, FileText, LogOut,
    Menu, X, Shield
} from 'lucide-react';

const AdminLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navItems = [
        { path: '/admin/dashboard', label: 'Dashboard', icon: Home },
        { path: '/admin/arenas', label: 'Arena Management', icon: Building2 },
        { path: '/admin/reports', label: 'Reports', icon: FileText },
    ];

    const isActive = (path) => {
        return location.pathname === path;
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('admin');
        navigate('/admin/login');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Navigation Bar */}
            <nav className="fixed top-0 z-50 w-full bg-white border-b">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        {/* Left side - Logo and mobile menu button */}
                        <div className="flex items-center">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 rounded-lg md:hidden hover:bg-gray-100"
                            >
                                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>

                            <div className="flex items-center ml-4">
                                <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                                    <Shield className="text-white" size={24} />
                                </div>
                                <div className="ml-3">
                                    <h1 className="text-lg font-bold text-gray-800">Admin Portal</h1>
                                    <p className="text-xs text-gray-500">System Administration</p>
                                </div>
                            </div>
                        </div>

                        {/* Right side - User info and logout */}
                        <div className="flex items-center space-x-4">
                            <div className="hidden md:block text-right">
                                <p className="text-sm font-medium text-gray-800">Administrator</p>
                                <p className="text-xs text-gray-500">System Admin</p>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <LogOut size={20} />
                                <span className="hidden md:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Sidebar for Desktop */}
            <aside className="fixed left-0 top-16 z-40 h-full w-64 bg-white border-r hidden md:block">
                <div className="px-4 py-6">
                    <nav className="space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.path)
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <Icon size={20} />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            {/* Mobile Sidebar */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-30 md:hidden">
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <div className="fixed inset-y-0 left-0 w-64 bg-white">
                        <div className="px-4 py-6">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center">
                                    <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                                        <Shield className="text-white" size={24} />
                                    </div>
                                    <div className="ml-3">
                                        <h1 className="text-lg font-bold text-gray-800">Admin Portal</h1>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="p-2 rounded-lg hover:bg-gray-100"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <nav className="space-y-1">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.path)
                                                    ? 'bg-blue-50 text-blue-600'
                                                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                                }`}
                                        >
                                            <Icon size={20} />
                                            <span className="font-medium">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="pt-16 md:pl-64">
                <div className="p-4 md:p-6">
                    <Outlet />
                </div>
            </main>

            {/* Toast Notifications */}
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                    },
                    success: {
                        duration: 3000,
                        style: {
                            background: '#10b981',
                        },
                    },
                    error: {
                        duration: 4000,
                        style: {
                            background: '#ef4444',
                        },
                    },
                }}
            />
        </div>
    );
};

export default AdminLayout;