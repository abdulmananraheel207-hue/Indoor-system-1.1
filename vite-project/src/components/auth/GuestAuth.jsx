import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const GuestAuth = () => {
    const [locationAllowed, setLocationAllowed] = useState(false);
    const navigate = useNavigate();

    const handleLocationRequest = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('Location:', position.coords);
                    setLocationAllowed(true);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Please enable location to find nearby arenas');
                }
            );
        } else {
            alert('Geolocation is not supported by your browser');
        }
    };

    const continueAsGuest = () => {
        console.log('Continuing as guest');
        navigate('/guest/view');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="h-8 w-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Welcome Guest!
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Preview the app before registering
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    As a guest, you can view arenas but cannot make bookings.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Enable Location Access
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Allow location access to find arenas near you
                            </p>
                            <button
                                onClick={handleLocationRequest}
                                className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Allow Location Access
                            </button>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                            <button
                                onClick={continueAsGuest}
                                disabled={!locationAllowed}
                                className={`w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white ${locationAllowed
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-gray-400 cursor-not-allowed'
                                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                            >
                                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                                Continue as Guest
                                {locationAllowed && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        Location Enabled
                                    </span>
                                )}
                            </button>
                        </div>

                        <div className="text-center pt-4">
                            <p className="text-sm text-gray-600">
                                Want full access?{' '}
                                <button
                                    onClick={() => navigate('/auth/user')}
                                    className="font-medium text-primary-600 hover:text-primary-500"
                                >
                                    Register as User
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuestAuth;