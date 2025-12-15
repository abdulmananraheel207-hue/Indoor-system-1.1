import React, { useState, useEffect } from "react";

// Receive dashboardData as a prop from OwnerDashboard
const OwnerProfile = ({ dashboardData }) => {
  const [ownerProfile, setOwnerProfile] = useState(null); // Separate state for profile details
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
      setLoading(true);
      const token = localStorage.getItem("token");
      // --- FIX: Calling the correct dedicated profile endpoint ---
      const response = await fetch("http://localhost:5000/api/owners/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setOwnerProfile(data); // Set profile details
        setFormData({
          arena_name: data.arena_name || "", // Corrected field access
          email: data.email || "",
          phone_number: data.phone_number || "",
          business_address: data.business_address || "",
        });
      }
    } catch (error) {
      console.error("Error fetching owner profile:", error);
    } finally {
      setLoading(false);
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
        // Only send fields that can be updated (email is not in validation)
        body: JSON.stringify({
          arena_name: formData.arena_name,
          phone_number: formData.phone_number,
          business_address: formData.business_address,
        }),
      });

      if (response.ok) {
        alert("Profile updated successfully");
        setEditMode(false);
        fetchOwnerProfile(); // Refresh profile data
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Use ownerProfile for profile details, dashboardData for stats
  if (!ownerProfile) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const dashboardStats = dashboardData?.dashboard || {};
  const managerCount = dashboardData?.managers?.length || 0;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-4 md:text-2xl md:mb-6">
        Profile Settings
      </h1>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b bg-gray-50 md:px-6 md:py-4">
          <div className="flex flex-col space-y-3 md:flex-row md:justify-between md:items-center md:space-y-0">
            <h2 className="text-base font-medium text-gray-900 md:text-lg">
              Owner Information
            </h2>
            <button
              onClick={() =>
                editMode ? handleSaveProfile() : setEditMode(true)
              }
              disabled={loading}
              className={`px-3 py-1.5 text-sm rounded-md text-white md:px-4 md:py-2 md:text-base ${
                loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1 md:h-4 md:w-4 md:mr-2"></span>
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
        <div className="p-4 md:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            {/* Arena Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3 md:mb-4">
                Arena Details
              </h3>

              <div className="space-y-3 md:space-y-4">
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
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {ownerProfile.arena_name}
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
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {ownerProfile.business_address || "Not provided"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Date
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(ownerProfile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3 md:mb-4">
                Contact Information
              </h3>

              <div className="space-y-3 md:space-y-4">
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
                      disabled
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md shadow-sm bg-gray-100"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {ownerProfile.email}
                    </p>
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
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {ownerProfile.phone_number || "Not provided"}
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
          <div className="mt-6 pt-4 border-t md:mt-8 md:pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3 md:mb-4">
              Business Summary
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              <div className="p-3 bg-blue-50 rounded-lg md:p-4">
                <p className="text-xs text-blue-700 md:text-sm">Total Arenas</p>
                <p className="text-lg font-bold text-blue-900 md:text-2xl">
                  {dashboardStats.total_arenas || 0}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg md:p-4">
                <p className="text-xs text-green-700 md:text-sm">
                  Active Bookings (Today)
                </p>
                <p className="text-lg font-bold text-green-900 md:text-2xl">
                  {dashboardStats.today_bookings || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg md:p-4">
                <p className="text-xs text-purple-700 md:text-sm">
                  Monthly Revenue
                </p>
                <p className="text-lg font-bold text-purple-900 md:text-2xl">
                  {formatCurrency(dashboardStats.monthly_revenue || 0)}
                </p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg md:p-4">
                <p className="text-xs text-yellow-700 md:text-sm">Managers</p>
                <p className="text-lg font-bold text-yellow-900 md:text-2xl">
                  {managerCount}
                </p>
              </div>
            </div>
          </div>

          {/* Cancel Edit Button */}
          {editMode && (
            <div className="mt-4 pt-4 border-t md:mt-6 md:pt-6">
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  setFormData({
                    arena_name: ownerProfile.arena_name || "",
                    email: ownerProfile.email || "",
                    phone_number: ownerProfile.phone_number || "",
                    business_address: ownerProfile.business_address || "",
                  });
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Security Section */}
      <div className="mt-4 bg-white rounded-xl shadow p-4 md:mt-6 md:p-6">
        <h3 className="text-base font-medium text-gray-900 mb-3 md:text-lg md:mb-4">
          Security
        </h3>
        <div className="space-y-3 md:space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Change Password
            </label>
            <div className="space-y-2 md:flex md:space-x-3 md:space-y-0">
              <input
                type="password"
                placeholder="Current password"
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="password"
                placeholder="New password"
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <button className="w-full px-4 py-2 text-sm md:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 md:w-auto">
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
