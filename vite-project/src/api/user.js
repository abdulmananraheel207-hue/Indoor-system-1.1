import api from './axiosConfig';

export const userAPI = {
    // Dashboard
    getDashboard: () => api.get('/user/dashboard'),

    // Profile
    getProfile: () => api.get('/user/profile'),
    updateProfile: (profileData) => api.put('/user/profile', profileData),

    // Arenas
    getArenas: (params) => api.get('/user/arenas', { params }),
    getArenaDetails: (arenaId) => api.get(`/user/arenas/${arenaId}`),
    getFavoriteArenas: () => api.get('/user/favorites'),
    toggleFavorite: (arenaId, action) =>
        api.post(`/user/arenas/${arenaId}/favorite`, { action }),

    // Bookings
    getBookings: (params) => api.get('/user/bookings', { params }),
    getBookingDetails: (bookingId) => api.get(`/user/bookings/${bookingId}`),
    createBooking: (bookingData) => api.post('/user/bookings', bookingData),
    cancelBooking: (bookingId) => api.post(`/user/bookings/${bookingId}/cancel`),

    // Chat
    sendMessage: (bookingId, message) =>
        api.post(`/user/bookings/${bookingId}/chat`, { message }),

    // Search
    searchArenas: (params) => api.get('/search/arenas', { params }),
    checkAvailability: (params) => api.get('/check-availability', { params }),
};