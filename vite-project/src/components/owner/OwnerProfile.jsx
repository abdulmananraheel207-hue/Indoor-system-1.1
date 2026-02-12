// File: OwnerProfile.jsx - UPDATED for both Owner and Manager roles
import React, { useState, useEffect } from "react";

const OwnerProfile = ({ dashboardData, isOwner, permissions = {} }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    arena_name: "",
    email: "",
    phone_number: "",
    business_address: "",
    name: "", // For manager
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Permission checks
  const canViewFinancial = isOwner || permissions.view_financial;

  useEffect(() => {
    fetchProfile();
  }, [isOwner]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole");

      let endpoint;
      if (userRole === "owner") {
        endpoint = "http://localhost:5000/api/owners/profile";
      } else {
        endpoint = "http://localhost:5000/api/managers/profile";
      }

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setProfile(data);

        if (userRole === "owner") {
          setFormData({
            arena_name: data.arena_name || "",
            email: data.email || "",
            phone_number: data.phone_number || "",
            business_address: data.business_address || "",
            name: "",
          });
        } else {
          // Manager profile data
          setFormData({
            name: data.name || "",
            email: data.email || "",
            phone_number: data.phone_number || "",
            arena_name: data.arena_name || "",
            business_address: "",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();

    // Validation
    if (!passwordData.current_password || !passwordData.new_password) {
      setPasswordError("Current password and new password are required");
      return;
    }

    if (passwordData.new_password.length < 6) {
      setPasswordError("New password must be at least 6 characters long");
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError("New passwords do not match");
      return;
    }

    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole");

      let endpoint;
      if (userRole === "owner") {
        endpoint = "http://localhost:5000/api/owners/profile/password";
      } else {
        endpoint = "http://localhost:5000/api/managers/profile/password";
      }

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess("Password updated successfully!");
        setPasswordData({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });

        setTimeout(() => {
          setPasswordSuccess("");
        }, 5000);
      } else {
        setPasswordError(data.message || "Failed to update password");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      setPasswordError("An error occurred. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value,
    });
    if (passwordError) setPasswordError("");
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole");

      let endpoint, payload;

      if (userRole === "owner") {
        endpoint = "http://localhost:5000/api/owners/profile";
        payload = {
          arena_name: formData.arena_name,
          phone_number: formData.phone_number,
          business_address: formData.business_address,
        };
      } else {
        endpoint = "http://localhost:5000/api/managers/profile";
        payload = {
          name: formData.name,
          phone_number: formData.phone_number,
        };
      }

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

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
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (!profile) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const dashboardStats = dashboardData?.dashboard || dashboardData?.stats || {};
  const userRole = localStorage.getItem("userRole");
  const isManager = userRole === "manager";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
            {isOwner ? "Profile Settings" : "Manager Profile"}
          </h1>
          {isManager && (
            <p className="text-sm text-gray-600 mt-1">
              {Object.values(permissions || {}).filter(Boolean).length} permissions assigned
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b bg-gray-50 md:px-6 md:py-4">
          <div className="flex flex-col space-y-3 md:flex-row md:justify-between md:items-center md:space-y-0">
            <h2 className="text-base font-medium text-gray-900 md:text-lg">
              {isOwner ? "Owner Information" : "Manager Information"}
            </h2>
            {isOwner && (
              <button
                onClick={() =>
                  editMode ? handleSaveProfile() : setEditMode(true)
                }
                disabled={loading}
                className={`px-3 py-1.5 text-sm rounded-md text-white md:px-4 md:py-2 md:text-base ${loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
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
            )}
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-4 md:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            {/* Owner/Manager Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3 md:mb-4">
                {isOwner ? "Arena Details" : "Personal Details"}
              </h3>

              <div className="space-y-3 md:space-y-4">
                {isOwner ? (
                  // Owner fields
                  <>
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
                          {profile.arena_name}
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
                          {profile.business_address || "Not provided"}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  // Manager fields
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      {editMode ? (
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">
                          {profile.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Arena
                      </label>
                      <p className="text-sm text-gray-900">
                        {profile.arena_name || profile.owner_arena_name || "Not assigned"}
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Date
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(profile.created_at).toLocaleDateString()}
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
                  {editMode && isOwner ? (
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
                      {profile.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  {(editMode && isOwner) || (editMode && isManager) ? (
                    <input
                      type="tel"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {profile.phone_number || "Not provided"}
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
                  {isManager && profile.is_active === 0 && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Inactive
                    </span>
                  )}
                </div>

                {isManager && profile.permissions && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Permissions
                    </label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(profile.permissions)
                        .filter(([_, value]) => value)
                        .map(([key]) => (
                          <span
                            key={key}
                            className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                          >
                            {key.replace(/_/g, ' ')}
                          </span>
                        ))}
                      {Object.values(profile.permissions || {}).filter(Boolean).length === 0 && (
                        <span className="text-xs text-gray-500">No permissions</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Summary - Only show financial stats if user has permission */}
          {(isOwner || canViewFinancial) && (
            <div className="mt-6 pt-4 border-t md:mt-8 md:pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3 md:mb-4">
                {isOwner ? "Business Summary" : "Performance Summary"}
              </h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                {isOwner ? (
                  // Owner stats
                  <>
                    <div className="p-3 bg-blue-50 rounded-lg md:p-4">
                      <p className="text-xs text-blue-700 md:text-sm">Total Arenas</p>
                      <p className="text-lg font-bold text-blue-900 md:text-2xl">
                        {dashboardStats.total_arenas || 0}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg md:p-4">
                      <p className="text-xs text-green-700 md:text-sm">
                        Today's Bookings
                      </p>
                      <p className="text-lg font-bold text-green-900 md:text-2xl">
                        {dashboardStats.today_bookings || 0}
                      </p>
                    </div>
                  </>
                ) : (
                  // Manager stats
                  <>
                    <div className="p-3 bg-blue-50 rounded-lg md:p-4">
                      <p className="text-xs text-blue-700 md:text-sm">Bookings Handled</p>
                      <p className="text-lg font-bold text-blue-900 md:text-2xl">
                        {dashboardStats.completed_bookings || 0}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg md:p-4">
                      <p className="text-xs text-green-700 md:text-sm">
                        Pending Requests
                      </p>
                      <p className="text-lg font-bold text-green-900 md:text-2xl">
                        {dashboardStats.pending_bookings || 0}
                      </p>
                    </div>
                  </>
                )}

                {canViewFinancial && (
                  <div className="p-3 bg-purple-50 rounded-lg md:p-4">
                    <p className="text-xs text-purple-700 md:text-sm">
                      {isOwner ? "Monthly Revenue" : "Revenue Handled"}
                    </p>
                    <p className="text-lg font-bold text-purple-900 md:text-2xl">
                      {formatCurrency(dashboardStats.monthly_revenue || dashboardStats.total_revenue || 0)}
                    </p>
                  </div>
                )}

                <div className="p-3 bg-yellow-50 rounded-lg md:p-4">
                  <p className="text-xs text-yellow-700 md:text-sm">
                    {isOwner ? "Managers" : "Your Role"}
                  </p>
                  <p className="text-lg font-bold text-yellow-900 md:text-2xl">
                    {isOwner ? (dashboardData?.managers?.length || 0) : "Manager"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cancel Edit Button - Only for owners */}
          {editMode && isOwner && (
            <div className="mt-4 pt-4 border-t md:mt-6 md:pt-6">
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  setFormData({
                    arena_name: profile.arena_name || "",
                    email: profile.email || "",
                    phone_number: profile.phone_number || "",
                    business_address: profile.business_address || "",
                    name: "",
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

      {/* Security Section - Password Change (Both Owner and Manager) */}
      <div className="mt-4 bg-white rounded-xl shadow p-4 md:mt-6 md:p-6">
        <h3 className="text-base font-medium text-gray-900 mb-3 md:text-lg md:mb-4">
          Security
        </h3>

        {/* Error Message */}
        {passwordError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-red-800">{passwordError}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {passwordSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-green-800">{passwordSuccess}</p>
            </div>
          </div>
        )}

        <form onSubmit={handlePasswordChange}>
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                name="current_password"
                value={passwordData.current_password}
                onChange={handlePasswordInputChange}
                placeholder="Enter current password"
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                name="new_password"
                value={passwordData.new_password}
                onChange={handlePasswordInputChange}
                placeholder="Enter new password (min. 6 characters)"
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirm_password"
                value={passwordData.confirm_password}
                onChange={handlePasswordInputChange}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className={`w-full px-4 py-2 text-sm md:text-base text-white rounded-md md:w-auto ${passwordLoading
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                  }`}
              >
                {passwordLoading ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Password Requirements Note */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            <strong>Note:</strong> Password must be at least 6 characters long.
            Make sure to use a strong password that includes letters, numbers,
            and special characters.
          </p>
          {isManager && (
            <p className="text-xs text-gray-500 mt-2">
              <strong>Account Managed By:</strong> Arena Owner
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerProfile;