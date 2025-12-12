import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
    const { user, role, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="bg-white shadow-lg border-b">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xl font-bold">🏟️</span>
                        </div>
                        <span className="text-xl font-bold text-gray-800 hidden md:block">
                            Sports Arena
                        </span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center space-x-4">
                        {!isAuthenticated ? (
                            <>
                                <Link
                                    to="/login"
                                    className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                >
                                    Register
                                </Link>
                            </>
                        ) : (
                            <>
                                {/* User greeting */}
                                <div className="hidden md:block">
                                    <p className="text-sm font-medium text-gray-800">
                                        Welcome, {user?.name || user?.arena_name || user?.username}!
                                    </p>
                                    <p className="text-xs text-gray-500 capitalize">{role}</p>
                                </div>

                                {/* Dashboard link based on role */}
                                <Link
                                    to={`/${role}/dashboard`}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                                >
                                    Dashboard
                                </Link>

                                {/* Logout button */}
                                <button
                                    onClick={handleLogout}
                                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium"
                                >
                                    Logout
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;