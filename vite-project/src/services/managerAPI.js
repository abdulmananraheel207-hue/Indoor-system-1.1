import API from "./api";

export const managerAPI = {
    // Dashboard - accessible if has any permission
    getDashboard: () => API.get("/managers/dashboard"),

    // Bookings - requires manage_bookings permission
    getBookings: (params) => API.get("/managers/bookings", { params }),
    acceptBooking: (bookingId) => API.put(`/managers/bookings/${bookingId}/accept`),
    rejectBooking: (bookingId, reason) =>
        API.put(`/managers/bookings/${bookingId}/reject`, { reason }),
    completeBooking: (bookingId) =>
        API.put(`/managers/bookings/${bookingId}/complete`),

    // Calendar - requires manage_calendar permission
    getCalendar: (params) => API.get("/managers/calendar", { params }),
    updateTimeSlots: (data) => API.put("/managers/calendar/slots", data),

    // Arena & Courts - requires manage_arena permission
    getArenas: () => API.get("/managers/arenas"),
    getCourts: (arenaId) => API.get(`/managers/courts/${arenaId}`),

    // Stats - requires view_financials permission
    getStats: (params) => API.get("/managers/stats", { params }),

    // Profile - always accessible
    getProfile: () => API.get("/managers/profile"),
    updateProfile: (data) => API.put("/managers/profile", data),
};