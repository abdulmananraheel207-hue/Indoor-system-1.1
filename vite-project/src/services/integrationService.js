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
            const [arenaResponse, courtsResponse, reviewsResponse] = await Promise.all([
                arenaAPI.getArenaDetails(arenaId),
                arenaAPI.getArenaCourts(arenaId).catch(() => ({ data: [] })),
                reviewAPI.getReviews(arenaId).catch(() => ({ data: { reviews: [] } })),
            ]);

            return {
                arena: arenaResponse.data,
                courts: Array.isArray(courtsResponse.data) ? courtsResponse.data : (courtsResponse.data.courts || []),
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
    getAvailableSlots: async (arenaId, date, sportId) => {
        try {
            const response = await arenaAPI.getAvailableSlots(arenaId, date, sportId);
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
                // backend expects `total_amount`
                total_amount: bookingData.totalPrice || bookingData.total_amount,
                sport_id: bookingData.sportId || bookingData.sport_id || undefined,
                notes: bookingData.notes || "",
            };

            // Accept either `slot_id` or `slotId` when frontend supplies an existing slot
            if (bookingData.slot_id) payload.slot_id = bookingData.slot_id;
            if (bookingData.slotId) payload.slot_id = bookingData.slotId;

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
            const response = await ownerAPI.getDashboard();
            return response.data;
        } catch (error) {
            console.error("Error fetching owner dashboard:", error);
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
     */
    addToFavorites: async (arenaId) => {
        try {
            const response = await userAPI.addFavorite(arenaId);
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
            const response = await userAPI.removeFavorite(arenaId);
            return response.data;
        } catch (error) {
            console.error("Error removing from favorites:", error);
            throw error;
        }
    },

    /**
     * Get user's favorite arenas
     */
    getUserFavorites: async () => {
        try {
            const response = await userAPI.getFavorites();
            return response.data;
        } catch (error) {
            console.error("Error fetching favorites:", error);
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

    // ====== BOOKINGS ======

    bookSlot: async (bookingData) => {
        try {
            const response = await bookingAPI.createBooking(bookingData);
            return response.data;
        } catch (error) {
            console.error("Error booking slot:", error);
            throw error;
        }
    },

    getUserBookings: async () => {
        try {
            const response = await bookingAPI.getUserBookings();
            return response.data;
        } catch (error) {
            console.error("Error fetching user bookings:", error);
            throw error;
        }
    },

    // ====== OWNER DASHBOARD ======

    getOwnerBookings: async () => {
        try {
            const response = await ownerAPI.getOwnerBookings();
            return response.data;
        } catch (error) {
            console.error("Error fetching owner bookings:", error);
            throw error;
        }
    },

    respondToBooking: async (bookingId, status) => {
        try {
            const response = await ownerAPI.respondToBooking(bookingId, status);
            return response.data;
        } catch (error) {
            console.error("Error updating booking status:", error);
            throw error;
        }
    },

};

export default integrationService;
