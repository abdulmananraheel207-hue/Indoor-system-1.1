/**
 * Integration Service
 * Handles all interactions between User and Owner modules
 * Manages the complete booking flow
 */

import { userAPI, ownerAPI, bookingAPI, arenaAPI, reviewAPI } from "./api";

export const integrationService = {
  // ===== ARENA BROWSING (User Module) =====

  /**
   * Get all arenas with filters
   */
  getAllArenas: async (filters = {}) => {
    try {
      const response = await arenaAPI.getAllArenas(filters);
      return response.data;
    } catch (error) {
      console.error("Error fetching arenas:", error);
      throw error;
    }
  },

  /**
   * Search arenas by location, sport, or query
   */
  searchArenas: async (params) => {
    try {
      const response = await arenaAPI.searchArenas(params);
      return response.data;
    } catch (error) {
      console.error("Error searching arenas:", error);
      throw error;
    }
  },

  /**
   * Get detailed information about a specific arena
   * Includes all courts and current prices
   */
  getArenaDetails: async (arenaId) => {
    try {
      const [arenaResponse, courtsResponse, reviewsResponse] =
        await Promise.all([
          arenaAPI.getArenaDetails(arenaId),
          arenaAPI.getArenaCourts(arenaId).catch(() => ({ data: [] })),
          reviewAPI
            .getReviews(arenaId)
            .catch(() => ({ data: { reviews: [] } })),
        ]);

      return {
        arena: arenaResponse.data,
        courts: Array.isArray(courtsResponse.data)
          ? courtsResponse.data
          : courtsResponse.data.courts || [],
        reviews: reviewsResponse.data.reviews || [],
      };
    } catch (error) {
      console.error("Error fetching arena details:", error);
      throw error;
    }
  },

  /**
   * Get available time slots for an arena on a specific date
   */
  getAvailableSlots: async (arenaId, date = null, sportId = null) => {
    try {
      const params = {};
      if (date) params.date = date;
      if (sportId) params.sport_id = sportId;
      const response = await arenaAPI.getAvailableSlots(arenaId, params);
      return response.data;
    } catch (error) {
      console.error("Error fetching available slots:", error);
      throw error;
    }
  },

  /**
   * Get sports categories
   */
  getSportsCategories: async () => {
    try {
      const response = await arenaAPI.getSportsCategories();
      return response.data;
    } catch (error) {
      console.error("Error fetching sports:", error);
      throw error;
    }
  },

  // ===== BOOKING FLOW (User → Owner) =====

  /**
   * Create a booking request
   * User selects arena, court, date, time slots and creates booking
   */
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

      // Accept either `slot_id` or `slotId` when frontend supplies an existing slot
      if (bookingData.slot_id) payload.slot_id = bookingData.slot_id;
      if (bookingData.slotId) payload.slot_id = bookingData.slotId;
      if (bookingData.slot_ids || bookingData.slotIds) {
        const ids = bookingData.slot_ids || bookingData.slotIds;
        payload.slot_ids = Array.isArray(ids) ? ids : [ids];
      }

      const response = await bookingAPI.createBooking(payload);
      return response.data;
    } catch (error) {
      console.error("Error creating booking:", error);
      throw error;
    }
  },

  /**
   * Get user's bookings
   */
  getUserBookings: async (filters = {}) => {
    try {
      const response = await bookingAPI.getUserBookings(filters);
      return response.data;
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      throw error;
    }
  },

  /**
   * Get booking details
   */
  getBookingDetails: async (bookingId) => {
    try {
      const response = await bookingAPI.getBookingDetails(bookingId);
      return response.data;
    } catch (error) {
      console.error("Error fetching booking details:", error);
      throw error;
    }
  },

  /**
   * Cancel a user booking
   */
  cancelBooking: async (bookingId, reason) => {
    try {
      const response = await bookingAPI.cancelBooking(bookingId, { reason });
      return response.data;
    } catch (error) {
      console.error("Error cancelling booking:", error);
      throw error;
    }
  },

  // ===== BOOKING MANAGEMENT (Owner Module) =====

  /**
   * Get all booking requests for owner's arenas
   * Filters: pending, accepted, completed, rejected, cancelled
   */
  getOwnerBookingRequests: async (filters = {}) => {
    try {
      const response = await ownerAPI.getOwnerBookings(filters);
      return response.data;
    } catch (error) {
      console.error("Error fetching owner bookings:", error);
      throw error;
    }
  },

  /**
   * Accept a booking request
   * Owner reviews and approves user's booking
   */
  acceptBookingRequest: async (bookingId) => {
    try {
      const response = await ownerAPI.acceptBooking(bookingId);
      return response.data;
    } catch (error) {
      console.error("Error accepting booking:", error);
      throw error;
    }
  },

  /**
   * Reject a booking request
   * Owner can reject with a reason
   */
  rejectBookingRequest: async (bookingId, reason) => {
    try {
      const response = await ownerAPI.rejectBooking(bookingId, { reason });
      return response.data;
    } catch (error) {
      console.error("Error rejecting booking:", error);
      throw error;
    }
  },

  /**
   * Complete a booking (mark as completed)
   */
  completeBooking: async (bookingId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/owners/bookings/${bookingId}/complete`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error completing booking:", error);
      throw error;
    }
  },

  /**
   * Get owner's booking statistics
   */
  getOwnerBookingStats: async (period = "month") => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/owners/bookings/stats?period=${period}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error fetching booking stats:", error);
      throw error;
    }
  },

  /**
   * Get owner's arenas
   */
  getOwnerArenas: async () => {
    try {
      const response = await ownerAPI.getArenas();
      return response.data;
    } catch (error) {
      console.error("Error fetching owner arenas:", error);
      throw error;
    }
  },

  /**
   * Get owner's dashboard data
   */
  getOwnerDashboard: async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/owners/dashboard",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error fetching owner dashboard:", error);
      throw error;
    }
  },

  /**
   * Get time slots for specific arena and date (Owner)
   */
  getOwnerTimeSlots: async (arenaId, date) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/owners/arenas/${arenaId}/slots?date=${date}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error fetching time slots:", error);
      throw error;
    }
  },

  /**
   * Manage time slots (Owner)
   */
  manageTimeSlots: async (arenaId, payload) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/owners/arenas/${arenaId}/slots`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error managing time slots:", error);
      throw error;
    }
  },

  // ===== REVIEWS & RATINGS =====

  /**
   * Submit a review for an arena
   */
  submitReview: async (arenaId, rating, comment) => {
    try {
      const response = await reviewAPI.submitReview(arenaId, {
        rating,
        comment,
      });
      return response.data;
    } catch (error) {
      console.error("Error submitting review:", error);
      throw error;
    }
  },

  /**
   * Get reviews for an arena
   */
  getArenaReviews: async (arenaId) => {
    try {
      const response = await reviewAPI.getReviews(arenaId);
      return response.data;
    } catch (error) {
      console.error("Error fetching reviews:", error);
      throw error;
    }
  },

  // ===== USER PROFILE =====

  /**
   * Get user profile
   */
  getUserProfile: async () => {
    try {
      const response = await userAPI.getProfile();
      return response.data;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw error;
    }
  },

  /**
   * Update user profile
   */
  updateUserProfile: async (profileData) => {
    try {
      const response = await userAPI.updateProfile(profileData);
      return response.data;
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  },

  // ===== FAVORITES =====

  /**
   * Add arena to favorites
   *
   *
   */

  // Get user's favorite arenas
  getFavoriteArenas: async () => {
    try {
      const response = await userAPI.getFavorites(); // Using userAPI
      return response.data;
    } catch (error) {
      console.error("Error fetching favorite arenas:", error);
      throw error;
    }
  },
  addToFavorites: async (arenaId) => {
    try {
      const response = await userAPI.addToFavorites(arenaId); // Correct method name
      return response.data;
    } catch (error) {
      console.error("Error adding to favorites:", error);
      throw error;
    }
  },

  /**
   * Remove arena from favorites
   */
  removeFromFavorites: async (arenaId) => {
    try {
      const response = await userAPI.removeFromFavorites(arenaId); // Correct method name
      return response.data;
    } catch (error) {
      console.error("Error removing from favorites:", error);
      throw error;
    }
  },

  // ===== OWNER PROFILE =====

  /**
   * Get owner profile
   */
  getOwnerProfile: async () => {
    try {
      const response = await ownerAPI.getProfile();
      return response.data;
    } catch (error) {
      console.error("Error fetching owner profile:", error);
      throw error;
    }
  },

  /**
   * Update owner profile
   */
  updateOwnerProfile: async (profileData) => {
    try {
      const response = await ownerAPI.updateProfile(profileData);
      return response.data;
    } catch (error) {
      console.error("Error updating owner profile:", error);
      throw error;
    }
  },

  // ===== HELPER FUNCTIONS =====

  /**
   * Format date to YYYY-MM-DD
   */
  formatDate: (date) => {
    if (typeof date === "string") return date;
    return date.toISOString().split("T")[0];
  },

  /**
   * Format time to HH:MM
   */
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

  // ====== TIME SLOTS ======

  lockSlot: async (slotId) => {
    try {
      const response = await arenaAPI.lockTimeSlot(slotId);
      return response.data;
    } catch (error) {
      console.error("Error locking slot:", error);
      throw error;
    }
  },

  releaseSlot: async (slotId) => {
    try {
      const response = await arenaAPI.releaseTimeSlot(slotId);
      return response.data;
    } catch (error) {
      console.error("Error releasing slot:", error);
      throw error;
    }
  },

  // ====== PAYMENT ======

  /**
   * Upload payment screenshot
   */
  uploadPaymentScreenshot: async (bookingId, paymentData) => {
    try {
      const response = await bookingAPI.uploadPaymentScreenshot(
        bookingId,
        paymentData
      );
      return response.data;
    } catch (error) {
      console.error("Error uploading payment screenshot:", error);
      throw error;
    }
  },

  // ====== NOTIFICATIONS ======

  /**
   * Get user notifications
   */
  getUserNotifications: async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      return await response.json();
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  },

  /**
   * Mark notification as read
   */
  markNotificationAsRead: async (notificationId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  },

  // ====== ADMIN ======
  getAdminDashboard: async () => {
    const response = await import("./api").then(({ adminAPI }) =>
      adminAPI.getDashboard()
    );
    return response.data;
  },

  getAdminArenas: async (params = {}) => {
    const response = await import("./api").then(({ adminAPI }) =>
      adminAPI.getArenas(params)
    );
    return response.data;
  },

  toggleArenaBlock: async (arenaId, isBlocked, reason = "") => {
    const response = await import("./api").then(({ adminAPI }) =>
      adminAPI.toggleArenaBlock(arenaId, isBlocked, reason)
    );
    return response.data;
  },

  markArenaPayment: async (arenaId, payload) => {
    const response = await import("./api").then(({ adminAPI }) =>
      adminAPI.markPaymentCompleted(arenaId, payload)
    );
    return response.data;
  },

  // ====== CLEANUP ======
  cleanupExpiredLocks: async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/owners/cleanup/expired-locks",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
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
