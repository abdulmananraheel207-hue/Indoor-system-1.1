import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to all requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const arenaAPI = {
  getSportsCategories: () => API.get("/arenas/sports"),
  getArenaDetails: (arenaId) => API.get(`/arenas/${arenaId}`),
  getAvailableSlots: (arenaId, date, sportId) =>
    API.get(`/arenas/${arenaId}/slots`, {
      params: { date, sport_id: sportId },
    }),
  searchArenas: (params) => API.get("/arenas/search", { params }),
  lockTimeSlot: (slotId) => API.post(`/user/slots/${slotId}/lock`),
  releaseTimeSlot: (slotId) => API.delete(`/user/slots/${slotId}/lock`),
};

export const bookingAPI = {
  createBooking: (data) => API.post("/bookings", data),
  getUserBookings: (params) => API.get("/bookings", { params }),
  getBookingDetails: (bookingId) => API.get(`/bookings/${bookingId}`),
  cancelBooking: (bookingId, data) =>
    API.put(`/bookings/${bookingId}/cancel`, data),
  uploadPayment: (bookingId, data) =>
    API.put(`/bookings/${bookingId}/payment`, data),
  getBookingStats: () => API.get("/bookings/stats"),
  getAvailableSlots: (params) =>
    API.get("/bookings/slots/available", { params }),
  completeBooking: (bookingId) => API.put(`/bookings/${bookingId}/complete`),
};

export const userAPI = {
  getProfile: () => API.get("/user/profile"),
  updateProfile: (data) => API.put("/user/profile", data),
  getNearbyArenas: (params) => API.get("/user/arenas/nearby", { params }),
  addFavorite: (arenaId) => API.post(`/user/arenas/${arenaId}/favorite`),
  removeFavorite: (arenaId) => API.delete(`/user/arenas/${arenaId}/favorite`),
  updateProfilePicture: (data) => API.put("/user/profile/picture", data),
  changePassword: (data) => API.put("/user/profile/password", data),
};

export const authAPI = {
  login: (data) => API.post("/auth/login", data),
  registerUser: (data) => API.post("/auth/register/user", data),
  registerOwner: (data) => API.post("/auth/register/owner", data),
  logout: () => API.post("/auth/logout"),
};

// Add these to your existing api.js
export const tournamentAPI = {
  createTournament: (data) => API.post("/user/tournaments", data),
  getTournaments: () => API.get("/user/tournaments"),
  getTournamentDetails: (tournamentId) =>
    API.get(`/user/tournaments/${tournamentId}`),
};

export const reviewAPI = {
  submitReview: (arenaId, data) => API.post(`/arenas/${arenaId}/reviews`, data),
  getReviews: (arenaId) => API.get(`/arenas/${arenaId}/reviews`),
};

export const chatAPI = {
  getMessages: (bookingId) => API.get(`/bookings/${bookingId}/messages`),
  sendMessage: (bookingId, data) =>
    API.post(`/bookings/${bookingId}/messages`, data),
};

export default API;
