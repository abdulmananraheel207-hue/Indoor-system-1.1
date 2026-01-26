import React, { useState, useEffect } from "react";
import integrationService from "../../services/integrationService";

const UserProfile = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone_number: "",
    profile_picture_url: "",
    location_lat: null,
    location_lng: null,
    created_at: "",
    favorite_arenas: [],
    teams: []
  });
  
  const [paymentMethods, setPaymentMethods] = useState([
    { id: 1, type: "credit_card", last4: "4242", isDefault: true },
    { id: 2, type: "paypal", email: "john@example.com" },
  ]);
  
  const [favoriteArenas, setFavoriteArenas] = useState([]);
  const [loading, setLoading] = useState({
    profile: false,
    favorites: false
  });
  const [error, setError] = useState("");

  // Fetch user profile when component mounts or when activeTab changes
  useEffect(() => {
    if (activeTab === "profile") {
      fetchUserProfile();
    }
    if (activeTab === "favorites") {
      fetchFavoriteArenas();
    }
  }, [activeTab]);

  // Fetch user profile from backend
  const fetchUserProfile = async () => {
    try {
      setLoading(prev => ({ ...prev, profile: true }));
      setError("");
      
      console.log("Fetching user profile...");
      const profile = await integrationService.getUserProfile();
      console.log("Profile data received:", profile);
      
      // Format the data for display
      setProfileData({
        name: profile.name || "",
        email: profile.email || "",
        phone_number: profile.phone_number || "",
        profile_picture_url: profile.profile_picture_url || getDefaultProfilePicture(),
        location_lat: profile.location_lat,
        location_lng: profile.location_lng,
        created_at: profile.created_at,
        favorite_arenas: profile.favorite_arenas || [],
        teams: profile.teams || []
      });
      
      // Also set favorite arenas if available
      if (profile.favorite_arenas) {
        setFavoriteArenas(profile.favorite_arenas);
      }
      
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setError("Failed to load profile information. Please try again.");
      
      // Fallback to localStorage data if available
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (storedUser) {
          setProfileData(prev => ({
            ...prev,
            name: storedUser.name || "User",
            email: storedUser.email || "No email provided",
            phone_number: storedUser.phone_number || "Not provided",
            profile_picture_url: getDefaultProfilePicture()
          }));
        }
      } catch (e) {
        console.error("Error parsing stored user:", e);
      }
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  // Get default profile picture
  const getDefaultProfilePicture = () => {
    // Use a local fallback or a reliable placeholder
    return "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541";
  };

  // Fetch favorite arenas from backend
  const fetchFavoriteArenas = async () => {
    try {
      setLoading(prev => ({ ...prev, favorites: true }));
      const favorites = await integrationService.getFavoriteArenas();
      setFavoriteArenas(favorites);
    } catch (error) {
      console.error("Error fetching favorite arenas:", error);
      // If there's an error, try to use the ones from profile data
      if (profileData.favorite_arenas && profileData.favorite_arenas.length > 0) {
        setFavoriteArenas(profileData.favorite_arenas);
      }
    } finally {
      setLoading(prev => ({ ...prev, favorites: false }));
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      // Prepare data for update (only send updatable fields)
      const updateData = {
        name: profileData.name,
        phone_number: profileData.phone_number,
        location_lat: profileData.location_lat,
        location_lng: profileData.location_lng
      };
      
      // Implement update profile logic here
      await integrationService.updateProfile(updateData);
      alert("Profile updated successfully!");
      // Refresh profile data
      fetchUserProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    }
  };

  const handleAddPaymentMethod = () => {
    console.log("Add payment method");
    // Implement add payment method
  };

  const handleRemoveFavorite = async (arenaId) => {
    try {
      await integrationService.removeFromFavorites(arenaId);
      // Update local state
      setFavoriteArenas(
        favoriteArenas.filter((arena) => arena.arena_id !== arenaId)
      );
      // Also update profile data
      setProfileData(prev => ({
        ...prev,
        favorite_arenas: prev.favorite_arenas.filter(arena => arena.arena_id !== arenaId)
      }));
    } catch (error) {
      console.error("Error removing favorite:", error);
      alert("Failed to remove from favorites");
    }
  };

  // Format location for display
  const formatLocation = () => {
    if (profileData.location_lat && profileData.location_lng) {
      return `Lat: ${profileData.location_lat.toFixed(4)}, Lng: ${profileData.location_lng.toFixed(4)}`;
    }
    return "Location not set";
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return "Invalid date";
    }
  };

  // Handle profile picture error
  const handleImageError = (e) => {
    console.log("Profile picture failed to load, using default");
    e.target.src = getDefaultProfilePicture();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600 mb-8">
          Manage your account settings and preferences
        </p>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("profile")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "profile"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Profile Info
            </button>
            <button
              onClick={() => setActiveTab("payment")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "payment"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Payment Methods
            </button>
            <button
              onClick={() => setActiveTab("favorites")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "favorites"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Favorite Arenas
            </button>
            <button
              onClick={() => setActiveTab("support")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "support"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Help & Support
            </button>
          </nav>
        </div>

        {/* Profile Info Tab */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {loading.profile ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading profile...</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-6 mb-8">
                  <div className="relative">
                    <img
                      src={profileData.profile_picture_url}
                      alt="Profile"
                      className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg"
                      onError={handleImageError}
                    />
                    <button 
                      className="absolute bottom-2 right-2 bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700"
                      onClick={() => {
                        // Add profile picture upload functionality here
                        console.log("Upload profile picture clicked");
                      }}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </button>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {profileData.name || "User"}
                    </h2>
                    <p className="text-gray-600">{profileData.email || "No email provided"}</p>
                    <div className="flex items-center mt-2">
                      <svg
                        className="h-4 w-4 text-gray-400 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span className="text-sm text-gray-600">
                        {formatLocation()}
                      </span>
                    </div>
                    <div className="flex items-center mt-1">
                      <svg
                        className="h-4 w-4 text-gray-400 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-sm text-gray-600">
                        Member since {formatDate(profileData.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Favorite Arenas</p>
                    <p className="text-2xl font-bold">{profileData.favorite_arenas?.length || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Teams</p>
                    <p className="text-2xl font-bold">{profileData.teams?.length || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="text-lg font-medium">{profileData.phone_number || "Not provided"}</p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) =>
                          setProfileData({ ...profileData, name: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                        disabled
                      />
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone_number}
                        onChange={(e) =>
                          setProfileData({ ...profileData, phone_number: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="+92 300 1234567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Member Since
                      </label>
                      <input
                        type="text"
                        value={formatDate(profileData.created_at)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                        disabled
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={fetchUserProfile}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        )}

        {/* Payment Methods Tab */}
        {activeTab === "payment" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Payment Methods
                </h2>
                <button
                  onClick={handleAddPaymentMethod}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  + Add Payment Method
                </button>
              </div>

              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="h-10 w-16 bg-gray-100 rounded flex items-center justify-center mr-4">
                        {method.type === "credit_card" ? (
                          <span className="text-sm font-medium">💳 Card</span>
                        ) : (
                          <span className="text-sm font-medium">💰 PayPal</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {method.type === "credit_card"
                            ? `Card ending in ${method.last4}`
                            : `PayPal: ${method.email}`}
                        </p>
                        {method.isDefault && (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {!method.isDefault && (
                        <button className="text-sm text-primary-600 hover:text-primary-500">
                          Set as Default
                        </button>
                      )}
                      <button className="text-sm text-red-600 hover:text-red-500">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Favorite Arenas Tab */}
        {activeTab === "favorites" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Favorite Arenas
              </h2>

              {loading.favorites ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading favorites...</p>
                </div>
              ) : favoriteArenas.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No favorite arenas
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add arenas to your favorites to quickly book them later.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoriteArenas.map((arena) => (
                    <div
                      key={arena.arena_id || arena.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {arena.name}
                          </h3>
                          <div className="flex items-center mt-1">
                            <span className="text-sm text-gray-600">
                              {arena.sport_type || arena.sport}
                            </span>
                            <div className="flex items-center ml-3">
                              <svg
                                className="h-3 w-3 text-yellow-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-sm ml-1">
                                {arena.rating || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleRemoveFavorite(arena.arena_id || arena.id)
                          }
                          className="text-gray-400 hover:text-red-500"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                      <button className="w-full mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        Book Now
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Help & Support Tab */}
        {activeTab === "support" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Help & Support
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    Frequently Asked Questions
                  </h3>
                  <div className="space-y-3">
                    {[
                      "How do I book an arena?",
                      "What is the cancellation policy?",
                      "How do I make a payment?",
                      "Can I get a refund?",
                      "How do I contact arena owners?",
                    ].map((question, index) => (
                      <button
                        key={index}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-3">
                    Contact Support
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                      <svg
                        className="h-5 w-5 text-blue-600 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm text-blue-600">Call us</p>
                        <p className="font-medium">+1 (555) 123-4567</p>
                      </div>
                    </div>
                    <div className="flex items-center p-3 bg-green-50 rounded-lg">
                      <svg
                        className="h-5 w-5 text-green-600 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm text-green-600">Email us</p>
                        <p className="font-medium">support@indoorbooking.com</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <button className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    Submit a Support Ticket
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;