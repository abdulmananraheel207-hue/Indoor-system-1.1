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

  adminLogin: async (credentials) => {
    try {
      console.log('🔐 Admin login attempt:', credentials.username);

      const response = await fetch('http://localhost:5000/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Admin login failed');
      }

      if (data.success && data.token) {
        // Store admin token separately
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.admin));
        localStorage.setItem('userRole', 'admin');

        console.log('✅ Admin login successful');
        return data;
      }

      throw new Error(data.message || 'Admin login failed');

    } catch (error) {
      console.error('❌ Admin login error:', error);
      throw error;
    }
  },

  getSuperAdminDashboard: async () => {
    try {
      const token = localStorage.getItem('adminToken');

      if (!token) {
        throw new Error('No admin token found');
      }

      const response = await fetch('http://localhost:5000/api/super-admin/system-overview', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          localStorage.removeItem('userRole');
          throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to fetch dashboard data');
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Get dashboard error:', error);
      throw error;
    }
  },

  // In integrationService.js - FIXED markArenaPayment function
  markArenaPayment: async (arenaId, paymentData) => {
    try {
      const token = localStorage.getItem('adminToken');
      console.log('📤 Marking payment for arena:', arenaId, 'with data:', paymentData);

      if (!token) {
        throw new Error('No admin token found. Please login again.');
      }

      // IMPORTANT: Convert amount_paid to number
      const amountPaid = parseFloat(paymentData.amount_paid);

      if (isNaN(amountPaid) || amountPaid <= 0) {
        throw new Error('Invalid amount paid');
      }

      const requestData = {
        action: 'mark_paid',
        amount_paid: amountPaid, // Now it's a number, not a string
        notes: paymentData.notes || `Monthly commission payment`,
        notify_owner: true
      };

      console.log('📤 Request data (with number):', requestData);

      const response = await fetch(`http://localhost:5000/api/super-admin/arenas/${arenaId}/enforce-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const responseText = await response.text();
      console.log('📡 Response status:', response.status);
      console.log('📡 Raw response:', responseText);

      if (!response.ok) {
        let errorMessage = 'Failed to mark payment';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('❌ Server error details:', errorData);
        } catch (e) {
          errorMessage = responseText || `HTTP error ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const result = JSON.parse(responseText);
      console.log('✅ Payment marked successfully:', result);
      return result;

    } catch (error) {
      console.error('❌ Payment error details:', error);
      throw error;
    }
  },

  toggleArenaBlock: async (arenaId, blockData) => {
    try {
      const token = localStorage.getItem('adminToken');

      if (!token) {
        throw new Error('No admin token found');
      }

      console.log('📤 [toggleArenaBlock] Blocking arena:', arenaId, 'Data:', blockData);

      const response = await fetch(`http://localhost:5000/api/super-admin/arenas/${arenaId}/enforce-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(blockData)
      });

      const responseText = await response.text();
      console.log('📡 [toggleArenaBlock] Response:', response.status, responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      const result = JSON.parse(responseText);
      console.log('✅ [toggleArenaBlock] Success:', result);
      return result;

    } catch (error) {
      console.error('❌ [toggleArenaBlock] Error:', error);
      throw error;
    }
  },

  adminLogout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('userRole');
    window.location.href = '/';
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

  // Replace the entire createBooking method in integrationService.js
  createBooking: async (bookingData) => {
    try {
      // Normalize parameter names
      const arenaId = bookingData.arena_id || bookingData.arenaId;
      const courtId = bookingData.court_id || bookingData.courtId;
      const sportId = bookingData.sport_id || bookingData.sportId;

      // Handle slot IDs - ensure it's an array
      let slotIds = [];
      if (bookingData.slot_ids && Array.isArray(bookingData.slot_ids)) {
        slotIds = bookingData.slot_ids;
      } else if (bookingData.slot_id) {
        slotIds = [bookingData.slot_id];
      } else if (bookingData.slotIds && Array.isArray(bookingData.slotIds)) {
        slotIds = bookingData.slotIds;
      }

      // Validate required fields
      if (!arenaId) throw new Error("Arena ID is required");
      if (!courtId) throw new Error("Court ID is required");
      if (!sportId) throw new Error("Sport ID is required");
      if (slotIds.length === 0) throw new Error("At least one slot ID is required");

      // Ensure total_amount is a number
      const totalAmount = bookingData.total_amount || bookingData.totalPrice;
      if (!totalAmount) throw new Error("Total amount is required");

      const payload = {
        arena_id: Number(arenaId),
        court_id: Number(courtId),
        sport_id: Number(sportId),
        total_amount: Number(parseFloat(totalAmount).toFixed(2)),
        slot_ids: slotIds.map(id => Number(id)),
        notes: bookingData.notes || ""
      };

      console.log("📤 Creating booking with payload:", payload);

      const response = await fetch(
        "http://localhost:5000/api/bookings",
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      const responseText = await response.text();
      console.log("📡 Booking response:", responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { message: responseText };
        }
        throw new Error(errorData.message || "Failed to create booking");
      }

      return JSON.parse(responseText);
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

      const data = await response.json();

      // Process bookings to add multi-slot info
      if (data.bookings) {
        data.bookings = data.bookings.map(booking => ({
          ...booking,
          slot_count: booking.is_multi_slot && booking.slot_ids
            ? (Array.isArray(booking.slot_ids) ? booking.slot_ids.length :
              (typeof booking.slot_ids === 'string' ? JSON.parse(booking.slot_ids).length : 1))
            : 1
        }));
      }

      return data;
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
  // In integrationService.js - FIX submitReview method
  submitReview: async (arenaId, rating, comment, bookingId = null) => {
    try {
      const token = localStorage.getItem("token");

      const payload = {
        rating,
        comment
      };

      // Add booking_id if provided (for reminder flow)
      if (bookingId) {
        payload.booking_id = bookingId;
      }

      const response = await fetch(
        `http://localhost:5000/api/arenas/${arenaId}/reviews`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
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
        throw new Error(result.message || "Failed to submit review");
      }

      return result;
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


  // Check for pending reviews
  getPendingReviews: async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/users/reviews/pending",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        // Check if it's a server error and return empty array
        if (response.status >= 500) {
          console.warn("Server error fetching pending reviews, returning empty array");
          return { pending_reviews: [], count: 0 };
        }
        throw new Error(responseData.message || "Failed to fetch pending reviews");
      }

      return responseData;
    } catch (error) {
      console.error("Error fetching pending reviews:", error);
      // Return empty array instead of throwing error
      return { pending_reviews: [], count: 0 };
    }
  },
  // Dismiss review reminder
  dismissReviewReminder: async (bookingId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/users/reviews/dismiss-reminder",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ booking_id: bookingId }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to dismiss review reminder");
      }

      return await response.json();
    } catch (error) {
      console.error("Error dismissing review reminder:", error);
      throw error;
    }
  },

  // Skip all reminders
  skipAllReviewReminders: async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/users/reviews/skip-all-reminders",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to skip all reminders");
      }

      return await response.json();
    } catch (error) {
      console.error("Error skipping all reminders:", error);
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
  lockSlot: async (slotId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/bookings/slots/${slotId}/lock`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to lock slot');
      }
      return await response.json();
    } catch (error) {
      console.error("Error locking slot:", error);
      throw error;
    }
  },

  // Update releaseSlot
  releaseSlot: async (slotId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/bookings/slots/${slotId}/release`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to release slot');
      }
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
  // Add these methods to integrationService.js

  blockOwner: async (ownerId, blockData) => {
    try {
      const token = localStorage.getItem('adminToken');

      if (!token) {
        throw new Error('No admin token found');
      }

      console.log('🔒 API Call - Block owner:', { ownerId, blockData });

      const response = await fetch(`http://localhost:5000/api/super-admin/owners/${ownerId}/block`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: blockData.reason,
          block_arenas: blockData.block_arenas !== false,
          notify_owner: blockData.notify_owner !== false
        })
      });

      const responseText = await response.text();
      console.log('📡 Block owner response:', response.status, responseText);

      if (!response.ok) {
        let errorMessage = 'Failed to block owner';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = JSON.parse(responseText);
      console.log('✅ Owner blocked successfully:', result);
      return result;

    } catch (error) {
      console.error('❌ Block owner error:', error);
      throw error;
    }
  },

  // UNBLOCK OWNER - Complete function
  unblockOwner: async (ownerId, unblockData) => {
    try {
      const token = localStorage.getItem('adminToken');

      if (!token) {
        throw new Error('No admin token found');
      }

      console.log('🔓 API Call - Unblock owner:', { ownerId, unblockData });

      const response = await fetch(`http://localhost:5000/api/super-admin/owners/${ownerId}/unblock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          unblock_arenas: true,
          notify_owner: unblockData.notify_owner !== false
        })
      });

      const responseText = await response.text();
      console.log('📡 Unblock owner response:', response.status, responseText);

      if (!response.ok) {
        let errorMessage = 'Failed to unblock owner';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = JSON.parse(responseText);
      console.log('✅ Owner unblocked successfully:', result);
      return result;

    } catch (error) {
      console.error('❌ Unblock owner error:', error);
      throw error;
    }
  },

  // Add to integrationService.js
  exportFinancialReport: async (startDate, endDate) => {
    try {
      const token = localStorage.getItem('adminToken');

      if (!token) {
        throw new Error('No admin token found');
      }

      const response = await fetch(
        `http://localhost:5000/api/super-admin/export/financial-report?format=excel&start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Export failed');
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial_report_${startDate}_to_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { success: true };

    } catch (error) {
      console.error('❌ Export error:', error);
      throw error;
    }
  },

  getManagerDashboard: async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/managers/dashboard",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) throw new Error("Failed to fetch manager dashboard");
      return await response.json();
    } catch (error) {
      console.error("Error fetching manager dashboard:", error);
      throw error;
    }
  },

  getManagerBookings: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) queryParams.append(key, filters[key]);
      });

      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/managers/bookings?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) throw new Error("Failed to fetch manager bookings");
      return await response.json();
    } catch (error) {
      console.error("Error fetching manager bookings:", error);
      throw error;
    }
  },

  acceptManagerBooking: async (bookingId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/managers/bookings/${bookingId}/accept`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error accepting booking:", error);
      throw error;
    }
  },

  rejectManagerBooking: async (bookingId, reason) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/managers/bookings/${bookingId}/reject`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ reason })
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error rejecting booking:", error);
      throw error;
    }
  },

  completeManagerBooking: async (bookingId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/managers/bookings/${bookingId}/complete`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error completing booking:", error);
      throw error;
    }
  },

  getManagerCalendar: async (arenaId, date, courtId = null) => {
    try {
      const params = new URLSearchParams({
        arena_id: arenaId,
        date: date
      });

      if (courtId) params.append("court_id", courtId);

      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/managers/calendar?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) throw new Error("Failed to fetch calendar");
      return await response.json();
    } catch (error) {
      console.error("Error fetching calendar:", error);
      throw error;
    }
  },

  updateManagerTimeSlots: async (arenaId, date, slots, courtId = null) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/managers/calendar/slots`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            arena_id: arenaId,
            date: date,
            action: "update_slots",
            slots: slots,
            court_id: courtId
          })
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error updating time slots:", error);
      throw error;
    }
  },

  getManagerCourts: async (arenaId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/managers/courts/${arenaId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) throw new Error("Failed to fetch courts");
      return await response.json();
    } catch (error) {
      console.error("Error fetching courts:", error);
      throw error;
    }
  },

  getManagerArenas: async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/managers/arenas`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) throw new Error("Failed to fetch arenas");
      return await response.json();
    } catch (error) {
      console.error("Error fetching arenas:", error);
      throw error;
    }
  },

  getManagerStats: async (period = "month") => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/managers/stats?period=${period}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) throw new Error("Failed to fetch stats");
      return await response.json();
    } catch (error) {
      console.error("Error fetching stats:", error);
      throw error;
    }
  },

  getManagerProfile: async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/managers/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) throw new Error("Failed to fetch profile");
      return await response.json();
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  },

  updateManagerProfile: async (data) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/managers/profile`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data)
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  },

};

export default integrationService;