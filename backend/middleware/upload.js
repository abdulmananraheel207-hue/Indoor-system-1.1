// backend/middleware/upload.js - IMPROVED CLOUDINARY VERSION
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});



console.log('✓ Cloudinary configured:', process.env.CLOUDINARY_CLOUD_NAME);

// Get folder name based on upload type
const getFolderName = (req, file) => {
    if (file.fieldname === 'profile_picture') {
        return `sports-arena/users/${req.user.id}/profile`;
    } else if (file.fieldname === 'arena_images') {
        const arenaId = req.params.arena_id;
        return `sports-arena/arenas/${arenaId}`;
    } else if (file.fieldname === 'court_images') {
        const courtId = req.params.court_id;
        return `sports-arena/courts/${courtId}`;
    }
    return 'sports-arena/others';
};

// Get public ID (filename in Cloudinary)
const getPublicId = (req, file) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const originalName = file.originalname.replace(/\.[^/.]+$/, ""); // Remove extension
    const safeName = originalName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    return `${safeName}-${uniqueSuffix}`;
};

// Create storage engine
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
        const folder = getFolderName(req, file);
        const public_id = getPublicId(req, file);

        // Different transformations for different types
        let transformations = [];

        if (file.fieldname === 'profile_picture') {
            transformations = [
                { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // Profile pic crop
                { quality: 'auto:good' }
            ];
        } else if (file.fieldname === 'arena_images' || file.fieldname === 'court_images') {
            transformations = [
                { width: 1200, height: 800, crop: 'limit' }, // Limit size for arena/court photos
                { quality: 'auto:good' }
            ];
        } else {
            transformations = [
                { quality: 'auto:good' }
            ];
        }

        return {
            folder: folder,
            public_id: public_id,
            resource_type: 'image',
            format: 'jpg',
            transformation: transformations,
            tags: ['sports-arena', file.fieldname] // Add tags for organization
        };
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed: ${allowedMimeTypes.join(', ')}`), false);
    }
};

// Create upload instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 20 // Max 20 files per upload
    },
    fileFilter: fileFilter
});

// Middleware wrapper to handle errors
const handleUpload = (uploadMethod) => {
    return (req, res, next) => {
        uploadMethod(req, res, (err) => {
            if (err) {
                if (err instanceof multer.MulterError) {
                    // Multer-specific errors
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        return res.status(400).json({
                            message: 'File too large. Maximum size is 10MB'
                        });
                    }
                    if (err.code === 'LIMIT_FILE_COUNT') {
                        return res.status(400).json({
                            message: 'Too many files. Maximum is 20 files per upload'
                        });
                    }
                }
                return res.status(400).json({
                    message: 'Upload error',
                    error: err.message
                });
            }
            next();
        });
    };
};

module.exports = {
    uploadProfilePicture: handleUpload(upload.single('profile_picture')),
    uploadArenaImages: handleUpload(upload.array('arena_images', 20)),
    uploadCourtImages: handleUpload(upload.array('court_images', 20)),
    cloudinary // Export for potential use elsewhere
};