// components/Profile.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Profile = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center">
                        <Link to="/dashboard" className="text-2xl font-bold text-blue-600 mr-2">🏟️</Link>
                        <h1 className="text-xl font-bold text-gray-800">My Profile</h1>
                    </div>
                    <Link to="/dashboard" className="text-blue-600 hover:underline">
                        ← Back to Dashboard
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="text-6xl mb-4">👤</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Profile Page</h2>
                    <p className="text-gray-600 mb-6">This page is under development.</p>
                    <p className="text-gray-500 text-sm">
                        Here you will be able to manage your profile information.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Profile;