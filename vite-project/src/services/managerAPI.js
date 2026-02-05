import API from "./api";

export const managerAPI = {
    // Dashboard
    getDashboard: () => API.get("/managers/dashboard"),

    // Bookings
    getBookings: (params) => API.get("/managers/bookings", { params }),
    acceptBooking: (bookingId) => API.put(`/managers/bookings/${bookingId}/accept`),
    rejectBooking: (bookingId, reason) => API.put(`/managers/bookings/${bookingId}/reject`, { reason }),
    completeBooking: (bookingId) => API.put(`/managers/bookings/${bookingId}/complete`),

    // Calendar
    getCalendar: (params) => API.get("/managers/calendar", { params }),
    updateTimeSlots: (data) => API.put("/managers/calendar/slots", data),

    // Arena & Courts
    getArenas: () => API.get("/managers/arenas"),
    getCourts: (arenaId) => API.get(`/managers/courts/${arenaId}`),

    // Stats
    getStats: (params) => API.get("/managers/stats", { params }),

    // Profile
    getProfile: () => API.get("/managers/profile"),
    updateProfile: (data) => API.put("/managers/profile", data),
};