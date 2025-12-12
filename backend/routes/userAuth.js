// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { verifyUser } = require('../middleware/authMiddleware'); // Fixed path
const pool = require('../db');
// Apply user authentication to all routes
router.use(verifyUser);

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.user_id;

    const [users] = await pool.query(
      `SELECT 
        user_id, name, email, phone_number, 
        profile_picture_url, location_lat, location_lng,
        created_at, last_login
       FROM users 
       WHERE user_id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: users[0] });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { name, phone_number, location_lat, location_lng } = req.body;

    // Validation
    if (!name || !phone_number) {
      return res.status(400).json({ error: 'Name and phone number are required' });
    }

    await pool.query(
      `UPDATE users 
       SET name = ?, phone_number = ?, 
           location_lat = ?, location_lng = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [name, phone_number, location_lat, location_lng, userId]
    );

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get all arenas (with filters)
router.get('/arenas', async (req, res) => {
  try {
    const {
      sport,
      min_price,
      max_price,
      rating,
      search,
      page = 1,
      limit = 10
    } = req.query;

    let query = `
      SELECT 
        a.*,
        ao.arena_name as owner_name,
        ao.phone_number as owner_phone,
        AVG(ar.rating) as avg_rating,
        COUNT(DISTINCT ar.review_id) as total_reviews,
        COUNT(DISTINCT cd.court_id) as total_courts,
        GROUP_CONCAT(DISTINCT st.name) as available_sports
      FROM arenas a
      JOIN arena_owners ao ON a.owner_id = ao.owner_id
      LEFT JOIN arena_reviews ar ON a.arena_id = ar.arena_id
      LEFT JOIN court_details cd ON a.arena_id = cd.arena_id
      LEFT JOIN court_sports cs ON cd.court_id = cs.court_id
      LEFT JOIN sports_types st ON cs.sport_id = st.sport_id
      WHERE a.is_active = TRUE AND a.is_blocked = FALSE
    `;

    const params = [];

    // Apply filters
    if (sport) {
      query += ' AND st.name LIKE ?';
      params.push(`%${sport}%`);
    }

    if (min_price) {
      query += ' AND a.base_price_per_hour >= ?';
      params.push(parseFloat(min_price));
    }

    if (max_price) {
      query += ' AND a.base_price_per_hour <= ?';
      params.push(parseFloat(max_price));
    }

    if (search) {
      query += ' AND (a.name LIKE ? OR a.description LIKE ? OR ao.arena_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Group and paginate
    query += `
      GROUP BY a.arena_id
      ORDER BY avg_rating DESC, a.name ASC
      LIMIT ? OFFSET ?
    `;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const [arenas] = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT a.arena_id) as total
      FROM arenas a
      LEFT JOIN court_details cd ON a.arena_id = cd.arena_id
      LEFT JOIN court_sports cs ON cd.court_id = cs.court_id
      LEFT JOIN sports_types st ON cs.sport_id = st.sport_id
      WHERE a.is_active = TRUE AND a.is_blocked = FALSE
    `;

    const countParams = [];

    if (sport) {
      countQuery += ' AND st.name LIKE ?';
      countParams.push(`%${sport}%`);
    }

    if (search) {
      countQuery += ' AND a.name LIKE ?';
      countParams.push(`%${search}%`);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      arenas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get arenas error:', error);
    res.status(500).json({ error: 'Failed to load arenas' });
  }
});

// Get single arena details
router.get('/arenas/:arenaId', async (req, res) => {
  try {
    const { arenaId } = req.params;

    // Get arena details
    const [arenas] = await pool.query(
      `SELECT 
        a.*,
        ao.arena_name as owner_name,
        ao.phone_number as owner_phone,
        ao.business_address,
        ao.google_maps_location,
        AVG(ar.rating) as avg_rating,
        COUNT(DISTINCT ar.review_id) as total_reviews,
        GROUP_CONCAT(DISTINCT ai.image_url) as images,
        GROUP_CONCAT(DISTINCT st.name) as available_sports
       FROM arenas a
       JOIN arena_owners ao ON a.owner_id = ao.owner_id
       LEFT JOIN arena_images ai ON a.arena_id = ai.arena_id
       LEFT JOIN arena_reviews ar ON a.arena_id = ar.arena_id
       LEFT JOIN court_details cd ON a.arena_id = cd.arena_id
       LEFT JOIN court_sports cs ON cd.court_id = cs.court_id
       LEFT JOIN sports_types st ON cs.sport_id = st.sport_id
       WHERE a.arena_id = ? AND a.is_active = TRUE AND a.is_blocked = FALSE
       GROUP BY a.arena_id`,
      [arenaId]
    );

    if (arenas.length === 0) {
      return res.status(404).json({ error: 'Arena not found' });
    }

    const arena = arenas[0];

    // Parse images if stored as comma-separated
    arena.images = arena.images ? arena.images.split(',') : [];
    arena.available_sports = arena.available_sports ? arena.available_sports.split(',') : [];

    // Get courts for this arena
    const [courts] = await pool.query(
      `SELECT 
        cd.*,
        GROUP_CONCAT(st.name) as sports
       FROM court_details cd
       LEFT JOIN court_sports cs ON cd.court_id = cs.court_id
       LEFT JOIN sports_types st ON cs.sport_id = st.sport_id
       WHERE cd.arena_id = ?
       GROUP BY cd.court_id
       ORDER BY cd.court_number`,
      [arenaId]
    );

    // Get recent reviews
    const [reviews] = await pool.query(
      `SELECT 
        ar.*,
        u.name as user_name,
        u.profile_picture_url
       FROM arena_reviews ar
       JOIN users u ON ar.user_id = u.user_id
       WHERE ar.arena_id = ?
       ORDER BY ar.created_at DESC
       LIMIT 5`,
      [arenaId]
    );

    // Check if arena is in user's favorites
    const userId = req.user.user_id;
    const [favorites] = await pool.query(
      'SELECT 1 FROM favorite_arenas WHERE user_id = ? AND arena_id = ?',
      [userId, arenaId]
    );

    arena.is_favorite = favorites.length > 0;
    arena.courts = courts;
    arena.reviews = reviews;

    res.json({ success: true, arena });
  } catch (error) {
    console.error('Get arena details error:', error);
    res.status(500).json({ error: 'Failed to load arena details' });
  }
});

// Add/Remove arena to favorites
router.post('/arenas/:arenaId/favorite', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { arenaId } = req.params;
    const { action = 'toggle' } = req.body; // 'add', 'remove', or 'toggle'

    // Check if arena exists
    const [arenas] = await pool.query(
      'SELECT arena_id FROM arenas WHERE arena_id = ? AND is_active = TRUE',
      [arenaId]
    );

    if (arenas.length === 0) {
      return res.status(404).json({ error: 'Arena not found' });
    }

    // Check current favorite status
    const [existing] = await pool.query(
      'SELECT 1 FROM favorite_arenas WHERE user_id = ? AND arena_id = ?',
      [userId, arenaId]
    );

    const isFavorite = existing.length > 0;

    if (action === 'add' || (action === 'toggle' && !isFavorite)) {
      if (!isFavorite) {
        await pool.query(
          'INSERT INTO favorite_arenas (user_id, arena_id) VALUES (?, ?)',
          [userId, arenaId]
        );
        return res.json({ success: true, message: 'Added to favorites', is_favorite: true });
      }
      return res.json({ success: true, message: 'Already in favorites', is_favorite: true });
    }
    else if (action === 'remove' || (action === 'toggle' && isFavorite)) {
      if (isFavorite) {
        await pool.query(
          'DELETE FROM favorite_arenas WHERE user_id = ? AND arena_id = ?',
          [userId, arenaId]
        );
        return res.json({ success: true, message: 'Removed from favorites', is_favorite: false });
      }
      return res.json({ success: true, message: 'Not in favorites', is_favorite: false });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Favorite error:', error);
    res.status(500).json({ error: 'Failed to update favorites' });
  }
});

// Get user's favorite arenas
router.get('/favorites', async (req, res) => {
  try {
    const userId = req.user.user_id;

    const [favorites] = await pool.query(
      `SELECT 
        a.*,
        ao.arena_name as owner_name,
        AVG(ar.rating) as avg_rating,
        COUNT(DISTINCT ar.review_id) as total_reviews
       FROM favorite_arenas fa
       JOIN arenas a ON fa.arena_id = a.arena_id
       JOIN arena_owners ao ON a.owner_id = ao.owner_id
       LEFT JOIN arena_reviews ar ON a.arena_id = ar.arena_id
       WHERE fa.user_id = ? AND a.is_active = TRUE
       GROUP BY a.arena_id
       ORDER BY fa.added_at DESC`,
      [userId]
    );

    res.json({ success: true, favorites });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Failed to load favorites' });
  }
});

// Get available time slots for an arena
router.get('/arenas/:arenaId/slots', async (req, res) => {
  try {
    const { arenaId } = req.params;
    const { date, sport_id } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    let query = `
      SELECT 
        ts.*,
        st.name as sport_name,
        cd.court_name,
        cd.price_per_hour
      FROM time_slots ts
      LEFT JOIN sports_types st ON ts.sport_id = st.sport_id
      LEFT JOIN court_details cd ON ts.court_id = cd.court_id
      WHERE ts.arena_id = ?
        AND ts.date = ?
        AND ts.is_available = TRUE
        AND ts.is_blocked_by_owner = FALSE
        AND ts.is_holiday = FALSE
        AND (ts.locked_until IS NULL OR ts.locked_until < NOW())
    `;

    const params = [arenaId, date];

    if (sport_id) {
      query += ' AND ts.sport_id = ?';
      params.push(sport_id);
    }

    query += ' ORDER BY ts.start_time';

    const [slots] = await pool.query(query, params);

    res.json({ success: true, slots });
  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({ error: 'Failed to load time slots' });
  }
});

// Create booking request
router.post('/bookings', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { arena_id, slot_id, sport_id, payment_method = 'pay_now' } = req.body;

    // Validation
    if (!arena_id || !slot_id || !sport_id) {
      return res.status(400).json({
        error: 'Arena ID, slot ID, and sport ID are required'
      });
    }

    // Check slot availability
    const [slots] = await pool.query(
      `SELECT 
        ts.*,
        st.name as sport_name,
        cd.price_per_hour,
        cd.court_name
       FROM time_slots ts
       JOIN sports_types st ON ts.sport_id = st.sport_id
       JOIN court_details cd ON ts.court_id = cd.court_id
       WHERE ts.slot_id = ?
         AND ts.is_available = TRUE
         AND ts.is_blocked_by_owner = FALSE
         AND (ts.locked_until IS NULL OR ts.locked_until < NOW())`,
      [slot_id]
    );

    if (slots.length === 0) {
      return res.status(400).json({ error: 'Time slot is not available' });
    }

    const slot = slots[0];

    // Calculate amounts
    const commission_rate = 0.05; // 5%
    const total_amount = slot.price_per_hour;
    const commission_amount = total_amount * commission_rate;
    const owner_amount = total_amount - commission_amount;

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Lock the slot temporarily
      await connection.query(
        `UPDATE time_slots 
         SET locked_until = DATE_ADD(NOW(), INTERVAL 10 MINUTE),
             locked_by_user_id = ?
         WHERE slot_id = ?`,
        [userId, slot_id]
      );

      // Create booking
      const [bookingResult] = await connection.query(
        `INSERT INTO bookings 
         (user_id, arena_id, slot_id, sport_id, total_amount, 
          commission_percentage, commission_amount, payment_method, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [userId, arena_id, slot_id, sport_id, total_amount,
          commission_rate * 100, commission_amount, payment_method]
      );

      const bookingId = bookingResult.insertId;

      // Create notification for arena owner
      const [arenas] = await connection.query(
        'SELECT owner_id FROM arenas WHERE arena_id = ?',
        [arena_id]
      );

      if (arenas.length > 0) {
        await connection.query(
          `INSERT INTO notifications 
           (owner_id, notification_type, title, message)
           VALUES (?, 'new_booking', 'New Booking Request', 
                  'You have a new booking request for ${slot.court_name} at ${slot.start_time}')`,
          [arenas[0].owner_id]
        );
      }

      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message: 'Booking request created successfully',
        booking_id: bookingId,
        booking: {
          booking_id: bookingId,
          total_amount,
          commission_amount,
          slot_details: {
            court_name: slot.court_name,
            sport_name: slot.sport_name,
            date: slot.date,
            start_time: slot.start_time,
            end_time: slot.end_time
          }
        }
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get user's bookings
router.get('/bookings', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { status, page = 1, limit = 10 } = req.query;

    let query = `
      SELECT 
        b.*,
        a.name as arena_name,
        st.name as sport_name,
        ts.date,
        ts.start_time,
        ts.end_time,
        cd.court_name,
        ao.arena_name as owner_name
      FROM bookings b
      JOIN arenas a ON b.arena_id = a.arena_id
      JOIN sports_types st ON b.sport_id = st.sport_id
      JOIN time_slots ts ON b.slot_id = ts.slot_id
      LEFT JOIN court_details cd ON ts.court_id = cd.court_id
      JOIN arena_owners ao ON a.owner_id = ao.owner_id
      WHERE b.user_id = ?
    `;

    const params = [userId];

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    query += ' ORDER BY b.booking_date DESC LIMIT ? OFFSET ?';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const [bookings] = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM bookings WHERE user_id = ?';
    const countParams = [userId];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to load bookings' });
  }
});

// Get single booking
router.get('/bookings/:bookingId', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { bookingId } = req.params;

    const [bookings] = await pool.query(
      `SELECT 
        b.*,
        a.name as arena_name,
        a.address as arena_address,
        st.name as sport_name,
        ts.date,
        ts.start_time,
        ts.end_time,
        cd.court_name,
        cd.court_number,
        ao.arena_name as owner_name,
        ao.phone_number as owner_phone,
        (SELECT COUNT(*) FROM chats c WHERE c.booking_id = b.booking_id) as message_count
       FROM bookings b
       JOIN arenas a ON b.arena_id = a.arena_id
       JOIN sports_types st ON b.sport_id = st.sport_id
       JOIN time_slots ts ON b.slot_id = ts.slot_id
       LEFT JOIN court_details cd ON ts.court_id = cd.court_id
       JOIN arena_owners ao ON a.owner_id = ao.owner_id
       WHERE b.booking_id = ? AND b.user_id = ?`,
      [bookingId, userId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookings[0];

    // Get chat messages for this booking
    const [messages] = await pool.query(
      `SELECT 
        c.*,
        CASE 
          WHEN c.sender_type = 'user' THEN u.name
          WHEN c.sender_type = 'owner' THEN ao.arena_name
        END as sender_name
       FROM chats c
       LEFT JOIN users u ON c.sender_id = u.user_id AND c.sender_type = 'user'
       LEFT JOIN arena_owners ao ON c.sender_id = ao.owner_id AND c.sender_type = 'owner'
       WHERE c.booking_id = ?
       ORDER BY c.sent_at ASC`,
      [bookingId]
    );

    booking.messages = messages;

    res.json({ success: true, booking });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Failed to load booking' });
  }
});

// Send message in booking chat
router.post('/bookings/:bookingId/chat', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { bookingId } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Check if booking exists and belongs to user
    const [bookings] = await pool.query(
      'SELECT booking_id FROM bookings WHERE booking_id = ? AND user_id = ?',
      [bookingId, userId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check for contact info in message (basic check)
    const containsContactInfo =
      message.includes('@') || // Email
      /\d{10,}/.test(message) || // Phone numbers
      message.includes('http://') || message.includes('https://'); // URLs

    // Insert message
    const [result] = await pool.query(
      `INSERT INTO chats 
       (booking_id, sender_id, sender_type, message, contains_contact_info)
       VALUES (?, ?, 'user', ?, ?)`,
      [bookingId, userId, message.trim(), containsContactInfo]
    );

    // Get arena owner to notify them
    const [arenaInfo] = await pool.query(
      `SELECT a.owner_id 
       FROM bookings b
       JOIN arenas a ON b.arena_id = a.arena_id
       WHERE b.booking_id = ?`,
      [bookingId]
    );

    if (arenaInfo.length > 0) {
      await pool.query(
        `INSERT INTO notifications 
         (owner_id, notification_type, title, message)
         VALUES (?, 'new_message', 'New Message', 
                'You have a new message regarding booking #${bookingId}')`,
        [arenaInfo[0].owner_id]
      );
    }

    res.json({
      success: true,
      message: 'Message sent successfully',
      message_id: result.insertId,
      contains_contact_info: containsContactInfo
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Cancel booking
router.post('/bookings/:bookingId/cancel', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { bookingId } = req.params;

    // Check booking status
    const [bookings] = await pool.query(
      `SELECT b.*, ts.date, ts.start_time
       FROM bookings b
       JOIN time_slots ts ON b.slot_id = ts.slot_id
       WHERE b.booking_id = ? AND b.user_id = ?`,
      [bookingId, userId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookings[0];

    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({ error: 'Completed bookings cannot be cancelled' });
    }

    // Calculate cancellation fee (50% if within 24 hours)
    const slotDateTime = new Date(`${booking.date}T${booking.start_time}`);
    const now = new Date();
    const hoursDiff = (slotDateTime - now) / (1000 * 60 * 60);

    let cancellation_fee = 0;
    if (hoursDiff < 24) {
      cancellation_fee = booking.total_amount * 0.5; // 50% cancellation fee
    }

    // Update booking
    await pool.query(
      `UPDATE bookings 
       SET status = 'cancelled',
           cancelled_by = 'user',
           cancellation_fee = ?,
           cancellation_time = NOW()
       WHERE booking_id = ?`,
      [cancellation_fee, bookingId]
    );

    // Free up the time slot
    await pool.query(
      `UPDATE time_slots 
       SET is_available = TRUE,
           locked_until = NULL,
           locked_by_user_id = NULL
       WHERE slot_id = ?`,
      [booking.slot_id]
    );

    // Notify arena owner
    const [arenaInfo] = await pool.query(
      `SELECT a.owner_id 
       FROM bookings b
       JOIN arenas a ON b.arena_id = a.arena_id
       WHERE b.booking_id = ?`,
      [bookingId]
    );

    if (arenaInfo.length > 0) {
      await pool.query(
        `INSERT INTO notifications 
         (owner_id, notification_type, title, message)
         VALUES (?, 'booking_cancelled', 'Booking Cancelled', 
                'Booking #${bookingId} has been cancelled by the user')`,
        [arenaInfo[0].owner_id]
      );
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      cancellation_fee,
      refund_amount: booking.total_amount - cancellation_fee
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// Get sports list for filters
router.get('/sports', async (req, res) => {
  try {
    const [sports] = await pool.query(
      'SELECT sport_id, name FROM sports_types ORDER BY name'
    );

    res.json({ success: true, sports });
  } catch (error) {
    console.error('Get sports error:', error);
    res.status(500).json({ error: 'Failed to load sports' });
  }
});

// Get user dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get user info
    const [users] = await pool.query(
      'SELECT name, email, profile_picture_url FROM users WHERE user_id = ?',
      [userId]
    );

    // Get booking stats
    const [stats] = await pool.query(
      `SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
        SUM(total_amount) as total_spent
       FROM bookings
       WHERE user_id = ?`,
      [userId]
    );

    // Get favorite arenas count
    const [favorites] = await pool.query(
      'SELECT COUNT(*) as favorite_count FROM favorite_arenas WHERE user_id = ?',
      [userId]
    );

    // Get upcoming bookings
    const [upcoming] = await pool.query(
      `SELECT 
        b.booking_id,
        a.name as arena_name,
        st.name as sport_name,
        ts.date,
        ts.start_time,
        b.status
       FROM bookings b
       JOIN arenas a ON b.arena_id = a.arena_id
       JOIN sports_types st ON b.sport_id = st.sport_id
       JOIN time_slots ts ON b.slot_id = ts.slot_id
       WHERE b.user_id = ? 
         AND b.status IN ('pending', 'accepted')
         AND ts.date >= CURDATE()
       ORDER BY ts.date, ts.start_time
       LIMIT 3`,
      [userId]
    );

    res.json({
      success: true,
      user: users[0] || {},
      statistics: {
        ...stats[0],
        favorite_count: favorites[0]?.favorite_count || 0
      },
      upcoming_bookings: upcoming
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

module.exports = router;