// File: OwnerArenaSettings.jsx - UPDATED (removed duplicate arena selector)
import React, { useState, useEffect } from "react";
import { ownerAPI } from "../../services/api";

// In OwnerArenaSettings.jsx - Add arena-specific permission checks

const OwnerArenaSettings = ({ dashboardData, isOwner, permissions = {}, selectedArena = null }) => {
  const [arenas, setArenas] = useState([]);
  // 🔥 Use selectedArena from props directly
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState({});
  const [editCourt, setEditCourt] = useState(null);
  const [showAddCourt, setShowAddCourt] = useState(false);
  const [courtForm, setCourtForm] = useState({
    court_name: "",
    size_sqft: "",
    price_per_hour: "",
    description: "",
    sports: [],
  });
  const [newCourtForm, setNewCourtForm] = useState({
    court_name: "",
    size_sqft: "",
    price_per_hour: "",
    description: "",
    sports: [],
  });

  // Get arena-specific permissions from localStorage
  const [arenaPermissions, setArenaPermissions] = useState({});

  useEffect(() => {
    const storedArenaPerms = localStorage.getItem('arenaPermissions');
    if (storedArenaPerms) {
      try {
        setArenaPermissions(JSON.parse(storedArenaPerms));
      } catch (e) {
        console.error("Error parsing arena permissions:", e);
      }
    }
  }, []);

  const hasPermissionForSelectedArena = (permissionName) => {
    if (isOwner) return true;
    if (!selectedArena) return false;

    const arenaKey = `arena_${selectedArena.arena_id}`;
    const arenaPerms = arenaPermissions[arenaKey] || {};
    return arenaPerms[permissionName] || false;
  };

  const canViewArena = isOwner || hasPermissionForSelectedArena('manage_arena');
  const canManageArena = isOwner || hasPermissionForSelectedArena('manage_arena');
  const canUploadPhotos = isOwner || hasPermissionForSelectedArena('manage_arena');


  const availableSports = [
    { id: 1, name: "Badminton", icon: "🏸" },
    { id: 2, name: "Tennis", icon: "🎾" },
    { id: 3, name: "Squash", icon: "🥎" },
    { id: 4, name: "Basketball", icon: "🏀" },
    { id: 5, name: "Volleyball", icon: "🏐" },
    { id: 6, name: "Cricket Nets", icon: "🏏" },
    { id: 7, name: "Football", icon: "⚽" },
    { id: 8, name: "Table Tennis", icon: "🏓" },
  ];

  // Update arenas from dashboardData
  useEffect(() => {
    if (dashboardData?.arenas) {
      setArenas(dashboardData.arenas);
    } else if (dashboardData?.data?.arenas) {
      setArenas(dashboardData.data.arenas);
    }
  }, [dashboardData]);

  // Fetch courts when selected arena changes
  useEffect(() => {
    if (selectedArena?.arena_id && (canViewArena || canManageArena)) {
      fetchCourts();
    }
  }, [selectedArena, canViewArena, canManageArena]);

  const fetchCourts = async () => {
    if (!canViewArena && !canManageArena) return;
    if (!selectedArena) return;

    try {
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole");

      let courtsData = [];

      if (userRole === "owner") {
        const response = await ownerAPI.getCourts(selectedArena.arena_id);
        courtsData = response.data || [];
      } else {
        const response = await fetch(
          `http://localhost:5000/api/managers/courts/${selectedArena.arena_id}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const data = await response.json();
        courtsData = data || [];
      }

      const processedCourts = courtsData.map(court => ({
        ...court,
        sports_names: Array.isArray(court.sports_names)
          ? court.sports_names
          : (court.sports_names ? [court.sports_names] : []),
        sports: Array.isArray(court.sports)
          ? court.sports
          : (court.sports ? [court.sports] : []),
        images: Array.isArray(court.images) ? court.images : []
      }));

      setCourts(processedCourts);
    } catch (error) {
      console.error("Error fetching courts:", error);
      setCourts([]);
    }
  };

  const handleCourtEdit = (court) => {
    if (!canManageArena) {
      alert("❌ You don't have permission to edit court details");
      return;
    }

    setEditCourt(court);
    setCourtForm({
      court_name: court.court_name || "",
      size_sqft: court.size_sqft || "",
      price_per_hour: court.price_per_hour || "",
      description: court.description || "",
      sports: Array.isArray(court.sports) ? court.sports : [],
    });
  };

  const handleCourtUpdate = async () => {
    if (!canManageArena) {
      alert("❌ You don't have permission to update court details");
      return;
    }

    if (!editCourt) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole");

      if (userRole === "owner") {
        await ownerAPI.updateCourt(editCourt.court_id, {
          court_name: courtForm.court_name,
          size_sqft: courtForm.size_sqft,
          price_per_hour: courtForm.price_per_hour,
          description: courtForm.description,
          sports: courtForm.sports,
        });
      } else {
        await fetch(
          `http://localhost:5000/api/managers/courts/${editCourt.court_id}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              court_name: courtForm.court_name,
              size_sqft: courtForm.size_sqft,
              price_per_hour: courtForm.price_per_hour,
              description: courtForm.description,
              sports: courtForm.sports,
            }),
          }
        );
      }

      alert("Court details updated successfully");
      setEditCourt(null);
      fetchCourts();
    } catch (error) {
      console.error("Error updating court:", error);
      alert(error.response?.data?.message || "Failed to update court details");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourt = async () => {
    if (!canManageArena) {
      alert("❌ You don't have permission to add courts");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole");

      if (userRole === "owner") {
        await ownerAPI.addCourt(selectedArena.arena_id, {
          court_name: newCourtForm.court_name,
          size_sqft: newCourtForm.size_sqft,
          price_per_hour: newCourtForm.price_per_hour,
          description: newCourtForm.description,
          sports: newCourtForm.sports,
        });
      } else {
        await fetch(
          `http://localhost:5000/api/managers/arenas/${selectedArena.arena_id}/courts`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              court_name: newCourtForm.court_name,
              size_sqft: newCourtForm.size_sqft,
              price_per_hour: newCourtForm.price_per_hour,
              description: newCourtForm.description,
              sports: newCourtForm.sports,
            }),
          }
        );
      }

      alert("Court added successfully");
      setShowAddCourt(false);
      setNewCourtForm({
        court_name: "",
        size_sqft: "",
        price_per_hour: "",
        description: "",
        sports: [],
      });
      fetchCourts();
    } catch (error) {
      console.error("Error adding court:", error);
      alert(error.response?.data?.message || "Failed to add court");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (courtId) => {
    if (!canUploadPhotos) {
      alert("❌ You don't have permission to upload photos");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole");

      if (!token) {
        alert("❌ No authentication token found. Please login first.");
        return;
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;

      input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const court = courts.find(c => c.court_id === courtId);
        const courtPhotos = getCourtPhotos(court);

        if (courtPhotos.length + files.length > 3) {
          alert(`Maximum 3 photos per court allowed.\nYou have ${courtPhotos.length} photos, trying to add ${files.length} more.`);
          return;
        }

        const formData = new FormData();
        files.forEach((file) => {
          formData.append('court_images', file);
        });

        setUploadingPhotos({ ...uploadingPhotos, [courtId]: true });

        try {
          let endpoint;
          if (userRole === "owner") {
            endpoint = `http://localhost:5000/api/owners/courts/${courtId}/photos`;
          } else {
            endpoint = `http://localhost:5000/api/managers/courts/${courtId}/photos`;
          }

          console.log(`📤 Uploading to endpoint: ${endpoint} as ${userRole}`);

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          });

          const result = await response.json();

          if (response.ok) {
            alert(`✅ Upload successful!\n${result.message}\nPhotos: ${result.count}`);
            setTimeout(() => {
              fetchCourts();
            }, 500);
          } else {
            alert(`❌ Upload failed: ${result.message}`);
          }
        } catch (error) {
          console.error("💥 Upload error:", error);
          alert(`❌ Error: ${error.message}`);
        } finally {
          setUploadingPhotos({ ...uploadingPhotos, [courtId]: false });
        }
      };

      input.click();
    } catch (error) {
      console.error("Error in photo upload:", error);
      alert(`❌ Error: ${error.message}`);
      setUploadingPhotos({ ...uploadingPhotos, [courtId]: false });
    }
  };

  const handleDeletePhoto = async (courtId, photo) => {
    if (!canUploadPhotos) {
      alert("❌ You don't have permission to delete photos");
      return;
    }

    if (!window.confirm("Delete this photo?")) return;

    try {
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole");

      let endpoint;
      if (userRole === "owner") {
        endpoint = `http://localhost:5000/api/owners/courts/${courtId}/photos/${photo.image_id}`;
      } else {
        endpoint = `http://localhost:5000/api/managers/courts/${courtId}/photos/${photo.image_id}`;
      }

      console.log(`🗑️ Deleting photo from: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok) {
        alert("✅ Photo deleted successfully");
        fetchCourts();
      } else {
        alert(`❌ Failed to delete photo: ${result.message}`);
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Failed to delete photo");
    }
  };

  const toggleSport = (sportId, formType = "edit") => {
    if (formType === "edit") {
      const isSelected = courtForm.sports.includes(sportId);
      setCourtForm({
        ...courtForm,
        sports: isSelected
          ? courtForm.sports.filter((id) => id !== sportId)
          : [...courtForm.sports, sportId],
      });
    } else {
      const isSelected = newCourtForm.sports.includes(sportId);
      setNewCourtForm({
        ...newCourtForm,
        sports: isSelected
          ? newCourtForm.sports.filter((id) => id !== sportId)
          : [...newCourtForm.sports, sportId],
      });
    }
  };

  const getCourtPhotos = (court) => {
    const photos = [];

    if (court.images && Array.isArray(court.images) && court.images.length > 0) {
      court.images.forEach((img) => {
        photos.push({
          image_id: img.image_id,
          image_url: img.image_url || img.path,
          cloudinary_id: img.cloudinary_id,
          is_primary: img.is_primary || false,
          path: img.image_url || img.path,
        });
      });
      return photos;
    }

    if (court.primary_image) {
      photos.push({
        path: court.primary_image,
        is_primary: true,
      });
    }

    if (court.additional_images && Array.isArray(court.additional_images)) {
      court.additional_images.forEach((img) => {
        photos.push({
          path: img,
          is_primary: false,
        });
      });
    }

    return photos;
  };

  const renderSportsNames = (sports_names) => {
    if (!sports_names) return null;

    if (Array.isArray(sports_names)) {
      return sports_names.map((sport, index) => (
        <span
          key={index}
          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
        >
          {sport}
        </span>
      ));
    }

    if (typeof sports_names === 'string') {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
          {sports_names}
        </span>
      );
    }

    return null;
  };

  if (!canViewArena && !canManageArena) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center">
        <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have permission to view arena settings.
        </p>
      </div>
    );
  }

  if (!selectedArena) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center">
        <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">No Arena Selected</h3>
        <p className="mt-1 text-sm text-gray-500">
          Please select an arena from the dropdown above to manage court settings.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
            Arena & Court Settings
            {selectedArena && (
              <span className="ml-2 text-sm font-normal text-blue-600">
                • {selectedArena.name}
              </span>
            )}
          </h1>
          {!isOwner && (
            <p className="text-sm text-gray-600 mt-1">
              {canManageArena
                ? "You can manage arena and court settings"
                : "View-only access"}
            </p>
          )}
        </div>
        {canManageArena && (
          <button
            onClick={() => setShowAddCourt(true)}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
          >
            + Add Court
          </button>
        )}
      </div>

      {/* Courts Summary */}
      <div className="bg-white p-4 rounded-xl shadow mb-4 md:p-6 md:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Managing courts for <span className="font-semibold">{selectedArena.name}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {courts.length} court{courts.length !== 1 ? "s" : ""} found
            </p>
          </div>
          <div className="text-sm text-gray-600">
            {selectedArena.address && (
              <span className="text-gray-500 truncate max-w-xs">
                📍 {selectedArena.address.substring(0, 50)}...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Courts List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b bg-gray-50 md:p-6">
          <h2 className="text-lg font-medium text-gray-900">
            Courts Management
          </h2>
          <p className="text-sm text-gray-600">
            {canManageArena
              ? "Edit details and upload photos for each court"
              : "View court details (read-only)"}
          </p>
        </div>

        <div className="p-4 md:p-6">
          {courts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">🏟️</div>
              <p className="text-gray-600">No courts found for this arena.</p>
              {canManageArena && (
                <button
                  onClick={() => setShowAddCourt(true)}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Your First Court
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {courts.map((court) => {
                const courtPhotos = getCourtPhotos(court);

                return (
                  <div
                    key={court.court_id}
                    className="border border-gray-200 rounded-lg p-4 md:p-6 bg-white"
                  >
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">
                          {court.court_name}
                        </h3>
                        <div className="flex flex-wrap gap-3 mt-2">
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded">
                            {court.size_sqft} SQ FT
                          </span>
                          <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded">
                            Rs {court.price_per_hour}/HOUR
                          </span>
                          <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded">
                            Court #{court.court_number}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-3">
                          {court.description || "No description provided."}
                        </p>

                        {court.sports_names && (
                          <div className="mt-3">
                            <span className="text-xs font-bold text-gray-400 uppercase">
                              Sports:{" "}
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {renderSportsNames(court.sports_names)}
                            </div>
                          </div>
                        )}
                      </div>
                      {canManageArena && (
                        <div className="flex gap-2 mt-4 md:mt-0">
                          <button
                            onClick={() => handleCourtEdit(court)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                          >
                            Edit Details
                          </button>
                        </div>
                      )}
                    </div>

                    {/* PHOTO SECTION */}
                    <div className="pt-6 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-tight">
                          Photos ({courtPhotos.length}/3)
                        </h4>

                        {canUploadPhotos && (
                          <button
                            onClick={() => handlePhotoUpload(court.court_id)}
                            disabled={uploadingPhotos[court.court_id] || courtPhotos.length >= 3}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                          >
                            {uploadingPhotos[court.court_id]
                              ? "Uploading..."
                              : courtPhotos.length >= 3
                                ? "Max 3 Photos"
                                : "Upload Photos"}
                          </button>
                        )}
                      </div>

                      {/* PHOTO GALLERY */}
                      {courtPhotos.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {courtPhotos.map((photo, index) => (
                            <div key={photo.image_id || index} className="relative group">
                              <img
                                src={photo.image_url || photo.path}
                                alt={`Court ${court.court_name} - ${index + 1}`}
                                className="w-full h-40 object-cover rounded-lg shadow-sm border border-gray-200"
                                onError={(e) => {
                                  e.target.src = "https://via.placeholder.com/300x200?text=Image+Error";
                                }}
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                {photo.is_primary && (
                                  <span className="absolute top-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">
                                    Primary
                                  </span>
                                )}

                                {photo.uploaded_by_manager_id && (
                                  <span className="absolute top-2 right-2 px-2 py-1 bg-purple-600 text-white text-xs rounded">
                                    Manager Upload
                                  </span>
                                )}

                                {canUploadPhotos && (
                                  <button
                                    onClick={() => handleDeletePhoto(court.court_id, photo)}
                                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                          <div className="text-gray-400 text-4xl mb-3">📷</div>
                          <p className="text-gray-600 font-medium mb-2">
                            No photos uploaded yet
                          </p>
                          <p className="text-sm text-gray-500 mb-4">
                            Maximum 3 photos per court
                          </p>
                          {canUploadPhotos && (
                            <button
                              onClick={() => handlePhotoUpload(court.court_id)}
                              className="px-4 py-2 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200"
                            >
                              Click to Upload Photos
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Court Modal */}
      {canManageArena && editCourt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">
                Update Court Details
              </h3>
              <button
                onClick={() => setEditCourt(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Court Name
                  </label>
                  <input
                    type="text"
                    value={courtForm.court_name}
                    onChange={(e) =>
                      setCourtForm({ ...courtForm, court_name: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Size (SQ FT)
                  </label>
                  <input
                    type="number"
                    value={courtForm.size_sqft}
                    onChange={(e) =>
                      setCourtForm({
                        ...courtForm,
                        size_sqft: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Price (Rs/Hour)
                  </label>
                  <input
                    type="number"
                    value={courtForm.price_per_hour}
                    onChange={(e) =>
                      setCourtForm({
                        ...courtForm,
                        price_per_hour: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Description
                </label>
                <textarea
                  value={courtForm.description}
                  onChange={(e) =>
                    setCourtForm({ ...courtForm, description: e.target.value })
                  }
                  rows="3"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-3">
                  Available Sports
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {availableSports.map((sport) => (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => toggleSport(sport.id, "edit")}
                      className={`flex flex-col items-center p-3 border-2 rounded-lg transition ${courtForm.sports.includes(sport.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                      <span className="text-2xl">{sport.icon}</span>
                      <span className="text-xs mt-1">{sport.name}</span>
                    </button>
                  ))}
                </div>
                {courtForm.sports.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Selected Sports:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {courtForm.sports.map((sportId) => {
                        const sport = availableSports.find(
                          (s) => s.id === sportId
                        );
                        return sport ? (
                          <span
                            key={sportId}
                            className="px-3 py-1 bg-white border border-blue-200 rounded-full text-sm flex items-center"
                          >
                            <span className="mr-2">{sport.icon}</span>
                            {sport.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  onClick={() => setEditCourt(null)}
                  className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCourtUpdate}
                  disabled={loading}
                  className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:bg-blue-300"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Court Modal */}
      {canManageArena && showAddCourt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Add New Court</h3>
              <button
                onClick={() => setShowAddCourt(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Court Name *
                  </label>
                  <input
                    type="text"
                    value={newCourtForm.court_name}
                    onChange={(e) =>
                      setNewCourtForm({
                        ...newCourtForm,
                        court_name: e.target.value,
                      })
                    }
                    placeholder="e.g., Court A, Main Court"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Size (SQ FT) *
                  </label>
                  <input
                    type="number"
                    value={newCourtForm.size_sqft}
                    onChange={(e) =>
                      setNewCourtForm({
                        ...newCourtForm,
                        size_sqft: e.target.value,
                      })
                    }
                    placeholder="e.g., 2000"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Price (Rs/Hour) *
                  </label>
                  <input
                    type="number"
                    value={newCourtForm.price_per_hour}
                    onChange={(e) =>
                      setNewCourtForm({
                        ...newCourtForm,
                        price_per_hour: e.target.value,
                      })
                    }
                    placeholder="e.g., 500"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Description
                </label>
                <textarea
                  value={newCourtForm.description}
                  onChange={(e) =>
                    setNewCourtForm({
                      ...newCourtForm,
                      description: e.target.value,
                    })
                  }
                  rows="3"
                  placeholder="Describe the court features..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-3">
                  Available Sports
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {availableSports.map((sport) => (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => toggleSport(sport.id, "add")}
                      className={`flex flex-col items-center p-3 border-2 rounded-lg transition ${newCourtForm.sports.includes(sport.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                      <span className="text-2xl">{sport.icon}</span>
                      <span className="text-xs mt-1">{sport.name}</span>
                    </button>
                  ))}
                </div>
                {newCourtForm.sports.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Selected Sports:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {newCourtForm.sports.map((sportId) => {
                        const sport = availableSports.find(
                          (s) => s.id === sportId
                        );
                        return sport ? (
                          <span
                            key={sportId}
                            className="px-3 py-1 bg-white border border-blue-200 rounded-full text-sm flex items-center"
                          >
                            <span className="mr-2">{sport.icon}</span>
                            {sport.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  onClick={() => setShowAddCourt(false)}
                  className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCourt}
                  disabled={
                    loading ||
                    !newCourtForm.court_name ||
                    !newCourtForm.size_sqft ||
                    !newCourtForm.price_per_hour
                  }
                  className="px-8 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 disabled:bg-green-300"
                >
                  {loading ? "Adding..." : "Add Court"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerArenaSettings;