import React, { useState, useEffect } from "react";

const OwnerManagers = () => {
  const [managers, setManagers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingManager, setEditingManager] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone_number: "",
    permissions: {},
  });
  const [loading, setLoading] = useState(false);

  // Define all available permissions based on owner portal features
  const availablePermissions = [
    {
      id: "view_dashboard",
      name: "View Dashboard",
      description: "Can view dashboard statistics",
    },
    {
      id: "view_bookings",
      name: "View Bookings",
      description: "Can view all bookings",
    },
    {
      id: "manage_bookings",
      name: "Manage Bookings",
      description: "Can accept/reject bookings",
    },
    {
      id: "view_calendar",
      name: "View Calendar",
      description: "Can view calendar and time slots",
    },
    {
      id: "manage_calendar",
      name: "Manage Calendar",
      description: "Can block/unblock time slots",
    },
    {
      id: "view_reports",
      name: "View Reports",
      description: "Can view financial reports",
    },
    {
      id: "view_managers",
      name: "View Managers",
      description: "Can view other managers (read-only)",
    },
    {
      id: "manage_arena",
      name: "Manage Arena",
      description: "Can edit arena details",
    },
    {
      id: "view_financial",
      name: "View Financial",
      description: "Can view revenue and commission data",
    },
  ];

  useEffect(() => {
    fetchManagers();
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
      if (response.ok) {
        setManagers(data);
      }
    } catch (error) {
      console.error("Error fetching managers:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData({
        ...formData,
        permissions: {
          ...formData.permissions,
          [name]: checked,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSelectAllPermissions = (checked) => {
    const allPermissions = {};
    availablePermissions.forEach((perm) => {
      allPermissions[perm.id] = checked;
    });
    setFormData({
      ...formData,
      permissions: allPermissions,
    });
  };

  const handleAddManager = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/owners/managers",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("Manager added successfully");
        resetForm();
        fetchManagers();
        setShowAddForm(false);
      } else {
        alert(data.message || "Failed to add manager");
      }
    } catch (error) {
      console.error("Error adding manager:", error);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
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
            permissions: formData.permissions,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("Manager permissions updated successfully");
        resetForm();
        fetchManagers();
        setEditingManager(null);
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

  const handleEditManager = (manager) => {
    // Parse permissions if they're stored as JSON string
    const permissions =
      typeof manager.permissions === "string"
        ? JSON.parse(manager.permissions)
        : manager.permissions || {};

    setFormData({
      name: manager.name,
      email: manager.email,
      phone_number: manager.phone_number,
      permissions: permissions,
    });
    setEditingManager(manager);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      phone_number: "",
      permissions: {},
    });
  };

  const getPermissionCount = (manager) => {
    const perms =
      typeof manager.permissions === "string"
        ? JSON.parse(manager.permissions)
        : manager.permissions || {};
    return Object.values(perms).filter(Boolean).length;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manager Management</h1>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(true);
            setEditingManager(null);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Manager
        </button>
      </div>

      {/* Add/Edit Manager Form */}
      {(showAddForm || editingManager) && (
        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              {editingManager ? "Edit Manager Permissions" : "Add New Manager"}
            </h2>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingManager(null);
                resetForm();
              }}
              className="text-gray-400 hover:text-gray-500"
            >
              ✕
            </button>
          </div>

          <form
            onSubmit={editingManager ? handleUpdateManager : handleAddManager}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Manager Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">
                  Manager Details
                </h3>

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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="+1234567890"
                      />
                    </div>
                  </>
                )}

                {editingManager && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Editing permissions for:{" "}
                      <span className="font-medium">{editingManager.name}</span>
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Email: {editingManager.email}
                    </p>
                  </div>
                )}
              </div>

              {/* Permissions */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-medium text-gray-900">
                    Permissions
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleSelectAllPermissions(true)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Select All
                  </button>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto p-2">
                  {availablePermissions.map((permission) => (
                    <div key={permission.id} className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id={permission.id}
                          name={permission.id}
                          type="checkbox"
                          checked={!!formData.permissions[permission.id]}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label
                          htmlFor={permission.id}
                          className="font-medium text-gray-700"
                        >
                          {permission.name}
                        </label>
                        <p className="text-gray-500">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Selected{" "}
                    {Object.values(formData.permissions).filter(Boolean).length}{" "}
                    of {availablePermissions.length} permissions
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingManager(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 rounded-md text-white ${
                  loading
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
          </form>
        </div>
      )}

      {/* Managers List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {managers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No managers added yet.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Add your first manager
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {managers.map((manager) => (
                  <tr key={manager.manager_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {manager.phone_number || "Not provided"}
                      </div>
                      <div className="text-sm text-gray-500">
                        Added:{" "}
                        {new Date(manager.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {getPermissionCount(manager)} permissions
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {manager.permissions &&
                        typeof manager.permissions === "string"
                          ? JSON.parse(manager.permissions).view_financial
                            ? "Includes financial access"
                            : "No financial access"
                          : "No permissions set"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${
                                                  manager.is_active
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-red-100 text-red-800"
                                                }`}
                      >
                        {manager.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleEditManager(manager)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit Permissions
                        </button>
                        <button
                          onClick={async () => {
                            if (
                              window.confirm(
                                "Are you sure you want to deactivate this manager?"
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
                                    `Manager ${
                                      manager.is_active
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
                          className={
                            manager.is_active
                              ? "text-red-600 hover:text-red-900"
                              : "text-green-600 hover:text-green-900"
                          }
                        >
                          {manager.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Information Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          About Manager Permissions
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Managers can only access features you explicitly permit</li>
          <li>
            • Financial data access is controlled separately through "View
            Financial" permission
          </li>
          <li>• Managers cannot modify other managers' permissions</li>
          <li>• Deactivated managers cannot login to the system</li>
        </ul>
      </div>
    </div>
  );
};

export default OwnerManagers;
