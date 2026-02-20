// services/uploadService.js - COMPLETE FIX
import axios from 'axios';

// ✅ FIXED: Use window location for fallback instead of process.env
const API_BASE_URL = typeof process !== 'undefined' && process.env?.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL
    : `${window.location.protocol}//${window.location.hostname}:5000/api`;

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 second timeout for uploads
});

// Add token to requests
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        console.log('🔐 Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('✅ Authorization header set');
        } else {
            console.warn('⚠️ NO TOKEN FOUND - User may not be authenticated');
        }
        return config;
    },
    (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Handle response errors
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('❌ Response error:', {
            status: error.response?.status,
            message: error.response?.data?.message,
            url: error.config?.url
        });

        // DON'T auto-redirect on errors - let the calling function handle it
        // This prevents unexpected redirects during uploads

        return Promise.reject(error);
    }
);

export const uploadService = {
    /**
     * Upload court photos
     * @param {number} courtId - Court ID
     * @param {File[]} files - Array of File objects
     * @returns {Promise} Response from server
     */
    uploadCourtPhotos: async (courtId, files) => {
        console.log('📤 uploadService.uploadCourtPhotos called');
        console.log('Court ID:', courtId);
        console.log('Files count:', files.length);

        // Validate inputs
        if (!courtId) {
            throw new Error('Court ID is required');
        }

        if (!Array.isArray(files) || files.length === 0) {
            throw new Error('At least one file is required');
        }

        // Validate each file
        const validFiles = [];
        for (const file of files) {
            console.log(`📁 Validating file: ${file.name}`);

            if (!(file instanceof File)) {
                console.warn(`⚠️ Skipping non-File object: ${file.name}`);
                continue;
            }

            if (!file.type.startsWith('image/')) {
                throw new Error(`Invalid file type: ${file.type}. Only images allowed.`);
            }

            if (file.size > 10 * 1024 * 1024) {
                throw new Error(`File too large: ${file.name}. Max 10MB per file.`);
            }

            validFiles.push(file);
            console.log(`✅ File valid: ${file.name} (${file.size} bytes)`);
        }

        if (validFiles.length === 0) {
            throw new Error('No valid image files provided');
        }

        // Create FormData
        console.log('📦 Creating FormData...');
        const formData = new FormData();

        validFiles.forEach((file, index) => {
            console.log(`📝 Adding file ${index} to FormData: ${file.name}`);
            formData.append('court_images', file);
        });

        // Log FormData contents (for debugging)
        console.log('📊 FormData contents:');
        for (let pair of formData.entries()) {
            console.log(`  - ${pair[0]}: ${pair[1].name || pair[1]}`);
        }

        try {
            const url = `/owners/courts/${courtId}/photos`;
            const fullUrl = `${API_BASE_URL}${url}`;
            console.log('🌐 POST request to:', fullUrl);
            console.log('📦 FormData entries:', Array.from(formData.entries()).map(e => `${e[0]}: ${e[1].name}`));

            const response = await axiosInstance.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const percentComplete = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    console.log(`⬆️ Upload progress: ${percentComplete}%`);
                },
            });

            console.log('✅ Upload successful!');
            console.log('Response:', response.data);

            return response.data;
        } catch (error) {
            console.error('❌ FULL ERROR DETAILS:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers
                }
            });

            // Provide detailed error message
            if (error.response?.data?.message) {
                throw new Error(error.response.data.message);
            }

            if (error.response?.status === 401) {
                throw new Error('Unauthorized: Your session may have expired. Please login again.');
            }

            if (error.response?.status === 403) {
                throw new Error('You do not have permission to upload photos for this court');
            }

            if (error.response?.status === 404) {
                throw new Error('Court not found');
            }

            if (error.response?.status === 400) {
                throw new Error(error.response.data.error || 'Invalid request');
            }

            throw new Error(
                error.message || 'Failed to upload photos. Please try again.'
            );
        }
    },

    /**
     * Upload arena photos
     * @param {number} arenaId - Arena ID
     * @param {File[]} files - Array of File objects
     * @returns {Promise} Response from server
     */
    uploadArenaPhotos: async (arenaId, files) => {
        console.log('📤 uploadService.uploadArenaPhotos called');
        console.log('Arena ID:', arenaId);
        console.log('Files count:', files.length);

        if (!arenaId) {
            throw new Error('Arena ID is required');
        }

        if (!Array.isArray(files) || files.length === 0) {
            throw new Error('At least one file is required');
        }

        const validFiles = [];
        for (const file of files) {
            if (!(file instanceof File)) continue;
            if (!file.type.startsWith('image/')) {
                throw new Error(`Invalid file type: ${file.type}`);
            }
            if (file.size > 10 * 1024 * 1024) {
                throw new Error(`File too large: ${file.name}`);
            }
            validFiles.push(file);
        }

        if (validFiles.length === 0) {
            throw new Error('No valid image files provided');
        }

        const formData = new FormData();
        validFiles.forEach((file) => {
            formData.append('arena_images', file);
        });

        try {
            const url = `/owners/arenas/${arenaId}/photos`;
            console.log('🌐 POST request to:', url);

            const response = await axiosInstance.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('✅ Arena upload successful!');
            return response.data;
        } catch (error) {
            console.error('❌ Arena upload error:', error);

            if (error.response?.data?.message) {
                throw new Error(error.response.data.message);
            }

            throw new Error(error.message || 'Failed to upload arena photos');
        }
    },

    /**
     * Test upload connection (for debugging)
     * @returns {Promise} Test response
     */


    /**
     * Delete court photo
     * @param {number} courtId - Court ID
     * @param {number} photoId - Photo ID
     * @returns {Promise} Response from server
     */
    deleteCourtPhoto: async (courtId, photoId) => {
        console.log(`🗑️ Deleting court photo: ${photoId} from court: ${courtId}`);

        try {
            const response = await axiosInstance.delete(
                `/owners/courts/${courtId}/photos/${photoId}`
            );

            console.log('✅ Photo deleted successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Delete error:', error);
            throw new Error(error.response?.data?.message || 'Failed to delete photo');
        }
    },

    /**
     * Get court images
     * @param {number} courtId - Court ID
     * @returns {Promise} Array of images
     */
    getCourtImages: async (courtId) => {
        console.log(`📸 Fetching images for court: ${courtId}`);

        try {
            const response = await axiosInstance.get(`/owners/courts/${courtId}/images`);
            console.log('✅ Images fetched:', response.data.images.length);
            return response.data;
        } catch (error) {
            console.error('❌ Fetch images error:', error);
            throw error;
        }
    },

    /**
     * Upload profile picture
     * @param {File} file - Profile picture file
     * @returns {Promise} Response from server
     */
    uploadProfilePicture: async (file) => {
        console.log('📤 Uploading profile picture');

        if (!(file instanceof File)) {
            throw new Error('Invalid file object');
        }

        if (!file.type.startsWith('image/')) {
            throw new Error('File must be an image');
        }

        if (file.size > 5 * 1024 * 1024) {
            throw new Error('File too large. Max 5MB');
        }

        const formData = new FormData();
        formData.append('profile_picture', file);

        try {
            const response = await axiosInstance.post(
                '/users/upload-profile-picture',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            console.log('✅ Profile picture uploaded');
            return response.data;
        } catch (error) {
            console.error('❌ Profile upload error:', error);
            throw error;
        }
    },
};

export default uploadService;