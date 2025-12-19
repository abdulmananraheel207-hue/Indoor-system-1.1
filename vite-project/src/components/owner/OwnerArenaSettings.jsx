import React, { useState, useEffect } from "react";
import { ownerAPI } from "../../services/api";

const OwnerArenaSettings = ({ dashboardData }) => {
  const [arenas, setArenas] = useState([]);
  const [selectedArena, setSelectedArena] = useState("");
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

  useEffect(() => {
    if (dashboardData?.arenas) {
      setArenas(dashboardData.arenas);
      if (dashboardData.arenas.length > 0) {
        setSelectedArena(dashboardData.arenas[0].arena_id);
      }
    }
  }, [dashboardData]);

  useEffect(() => {
    if (selectedArena) {
      fetchCourts();
    }
  }, [selectedArena]);

  const fetchCourts = async () => {
    try {
      const response = await ownerAPI.getCourts(selectedArena);
      setCourts(response.data || []);
    } catch (error) {
      console.error("Error fetching courts:", error);
    }
  };

  const handleCourtEdit = (court) => {
    setEditCourt(court);
    setCourtForm({
      court_name: court.court_name || "",
      size_sqft: court.size_sqft || "",
      price_per_hour: court.price_per_hour || "",
      description: court.description || "",
      sports: court.sports || [],
    });
  };

  const handleCourtUpdate = async () => {
    if (!editCourt) return;
    setLoading(true);
    try {
      await ownerAPI.updateCourt(editCourt.court_id, {
        court_name: courtForm.court_name,
        size_sqft: courtForm.size_sqft,
        price_per_hour: courtForm.price_per_hour,
        description: courtForm.description,
        sports: courtForm.sports,
      });

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
    setLoading(true);
    try {
      await ownerAPI.addCourt(selectedArena, {
        court_name: newCourtForm.court_name,
        size_sqft: newCourtForm.size_sqft,
        price_per_hour: newCourtForm.price_per_hour,
        description: newCourtForm.description,
        sports: newCourtForm.sports,
      });

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

  const handlePhotoUpload = async (courtId, event) => {
    const files = event.target.files;
    if (!files.length) return;

    setUploadingPhotos({ ...uploadingPhotos, [courtId]: true });

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("photos", files[i]);
    }

    try {
      const response = await ownerAPI.uploadCourtPhotos(courtId, formData);
      alert("Photos uploaded successfully");
      fetchCourts();
    } catch (error) {
      console.error("Error uploading photos:", error);
      alert(error.response?.data?.message || "Failed to upload photos");
    } finally {
      setUploadingPhotos({ ...uploadingPhotos, [courtId]: false });
      event.target.value = "";
    }
  };

  const handleDeletePhoto = async (courtId, photoPath) => {
    if (!window.confirm("Are you sure you want to delete this photo?")) return;

    try {
      await ownerAPI.deleteCourtPhoto(courtId, { photo_path: photoPath });
      alert("Photo deleted successfully");
      fetchCourts();
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert(error.response?.data?.message || "Failed to delete photo");
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

  // In OwnerArenaSettings.jsx, update the getAllCourtPhotos function:
  const getAllCourtPhotos = (court) => {
    const photos = [];

    // Check if court has images array (from API)
    if (court.images && court.images.length > 0) {
      court.images.forEach((img, index) => {
        photos.push({
          path: img.image_url,
          is_primary: img.is_primary || index === 0,
        });
      });
    }

    // Fallback to old structure if exists
    if (court.primary_image) {
      photos.push({
        path: court.primary_image,
        is_primary: true,
      });
    }

    if (court.additional_images && court.additional_images.length > 0) {
      court.additional_images.forEach((img) => {
        photos.push({
          path: img,
          is_primary: false,
        });
      });
    }

    return photos;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-4 md:text-2xl md:mb-6">
        Arena & Court Settings
      </h1>

      <div className="bg-white p-4 rounded-xl shadow mb-4 md:p-6 md:mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Arena
            </label>
            <select
              value={selectedArena}
              onChange={(e) => setSelectedArena(e.target.value)}
              className="w-full md:w-64 px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {arenas.map((arena) => (
                <option key={arena.arena_id} value={arena.arena_id}>
                  {arena.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <div className="text-sm text-gray-600">
              {courts.length} court{courts.length !== 1 ? "s" : ""}
            </div>
            <button
              onClick={() => setShowAddCourt(true)}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
            >
              + Add Court
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b bg-gray-50 md:p-6">
          <h2 className="text-lg font-medium text-gray-900">
            Courts Management
          </h2>
          <p className="text-sm text-gray-600">
            Edit details and upload photos for each court
          </p>
        </div>

        <div className="p-4 md:p-6">
          {courts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">🏟️</div>
              <p className="text-gray-600">No courts found for this arena.</p>
              <button
                onClick={() => setShowAddCourt(true)}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Your First Court
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {courts.map((court) => (
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
                          ₹{court.price_per_hour}/HOUR
                        </span>
                        <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded">
                          Court #{court.court_number}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-3">
                        {court.description || "No description provided."}
                      </p>
                      {court.sports_names && court.sports_names.length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs font-bold text-gray-400 uppercase">
                            Sports:{" "}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {court.sports_names.map((sport, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                              >
                                {sport}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleCourtEdit(court)}
                      className="mt-4 md:mt-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                    >
                      Edit Details
                    </button>
                  </div>

                  <div className="pt-6 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-tight">
                        Gallery
                      </h4>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(court.court_id, e)}
                          className="hidden"
                        />
                        <span className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition">
                          {uploadingPhotos[court.court_id]
                            ? "UPLOADING..."
                            : "+ ADD PHOTOS"}
                        </span>
                      </label>
                    </div>

                    {(() => {
                      const allPhotos = getAllCourtPhotos(court);

                      if (allPhotos.length > 0) {
                        return (
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {allPhotos.map((photo, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={`http://localhost:5000${photo.path}`}
                                  alt={`Court ${court.court_name} - ${
                                    index + 1
                                  }`}
                                  className="w-full h-32 object-cover rounded-xl shadow-sm border border-gray-100"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src =
                                      "https://via.placeholder.com/300x200?text=Image+Not+Found";
                                  }}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  {photo.is_primary && (
                                    <span className="absolute top-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">
                                      Primary
                                    </span>
                                  )}
                                  <button
                                    onClick={() =>
                                      handleDeletePhoto(
                                        court.court_id,
                                        photo.path
                                      )
                                    }
                                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      } else {
                        return (
                          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                            <p className="text-sm text-gray-400">
                              No photos available. Upload your first court
                              photo.
                            </p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Court Modal */}
      {editCourt && (
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
                    Price (₹/Hour)
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
                      className={`flex flex-col items-center p-3 border-2 rounded-lg transition ${
                        courtForm.sports.includes(sport.id)
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
      {showAddCourt && (
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
                    Price (₹/Hour) *
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
                      className={`flex flex-col items-center p-3 border-2 rounded-lg transition ${
                        newCourtForm.sports.includes(sport.id)
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
