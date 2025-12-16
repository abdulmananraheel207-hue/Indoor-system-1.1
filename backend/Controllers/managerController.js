// Controllers/managerController.js
const pool = require("../db");

const managerController = {
    // Get manager dashboard data (based on permissions)
    getDashboard: async (req, res) => {
        try {
            const { owner_id, permissions } = req.manager;
            const today = new Date().toISOString().split("T")[0];

            const dashboardData = {
                permissions: permissions,
                stats: {},
                pending_requests: [],
                recent_bookings: [],
                arenas: []
            };

            // Only fetch stats if manager has view_dashboard permission
            if (permissions.view_dashboard) {
                // Today's bookings count
                const [todayBookings] = await pool.execute(
                    `SELECT COUNT(*) as count 
           FROM bookings b
           JOIN arenas a ON b.arena_id = a.arena_id
           WHERE a.owner_id = ? AND DATE(b.booking_date) = ?`,
                    [owner_id, today]
                );

                dashboardData.stats.today_bookings = todayBookings[0].count || 0;

                // Today's revenue (only if has financial permission)
                if (permissions.view_financial) {
                    const [todayRevenue] = await pool.execute(
                        `SELECT COALESCE(SUM(b.total_amount), 0) as revenue
             FROM bookings b
             JOIN arenas a ON b.arena_id = a.arena_id
             WHERE a.owner_id = ? 
               AND DATE(b.booking_date) = ? 
               AND b.status = 'completed'`,
                        [owner_id, today]
                    );
                    dashboardData.stats.today_revenue = todayRevenue[0].revenue || 0;
                }
            }

            // Only fetch pending requests if manager can view or manage bookings
            if (permissions.view_bookings || permissions.manage_bookings) {
                const [pendingRequests] = await pool.execute(
                    `SELECT b.*, u.name as user_name, u.phone_number as user_phone,
                  st.name as sport_name, a.name as arena_name,
                  ts.date, ts.start_time, ts.end_time
           FROM bookings b
           JOIN arenas a ON b.arena_id = a.arena_id
           JOIN users u ON b.user_id = u.user_id
           JOIN sports_types st ON b.sport_id = st.sport_id
           JOIN time_slots ts ON b.slot_id = ts.slot_id
           WHERE a.owner_id = ? AND b.status = 'pending'
           ORDER BY b.booking_date DESC
           LIMIT 10`,
                    [owner_id]
                );
                dashboardData.pending_requests = pendingRequests;
            }

            // Get owner's arenas
            const [arenas] = await pool.execute(
                "SELECT arena_id, name FROM arenas WHERE owner_id = ? AND is_active = TRUE",
                [owner_id]
            );
            dashboardData.arenas = arenas;

            // Get recent bookings if manager can view bookings
            if (permissions.view_bookings) {
                const [recentBookings] = await pool.execute(
                    `SELECT b.*, u.name as user_name, st.name as sport_name,
                  a.name as arena_name, ts.date, ts.start_time, ts.end_time
           FROM bookings b
           JOIN arenas a ON b.arena_id = a.arena_id
           JOIN users u ON b.user_id = u.user_id
           JOIN sports_types st ON b.sport_id = st.sport_id
           JOIN time_slots ts ON b.slot_id = ts.slot_id
           WHERE a.owner_id = ?
           ORDER BY b.booking_date DESC
           LIMIT 5`,
                    [owner_id]
                );
                dashboardData.recent_bookings = recentBookings;
            }

            res.json(dashboardData);
        } catch (error) {
            console.error("Dashboard error:", error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Get bookings (with permission check in route)
    getBookings: async (req, res) => {
        try {
            const { owner_id } = req.manager;
            const { status, date_from, date_to } = req.query;

            let query = `
        SELECT b.*, u.name as user_name, u.email as user_email, 
               u.phone_number as user_phone, st.name as sport_name,
               a.name as arena_name, ts.date, ts.start_time, ts.end_time
        FROM bookings b
        JOIN arenas a ON b.arena_id = a.arena_id
        JOIN users u ON b.user_id = u.user_id
        JOIN sports_types st ON b.sport_id = st.sport_id
        JOIN time_slots ts ON b.slot_id = ts.slot_id
        WHERE a.owner_id = ?
      `;

            const params = [owner_id];

            if (status && status !== "all") {
                query += " AND b.status = ?";
                params.push(status);
            }

            if (date_from) {
                query += " AND ts.date >= ?";
                params.push(date_from);
            }

            if (date_to) {
                query += " AND ts.date <= ?";
                params.push(date_to);
            }

            query += " ORDER BY b.booking_date DESC";

            const [bookings] = await pool.execute(query, params);
            res.json(bookings);
        } catch (error) {
            console.error("Get bookings error:", error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Accept booking (requires manage_bookings permission)
    acceptBooking: async (req, res) => {
        try {
            const { booking_id } = req.params;
            const { owner_id } = req.manager;

            // Verify booking belongs to owner's arena
            const [bookingCheck] = await pool.execute(
                `SELECT b.* FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         WHERE b.booking_id = ? AND a.owner_id = ?`,
                [booking_id, owner_id]
            );

            if (bookingCheck.length === 0) {
                return res.status(404).json({ message: "Booking not found or access denied" });
            }

            if (bookingCheck[0].status !== "pending") {
                return res.status(400).json({ message: "Booking is not in pending status" });
            }

            // Update booking status
            await pool.execute(
                'UPDATE bookings SET status = "accepted" WHERE booking_id = ?',
                [booking_id]
            );

            res.json({ message: "Booking accepted successfully" });
        } catch (error) {
            console.error("Accept booking error:", error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Reject booking (requires manage_bookings permission)
    rejectBooking: async (req, res) => {
        try {
            const { booking_id } = req.params;
            const { reason } = req.body;
            const { owner_id } = req.manager;

            // Verify booking belongs to owner's arena
            const [bookingCheck] = await pool.execute(
                `SELECT b.*, ts.slot_id FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         JOIN time_slots ts ON b.slot_id = ts.slot_id
         WHERE b.booking_id = ? AND a.owner_id = ?`,
                [booking_id, owner_id]
            );

            if (bookingCheck.length === 0) {
                return res.status(404).json({ message: "Booking not found or access denied" });
            }

            if (bookingCheck[0].status !== "pending") {
                return res.status(400).json({ message: "Booking is not in pending status" });
            }

            const connection = await pool.getConnection();
            await connection.beginTransaction();

            try {
                // Update booking status
                await connection.execute(
                    `UPDATE bookings 
           SET status = "rejected", cancelled_by = "manager", cancellation_time = NOW()
           WHERE booking_id = ?`,
                    [booking_id]
                );

                // Make time slot available again
                await connection.execute(
                    `UPDATE time_slots 
           SET is_available = TRUE,
               locked_until = NULL,
               locked_by_user_id = NULL
           WHERE slot_id = ?`,
                    [bookingCheck[0].slot_id]
                );

                await connection.commit();
                res.json({ message: "Booking rejected successfully", reason });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error("Reject booking error:", error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Get arenas (requires view_calendar or manage_arena permission)
    getArenas: async (req, res) => {
        try {
            const { owner_id } = req.manager;

            const [arenas] = await pool.execute(
                "SELECT arena_id, name, address FROM arenas WHERE owner_id = ? AND is_active = TRUE",
                [owner_id]
            );

            res.json(arenas);
        } catch (error) {
            console.error("Get arenas error:", error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Get time slots for specific arena and date
    getTimeSlots: async (req, res) => {
        try {
            const { arena_id, date } = req.query;
            const { owner_id } = req.manager;

            // Verify arena belongs to owner
            const [arenaCheck] = await pool.execute(
                "SELECT arena_id FROM arenas WHERE arena_id = ? AND owner_id = ?",
                [arena_id, owner_id]
            );

            if (arenaCheck.length === 0) {
                return res.status(404).json({ message: "Arena not found or access denied" });
            }

            const [timeSlots] = await pool.execute(
                `SELECT * FROM time_slots 
         WHERE arena_id = ? AND date = ?
         ORDER BY start_time`,
                [arena_id, date]
            );

            res.json(timeSlots);
        } catch (error) {
            console.error("Get time slots error:", error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Update time slots (requires manage_calendar permission)
    updateTimeSlots: async (req, res) => {
        try {
            const { arena_id } = req.params;
            const { date, slots, is_blocked, is_holiday } = req.body;
            const { owner_id } = req.manager;

            // Verify arena belongs to owner
            const [arenaCheck] = await pool.execute(
                "SELECT arena_id FROM arenas WHERE arena_id = ? AND owner_id = ?",
                [arena_id, owner_id]
            );

            if (arenaCheck.length === 0) {
                return res.status(404).json({ message: "Arena not found or access denied" });
            }

            const connection = await pool.getConnection();
            await connection.beginTransaction();

            try {
                if (slots && slots.length > 0) {
                    for (const slot of slots) {
                        const [existingSlot] = await connection.execute(
                            `SELECT slot_id FROM time_slots 
               WHERE arena_id = ? AND date = ? AND start_time = ? AND end_time = ?`,
                            [arena_id, date, slot.start_time, slot.end_time]
                        );

                        if (existingSlot.length > 0) {
                            await connection.execute(
                                `UPDATE time_slots 
                 SET is_blocked_by_owner = ?, is_holiday = ?, price = ?
                 WHERE slot_id = ?`,
                                [
                                    is_blocked || slot.is_blocked || false,
                                    is_holiday || slot.is_holiday || false,
                                    slot.price,
                                    existingSlot[0].slot_id
                                ]
                            );
                        } else {
                            await connection.execute(
                                `INSERT INTO time_slots 
                 (arena_id, date, start_time, end_time, price, is_blocked_by_owner, is_holiday)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    arena_id,
                                    date,
                                    slot.start_time,
                                    slot.end_time,
                                    slot.price,
                                    is_blocked || slot.is_blocked || false,
                                    is_holiday || slot.is_holiday || false
                                ]
                            );
                        }
                    }
                }

                await connection.commit();
                res.json({ message: "Time slots updated successfully" });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error("Update time slots error:", error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Get manager profile
    getProfile: async (req, res) => {
        try {
            const { id } = req.manager;

            const [managers] = await pool.execute(
                `SELECT m.name, m.email, m.phone_number, m.permissions,
                o.arena_name, o.email as owner_email
         FROM arena_managers m
         JOIN arena_owners o ON m.owner_id = o.owner_id
         WHERE m.manager_id = ?`,
                [id]
            );

            if (managers.length === 0) {
                return res.status(404).json({ message: "Manager not found" });
            }

            const manager = managers[0];
            manager.permissions = typeof manager.permissions === 'string'
                ? JSON.parse(manager.permissions)
                : manager.permissions;

            res.json(manager);
        } catch (error) {
            console.error("Get profile error:", error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Update manager profile (only own profile)
    updateProfile: async (req, res) => {
        try {
            const { id } = req.manager;
            const { phone_number } = req.body;

            // Only allow updating phone number for now
            if (!phone_number) {
                return res.status(400).json({ message: "No fields to update" });
            }

            await pool.execute(
                "UPDATE arena_managers SET phone_number = ? WHERE manager_id = ?",
                [phone_number, id]
            );

            res.json({ message: "Profile updated successfully" });
        } catch (error) {
            console.error("Update profile error:", error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Get booking statistics
    getBookingStats: async (req, res) => {
        try {
            const { owner_id, permissions } = req.manager;
            const { period = "month" } = req.query;

            if (!permissions.view_financial && !permissions.view_dashboard) {
                return res.status(403).json({ message: "Insufficient permissions" });
            }

            let dateFilter = "";
            switch (period) {
                case "day":
                    dateFilter = "DATE(b.booking_date) = CURDATE()";
                    break;
                case "week":
                    dateFilter = "YEARWEEK(b.booking_date) = YEARWEEK(CURDATE())";
                    break;
                case "month":
                    dateFilter = "MONTH(b.booking_date) = MONTH(CURDATE()) AND YEAR(b.booking_date) = YEAR(CURDATE())";
                    break;
                case "year":
                    dateFilter = "YEAR(b.booking_date) = YEAR(CURDATE())";
                    break;
                default:
                    dateFilter = "MONTH(b.booking_date) = MONTH(CURDATE()) AND YEAR(b.booking_date) = YEAR(CURDATE())";
            }

            const [stats] = await pool.execute(
                `SELECT 
           COUNT(*) as total_bookings,
           SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
           SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
           SUM(CASE WHEN b.status = 'accepted' THEN 1 ELSE 0 END) as accepted_bookings,
           SUM(CASE WHEN b.status = 'rejected' THEN 1 ELSE 0 END) as rejected_bookings,
           SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
           COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as total_revenue
         FROM bookings b
         JOIN arenas a ON b.arena_id = a.arena_id
         WHERE a.owner_id = ? AND ${dateFilter}`,
                [owner_id]
            );

            res.json(stats[0]);
        } catch (error) {
            console.error("Get stats error:", error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    }
};

module.exports = managerController;