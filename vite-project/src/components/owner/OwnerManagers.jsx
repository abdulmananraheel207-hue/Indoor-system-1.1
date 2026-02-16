// File: OwnerManagers.jsx - COMPLETE WORKING VERSION

import React, { useState, useEffect } from "react";

const OwnerManagers = () => {
  const [managers, setManagers] = useState([]);
  const [arenas, setArenas] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditCredentials, setShowEditCredentials] = useState(null);
  const [editingManager, setEditingManager] = useState(null);
  const [selectedArenaForPermissions, setSelectedArenaForPermissions] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [formErrors, setFormErrors] = useState({});

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

  // Available permissions
  const availablePermissions = [
    {
      id: "view_financials",
      name: "View Financials",
      description: "Can view revenue, commissions, and financial reports",
      icon: "💰"
    },
    {
      id: "manage_bookings",
      name: "Manage Bookings",
      description: "Can view, accept, reject, and complete all bookings",
      icon: "📅"
    },
    {
      id: "manage_calendar",
      name: "Manage Calendar",
      description: "Can view and block/unblock time slots",
      icon: "🗓️"
    },
    {
      id: "manage_arena",
      name: "Manage Arena Settings",
      description: "Can edit arena details, courts, and upload photos",
      icon: "⚙️"
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
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
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
            permissions: {
              view_financials: false,
              manage_bookings: false,
              manage_calendar: false,
              manage_arena: false
            }
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

  // Validate form before submission
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid";
    }

    if (!editingManager && !formData.password) {
      errors.password = "Password is required";
    } else if (!editingManager && formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (formData.arena_permissions.length === 0) {
      errors.arena = "At least one arena must be assigned";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddManager = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

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
        alert("✅ Manager added successfully");
        resetForm();
        fetchManagers();
        setShowAddForm(false);
      } else {
        alert(data.message || "Failed to add manager");
      }
    } catch (error) {
      console.error("❌ Error adding manager:", error);
      alert("An error occurred while adding manager");
    } finally {
      setLoading(false);
    }
  };

  const handleEditManager = (manager) => {
    setFormData({
      name: manager.name,
      email: manager.email,
      password: "",
      phone_number: manager.phone_number || "",
      arena_permissions: manager.arena_permissions || []
    });
    setEditingManager(manager);
    setShowAddForm(true);
  };

  const handleUpdateManager = async (e) => {
    e.preventDefault();

    if (formData.arena_permissions.length === 0) {
      alert("At least one arena must be assigned");
      return;
    }

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
        alert("✅ Manager permissions updated successfully");
        resetForm();
        fetchManagers();
        setEditingManager(null);
        setShowAddForm(false);
      } else {
        alert(data.message || "Failed to update manager");
      }
    } catch (error) {
      console.error("Error updating manager:", error);
      alert("An error occurred while updating manager");
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

    // Validate
    if (!credentialsForm.name.trim()) {
      alert("Name is required");
      return;
    }

    if (!credentialsForm.email.trim()) {
      alert("Email is required");
      return;
    }

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
      alert("An error occurred while updating credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteManager = async (managerId, managerName) => {
    if (!window.confirm(
      `⚠️ DELETE MANAGER?\n\nYou are about to permanently delete "${managerName}".\n\nThis action cannot be undone.`
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
        alert(`✅ Manager "${managerName}" has been deleted.`);
        fetchManagers();
      } else {
        alert(data.message || "Failed to delete manager");
      }
    } catch (error) {
      console.error("Error deleting manager:", error);
      alert("An error occurred while deleting");
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
    setFormErrors({});
  };

  const getPermissionCountForManager = (manager) => {
    if (!manager.arena_permissions) return 0;
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
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col space-y-3 md:flex-row md:justify-between md:items-center md:space-y-0 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
            Manager Management
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Add and manage staff members with arena-specific permissions
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(true);
            setEditingManager(null);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Manager
        </button>
      </div>

      {/* Add/Edit Manager Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingManager ? "Edit Manager Permissions" : "Add New Manager"}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingManager(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              <form onSubmit={editingManager ? handleUpdateManager : handleAddManager}>
                <div className="space-y-6">
                  {/* Manager Details Section */}
                  <div className="bg-gray-50 p-5 rounded-xl">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Manager Details
                    </h3>

                    {!editingManager ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            placeholder="John Doe"
                          />
                          {formErrors.name && (
                            <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            placeholder="manager@arena.com"
                          />
                          {formErrors.email && (
                            <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 border ${formErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            placeholder="Minimum 6 characters"
                          />
                          {formErrors.password && (
                            <p className="mt-1 text-xs text-red-500">{formErrors.password}</p>
                          )}
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="+92 300 1234567"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Editing permissions for:</span> {editingManager.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Email:</span> {editingManager.email}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Arena Permissions Section */}
                  <div className="bg-gray-50 p-5 rounded-xl">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Arena Permissions
                    </h3>

                    {/* Add Arena Dropdown */}
                    <div className="flex items-center space-x-2 mb-4">
                      <select
                        value={selectedArenaForPermissions}
                        onChange={(e) => setSelectedArenaForPermissions(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select an arena to assign</option>
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
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed"
                      >
                        Add Arena
                      </button>
                    </div>

                    {formErrors.arena && (
                      <p className="mb-3 text-xs text-red-500">{formErrors.arena}</p>
                    )}

                    {/* Arena Permissions List */}
                    {formData.arena_permissions.length === 0 ? (
                      <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="text-sm text-gray-500">
                          No arenas assigned yet. Add an arena above to set permissions.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                        {formData.arena_permissions.map((ap) => (
                          <div key={ap.arena_id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            {/* Arena Header */}
                            <div className="px-4 py-3 bg-gray-100 border-b flex justify-between items-center">
                              <h4 className="font-medium text-gray-900">
                                {ap.arena_name}
                              </h4>
                              <button
                                type="button"
                                onClick={() => handleRemoveArena(ap.arena_id)}
                                className="text-red-600 hover:text-red-800 text-sm flex items-center"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Remove
                              </button>
                            </div>

                            {/* Permissions */}
                            <div className="p-4">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-medium text-gray-500">
                                  Select permissions for this arena
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleSelectAllForArena(ap.arena_id, true)}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  Select All
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {availablePermissions.map((permission) => (
                                  <label
                                    key={permission.id}
                                    className={`flex items-start p-3 border rounded-lg cursor-pointer transition ${ap.permissions[permission.id]
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-gray-200 hover:bg-gray-50'
                                      }`}
                                  >
                                    <div className="flex items-center h-5">
                                      <input
                                        type="checkbox"
                                        checked={!!ap.permissions[permission.id]}
                                        onChange={(e) =>
                                          handlePermissionChange(ap.arena_id, permission.id, e.target.checked)
                                        }
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      />
                                    </div>
                                    <div className="ml-3">
                                      <div className="flex items-center">
                                        <span className="mr-1">{permission.icon}</span>
                                        <span className="text-sm font-medium text-gray-700">
                                          {permission.name}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1">
                                        {permission.description}
                                      </p>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingManager(null);
                        resetForm();
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || formData.arena_permissions.length === 0}
                      className={`px-6 py-2 rounded-lg text-white flex items-center ${loading || formData.arena_permissions.length === 0
                        ? 'bg-blue-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                      {loading && (
                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                      )}
                      {editingManager ? "Update Permissions" : "Add Manager"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Credentials Modal */}
      {showEditCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Edit Manager Details
              </h2>
              <button
                onClick={() => setShowEditCredentials(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={credentialsForm.name}
                  onChange={handleCredentialsInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+92 300 1234567"
                />
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-gray-700 mb-3">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Minimum 6 characters"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowEditCredentials(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCredentials}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-white flex items-center ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                  {loading && (
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Managers List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {managers.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Managers Yet</h3>
            <p className="text-gray-500 mb-4">Add your first manager to help manage your arenas</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Your First Manager
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
                      Permissions
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
                          <div className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold">
                            {manager.name.charAt(0).toUpperCase()}
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
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {manager.phone_number || "—"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Added: {new Date(manager.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {manager.arena_permissions?.length || 0} arena(s)
                        </div>
                        <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={getArenasList(manager)}>
                          {getArenasList(manager)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {getPermissionCountForManager(manager)} total
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {manager.arena_permissions?.map((ap, idx) => {
                            const count = Object.values(ap.permissions || {}).filter(Boolean).length;
                            return count > 0 ? (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                title={ap.arena_name}
                              >
                                {ap.arena_name.substring(0, 3)}: {count}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3">
                        <div className="flex flex-col space-y-2">
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleEditManager(manager)}
                              className="text-blue-600 hover:text-blue-900 text-sm flex items-center"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              Permissions
                            </button>
                            <button
                              onClick={() => handleEditCredentials(manager)}
                              className="text-green-600 hover:text-green-900 text-sm flex items-center"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                              Edit
                            </button>
                          </div>
                          <div className="flex space-x-3">
                            <button
                              onClick={async () => {
                                if (window.confirm(
                                  `Are you sure you want to ${manager.is_active ? "deactivate" : "activate"} this manager?`
                                )) {
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
                                      alert(`Manager ${manager.is_active ? "deactivated" : "activated"} successfully`);
                                      fetchManagers();
                                    }
                                  } catch (error) {
                                    console.error("Error updating manager:", error);
                                  }
                                }
                              }}
                              className={manager.is_active
                                ? "text-yellow-600 hover:text-yellow-900 text-sm flex items-center"
                                : "text-green-600 hover:text-green-900 text-sm flex items-center"
                              }
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              {manager.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => handleDeleteManager(manager.manager_id, manager.name)}
                              disabled={deleteLoading === manager.manager_id}
                              className="text-red-600 hover:text-red-900 text-sm flex items-center"
                            >
                              {deleteLoading === manager.manager_id ? (
                                <>
                                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-1"></span>
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </>
                              )}
                            </button>
                          </div>
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
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className="h-12 w-12 flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-lg">
                        {manager.name.charAt(0).toUpperCase()}
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
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${manager.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                        }`}
                    >
                      {manager.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm mb-4 bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone:</span>
                      <span className="font-medium">
                        {manager.phone_number || "—"}
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
                  </div>

                  {/* Arena List */}
                  {manager.arena_permissions && manager.arena_permissions.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 mb-2">Assigned Arenas:</p>
                      <div className="space-y-2">
                        {manager.arena_permissions.map((ap, idx) => {
                          const perms = Object.entries(ap.permissions || {})
                            .filter(([_, value]) => value)
                            .map(([key]) => key.replace('_', ' '));

                          return (
                            <div key={idx} className="bg-gray-50 p-2 rounded-lg">
                              <div className="font-medium text-sm text-gray-900">{ap.arena_name}</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {perms.length > 0 ? (
                                  perms.map((perm, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                                      {perm}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-gray-400">No permissions</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleEditManager(manager)}
                      className="px-3 py-2 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Permissions
                    </button>
                    <button
                      onClick={() => handleEditCredentials(manager)}
                      className="px-3 py-2 bg-green-100 text-green-700 text-sm rounded-lg hover:bg-green-200 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm(`Are you sure you want to ${manager.is_active ? "deactivate" : "activate"} this manager?`)) {
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
                              alert(`Manager ${manager.is_active ? "deactivated" : "activated"} successfully`);
                              fetchManagers();
                            }
                          } catch (error) {
                            console.error("Error updating manager:", error);
                          }
                        }
                      }}
                      className={`px-3 py-2 text-sm rounded-lg flex items-center justify-center
                        ${manager.is_active
                          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {manager.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDeleteManager(manager.manager_id, manager.name)}
                      disabled={deleteLoading === manager.manager_id}
                      className="px-3 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 flex items-center justify-center disabled:opacity-50"
                    >
                      {deleteLoading === manager.manager_id ? (
                        <>
                          <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-red-700 mr-1"></span>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Information Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              About Manager Management
            </h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• <span className="font-medium">Multiple Arenas:</span> Assign one manager to handle multiple arenas</li>
              <li>• <span className="font-medium">Arena-Specific Permissions:</span> Set different permissions for each arena</li>
              <li>• <span className="font-medium">View Financials:</span> Can see revenue and commission data</li>
              <li>• <span className="font-medium">Manage Bookings:</span> Can accept/reject/complete bookings</li>
              <li>• <span className="font-medium">Manage Calendar:</span> Can block/unblock time slots</li>
              <li>• <span className="font-medium">Manage Arena Settings:</span> Can update court details and upload photos</li>
              <li>• <span className="font-medium">Deactivate:</span> Temporarily prevent login without deleting</li>
              <li>• <span className="font-medium">Delete:</span> Permanently remove manager from system</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerManagers;