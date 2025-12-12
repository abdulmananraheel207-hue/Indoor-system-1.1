import api from './axiosConfig';

export const authAPI = {
    // User Auth
    userLogin: (email, password) =>
        axios.post('http://localhost:5000/api/auth/login', { email, password }),

    userRegister: (userData) =>
        api.post('/auth/user/register', userData),

    userLogout: () =>
        api.post('/auth/user/logout'),

    // Owner Auth
    ownerLogin: (email, password) =>
        api.post('/auth/owner/login', { email, password }),

    ownerRegister: (ownerData) =>
        api.post('/auth/owner/register', ownerData),

    // Admin Auth
    adminLogin: (email, password) =>
        api.post('/auth/admin/login', { email, password }),

    // Manager Auth
    managerLogin: (email, password) =>
        api.post('/auth/manager/login', { email, password }),
};