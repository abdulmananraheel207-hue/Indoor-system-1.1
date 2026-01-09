// backend/middleware/upload.js - FULLY FIXED VERSION
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("✓ Cloudinary configured:", process.env.CLOUDINARY_CLOUD_NAME);

// Get folder name based on upload type
const getFolderName = (req, file) => {
  // Extract from URL path since params might not be set yet
  const url = req.originalUrl;

  if (file.fieldname === "profile_picture") {
    const userId = req.user?.id;
    return `sports-arena/users/${userId}/profile`;
  }
  else if (file.fieldname === "arena_images") {
    // Extract arena_id from URL: /owners/arenas/:arena_id/photos
    const arenaMatch = url.match(/\/arenas\/(\d+)\/photos/);
    const arenaId = arenaMatch ? arenaMatch[1] : "unknown";
    return `sports-arena/arenas/${arenaId}`;
  }
  else if (file.fieldname === "court_images") {
    // Extract court_id from URL: /owners/courts/:court_id/photos
    const courtMatch = url.match(/\/courts\/(\d+)\/photos/);
    const courtId = courtMatch ? courtMatch[1] : "unknown";
    console.log("📍 Court Image Upload - Extracted court_id from URL:", courtId);
    return `sports-arena/courts/${courtId}`;
  }

  return "sports-arena/others";
};

// Get public ID (filename in Cloudinary)
const getPublicId = (req, file) => {
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  const originalName = file.originalname.replace(/\.[^/.]+$/, ""); // Remove extension
  const safeName = originalName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  return `${safeName}-${uniqueSuffix}`;
};

// Create storage engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    const folder = getFolderName(req, file);
    const public_id = getPublicId(req, file);

    console.log("📦 Uploading to Cloudinary:", {
      folder: folder,
      public_id: public_id,
      fieldname: file.fieldname,
    });

    // Different transformations for different types
    let transformations = [];

    if (file.fieldname === "profile_picture") {
      transformations = [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto:good" },
      ];
    } else if (
      file.fieldname === "arena_images" ||
      file.fieldname === "court_images"
    ) {
      transformations = [
        { width: 1200, height: 800, crop: "limit" },
        { quality: "auto:good" },
      ];
    } else {
      transformations = [{ quality: "auto:good" }];
    }

    return {
      folder: folder,
      public_id: public_id,
      resource_type: "image",
      format: "jpg",
      transformation: transformations,
      tags: ["sports-arena", file.fieldname],
    };
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Invalid file type. Allowed: ${allowedMimeTypes.join(", ")}`),
      false
    );
  }
};

// Create upload instance with proper error handling
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 3, // Max 3 files per upload (per your requirement)
  },
  fileFilter: fileFilter,
});

// Middleware wrapper to handle errors
const handleUpload = (uploadMethod) => {
  return (req, res, next) => {
    uploadMethod(req, res, (err) => {
      if (err) {
        console.error("❌ Upload error:", err);

        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              success: false,
              message: "File too large. Maximum size is 10MB per file",
            });
          }
          if (err.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({
              success: false,
              message: "Too many files. Maximum is 3 files per upload",
            });
          }
        }

        return res.status(400).json({
          success: false,
          message: "Upload error: " + err.message,
        });
      }

      // Log successful file reception
      if (req.files && req.files.length > 0) {
        console.log(
          `✅ ${req.files.length} files received and processed by Cloudinary`
        );
      }

      next();
    });
  };
};

module.exports = {
  uploadProfilePicture: handleUpload(upload.single("profile_picture")),
  uploadArenaImages: handleUpload(upload.array("arena_images", 3)),
  uploadCourtImages: handleUpload(upload.array("court_images", 3)),
  cloudinary,
};