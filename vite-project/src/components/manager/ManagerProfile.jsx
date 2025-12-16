// components/manager/ManagerProfile.jsx
import React, { useState, useEffect } from "react";

const ManagerProfile = ({ managerData }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState("");

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                "http://localhost:5000/api/managers/profile",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            const data = await response.json();
            if (response.ok) {
                setProfile(data);
                setPhoneNumber(data.phone_number || "");
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                "http://localhost:5000/api/managers/profile",
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        phone_number: phoneNumber
                    }),
                }
            );

            if (response.ok) {
                alert("Profile updated successfully");
                setEditMode(false);
                fetchProfile();
            } else {
                const data = await response.json();
                alert(data.message || "Failed to update profile");
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("An error occurred");
        }
    };

    if (loading || !profile) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-xl font-bold text-gray-900 mb-6 md:text-2xl">
                Your Profile
            </h1>

            <div className="bg-white rounded-xl shadow p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-medium text-gray-900">
                        Personal Information
                    </h2>
                    <button
                        onClick={() => setEditMode(!editMode)}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        {editMode ? "Cancel Edit" : "Edit Profile"}
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                value={profile.name}
                                disabled
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={profile.email}
                                disabled
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone Number
                            </label>
                            {editMode ? (
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter phone number"
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={profile.phone_number || "Not provided"}
                                    disabled
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700"
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Arena Name
                            </label>
                            <input
                                type="text"
                                value={profile.arena_name || "Not specified"}
                                disabled
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700"
                            />
                        </div>
                    </div>

                    {/* Permissions Section */}
                    <div className="mt-6 pt-6 border-t">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Your Permissions
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {Object.entries(managerData.permissions || {}).map(([key, value]) => (
                                <div key={key} className="flex items-center p-2 bg-gray-50 rounded-lg">
                                    <div className={`h-3 w-3 rounded-full mr-2 ${value ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className="text-sm capitalize">
                                        {key.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                            Permissions are managed by the arena owner. Contact them for changes.
                        </p>
                    </div>

                    {editMode && (
                        <div className="mt-6 pt-6 border-t">
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setEditMode(false)}
                                    className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveProfile}
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManagerProfile;