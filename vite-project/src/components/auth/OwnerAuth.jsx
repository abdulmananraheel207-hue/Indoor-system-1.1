import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const OwnerAuth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        arena_name: '',
        email: '',
        password: '',
        phone: '',
        business_address: '',
        number_of_courts: 1,
        agreed_to_terms: false
    });
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isLogin && !formData.agreed_to_terms) {
            alert('Please agree to terms and conditions');
            return;
        }
        console.log('Owner Auth:', formData);
        navigate('/owner/dashboard');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {isLogin ? 'Login as Arena Owner' : 'Register Your Arena'}
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {!isLogin && (
                        <>
                            <div>
                                <label htmlFor="arena_name" className="block text-sm font-medium text-gray-700">
                                    Arena Name *
                                </label>
                                <input
                                    id="arena_name"
                                    name="arena_name"
                                    type="text"
                                    required
                                    value={formData.arena_name}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Sports Arena"
                                />
                            </div>

                            <div>
                                <label htmlFor="business_address" className="block text-sm font-medium text-gray-700">
                                    Business Address *
                                </label>
                                <textarea
                                    id="business_address"
                                    name="business_address"
                                    rows="2"
                                    required
                                    value={formData.business_address}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Full address of your arena"
                                />
                            </div>

                            <div>
                                <label htmlFor="number_of_courts" className="block text-sm font-medium text-gray-700">
                                    Number of Courts *
                                </label>
                                <select
                                    id="number_of_courts"
                                    name="number_of_courts"
                                    value={formData.number_of_courts}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                        <option key={num} value={num}>{num}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center">
                                <input
                                    id="agreed_to_terms"
                                    name="agreed_to_terms"
                                    type="checkbox"
                                    required
                                    checked={formData.agreed_to_terms}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                />
                                <label htmlFor="agreed_to_terms" className="ml-2 block text-sm text-gray-900">
                                    I agree to the Terms and Conditions
                                </label>
                            </div>
                        </>
                    )}

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email address *
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            placeholder="owner@arena.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                            Phone Number *
                        </label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            required
                            value={formData.phone}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            placeholder="+1234567890"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Password *
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                            {isLogin ? 'Sign In as Owner' : 'Register Arena'}
                        </button>
                    </div>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-primary-600 hover:text-primary-500 text-sm"
                        >
                            {isLogin ? "Don't have an account? Register your arena" : "Already have an account? Sign in"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OwnerAuth;