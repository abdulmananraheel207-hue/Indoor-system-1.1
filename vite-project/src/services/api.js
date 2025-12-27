// api.js - UPDATED VERSION
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to all requests
API.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") || localStorage.getItem("adminToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const arenaAPI = {
  getSportsCategories: () => API.get("/arenas/sports"),
  getArenaDetails: (arenaId) => API.get(`/arenas/${arenaId}`),
  getArenaCourts: (arenaId) => API.get(`/arenas/${arenaId}/courts`),
  getAllArenas: (params) => API.get("/arenas/all", { params }),
  getAvailableSlots: (arenaId, params) =>
    API.get(`/arenas/${arenaId}/slots`, { params }),
  searchArenas: (params) => API.get("/arenas/search", { params }),
  lockTimeSlot: (slotId) => API.post(`/arenas/slots/${slotId}/lock`, {}),
  releaseTimeSlot: (slotId) => API.post(`/arenas/slots/${slotId}/release`, {}),

  releaseTimeSlot: (slotId) => {
    return axios.post(
      `/api/arenas/slots/${slotId}/release`,
      {},
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }
    );
  },
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
  getFavorites: () => API.get("/user/arenas/favorites"), // NEW: Get all favorites
  updateProfilePicture: (data) => API.put("/user/profile/picture", data),
  changePassword: (data) => API.put("/user/profile/password", data),
  createTeam: (data) => API.post("/user/teams", data), // NEW: Create team
  getTeams: () => API.get("/user/teams"), // NEW: Get user teams
};

export const authAPI = {
  login: (data) => API.post("/auth/login", data),
  registerUser: (data) => API.post("/auth/register/user", data),
  registerOwner: (data) => API.post("/auth/register/owner", data),
  logout: () => API.post("/auth/logout"),
};

export const reviewAPI = {
  submitReview: (arenaId, data) => API.post(`/arenas/${arenaId}/reviews`, data),
  getReviews: (arenaId) => API.get(`/arenas/${arenaId}/reviews`),
};

export const chatAPI = {
  getMessages: (bookingId) => API.get(`/chats/${bookingId}`),
  sendMessage: (bookingId, data) =>
    API.post(`/chats/${bookingId}/message`, data),
};

export const ownerAPI = {
  // Dashboard & Profile
  getDashboard: (params) => API.get("/owners/dashboard", { params }),
  getProfile: () => API.get("/owners/profile"),
  updateProfile: (data) => API.put("/owners/profile", data),

  // Managers
  getManagers: () => API.get("/owners/managers"),
  addManager: (data) => API.post("/owners/managers", data),
  updateManager: (managerId, data) =>
    API.put(`/owners/managers/${managerId}`, data),
  deleteManager: (managerId) => API.delete(`/owners/managers/${managerId}`),

  // Bookings
  getOwnerBookings: (params) => API.get("/owners/bookings", { params }),
  acceptBooking: (bookingId) =>
    API.post(`/owners/bookings/${bookingId}/accept`),
  rejectBooking: (bookingId, data) =>
    API.post(`/owners/bookings/${bookingId}/reject`, data),

  // Arena & Court Management
  getArenas: () => API.get("/owners/arenas"),
  getCourts: (arenaId) => API.get(`/owners/arenas/${arenaId}/courts`),
  updateArena: (arenaId, data) => API.put(`/owners/arenas/${arenaId}`, data),
  uploadCourtPhotos: (courtId, data) =>
    API.post(`/owners/courts/${courtId}/photos`, data),
  updateCourt: (courtId, data) => API.put(`/owners/courts/${courtId}`, data),
  addCourt: (arenaId, data) =>
    API.post(`/owners/arenas/${arenaId}/courts`, data),
  deleteCourtPhoto: (courtId, data) =>
    API.delete(`/owners/courts/${courtId}/photos`, { data }),

  // Time Slots
  getTimeSlots: (arenaId, date) =>
    API.get(`/arenas/${arenaId}/slots`, {
      params: {
        date: typeof date === "object" ? date.date : date,
      },
    }),

  updateTimeSlots: (arenaId, data) =>
    API.put(`/owners/arenas/${arenaId}/slots`, data),

  // Tournaments
  getTournamentRequests: () => API.get("/owners/tournaments"),
  respondToTournament: (tournamentId, data) =>
    API.post(`/owners/tournaments/${tournamentId}/respond`, data),
};
export const adminAPI = {
  getDashboard: () => API.get("/admin/dashboard"),
  getArenas: (params) => API.get("/admin/arenas", { params }),
  toggleArenaBlock: (arenaId, isBlocked, reason = "") =>
    API.put(`/admin/arenas/${arenaId}/block`, {
      is_blocked: isBlocked,
      reason,
    }),
  markPaymentCompleted: (arenaId, payload) =>
    API.post(`/admin/arenas/${arenaId}/payment`, payload),
  getUsers: () => API.get("/admin/users"),
  getOwners: () => API.get("/admin/owners"),
  getFinancialReports: () => API.get("/admin/reports/financial"),
};

export const tournamentAPI = {
  createTournament: (data) => API.post("/tournaments", data),
  getUserTournaments: () => API.get("/user/tournaments"),
};

export default API;
