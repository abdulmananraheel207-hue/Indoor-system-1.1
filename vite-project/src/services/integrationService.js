const API_URL = 'http://localhost:5000'; // or your backend URL
/**
 * Integration Service
 * Handles all interactions between User and Owner modules
 * Manages the complete booking flow
 */

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };
};

export const integrationService = {
  // ===== PHOTO UPLOAD SERVICES =====

  uploadCourtPhotos: async (courtId, files) => {
    try {
      console.log("📤 Starting photo upload for court:", courtId);
      console.log("Files to upload:", files);

      const formData = new FormData();

      // Add each file to FormData
      files.forEach((file, index) => {
        formData.append("court_images", file);
        console.log(`📎 Added file ${index}: ${file.name} (${file.type}, ${file.size} bytes)`);
      });

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found. Please login again.");
      }

      const response = await fetch(
        `http://localhost:5000/api/owners/courts/${courtId}/photos`,
        {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      console.log("📡 Response status:", response.status);
      const responseText = await response.text();
      console.log("📡 Raw response:", responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse JSON response:", e);
        throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        console.error("❌ Server error response:", result);
        throw new Error(result.message || result.error || `Upload failed with status ${response.status}`);
      }

      console.log("✅ Upload successful:", result);
      return result;
    } catch (error) {
      console.error("❌ Upload error details:", error);
      throw error;
    }
  },

  testUploadConnection: async () => {
    try {
      const response = await fetch('http://localhost:5000/api/owners/debug/upload-test', {
        method: 'GET'
      });
      return await response.json();
    } catch (error) {
      console.error("Connection test failed:", error);
      throw error;
    }
  },

  uploadProfilePicture: async (formData) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/users/profile/picture",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to upload profile picture"
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      throw error;
    }
  },

  getArenaImages: async (arenaId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/owners/arenas/${arenaId}/images`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to get arena images");
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting arena images:", error);
      throw error;
    }
  },

  getCourtImages: async (courtId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/owners/courts/${courtId}/images`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to get court images");
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting court images:", error);
      throw error;
    }
  },

  deleteCourtPhoto: async (courtId, photoId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/owners/courts/${courtId}/photos/${photoId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete photo");
      }

      return await response.json();
    } catch (error) {
      console.error("Error deleting court photo:", error);
      throw error;
    }
  },

  deleteCourtPhotoByUrl: async (courtId, imageUrl) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/owners/courts/${courtId}/photos/delete`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ photo_path: imageUrl }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete photo");
      }

      return await response.json();
    } catch (error) {
      console.error("Error deleting court photo:", error);
      throw error;
    }
  },

  setPrimaryArenaImage: async (arenaId, imageId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/owners/arenas/${arenaId}/images/${imageId}/set-primary`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to set primary image");
      }

      return await response.json();
    } catch (error) {
      console.error("Error setting primary arena image:", error);
      throw error;
    }
  },

  // ===== USER PROFILE METHODS =====
  // In integrationService.js
  // ===== USER PROFILE METHODS =====
  getUserProfile: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },
  // In integrationService.js, update the updateProfile function:
  updateProfile: async (profileData) => {
    try {
      const token = localStorage.getItem("token");
      console.log("📤 Sending profile update request with data:", profileData);

      const response = await fetch(
        "http://localhost:5000/api/users/profile",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(profileData),
        }
      );

      console.log("📡 Response status:", response.status);

      const responseText = await response.text();
      console.log("📡 Raw response:", responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { message: responseText || `HTTP error ${response.status}` };
        }

        // Create a more informative error
        let errorMessage = "Failed to update profile";
        if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = errorData.errors.map(err =>
            `${err.path}: ${err.msg} (value: ${err.value})`
          ).join('; ');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }

        throw new Error(errorMessage);
      }

      const result = JSON.parse(responseText);
      console.log("✅ Profile update successful:", result);
      return result;
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      throw error;
    }
  },
  getFavoriteArenas: async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("No token found");
        return [];
      }

      const response = await fetch(
        "http://localhost:5000/api/users/favorites",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const altResponse = await fetch(
          "http://localhost:5000/api/user/favorites",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!altResponse.ok) {
          console.log("Both endpoints failed, returning empty array");
          return [];
        }

        const favorites = await altResponse.json();
        return favorites.map((favorite) => ({
          ...favorite,
          id: favorite.arena_id,
          arenaId: favorite.arena_id,
        }));
      }

      const favorites = await response.json();
      return favorites.map((favorite) => ({
        ...favorite,
        id: favorite.arena_id,
        arenaId: favorite.arena_id,
      }));
    } catch (error) {
      console.error("Error fetching favorites:", error);
      return [];
    }
  },

  removeFromFavorites: async (arenaId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/users/arenas/${arenaId}/favorite`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const altResponse = await fetch(
          `http://localhost:5000/api/user/arenas/${arenaId}/favorite`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!altResponse.ok) {
          throw new Error("Failed to remove favorite");
        }

        return await altResponse.json();
      }

      return await response.json();
    } catch (error) {
      console.error("Error removing favorite:", error);
      throw error;
    }
  },

  // In integrationService.js - add these methods

  // Email change methods
  requestEmailChange: async (newEmail) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/users/email/change-request",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ new_email: newEmail }),
        }
      );

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        result = { message: responseText };
      }

      if (!response.ok) {
        throw new Error(result.message || "Failed to request email change");
      }

      return result;
    } catch (error) {
      console.error("❌ Error requesting email change:", error);
      throw error;
    }
  },

  verifyEmailChange: async (otpData) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/users/email/verify-otp",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(otpData),
        }
      );

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        result = { message: responseText };
      }

      if (!response.ok) {
        throw new Error(result.message || "Failed to verify OTP");
      }

      return result;
    } catch (error) {
      console.error("❌ Error verifying email change:", error);
      throw error;
    }
  },

  resendEmailOTP: async (requestId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/users/email/resend-otp",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ request_id: requestId }),
        }
      );

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        result = { message: responseText };
      }

      if (!response.ok) {
        throw new Error(result.message || "Failed to resend OTP");
      }

      return result;
    } catch (error) {
      console.error("❌ Error resending OTP:", error);
      throw error;
    }
  },

  // Password change method
  changePassword: async (passwordData) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/users/password/change",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(passwordData),
        }
      );

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        result = { message: responseText };
      }

      if (!response.ok) {
        throw new Error(result.message || "Failed to change password");
      }

      return result;
    } catch (error) {
      console.error("❌ Error changing password:", error);
      throw error;
    }
  },

  // ===== ARENA METHODS =====
  getAllArenas: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) queryParams.append(key, filters[key]);
      });

      const response = await fetch(
        `http://localhost:5000/api/arenas?${queryParams.toString()}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) throw new Error("Failed to fetch arenas");
      return await response.json();
    } catch (error) {
      console.error("Error fetching arenas:", error);
      throw error;
    }
  },

  searchArenas: async (params) => {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key]) queryParams.append(key, params[key]);
      });

      const response = await fetch(
        `http://localhost:5000/api/arenas/search?${queryParams.toString()}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) throw new Error("Failed to search arenas");
      return await response.json();
    } catch (error) {
      console.error("Error searching arenas:", error);
      throw error;
    }
  },

  getArenaDetails: async (arenaId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/arenas/${arenaId}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) throw new Error("Failed to fetch arena details");
      return await response.json();
    } catch (error) {
      console.error("Error fetching arena details:", error);
      throw error;
    }
  },

  // ===== COURT SLOTS METHOD =====
  getCourtSlots: async (arenaId, courtId, date, sportId = null) => {
    try {
      let url = `http://localhost:5000/api/arenas/${arenaId}/courts/${courtId}/slots?date=${date}`;
      if (sportId) {
        url += `&sport_id=${sportId}`;
      }

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("Failed to fetch court slots");
      return await response.json();
    } catch (error) {
      console.error("Error fetching court slots:", error);
      throw error;
    }
  },

  // ===== GENERAL SLOTS METHOD =====
  getAvailableSlots: async (arenaId, date = null, sportId = null, courtId = null) => {
    try {
      let url = `http://localhost:5000/api/arenas/${arenaId}/slots`;
      const params = [];

      if (date) params.push(`date=${date}`);
      if (sportId) params.push(`sport_id=${sportId}`);
      if (courtId) params.push(`court_id=${courtId}`);

      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("Failed to fetch available slots");
      return await response.json();
    } catch (error) {
      console.error("Error fetching available slots:", error);
      throw error;
    }
  },

  getSportsCategories: async () => {
    try {
      // Try the correct endpoint first
      const response = await fetch(
        "http://localhost:5000/api/arenas/sports",
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch sports");
      }

      const data = await response.json();
      return Array.isArray(data) ? data : data.sports || data.categories || [];
    } catch (error) {
      console.error("Error fetching sports:", error);
      return []; // Return empty array instead of throwing
    }
  },

  // ===== BOOKING FLOW =====
  createBooking: async (bookingData) => {
    try {
      const payload = {
        arena_id: bookingData.arenaId,
        court_id: bookingData.courtId,
        date: bookingData.date,
        start_time: bookingData.startTime,
        end_time: bookingData.endTime,
        total_amount: bookingData.totalPrice || bookingData.total_amount,
        sport_id: bookingData.sportId || bookingData.sport_id || undefined,
        notes: bookingData.notes || "",
      };

      if (bookingData.slot_id) payload.slot_id = bookingData.slot_id;
      if (bookingData.slotId) payload.slot_id = bookingData.slotId;
      if (bookingData.slot_ids || bookingData.slotIds) {
        const ids = bookingData.slot_ids || bookingData.slotIds;
        payload.slot_ids = Array.isArray(ids) ? ids : [ids];
      }

      const response = await fetch(
        "http://localhost:5000/api/bookings",
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) throw new Error("Failed to create booking");
      return await response.json();
    } catch (error) {
      console.error("Error creating booking:", error);
      throw error;
    }
  },

  getUserBookings: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) queryParams.append(key, filters[key]);
      });

      const response = await fetch(
        `http://localhost:5000/api/bookings?${queryParams.toString()}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) throw new Error("Failed to fetch bookings");
      return await response.json();
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      throw error;
    }
  },

  getBookingDetails: async (bookingId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/bookings/${bookingId}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) throw new Error("Failed to fetch booking details");
      return await response.json();
    } catch (error) {
      console.error("Error fetching booking details:", error);
      throw error;
    }
  },

  cancelBooking: async (bookingId, reason) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/bookings/${bookingId}/cancel`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ reason }),
        }
      );

      if (!response.ok) throw new Error("Failed to cancel booking");
      return await response.json();
    } catch (error) {
      console.error("Error cancelling booking:", error);
      throw error;
    }
  },

  // ===== OWNER METHODS =====
  getOwnerBookingRequests: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) queryParams.append(key, filters[key]);
      });

      const response = await fetch(
        `http://localhost:5000/api/owners/bookings?${queryParams.toString()}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching owner bookings:", error);
      throw error;
    }
  },

  acceptBookingRequest: async (bookingId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/owners/bookings/${bookingId}/accept`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error accepting booking:", error);
      throw error;
    }
  },

  rejectBookingRequest: async (bookingId, reason) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/owners/bookings/${bookingId}/reject`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ reason }),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error rejecting booking:", error);
      throw error;
    }
  },

  completeBooking: async (bookingId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/owners/bookings/${bookingId}/complete`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error completing booking:", error);
      throw error;
    }
  },

  getOwnerBookingStats: async (period = "month") => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/owners/bookings/stats?period=${period}`,
        {
          headers: getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error fetching booking stats:", error);
      throw error;
    }
  },

  getOwnerArenas: async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/owners/arenas",
        {
          headers: getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error fetching owner arenas:", error);
      throw error;
    }
  },

  getOwnerDashboard: async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/owners/dashboard",
        {
          headers: getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error fetching owner dashboard:", error);
      throw error;
    }
  },

  getOwnerTimeSlots: async (arenaId, date) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/owners/arenas/${arenaId}/slots?date=${date}`,
        {
          headers: getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error fetching time slots:", error);
      throw error;
    }
  },

  manageTimeSlots: async (arenaId, payload) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/owners/arenas/${arenaId}/slots`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error managing time slots:", error);
      throw error;
    }
  },

  // ===== REVIEWS =====
  submitReview: async (arenaId, rating, comment) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/arenas/${arenaId}/reviews`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ rating, comment }),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error submitting review:", error);
      throw error;
    }
  },


  getArenaReviews: async (arenaId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/arenas/${arenaId}/reviews`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        // If endpoint fails, return empty reviews
        console.warn(`Failed to fetch reviews for arena ${arenaId}: ${response.status}`);
        return { reviews: [], total: 0, avg_rating: 0, total_reviews: 0 };
      }

      const data = await response.json();

      // Handle different response formats
      if (Array.isArray(data)) {
        return { reviews: data, total: data.length };
      } else if (data.reviews) {
        return data;
      } else {
        return { reviews: [], total: 0, avg_rating: 0, total_reviews: 0 };
      }
    } catch (error) {
      console.error("Error fetching arena reviews:", error);
      return { reviews: [], total: 0, avg_rating: 0, total_reviews: 0 };
    }
  },

  // In integrationService.js - UPDATED submitReview function
  submitReview: async (arenaId, rating, comment) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/arenas/${arenaId}/reviews`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ rating, comment }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        // Check if it's a validation error
        if (response.status === 400) {
          throw new Error(responseData.message || "Validation failed");
        }
        throw new Error(responseData.message || `Failed to submit review (${response.status})`);
      }

      return responseData;
    } catch (error) {
      console.error("Error submitting review:", error);

      // Provide more specific error messages
      if (error.message.includes("already reviewed")) {
        throw new Error("You have already reviewed this arena");
      }
      if (error.message.includes("Validation failed")) {
        throw new Error("Please provide both a rating and comment");
      }
      if (error.message.includes("completed booking")) {
        throw new Error("You need to complete a booking before reviewing");
      }

      throw error;
    }
  },

  // ===== FAVORITES =====
  addToFavorites: async (arenaId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/users/arenas/${arenaId}/favorite`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error adding to favorites:", error);
      throw error;
    }
  },

  // ===== HELPER FUNCTIONS =====
  formatDate: (date) => {
    if (typeof date === "string") return date;
    return date.toISOString().split("T")[0];
  },

  formatTime: (time) => {
    if (typeof time === "string") return time;
    return time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  },

  calculatePrice: (startTime, endTime, pricePerHour) => {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    const duration = (end - start) / (1000 * 60 * 60);
    return Math.round(duration * pricePerHour);
  },

  // ===== TIME SLOT LOCKING =====
  lockSlot: async (slotId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/bookings/slots/${slotId}/lock`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error locking slot:", error);
      throw error;
    }
  },

  releaseSlot: async (slotId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/bookings/slots/${slotId}/release`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error releasing slot:", error);
      throw error;
    }
  },

  // ===== PAYMENT =====
  uploadPaymentScreenshot: async (bookingId, paymentData) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/bookings/${bookingId}/payment`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(paymentData),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error uploading payment screenshot:", error);
      throw error;
    }
  },

  // ===== NOTIFICATIONS =====
  getUserNotifications: async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/notifications",
        {
          headers: getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  },

  markNotificationAsRead: async (notificationId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  },

  // ===== CLEANUP =====
  cleanupExpiredLocks: async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/owners/cleanup/expired-locks",
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error cleaning up expired locks:", error);
      throw error;
    }
  },
};

export default integrationService;