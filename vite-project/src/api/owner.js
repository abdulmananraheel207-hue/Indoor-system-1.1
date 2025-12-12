import api from './axiosConfig';

export const ownerAPI = {
    // Dashboard
    getDashboard: () => api.get('/owner/dashboard'),
    getStatistics: (params) => api.get('/owner/statistics', { params }),

    // Profile & Arena
    getProfile: () => api.get('/owner/profile'),
    updateProfile: (profileData) => api.put('/owner/profile', profileData),
    getArena: () => api.get('/owner/arena'),
    updateArena: (arenaData) => api.put('/owner/arena', arenaData),

    // Courts
    getCourts: () => api.get('/owner/courts'),
    getCourtDetails: (courtId) => api.get(`/owner/courts/${courtId}`),
    saveCourt: (courtData) => api.post('/owner/courts', courtData),
    deleteCourt: (courtId) => api.delete(`/owner/courts/${courtId}`),

    // Bookings
    getBookings: (params) => api.get('/owner/bookings', { params }),
    updateBookingStatus: (bookingId, statusData) =>
        api.put(`/bookings/${bookingId}/status`, statusData),

    // Time Slots
    updateTimeSlots: (timeSlots) => api.put('/owner/time-slots', { time_slots: timeSlots }),
    blockSlot: (slotData) => api.post('/block-slots', slotData),
    getBlockedSlots: (params) => api.get('/blocked-slots', { params }),
    unblockSlot: (slotId) => api.delete(`/blocked-slots/${slotId}`),

    // Reports
    getRevenueReport: (params) => api.get('/owner/revenue-report', { params }),
    getBookingTrends: (params) => api.get('/owner/booking-trends', { params }),
    exportBookings: (params) => api.get('/export/bookings', {
        params,
        responseType: 'blob'
    }),

    // Sports
    getSports: () => api.get('/owner/sports'),
};