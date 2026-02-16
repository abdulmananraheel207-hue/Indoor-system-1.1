import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import integrationService from "../../services/integrationService";

const UserHome = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [arenas, setArenas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [skipLocation, setSkipLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      console.warn("Geolocation is not supported by your browser");
      fetchArenas({ skip_location: true });
      return;
    }

    setLocationLoading(true);

    // Set timeout for geolocation request
    const options = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(userLocation);
        setLocationError(null);
        setLocationLoading(false);
        fetchArenas({
          lat: userLocation.lat,
          lng: userLocation.lng,
          radius_km: 8,
        });
      },
      (error) => {
        console.error("Error getting location:", error);
        setLocationError(getGeolocationErrorMessage(error));
        setLocationLoading(false);
        // Automatically fall back to non-location based search
        setSkipLocation(true);
        fetchArenas({ skip_location: true });
      },
      options
    );
  };

  const getGeolocationErrorMessage = (error) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return "Location permission denied. Please enable location services in your browser settings.";
      case error.POSITION_UNAVAILABLE:
        return "Location information is unavailable.";
      case error.TIMEOUT:
        return "Location request timed out. Please try again.";
      default:
        return "An unknown error occurred while getting your location.";
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const sportsData = await integrationService.getSportsCategories();
      setSports(sportsData);
    } catch (error) {
      setError("Failed to load sports");
      console.error("Error fetching sports:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArenas = async (filters = {}) => {
    try {
      setLoading(true);
      const params = { ...filters };

      // Only add location if we have it and user hasn't skipped it
      if (!filters.skip_location && location && !skipLocation) {
        params.lat = location.lat;
        params.lng = location.lng;
        params.radius_km = params.radius_km || 20;
      }

      const arenasData = await integrationService.searchArenas(params);
      const parsed = arenasData?.arenas ||
        arenasData?.data ||
        (Array.isArray(arenasData) ? arenasData : []);

      setArenas(parsed.filter((a) => !a.is_blocked));
      setError(null);
    } catch (err) {
      console.error("Error fetching arenas:", err);
      setError("Failed to load arenas");
    } finally {
      setLoading(false);
    }
  };

  const handleRetryLocation = () => {
    setLocationError(null);
    setSkipLocation(false);
    getUserLocation();
  };

  const handleSkipLocation = () => {
    setSkipLocation(true);
    setLocation(null);
    setLocationError(null);
    fetchArenas({ skip_location: true });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const params = { query: searchQuery };
      if (selectedSport) params.sport_id = selectedSport.sport_id;
      if (location && !skipLocation) {
        params.lat = location.lat;
        params.lng = location.lng;
        params.radius_km = 8;
      } else {
        params.skip_location = true;
      }
      const results = await integrationService.searchArenas(params);
      const parsed = Array.isArray(results) ? results : results.arenas || [];
      setArenas(parsed.filter((arena) => !arena.is_blocked));
      setError(null);
    } catch (error) {
      console.error("Error searching arenas:", error);
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSportSelect = async (sport) => {
    setSelectedSport(sport);
    try {
      setLoading(true);
      const params = { sport_id: sport.sport_id };
      if (location && !skipLocation) {
        params.lat = location.lat;
        params.lng = location.lng;
        params.radius_km = 8;
      } else {
        params.skip_location = true;
      }
      const results = await integrationService.searchArenas(params);
      const parsed = Array.isArray(results) ? results : results.arenas || [];
      setArenas(parsed.filter((arena) => !arena.is_blocked));
      setError(null);
    } catch (error) {
      console.error("Error filtering arenas:", error);
      setError("Failed to filter arenas");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (arenaId) => {
    navigate(`/user/arenas/${arenaId}`);
  };

  const handleClearFilters = () => {
    setSelectedSport(null);
    setSearchQuery("");
    if (location && !skipLocation) {
      fetchArenas({
        lat: location.lat,
        lng: location.lng,
        radius_km: 8,
      });
    } else {
      fetchArenas({ skip_location: true });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Location */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Find Arena</h1>

              {/* Location Status Display */}
              {locationLoading ? (
                <div className="mt-2 flex items-center text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                  <span className="text-sm">Detecting your location...</span>
                </div>
              ) : locationError ? (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-yellow-700">{locationError}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleRetryLocation}
                        className="text-xs px-3 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors"
                      >
                        Retry
                      </button>
                      <button
                        onClick={handleSkipLocation}
                        className="text-xs px-3 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
              ) : location && !skipLocation ? (
                <div className="flex items-center mt-1 text-gray-600 space-x-3">
                  <div className="flex items-center">
                    <svg className="h-4 w-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Using your location</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSkipLocation}
                    className="text-xs text-primary-600 hover:text-primary-500 underline"
                  >
                    Skip location
                  </button>
                </div>
              ) : (
                <div className="flex flex-col mt-1 space-y-1">
                  <button
                    onClick={handleRetryLocation}
                    className="text-sm text-primary-600 hover:text-primary-500 flex items-center transition-colors"
                  >
                    <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    Enable location to find nearby arenas
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipLocation}
                    className="text-xs text-primary-600 hover:text-primary-500 underline"
                  >
                    Continue without location
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-6">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search arena name, location..."
                  className="w-full px-4 py-3 pl-12 pr-10 text-gray-900 placeholder-gray-500 bg-gray-100 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
                <div className="absolute left-4 top-3.5">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <button
                  type="submit"
                  className="absolute right-3 top-3 text-primary-600 hover:text-primary-700 transition-colors"
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
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sport Categories */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
            {(selectedSport || searchQuery) && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
              >
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear filters
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {sports.map((sport) => (
              <button
                key={sport.sport_id}
                onClick={() => handleSportSelect(sport)}
                className={`flex flex-col items-center p-4 rounded-xl transition-all duration-200 ${selectedSport?.sport_id === sport.sport_id
                  ? "bg-primary-50 border-2 border-primary-500"
                  : "bg-white border border-gray-200 hover:border-primary-300 hover:shadow-sm"
                  }`}
              >
                <span className="text-2xl mb-2">
                  {sport.icon_url ? "🏸" : "🎾"}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {sport.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Arenas Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedSport
                ? `${selectedSport.name} Arenas`
                : "Available Arenas"}
              <span className="text-gray-500 text-sm font-normal ml-2">
                ({arenas.length} found)
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                <p className="mt-4 text-gray-600">Loading arenas...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <svg className="h-12 w-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 font-semibold mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  fetchInitialData();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : arenas.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
              <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-gray-600 mb-4">No arenas found matching your criteria</p>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                View All Arenas
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {arenas.map((arena) => (
                <div
                  key={arena.arena_id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer group"
                  onClick={() => handleViewDetails(arena.arena_id)}
                >
                  <div className="h-48 bg-gray-300 overflow-hidden relative">
                    {arena.images && arena.images.length > 0 ? (
                      <img
                        src={arena.images[0].image_url}
                        alt={arena.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://via.placeholder.com/400x200?text=Arena+Image";
                        }}
                      />
                    ) : arena.arena_images && arena.arena_images.length > 0 ? (
                      <img
                        src={arena.arena_images[0].image_url}
                        alt={arena.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://via.placeholder.com/400x200?text=Arena+Image";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <div className="flex items-center bg-white/90 backdrop-blur-sm text-primary-700 px-3 py-1 rounded-full">
                        <svg
                          className="h-4 w-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="font-semibold text-sm">
                          {arena.rating || "New"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {arena.name}
                      </h3>
                    </div>

                    <div className="flex items-center text-gray-600 text-sm mb-4">
                      <svg
                        className="h-4 w-4 mr-1 flex-shrink-0"
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
                      <span className="truncate">{arena.address || "Address not available"}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {Array.isArray(arena.sports) && arena.sports.length > 0 ? (
                        arena.sports.slice(0, 3).map((sport, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                          >
                            {typeof sport === "string"
                              ? sport
                              : sport.sport_name || sport.name || sport}
                          </span>
                        ))
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                          No sports specified
                        </span>
                      )}
                      {Array.isArray(arena.sports) && arena.sports.length > 3 && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                          +{arena.sports.length - 3} more
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <span className="text-2xl font-bold text-gray-900">
                          Rs {arena.base_price_per_hour || 0}
                        </span>
                        <span className="text-gray-600">/hour</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(arena.arena_id);
                        }}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserHome;