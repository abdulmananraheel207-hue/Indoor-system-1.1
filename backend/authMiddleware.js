// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

const verifyAdminToken = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      config.JWT_SECRET || "arena-booking-secret-key-2024"
    );

    // Check if user is admin
    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Access denied. Admin only.",
      });
    }

    // Attach admin info to request
    req.admin = decoded;
    next();
  } catch (error) {
    console.error("🔐 Token verification error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: "Invalid token.",
      });
    }

    return res.status(401).json({
      success: false,
      error: "Authentication failed.",
    });
  }
};

module.exports = { verifyAdminToken };
