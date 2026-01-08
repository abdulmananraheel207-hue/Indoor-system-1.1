const pool = require("../db");

// Add this helper function at the top of chatController.js
const validateChatAccess = async (req, res, next) => {
  try {
    const { booking_id } = req.params;

    // Check if booking exists and get its status
    const [booking] = await pool.execute(
      `SELECT b.*, a.owner_id, b.user_id 
             FROM bookings b
             JOIN arenas a ON b.arena_id = a.arena_id
             WHERE b.booking_id = ?`,
      [booking_id]
    );

    if (booking.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const bookingData = booking[0];

    // Check booking status
    if (!["pending", "accepted"].includes(bookingData.status)) {
      return res.status(403).json({
        message: "Chat is only available for pending or accepted bookings",
      });
    }

    // Store booking info for later use
    req.booking = bookingData;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const chatController = {
  // Get chat messages for a booking
  getChat: async (req, res) => {
    try {
      const { booking_id } = req.params;

      // 1. Check if booking exists
      const [booking] = await pool.execute(
        `SELECT b.*, a.owner_id 
             FROM bookings b
             JOIN arenas a ON b.arena_id = a.arena_id
             WHERE b.booking_id = ?`,
        [booking_id]
      );

      if (booking.length === 0) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const bookingData = booking[0];

      // 2. Check booking status - only pending or approved
      if (!["pending", "accepted"].includes(bookingData.status)) {
        return res.status(403).json({
          message: "Chat is only available for pending or accepted bookings",
        });
      }

      // 3. Check if user has access to this booking's chat
      let hasAccess = false;

      if (req.user.role === "user") {
        // For users, check if they made the booking
        if (bookingData.user_id === req.user.id) {
          hasAccess = true;
        }
      } else if (req.user.role === "owner" || req.user.role === "manager") {
        // For owners/managers, check if they own the arena
        const ownerId =
          req.user.role === "owner" ? req.user.id : req.user.owner_id;
        if (bookingData.owner_id === ownerId) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this chat" });
      }

      const [messages] = await pool.execute(
        `SELECT c.*, 
                CASE 
                    WHEN c.sender_type = 'user' THEN u.name
                    WHEN c.sender_type = 'owner' THEN ao.arena_name
                END as sender_name
            FROM chats c
            LEFT JOIN users u ON c.sender_type = 'user' AND c.sender_id = u.user_id
            LEFT JOIN arena_owners ao ON c.sender_type = 'owner' AND c.sender_id = ao.owner_id
            WHERE c.booking_id = ?
            ORDER BY c.sent_at ASC`,
        [booking_id]
      );

      res.json({
        booking_id,
        messages,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
  // Send a message in chat
  sendMessage: async (req, res) => {
    try {
      const { booking_id } = req.params;
      const { message } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({ message: "Message cannot be empty" });
      }

      // 1. Check if booking exists and get details
      const [booking] = await pool.execute(
        `SELECT b.*, a.owner_id 
             FROM bookings b
             JOIN arenas a ON b.arena_id = a.arena_id
             WHERE b.booking_id = ?`,
        [booking_id]
      );

      if (booking.length === 0) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const bookingData = booking[0];

      // 2. Check booking status - only pending or approved
      if (!["pending", "accepted"].includes(bookingData.status)) {
        return res.status(403).json({
          message: "Cannot send messages for this booking status",
        });
      }

      // 3. Check if user has access to this booking's chat
      let hasAccess = false;
      let sender_id = req.user.id;
      let sender_type = req.user.role;

      if (req.user.role === "user") {
        // For users, check if they made the booking
        if (bookingData.user_id === req.user.id) {
          hasAccess = true;
        }
      } else if (req.user.role === "owner" || req.user.role === "manager") {
        // For owners/managers, check if they own the arena
        const ownerId =
          req.user.role === "owner" ? req.user.id : req.user.owner_id;
        if (bookingData.owner_id === ownerId) {
          hasAccess = true;
        }

        // For managers sending as owner
        if (req.user.role === "manager") {
          sender_id = req.user.owner_id;
          sender_type = "owner";
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this chat" });
      }

      // 4. Filter message for contact information BEFORE saving
      const filteredMessage = filterContactInfo(message.trim());
      const containsContactInfo = checkForContactInfo(message.trim());

      // 5. Insert message with filtered content
      const [result] = await pool.execute(
        `INSERT INTO chats 
             (booking_id, sender_id, sender_type, message, contains_contact_info)
             VALUES (?, ?, ?, ?, ?)`,
        [
          booking_id,
          sender_id,
          sender_type,
          filteredMessage,
          containsContactInfo,
        ]
      );

      // 6. Get the sent message with sender info
      const [messages] = await pool.execute(
        `SELECT c.*, 
                CASE 
                    WHEN c.sender_type = 'user' THEN u.name
                    WHEN c.sender_type = 'owner' THEN ao.arena_name
                END as sender_name
            FROM chats c
            LEFT JOIN users u ON c.sender_type = 'user' AND c.sender_id = u.user_id
            LEFT JOIN arena_owners ao ON c.sender_type = 'owner' AND c.sender_id = ao.owner_id
            WHERE c.chat_id = ?`,
        [result.insertId]
      );

      res.status(201).json({
        message: "Message sent successfully",
        chat: messages[0],
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
  // Get all chats for a user/owner
  getChats: async (req, res) => {
    try {
      let query, params;

      if (req.user.role === "user") {
        // Get all bookings where user has chats
        query = `
          SELECT DISTINCT 
            b.booking_id,
            b.status as booking_status,
            a.name as arena_name,
            ao.arena_name as owner_name,
            st.name as sport_name,
            ts.date,
            ts.start_time,
            ts.end_time,
            (SELECT COUNT(*) FROM chats c WHERE c.booking_id = b.booking_id AND c.is_read = FALSE 
             AND c.sender_type = 'owner') as unread_count,
            (SELECT MAX(sent_at) FROM chats WHERE booking_id = b.booking_id) as last_message_time
          FROM bookings b
          JOIN arenas a ON b.arena_id = a.arena_id
          JOIN arena_owners ao ON a.owner_id = ao.owner_id
          JOIN sports_types st ON b.sport_id = st.sport_id
          JOIN time_slots ts ON b.slot_id = ts.slot_id
          WHERE b.user_id = ?
            AND EXISTS (SELECT 1 FROM chats WHERE booking_id = b.booking_id)
          ORDER BY last_message_time DESC
        `;
        params = [req.user.id];
      } else if (req.user.role === "owner" || req.user.role === "manager") {
        // Get all bookings for owner's arenas where there are chats
        query = `
          SELECT DISTINCT 
            b.booking_id,
            b.status as booking_status,
            u.name as user_name,
            u.profile_picture_url as user_avatar,
            a.name as arena_name,
            st.name as sport_name,
            ts.date,
            ts.start_time,
            ts.end_time,
            (SELECT COUNT(*) FROM chats c WHERE c.booking_id = b.booking_id AND c.is_read = FALSE 
             AND c.sender_type = 'user') as unread_count,
            (SELECT MAX(sent_at) FROM chats WHERE booking_id = b.booking_id) as last_message_time
          FROM bookings b
          JOIN arenas a ON b.arena_id = a.arena_id
          JOIN users u ON b.user_id = u.user_id
          JOIN sports_types st ON b.sport_id = st.sport_id
          JOIN time_slots ts ON b.slot_id = ts.slot_id
          WHERE a.owner_id = ?
            AND EXISTS (SELECT 1 FROM chats WHERE booking_id = b.booking_id)
          ORDER BY last_message_time DESC
        `;
        params = [req.user.role === "owner" ? req.user.id : req.user.owner_id];
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      const [chats] = await pool.execute(query, params);
      res.json(chats);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // Mark messages as read
  markAsRead: async (req, res) => {
    try {
      const { booking_id } = req.params;
      const sender_type = req.user.role === "user" ? "owner" : "user";

      // Check access
      let hasAccess = false;

      if (req.user.role === "user") {
        const [userCheck] = await pool.execute(
          "SELECT 1 FROM bookings WHERE booking_id = ? AND user_id = ?",
          [booking_id, req.user.id]
        );
        hasAccess = userCheck.length > 0;
      } else if (req.user.role === "owner" || req.user.role === "manager") {
        const [ownerCheck] = await pool.execute(
          `SELECT 1 FROM bookings b
           JOIN arenas a ON b.arena_id = a.arena_id
           WHERE b.booking_id = ? AND a.owner_id = ?`,
          [
            booking_id,
            req.user.role === "owner" ? req.user.id : req.user.owner_id,
          ]
        );
        hasAccess = ownerCheck.length > 0;
      }

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Mark all unread messages from the other party as read
      await pool.execute(
        `UPDATE chats 
         SET is_read = TRUE
         WHERE booking_id = ? AND sender_type = ? AND is_read = FALSE`,
        [booking_id, sender_type]
      );

      res.json({ message: "Messages marked as read" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
};

function filterContactInfo(message) {
  const patterns = [
    {
      regex: /\b\d{10,13}\b/g,
      replacement: "[PHONE REMOVED]",
    },
    {
      regex: /\S+@\S+\.\S+/g,
      replacement: "[EMAIL REMOVED]",
    },
    {
      regex: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      replacement: "[CONTACT REMOVED]",
    },
  ];

  let filtered = message;
  patterns.forEach((pattern) => {
    filtered = filtered.replace(pattern.regex, pattern.replacement);
  });

  return filtered;
}
function checkForContactInfo(message) {
  const contactPatterns = [
    /\b\d{10,13}\b/g,
    /\S+@\S+\.\S+/g,
    /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  ];

  return contactPatterns.some((pattern) => pattern.test(message));
}
module.exports = chatController;
