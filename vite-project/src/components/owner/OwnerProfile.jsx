import React, { useState, useEffect } from "react";

const OwnerProfile = () => {
  const [ownerData, setOwnerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    arena_name: "",
    email: "",
    phone_number: "",
    business_address: "",
  });

  useEffect(() => {
    fetchOwnerProfile();
  }, []);

  const fetchOwnerProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/owners/dashboard",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setOwnerData(data);
        setFormData({
          arena_name: data.owner_name || "",
          email: data.email || "",
          phone_number: data.phone_number || "",
          business_address: data.business_address || "",
        });
      }
    } catch (error) {
      console.error("Error fetching owner profile:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/owners/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("Profile updated successfully");
        setEditMode(false);
        fetchOwnerProfile();
      } else {
        const data = await response.json();
        alert(data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!ownerData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Profile Settings
      </h1>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              Owner Information
            </h2>
            <button
              onClick={() =>
                editMode ? handleSaveProfile() : setEditMode(true)
              }
              disabled={loading}
              className={`px-4 py-2 rounded-md text-white ${
                loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Saving...
                </>
              ) : editMode ? (
                "Save Changes"
              ) : (
                "Edit Profile"
              )}
            </button>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Arena Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                Arena Details
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Arena Name
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      name="arena_name"
                      value={formData.arena_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {ownerData.owner_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Address
                  </label>
                  {editMode ? (
                    <textarea
                      name="business_address"
                      value={formData.business_address}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {ownerData.business_address || "Not provided"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Date
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(ownerData.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                Contact Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  {editMode ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{ownerData.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  {editMode ? (
                    <input
                      type="tel"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {ownerData.phone_number || "Not provided"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Status
                  </label>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              Business Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">Total Arenas</p>
                <p className="text-2xl font-bold text-blue-900">
                  {ownerData.dashboard?.total_arenas || 0}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">Active Bookings</p>
                <p className="text-2xl font-bold text-green-900">
                  {ownerData.dashboard?.today_bookings || 0}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-700">Monthly Revenue</p>
                <p className="text-2xl font-bold text-purple-900">
                  ₹{ownerData.dashboard?.monthly_revenue || 0}
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-700">Managers</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {ownerData.managers?.length || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Cancel Edit Button */}
          {editMode && (
            <div className="mt-6 pt-6 border-t">
              <button
                onClick={() => {
                  setEditMode(false);
                  setFormData({
                    arena_name: ownerData.owner_name || "",
                    email: ownerData.email || "",
                    phone_number: ownerData.phone_number || "",
                    business_address: ownerData.business_address || "",
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Security Section */}
      <div className="mt-6 bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Security</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Change Password
            </label>
            <div className="flex space-x-3">
              <input
                type="password"
                placeholder="Current password"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="password"
                placeholder="New password"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Update
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerProfile;
