// File: OwnerManagers.jsx - COMPLETE UPDATED VERSION
import React, { useState, useEffect } from "react";

const OwnerManagers = () => {
  const [managers, setManagers] = useState([]);
  const [arenas, setArenas] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditCredentials, setShowEditCredentials] = useState(null);
  const [editingManager, setEditingManager] = useState(null);
  const [selectedArenaForPermissions, setSelectedArenaForPermissions] = useState("");

  // Form for adding/editing manager
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone_number: "",
    arena_permissions: [] // Array of { arena_id, arena_name, permissions }
  });

  const [credentialsForm, setCredentialsForm] = useState({
    name: "",
    email: "",
    phone_number: "",
    password: "",
    confirm_password: ""
  });

  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);

  // Available permissions
  const availablePermissions = [
    {
      id: "view_financials",
      name: "View Financials",
      description: "Can view revenue, commissions, and financial reports",
    },
    {
      id: "manage_bookings",
      name: "Manage Bookings",
      description: "Can view, accept, reject, and complete all bookings",
    },
    {
      id: "manage_calendar",
      name: "Manage Calendar",
      description: "Can view and block/unblock time slots",
    },
    {
      id: "manage_arena",
      name: "Manage Arena Settings",
      description: "Can edit arena details, courts, and upload photos",
    },
  ];

  useEffect(() => {
    fetchManagers();
    fetchArenas();
  }, []);

  const fetchManagers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/owners/managers",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      console.log("📥 Received managers data:", data);

      if (response.ok) {
        setManagers(data);
      }
    } catch (error) {
      console.error("Error fetching managers:", error);
    }
  };

  const fetchArenas = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/owners/arenas",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setArenas(data);
      }
    } catch (error) {
      console.error("Error fetching arenas:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleCredentialsInputChange = (e) => {
    const { name, value } = e.target;
    setCredentialsForm({
      ...credentialsForm,
      [name]: value,
    });
  };

  // Add arena to manager's permissions
  const handleAddArena = () => {
    if (!selectedArenaForPermissions) return;

    const arena = arenas.find(a => a.arena_id === parseInt(selectedArenaForPermissions));
    if (!arena) return;

    // Check if arena already added
    const exists = formData.arena_permissions.some(
      ap => ap.arena_id === arena.arena_id
    );

    if (!exists) {
      setFormData({
        ...formData,
        arena_permissions: [
          ...formData.arena_permissions,
          {
            arena_id: arena.arena_id,
            arena_name: arena.name,
            permissions: {}
          }
        ]
      });
    }
    setSelectedArenaForPermissions("");
  };

  // Remove arena from manager
  const handleRemoveArena = (arenaId) => {
    setFormData({
      ...formData,
      arena_permissions: formData.arena_permissions.filter(
        ap => ap.arena_id !== arenaId
      )
    });
  };

  // Update permissions for a specific arena
  const handlePermissionChange = (arenaId, permissionId, checked) => {
    setFormData({
      ...formData,
      arena_permissions: formData.arena_permissions.map(ap => {
        if (ap.arena_id === arenaId) {
          return {
            ...ap,
            permissions: {
              ...ap.permissions,
              [permissionId]: checked
            }
          };
        }
        return ap;
      })
    });
  };

  // Select all permissions for an arena
  const handleSelectAllForArena = (arenaId, checked) => {
    const allPermissions = {};
    availablePermissions.forEach(perm => {
      allPermissions[perm.id] = checked;
    });

    setFormData({
      ...formData,
      arena_permissions: formData.arena_permissions.map(ap => {
        if (ap.arena_id === arenaId) {
          return {
            ...ap,
            permissions: allPermissions
          };
        }
        return ap;
      })
    });
  };

  const handleAddManager = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      // 🔍 DEBUG: Log what we're sending
      console.log("📤 Sending manager data:", {
        name: formData.name,
        email: formData.email,
        phone_number: formData.phone_number,
        arena_permissions: formData.arena_permissions
      });

      const response = await fetch(
        "http://localhost:5000/api/owners/managers",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phone_number: formData.phone_number,
            arena_permissions: formData.arena_permissions
          }),
        }
      );

      const data = await response.json();
      console.log("📥 Response from server:", data);

      if (response.ok) {
        alert("Manager added successfully");
        resetForm();
        fetchManagers(); // This will refresh the list
        setShowAddForm(false);
      } else {
        alert(data.message || "Failed to add manager");
      }
    } catch (error) {
      console.error("❌ Error adding manager:", error);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleEditManager = (manager) => {
    setFormData({
      name: manager.name,
      email: manager.email,
      phone_number: manager.phone_number || "",
      password: "",
      arena_permissions: manager.arena_permissions || []
    });
    setEditingManager(manager);
    setShowAddForm(true);
  };

  const handleUpdateManager = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/owners/managers/${editingManager.manager_id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            arena_permissions: formData.arena_permissions
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("Manager permissions updated successfully");
        resetForm();
        fetchManagers();
        setEditingManager(null);
        setShowAddForm(false);
      } else {
        alert(data.message || "Failed to update manager");
      }
    } catch (error) {
      console.error("Error updating manager:", error);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCredentials = (manager) => {
    setShowEditCredentials(manager);
    setCredentialsForm({
      name: manager.name || "",
      email: manager.email || "",
      phone_number: manager.phone_number || "",
      password: "",
      confirm_password: ""
    });
  };

  const handleSaveCredentials = async () => {
    if (!showEditCredentials) return;

    if (credentialsForm.password && credentialsForm.password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    if (credentialsForm.password && credentialsForm.password !== credentialsForm.confirm_password) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      const updateData = {
        name: credentialsForm.name,
        email: credentialsForm.email,
        phone_number: credentialsForm.phone_number
      };

      if (credentialsForm.password) {
        updateData.password = credentialsForm.password;
      }

      const response = await fetch(
        `http://localhost:5000/api/owners/managers/${showEditCredentials.manager_id}/credentials`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("✅ Manager credentials updated successfully");
        setShowEditCredentials(null);
        fetchManagers();
      } else {
        alert(data.message || "Failed to update manager");
      }
    } catch (error) {
      console.error("Error updating manager credentials:", error);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteManager = async (managerId, managerName) => {
    if (!window.confirm(
      `⚠️ ARE YOU SURE?\n\nYou are about to permanently delete manager "${managerName}".\n\n` +
      `This action cannot be undone.`
    )) {
      return;
    }

    setDeleteLoading(managerId);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/owners/managers/${managerId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Manager "${managerName}" has been permanently deleted.`);
        fetchManagers();
      } else {
        alert(data.message || "Failed to delete manager. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting manager:", error);
      alert("An error occurred while deleting. Please check your connection and try again.");
    } finally {
      setDeleteLoading(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      phone_number: "",
      arena_permissions: []
    });
    setSelectedArenaForPermissions("");
  };

  const getPermissionCountForManager = (manager) => {
    if (!manager.arena_permissions) return 0;

    // Count total permissions across all arenas
    return manager.arena_permissions.reduce((total, ap) => {
      const permCount = Object.values(ap.permissions || {}).filter(Boolean).length;
      return total + permCount;
    }, 0);
  };

  const getArenasList = (manager) => {
    if (!manager.arena_permissions || manager.arena_permissions.length === 0) {
      return "None";
    }
    return manager.arena_permissions.map(ap => ap.arena_name).join(', ');
  };

  return (
    <div>
      <div className="flex flex-col space-y-3 md:flex-row md:justify-between md:items-center md:space-y-0 mb-4 md:mb-6">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
          Manager Management
        </h1>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(true);
            setEditingManager(null);
          }}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 md:px-4 md:text-base"
        >
          + Add Manager
        </button>
      </div>

      {/* Add/Edit Manager Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto z-50 p-3">
          <div className="relative top-4 mx-auto p-4 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2 border-b">
              <h2 className="text-base font-medium text-gray-900 md:text-lg">
                {editingManager
                  ? "Edit Manager Permissions"
                  : "Add New Manager"}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingManager(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-500 text-lg"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={editingManager ? handleUpdateManager : handleAddManager}
            >
              <div className="space-y-6">
                {/* Manager Details Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">
                    Manager Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!editingManager && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name *
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                            placeholder="Manager name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email *
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                            placeholder="manager@arena.com"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password *
                          </label>
                          <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required={!editingManager}
                            minLength="6"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                            placeholder="Minimum 6 characters"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            name="phone_number"
                            value={formData.phone_number}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                            placeholder="+1234567890"
                          />
                        </div>
                      </>
                    )}

                    {editingManager && (
                      <div className="col-span-2 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Editing permissions for:{" "}
                          <span className="font-medium">
                            {editingManager.name}
                          </span>
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Email: {editingManager.email}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Arena Permissions Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">
                    Arena Permissions
                  </h3>

                  {/* Add Arena Dropdown */}
                  <div className="flex items-center space-x-2 mb-4">
                    <select
                      value={selectedArenaForPermissions}
                      onChange={(e) => setSelectedArenaForPermissions(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md"
                    >
                      <option value="">Select an arena to add</option>
                      {arenas
                        .filter(arena =>
                          !formData.arena_permissions.some(ap => ap.arena_id === arena.arena_id)
                        )
                        .map(arena => (
                          <option key={arena.arena_id} value={arena.arena_id}>
                            {arena.name}
                          </option>
                        ))
                      }
                    </select>
                    <button
                      type="button"
                      onClick={handleAddArena}
                      disabled={!selectedArenaForPermissions}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-green-300"
                    >
                      Add Arena
                    </button>
                  </div>

                  {/* Arena Permissions List */}
                  {formData.arena_permissions.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
                      <p className="text-sm text-gray-500">
                        No arenas assigned yet. Add an arena above to set permissions.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {formData.arena_permissions.map((ap) => (
                        <div key={ap.arena_id} className="bg-white rounded-lg border border-gray-200 p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-medium text-gray-900">
                              {ap.arena_name}
                            </h4>
                            <button
                              type="button"
                              onClick={() => handleRemoveArena(ap.arena_id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-medium text-gray-500">
                              Permissions for this arena
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSelectAllForArena(ap.arena_id, true)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Select All
                            </button>
                          </div>

                          <div className="space-y-2">
                            {availablePermissions.map((permission) => (
                              <div key={permission.id} className="flex items-start">
                                <div className="flex items-center h-5">
                                  <input
                                    id={`${ap.arena_id}_${permission.id}`}
                                    type="checkbox"
                                    checked={!!ap.permissions[permission.id]}
                                    onChange={(e) =>
                                      handlePermissionChange(ap.arena_id, permission.id, e.target.checked)
                                    }
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                </div>
                                <div className="ml-3 text-sm">
                                  <label
                                    htmlFor={`${ap.arena_id}_${permission.id}`}
                                    className="font-medium text-gray-700"
                                  >
                                    {permission.name}
                                  </label>
                                  <p className="text-xs text-gray-500">
                                    {permission.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex flex-col space-y-3 md:flex-row md:justify-end md:space-x-3 md:space-y-0 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingManager(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || formData.arena_permissions.length === 0}
                    className={`px-4 py-2 text-sm rounded-md text-white ${loading || formData.arena_permissions.length === 0
                      ? "bg-blue-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                      }`}
                  >
                    {loading ? (
                      <>
                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                        {editingManager ? "Updating..." : "Adding..."}
                      </>
                    ) : editingManager ? (
                      "Update Permissions"
                    ) : (
                      "Add Manager"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Credentials Modal */}
      {showEditCredentials && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto z-50 p-3">
          <div className="relative top-20 mx-auto p-4 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Edit Manager Credentials
              </h2>
              <button
                onClick={() => setShowEditCredentials(null)}
                className="text-gray-400 hover:text-gray-500 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={credentialsForm.name}
                  onChange={handleCredentialsInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={credentialsForm.email}
                  onChange={handleCredentialsInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={credentialsForm.phone_number}
                  onChange={handleCredentialsInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="+1234567890"
                />
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Change Password (leave blank to keep current)
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={credentialsForm.password}
                      onChange={handleCredentialsInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Minimum 6 characters"
                      minLength="6"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirm_password"
                      value={credentialsForm.confirm_password}
                      onChange={handleCredentialsInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowEditCredentials(null)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCredentials}
                  disabled={loading}
                  className={`px-4 py-2 text-sm rounded-md text-white ${loading
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Managers List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {managers.length === 0 ? (
          <div className="p-6 text-center md:p-8">
            <p className="text-sm text-gray-600 md:text-base">
              No managers added yet.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 md:text-base"
            >
              Add your first manager
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned Arenas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Permissions
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {managers.map((manager) => (
                    <tr key={manager.manager_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {manager.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {manager.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {manager.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {manager.phone_number || "Not provided"}
                        </div>
                        <div className="text-sm text-gray-500">
                          Added:{" "}
                          {new Date(manager.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {manager.arena_permissions?.length || 0} arena(s)
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate max-w-xs" title={getArenasList(manager)}>
                          {getArenasList(manager)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {getPermissionCountForManager(manager)} total
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Across {manager.arena_permissions?.length || 0} arenas
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${manager.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                            }`}
                        >
                          {manager.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-2">
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleEditManager(manager)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Permissions
                            </button>
                            <button
                              onClick={() => handleEditCredentials(manager)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Edit Details
                            </button>
                            <button
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    `Are you sure you want to ${manager.is_active
                                      ? "deactivate"
                                      : "activate"
                                    } this manager?`
                                  )
                                ) {
                                  try {
                                    const token = localStorage.getItem("token");
                                    const response = await fetch(
                                      `http://localhost:5000/api/owners/managers/${manager.manager_id}`,
                                      {
                                        method: "PUT",
                                        headers: {
                                          Authorization: `Bearer ${token}`,
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          is_active: !manager.is_active,
                                        }),
                                      }
                                    );

                                    if (response.ok) {
                                      alert(
                                        `Manager ${manager.is_active
                                          ? "deactivated"
                                          : "activated"
                                        } successfully`
                                      );
                                      fetchManagers();
                                    }
                                  } catch (error) {
                                    console.error(
                                      "Error updating manager:",
                                      error
                                    );
                                  }
                                }
                              }}
                              className={
                                manager.is_active
                                  ? "text-yellow-600 hover:text-yellow-900"
                                  : "text-green-600 hover:text-green-900"
                              }
                            >
                              {manager.is_active ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                          <button
                            onClick={() => handleDeleteManager(manager.manager_id, manager.name)}
                            disabled={deleteLoading === manager.manager_id}
                            className="text-red-600 hover:text-red-900 text-left flex items-center"
                          >
                            {deleteLoading === manager.manager_id ? (
                              <>
                                <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></span>
                                Deleting...
                              </>
                            ) : (
                              "Delete Permanently"
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 p-3">
              {managers.map((manager) => (
                <div
                  key={manager.manager_id}
                  className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {manager.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">
                          {manager.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {manager.email}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                        ${manager.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                        }`}
                    >
                      {manager.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone:</span>
                      <span className="font-medium">
                        {manager.phone_number || "Not provided"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Added:</span>
                      <span className="font-medium">
                        {new Date(manager.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Arenas:</span>
                      <span className="font-medium">
                        {manager.arena_permissions?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Permissions:</span>
                      <span className="font-medium">
                        {getPermissionCountForManager(manager)}
                      </span>
                    </div>
                    {manager.arena_permissions && manager.arena_permissions.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="text-xs font-medium text-gray-500">Assigned Arenas:</span>
                        <div className="mt-1 space-y-1">
                          {manager.arena_permissions.map((ap, idx) => (
                            <div key={idx} className="text-xs bg-gray-50 p-1 rounded">
                              <span className="font-medium">{ap.arena_name}</span>
                              <span className="ml-2 text-gray-500">
                                ({Object.values(ap.permissions || {}).filter(Boolean).length} perms)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t">
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => handleEditManager(manager)}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200 text-center"
                      >
                        Edit Permissions
                      </button>
                      <button
                        onClick={() => handleEditCredentials(manager)}
                        className="px-3 py-1.5 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200 text-center"
                      >
                        Edit Details
                      </button>
                      <button
                        onClick={async () => {
                          if (
                            window.confirm(
                              `Are you sure you want to ${manager.is_active ? "deactivate" : "activate"
                              } this manager?`
                            )
                          ) {
                            try {
                              const token = localStorage.getItem("token");
                              const response = await fetch(
                                `http://localhost:5000/api/owners/managers/${manager.manager_id}`,
                                {
                                  method: "PUT",
                                  headers: {
                                    Authorization: `Bearer ${token}`,
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    is_active: !manager.is_active,
                                  }),
                                }
                              );

                              if (response.ok) {
                                alert(
                                  `Manager ${manager.is_active
                                    ? "deactivated"
                                    : "activated"
                                  } successfully`
                                );
                                fetchManagers();
                              }
                            } catch (error) {
                              console.error("Error updating manager:", error);
                            }
                          }
                        }}
                        className={`px-3 py-1.5 text-sm rounded text-center ${manager.is_active
                          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                      >
                        {manager.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDeleteManager(manager.manager_id, manager.name)}
                        disabled={deleteLoading === manager.manager_id}
                        className={`px-3 py-1.5 text-sm rounded text-center ${deleteLoading === manager.manager_id
                          ? "bg-red-100 text-red-400 cursor-not-allowed"
                          : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                      >
                        {deleteLoading === manager.manager_id ? (
                          <>
                            <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-red-700 mr-1"></span>
                            Deleting...
                          </>
                        ) : (
                          "Delete Permanently"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Information Box */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg md:mt-6 md:p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          About Manager Management
        </h3>
        <ul className="text-xs text-blue-700 space-y-1 md:text-sm">
          <li>• Managers can be assigned to multiple arenas</li>
          <li>• Each arena can have different permissions for the same manager</li>
          <li>• Financial data access is controlled per arena</li>
          <li>• <span className="font-semibold">Deactivate:</span> Temporarily prevents login</li>
          <li>• <span className="font-semibold">Edit Details:</span> Update manager's name, email, phone, and password</li>
          <li>• <span className="font-semibold text-red-700">Delete Permanently:</span> Completely removes manager from system</li>
        </ul>
      </div>
    </div>
  );
};

export default OwnerManagers;