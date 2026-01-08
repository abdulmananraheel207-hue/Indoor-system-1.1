// services/uploadService.js - FIXED EXPORTS
class UploadService {
    constructor(baseURL = "http://localhost:5000") {
        this.baseURL = baseURL;
    }

    getAuthHeader() {
        const token = localStorage.getItem("token");
        if (!token) {
            throw new Error("Authentication required. Please login.");
        }
        return { 'Authorization': `Bearer ${token}` };
    }

    async uploadCourtPhotos(courtId, files) {
        try {
            console.group("📤 Upload Service - Uploading Court Photos");
            console.log("Court ID:", courtId);
            console.log("Files:", files);

            const formData = new FormData();

            // Add each file
            files.forEach((file, index) => {
                formData.append("court_images", file);
                console.log(`Added file ${index}: ${file.name}`);
            });

            // Show FormData contents (for debugging)
            for (let pair of formData.entries()) {
                console.log(`FormData: ${pair[0]} = ${pair[1] instanceof File ? `File: ${pair[1].name}` : pair[1]}`);
            }

            const response = await fetch(
                `${this.baseURL}/api/owners/courts/${courtId}/photos`,
                {
                    method: "POST",
                    headers: this.getAuthHeader(),
                    body: formData,
                }
            );

            console.log("Response Status:", response.status);

            const result = await response.json();
            console.log("Response Data:", result);

            if (!response.ok) {
                console.error("Upload failed:", result);
                throw new Error(result.message || "Upload failed");
            }

            console.groupEnd();
            return result;
        } catch (error) {
            console.error("Upload service error:", error);
            console.groupEnd();
            throw error;
        }
    }

    async testUpload() {
        try {
            console.log("🧪 Testing upload connection...");

            // Create a test image
            const testImage = await this.createTestImage();
            const formData = new FormData();
            formData.append("court_images", testImage);

            const response = await fetch(
                `${this.baseURL}/api/owners/debug/upload-test`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            const result = await response.json();
            console.log("Test upload result:", result);
            return result;
        } catch (error) {
            console.error("Test upload failed:", error);
            throw error;
        }
    }

    async createTestImage() {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 300;
            const ctx = canvas.getContext('2d');

            // Create a colorful test image
            ctx.fillStyle = '#3498db';
            ctx.fillRect(0, 0, 400, 300);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('UPLOAD TEST', 200, 100);
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(100, 150, 200, 100);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('✓', 200, 215);

            canvas.toBlob((blob) => {
                const file = new File([blob], 'upload-test.jpg', {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                });
                resolve(file);
            }, 'image/jpeg', 0.9);
        });
    }

    async checkServerStatus() {
        try {
            const response = await fetch(`${this.baseURL}/api/health`);
            return await response.json();
        } catch (error) {
            console.error("Server check failed:", error);
            return { status: 'offline', error: error.message };
        }
    }
}

// Export the class and a default instance
export const uploadService = new UploadService();

// Also export the class if needed
export { UploadService };