// frontend/src/services/paymentService.js
const API_BASE_URL = 'http://localhost:5000/api';

const paymentService = {
    // Upload payment screenshot
    uploadScreenshot: async (bookingId, file, notes = '') => {
        const token = localStorage.getItem('token');

        if (!token) {
            throw new Error('No authentication token found');
        }

        const formData = new FormData();
        formData.append('payment_screenshot', file);
        formData.append('notes', notes);

        console.log(`📤 Uploading payment screenshot for booking ${bookingId}...`);

        const response = await fetch(
            `${API_BASE_URL}/payments/bookings/${bookingId}/screenshot`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to upload screenshot');
        }

        console.log('✅ Payment screenshot uploaded:', data);
        return data;
    },

    // Get screenshot for a booking
    getScreenshot: async (bookingId) => {
        const token = localStorage.getItem('token');

        const response = await fetch(
            `${API_BASE_URL}/payments/bookings/${bookingId}/screenshot`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch screenshot');
        }

        return data;
    }
};

export default paymentService;