// routes/ownerRoutes.js
const express = require('express');
const router = express.Router();
const { verifyOwner } = require('../middleware/authMiddleware');
const pool = require('../db');

// Apply owner authentication to all routes
router.use(verifyOwner);

// Get owner dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const ownerId = req.owner.owner_id;

    // Get owner details
    const [owners] = await pool.query(
      'SELECT * FROM arena_owners WHERE owner_id = ?',
      [ownerId]
    );

    if (owners.length === 0) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    const owner = owners[0];

    // Get arena details
    const [arenas] = await pool.query(
      'SELECT * FROM arenas WHERE owner_id = ?',
      [ownerId]
    );

    // Get court details
    const [courts] = await pool.query(
      `SELECT cd.*, GROUP_CONCAT(st.name) as sports 
       FROM court_details cd
       LEFT JOIN court_sports cs ON cd.court_id = cs.court_id
       LEFT JOIN sports_types st ON cs.sport_id = st.sport_id
       WHERE cd.arena_id IN (SELECT arena_id FROM arenas WHERE owner_id = ?)
       GROUP BY cd.court_id`,
      [ownerId]
    );

    // Get booking stats
    const [stats] = await pool.query(
      `SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN status = 'cancelled' THEN cancellation_fee ELSE 0 END) as lost_revenue,
        SUM(commission_amount) as total_commission
       FROM bookings b
       JOIN arenas a ON b.arena_id = a.arena_id
       WHERE a.owner_id = ?`,
      [ownerId]
    );

    // Parse time slots if stored as JSON
    let timeSlots = {};
    if (owner.time_slots) {
      try {
        timeSlots = typeof owner.time_slots === 'string'
          ? JSON.parse(owner.time_slots)
          : owner.time_slots;
      } catch (e) {
        console.error('Error parsing time slots:', e);
      }
    }

    res.json({
      success: true,
      owner: {
        ...owner,
        time_slots: timeSlots,
        password_hash: undefined // Don't send password hash
      },
      arena: arenas[0] || null,
      courts: courts || [],
      statistics: stats[0] || {
        total_bookings: 0,
        total_revenue: 0,
        lost_revenue: 0,
        total_commission: 0
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Get owner profile
router.get('/profile', async (req, res) => {
  try {
    const ownerId = req.owner.owner_id;

    const [owners] = await pool.query(
      `SELECT 
        owner_id, arena_name, email, phone_number, 
        business_address, google_maps_location, 
        number_of_courts, agreed_to_terms, is_active,
        created_at, time_slots
       FROM arena_owners 
       WHERE owner_id = ?`,
      [ownerId]
    );

    if (owners.length === 0) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    res.json({ success: true, owner: owners[0] });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// Update owner profile
router.put('/profile', async (req, res) => {
  try {
    const ownerId = req.owner.owner_id;
    const { arena_name, phone_number, business_address, google_maps_location } = req.body;

    // Validation
    if (!arena_name || !phone_number) {
      return res.status(400).json({ error: 'Arena name and phone number are required' });
    }

    await pool.query(
      `UPDATE arena_owners 
       SET arena_name = ?, phone_number = ?, business_address = ?, 
           google_maps_location = ?, updated_at = CURRENT_TIMESTAMP
       WHERE owner_id = ?`,
      [arena_name, phone_number, business_address, google_maps_location, ownerId]
    );

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get arena details
router.get('/arena', async (req, res) => {
  try {
    const ownerId = req.owner.owner_id;

    const [arenas] = await pool.query(
      `SELECT a.*, 
        GROUP_CONCAT(DISTINCT st.name) as available_sports,
        COUNT(DISTINCT cd.court_id) as total_courts
       FROM arenas a
       LEFT JOIN arena_sports asps ON a.arena_id = asps.arena_id
       LEFT JOIN sports_types st ON asps.sport_id = st.sport_id
       LEFT JOIN court_details cd ON a.arena_id = cd.arena_id
       WHERE a.owner_id = ?
       GROUP BY a.arena_id`,
      [ownerId]
    );

    res.json({ success: true, arena: arenas[0] || null });
  } catch (error) {
    console.error('Get arena error:', error);
    res.status(500).json({ error: 'Failed to load arena details' });
  }
});

// Update arena details
router.put('/arena', async (req, res) => {
  try {
    const ownerId = req.owner.owner_id;
    const { name, description, address, base_price_per_hour } = req.body;

    // Check if owner has an arena
    const [existingArenas] = await pool.query(
      'SELECT arena_id FROM arenas WHERE owner_id = ?',
      [ownerId]
    );

    if (existingArenas.length === 0) {
      // Create new arena if doesn't exist
      const [result] = await pool.query(
        `INSERT INTO arenas (owner_id, name, description, address, base_price_per_hour)
         VALUES (?, ?, ?, ?, ?)`,
        [ownerId, name, description, address, base_price_per_hour]
      );

      return res.json({
        success: true,
        message: 'Arena created successfully',
        arena_id: result.insertId
      });
    }

    // Update existing arena
    const arenaId = existingArenas[0].arena_id;

    await pool.query(
      `UPDATE arenas 
       SET name = ?, description = ?, address = ?, 
           base_price_per_hour = ?, updated_at = CURRENT_TIMESTAMP
       WHERE arena_id = ? AND owner_id = ?`,
      [name, description, address, base_price_per_hour, arenaId, ownerId]
    );

    res.json({ success: true, message: 'Arena updated successfully' });
  } catch (error) {
    console.error('Update arena error:', error);
    res.status(500).json({ error: 'Failed to update arena' });
  }
});

// Get all courts
router.get('/courts', async (req, res) => {
  try {
    const ownerId = req.owner.owner_id;

    const [courts] = await pool.query(
      `SELECT cd.*, 
        GROUP_CONCAT(st.name) as sports,
        a.name as arena_name
       FROM court_details cd
       JOIN arenas a ON cd.arena_id = a.arena_id
       LEFT JOIN court_sports cs ON cd.court_id = cs.court_id
       LEFT JOIN sports_types st ON cs.sport_id = st.sport_id
       WHERE a.owner_id = ?
       GROUP BY cd.court_id
       ORDER BY cd.court_number`,
      [ownerId]
    );

    res.json({ success: true, courts });
  } catch (error) {
    console.error('Get courts error:', error);
    res.status(500).json({ error: 'Failed to load courts' });
  }
});

// Get single court
router.get('/courts/:courtId', async (req, res) => {
  try {
    const ownerId = req.owner.owner_id;
    const { courtId } = req.params;

    const [courts] = await pool.query(
      `SELECT cd.*, 
        GROUP_CONCAT(st.sport_id) as sport_ids,
        GROUP_CONCAT(st.name) as sport_names,
        a.name as arena_name
       FROM court_details cd
       JOIN arenas a ON cd.arena_id = a.arena_id
       LEFT JOIN court_sports cs ON cd.court_id = cs.court_id
       LEFT JOIN sports_types st ON cs.sport_id = st.sport_id
       WHERE cd.court_id = ? AND a.owner_id = ?
       GROUP BY cd.court_id`,
      [courtId, ownerId]
    );

    if (courts.length === 0) {
      return res.status(404).json({ error: 'Court not found' });
    }

    const court = courts[0];
    // Parse sport IDs and names
    court.sport_ids = court.sport_ids ? court.sport_ids.split(',').map(Number) : [];
    court.sport_names = court.sport_names ? court.sport_names.split(',') : [];

    res.json({ success: true, court });
  } catch (error) {
    console.error('Get court error:', error);
    res.status(500).json({ error: 'Failed to load court' });
  }
});

// Create/Update court
router.post('/courts', async (req, res) => {
  try {
    const ownerId = req.owner.owner_id;
    const {
      court_id,
      court_number,
      court_name,
      size_sqft,
      price_per_hour,
      description,
      sport_ids
    } = req.body;

    // Get owner's arena
    const [arenas] = await pool.query(
      'SELECT arena_id FROM arenas WHERE owner_id = ?',
      [ownerId]
    );

    if (arenas.length === 0) {
      return res.status(400).json({ error: 'Owner has no arena. Create arena first.' });
    }

    const arenaId = arenas[0].arena_id;

    if (court_id) {
      // Update existing court
      await pool.query(
        `UPDATE court_details 
         SET court_number = ?, court_name = ?, size_sqft = ?, 
             price_per_hour = ?, description = ?, updated_at = CURRENT_TIMESTAMP
         WHERE court_id = ? AND arena_id = ?`,
        [court_number, court_name, size_sqft, price_per_hour, description, court_id, arenaId]
      );

      // Update sports
      await pool.query('DELETE FROM court_sports WHERE court_id = ?', [court_id]);

      if (sport_ids && Array.isArray(sport_ids)) {
        for (const sportId of sport_ids) {
          await pool.query(
            'INSERT INTO court_sports (court_id, sport_id) VALUES (?, ?)',
            [court_id, sportId]
          );
        }
      }

      res.json({ success: true, message: 'Court updated successfully', court_id });
    } else {
      // Create new court
      const [result] = await pool.query(
        `INSERT INTO court_details 
         (arena_id, court_number, court_name, size_sqft, price_per_hour, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [arenaId, court_number, court_name, size_sqft, price_per_hour, description]
      );

      const newCourtId = result.insertId;

      // Add sports
      if (sport_ids && Array.isArray(sport_ids)) {
        for (const sportId of sport_ids) {
          await pool.query(
            'INSERT INTO court_sports (court_id, sport_id) VALUES (?, ?)',
            [newCourtId, sportId]
          );
        }
      }

      res.json({
        success: true,
        message: 'Court created successfully',
        court_id: newCourtId
      });
    }
  } catch (error) {
    console.error('Save court error:', error);
    res.status(500).json({ error: 'Failed to save court' });
  }
});

// Delete court
router.delete('/courts/:courtId', async (req, res) => {
  try {
    const ownerId = req.owner.owner_id;
    const { courtId } = req.params;

    // Verify court belongs to owner
    const [courts] = await pool.query(
      `SELECT cd.court_id 
       FROM court_details cd
       JOIN arenas a ON cd.arena_id = a.arena_id
       WHERE cd.court_id = ? AND a.owner_id = ?`,
      [courtId, ownerId]
    );

    if (courts.length === 0) {
      return res.status(404).json({ error: 'Court not found or access denied' });
    }

    await pool.query('DELETE FROM court_details WHERE court_id = ?', [courtId]);

    res.json({ success: true, message: 'Court deleted successfully' });
  } catch (error) {
    console.error('Delete court error:', error);
    res.status(500).json({ error: 'Failed to delete court' });
  }
});

// Update time slots
router.put('/time-slots', async (req, res) => {
  try {
    const ownerId = req.owner.owner_id;
    const { time_slots } = req.body;

    if (!time_slots || typeof time_slots !== 'object') {
      return res.status(400).json({ error: 'Time slots data is required' });
    }

    await pool.query(
      'UPDATE arena_owners SET time_slots = ? WHERE owner_id = ?',
      [JSON.stringify(time_slots), ownerId]
    );

    res.json({ success: true, message: 'Time slots updated successfully' });
  } catch (error) {
    console.error('Update time slots error:', error);
    res.status(500).json({ error: 'Failed to update time slots' });
  }
});

// Get sports types for selection
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

// Get booking statistics (for charts)
router.get('/statistics', async (req, res) => {
  try {
    const ownerId = req.owner.owner_id;
    const { period = 'monthly' } = req.query;

    let dateFilter = '';
    switch (period) {
      case 'daily':
        dateFilter = 'AND DATE(b.booking_date) = CURDATE()';
        break;
      case 'weekly':
        dateFilter = 'AND b.booking_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
        break;
      case 'monthly':
        dateFilter = 'AND b.booking_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        break;
      default:
        dateFilter = 'AND b.booking_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    }

    // Revenue by day
    const [revenueData] = await pool.query(
      `SELECT 
        DATE(b.booking_date) as date,
        COUNT(*) as bookings,
        SUM(b.total_amount) as revenue,
        SUM(b.commission_amount) as commission
       FROM bookings b
       JOIN arenas a ON b.arena_id = a.arena_id
       WHERE a.owner_id = ? 
         ${dateFilter}
         AND b.status = 'completed'
       GROUP BY DATE(b.booking_date)
       ORDER BY date`,
      [ownerId]
    );

    // Bookings by sport
    const [sportData] = await pool.query(
      `SELECT 
        st.name as sport,
        COUNT(*) as bookings,
        SUM(b.total_amount) as revenue
       FROM bookings b
       JOIN sports_types st ON b.sport_id = st.sport_id
       JOIN arenas a ON b.arena_id = a.arena_id
       WHERE a.owner_id = ? 
         ${dateFilter}
         AND b.status = 'completed'
       GROUP BY b.sport_id
       ORDER BY bookings DESC`,
      [ownerId]
    );

    res.json({
      success: true,
      revenue_data: revenueData,
      sport_data: sportData,
      period
    });
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({ error: 'Failed to load statistics' });
  }
});

module.exports = router;