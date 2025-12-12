import api from './axiosConfig';

export const bookingAPI = {
    // Public endpoints
    getAvailableSlots: (arenaId, params) =>
        api.get(`/arenas/${arenaId}/slots`, { params }),

    // Owner chat
    sendOwnerMessage: (bookingId, message) =>
        api.post(`/bookings/${bookingId}/owner-chat`, { message }),
};