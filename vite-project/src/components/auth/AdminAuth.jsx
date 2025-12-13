import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminAuth = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Admin Login:', formData);
        // Admin login logic
        navigate('/admin/dashboard');
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-xl shadow-2xl">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
                        Admin Login
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-400">
                        Restricted access - Administrators only
                    </p>
                </div>
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
                            placeholder="admin_user"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                            Admin Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            placeholder="admin@system.com"
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

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-800"
                        >
                            Sign In as Admin
                        </button>
                    </div>

                    <div className="text-center">
                        <p className="text-sm text-gray-400">
                            For security reasons, admin registration is restricted.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminAuth;