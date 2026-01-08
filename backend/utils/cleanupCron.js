
const cron = require('node-cron');
const pool = require('../db');

const cleanupJobs = {
    // Clean up expired locks every 5 minutes
    cleanupExpiredLocks: async () => {
        try {
            const [result] = await pool.execute(
                `UPDATE time_slots 
         SET locked_until = NULL,
             locked_by_user_id = NULL
         WHERE locked_until IS NOT NULL 
           AND locked_until <= NOW()`
            );

            if (result.affectedRows > 0) {
                console.log(`[${new Date().toISOString()}] Cleaned up ${result.affectedRows} expired locks`);
            }
        } catch (error) {
            console.error("Error in cleanupExpiredLocks:", error);
        }
    },

    // Auto-complete past bookings daily at 2 AM
    autoCompletePastBookings: async () => {
        try {
            const [result] = await pool.execute(
                `UPDATE bookings b
         JOIN time_slots ts ON b.slot_id = ts.slot_id
         SET b.status = 'completed'
         WHERE b.status = 'accepted' 
           AND ts.date < CURDATE()`
            );

            if (result.affectedRows > 0) {
                console.log(`[${new Date().toISOString()}] Auto-completed ${result.affectedRows} past bookings`);
            }
        } catch (error) {
            console.error("Error in autoCompletePastBookings:", error);
        }
    },

    // Clean up old notifications weekly
    cleanupOldNotifications: async () => {
        try {
            const [result] = await pool.execute(
                `DELETE FROM notifications 
         WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
           AND is_read = TRUE`
            );

            if (result.affectedRows > 0) {
                console.log(`[${new Date().toISOString()}] Cleaned up ${result.affectedRows} old notifications`);
            }
        } catch (error) {
            console.error("Error in cleanupOldNotifications:", error);
        }
    },

    // Generate time slots for next 30 days (daily at 3 AM)
    generateFutureTimeSlots: async () => {
        try {
            // Get all active arenas
            const [arenas] = await pool.execute(
                `SELECT a.*, ao.time_slots as slot_config 
         FROM arenas a
         JOIN arena_owners ao ON a.owner_id = ao.owner_id
         WHERE a.is_active = 1 AND a.is_blocked = 0`
            );

            for (const arena of arenas) {
                try {
                    const slotConfig = arena.slot_config ? JSON.parse(arena.slot_config) : {
                        opening_time: "06:00",
                        closing_time: "22:00",
                        slot_duration: 60,
                        days_available: {
                            monday: true, tuesday: true, wednesday: true,
                            thursday: true, friday: true, saturday: true, sunday: false
                        }
                    };

                    // Check if slots exist for 30 days from now
                    const targetDate = new Date();
                    targetDate.setDate(targetDate.getDate() + 30);
                    const targetDateStr = targetDate.toISOString().split('T')[0];

                    const [existingSlots] = await pool.execute(
                        `SELECT 1 FROM time_slots 
             WHERE arena_id = ? AND date = ? LIMIT 1`,
                        [arena.arena_id, targetDateStr]
                    );

                    if (existingSlots.length === 0) {
                        // Generate slots for next 30 days
                        const { generateTimeSlots } = require('./timeSlotHelper');
                        const timeSlots = generateTimeSlots(
                            slotConfig.opening_time,
                            slotConfig.closing_time,
                            slotConfig.slot_duration
                        );

                        const today = new Date();
                        for (let i = 0; i < 30; i++) {
                            const date = new Date(today);
                            date.setDate(today.getDate() + i);
                            const dateStr = date.toISOString().split('T')[0];
                            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

                            if (slotConfig.days_available[dayName] !== false) {
                                for (const slot of timeSlots) {
                                    await pool.execute(
                                        `INSERT INTO time_slots 
                     (arena_id, date, start_time, end_time, price, is_available)
                     VALUES (?, ?, ?, ?, ?, TRUE)
                     ON DUPLICATE KEY UPDATE price = VALUES(price)`,
                                        [
                                            arena.arena_id,
                                            dateStr,
                                            slot.start_time,
                                            slot.end_time,
                                            arena.base_price_per_hour || 500
                                        ]
                                    );
                                }
                            }
                        }
                        console.log(`[${new Date().toISOString()}] Generated time slots for arena ${arena.name}`);
                    }
                } catch (arenaError) {
                    console.error(`Error generating slots for arena ${arena.arena_id}:`, arenaError.message);
                }
            }
        } catch (error) {
            console.error("Error in generateFutureTimeSlots:", error);
        }
    }
};

// Schedule cleanup jobs
const scheduleCleanupJobs = () => {
    console.log('⏰ Starting cleanup scheduler...');

    try {
        // Clean up expired locks every 5 minutes
        cron.schedule('*/5 * * * *', () => {
            cleanupJobs.cleanupExpiredLocks();
        });

        // Auto-complete past bookings daily at 2 AM
        cron.schedule('0 2 * * *', () => {
            cleanupJobs.autoCompletePastBookings();
        });

        // Clean up old notifications every Sunday at 3 AM
        cron.schedule('0 3 * * 0', () => {
            cleanupJobs.cleanupOldNotifications();
        });

        // Generate future time slots daily at 4 AM
        cron.schedule('0 4 * * *', () => {
            cleanupJobs.generateFutureTimeSlots();
        });

        console.log('✅ Cleanup jobs scheduled');
    } catch (error) {
        console.error('❌ Failed to schedule cleanup jobs:', error);
    }
};

module.exports = {
    cleanupJobs,
    scheduleCleanupJobs
};