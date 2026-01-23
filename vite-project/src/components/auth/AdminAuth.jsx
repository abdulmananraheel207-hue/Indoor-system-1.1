// components/auth/AdminAuth.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import integrationService from '../../services/integrationService';

const AdminAuth = ({ onLogin }) => {
    const [formData, setFormData] = useState({
        username: 'admin',
        password: 'admin123'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            console.log("🔐 Attempting admin login...");
            const result = await integrationService.adminLogin(formData);

            if (result.success) {
                console.log("✅ Admin login successful");

                // Store admin token and user data
                localStorage.setItem('adminToken', result.token);
                localStorage.setItem('adminUser', JSON.stringify(result.user));
                localStorage.setItem('userRole', 'admin');

                // Call parent onLogin
                if (onLogin) onLogin(result);

                // Navigate to admin dashboard
                navigate('/admin/dashboard');
            } else {
                setError(result.message || 'Invalid credentials');
            }
        } catch (err) {
            console.error('Admin login error:', err);
            setError(err.message || 'Invalid credentials. Use: admin / admin123');
        } finally {
            setLoading(false);
        }
    };

    const fillTestCredentials = () => {
        setFormData({
            username: 'admin',
            password: 'admin123'
        });
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-xl shadow-2xl">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100 mb-4">
                        <ShieldCheckIcon className="h-6 w-6 text-primary-600" />
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
                        Admin Login
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-400">
                        Single admin access only
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-300">
                            Username
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            required
                            value={formData.username}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Enter username"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="text-sm text-gray-400 bg-gray-900 p-3 rounded">
                        <p className="font-medium">Default Credentials:</p>
                        <p>Username: <span className="font-mono text-primary-400">admin</span></p>
                        <p>Password: <span className="font-mono text-primary-400">admin123</span></p>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </span>
                            ) : 'Sign In as Admin'}
                        </button>
                    </div>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={fillTestCredentials}
                            className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                        >
                            Use default credentials
                        </button>
                        <p className="mt-2 text-xs text-gray-400">
                            Admin registration is disabled. Only one admin account exists.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminAuth;