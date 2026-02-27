// In slotLockService.js - Add transferLock function

const pool = require("../db");
const { sendNotification } = require("./notificationService");

async function lockSlot(slotId, userId, minutes = 10, executor = pool) {
  await executor.execute(
    `UPDATE time_slots 
         SET locked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE),
             locked_by_user_id = ?,
             is_available = FALSE
         WHERE slot_id = ?`,
    [minutes, userId, slotId]
  );
}

async function releaseSlot(slotId, executor = pool) {
  await executor.execute(
    `UPDATE time_slots 
         SET is_available = TRUE,
             locked_until = NULL,
             locked_by_user_id = NULL
         WHERE slot_id = ?`,
    [slotId]
  );
}

// NEW FUNCTION: Transfer lock from one user to another (or to booking system)
async function transferSlotLock(slotId, fromUserId, toUserId, minutes = 10, executor = pool) {
  await executor.execute(
    `UPDATE time_slots 
         SET locked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE),
             locked_by_user_id = ?
         WHERE slot_id = ? AND locked_by_user_id = ?`,
    [minutes, toUserId, slotId, fromUserId]
  );
}

// In slotLockService.js - Update releaseExpiredLocks function

async function releaseExpiredLocks() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // First, get all expired locks that belong to bookings in awaiting_payment status
    const [expiredBookings] = await connection.execute(
      `SELECT b.booking_id, b.user_id, b.arena_id, b.commission_amount,
                    b.owner_id, b.date, b.start_time, b.end_time, b.is_multi_slot, b.slot_ids,
                    b.slot_id
             FROM bookings b
             WHERE b.status = 'awaiting_payment'
               AND b.lock_expires_at IS NOT NULL
               AND b.lock_expires_at < NOW()`
    );

    if (expiredBookings.length > 0) {
      console.log(`Found ${expiredBookings.length} expired payment windows`);

      for (const booking of expiredBookings) {
        // Get all slot IDs for this booking
        let slotIds = [];
        if (booking.is_multi_slot && booking.slot_ids) {
          try {
            slotIds = typeof booking.slot_ids === 'string'
              ? JSON.parse(booking.slot_ids)
              : booking.slot_ids;
          } catch (e) {
            slotIds = booking.slot_id ? [booking.slot_id] : [];
          }
        } else {
          slotIds = booking.slot_id ? [booking.slot_id] : [];
        }

        // Release the slots
        if (slotIds.length > 0) {
          const placeholders = slotIds.map(() => '?').join(',');
          await connection.execute(
            `UPDATE time_slots 
                         SET is_available = TRUE,
                             locked_until = NULL,
                             locked_by_user_id = NULL
                         WHERE slot_id IN (${placeholders})`,
            slotIds
          );
        }

        // Update booking status to rejected - FIX: Remove cancellation_reason
        await connection.execute(
          `UPDATE bookings 
                     SET status = 'rejected',
                         cancelled_by = 'system',
                         cancellation_time = NOW()
                     WHERE booking_id = ?`,
          [booking.booking_id]
        );

        // Notify user
        try {
          // Use your notifications table structure
          await connection.execute(
            `INSERT INTO notifications 
                         (user_id, type, title, message, booking_id, created_at)
                         VALUES (?, ?, ?, ?, ?, NOW())`,
            [
              booking.user_id,
              'booking.payment_expired',
              'Payment Window Expired',
              'Your payment window has expired. Please create a new booking if you still want to book.',
              booking.booking_id
            ]
          );
        } catch (notifError) {
          console.warn("Could not send notification:", notifError.message);
        }
      }
    }

    // Also clean up any other expired locks that aren't tied to bookings
    const [result] = await connection.execute(
      `UPDATE time_slots 
             SET locked_until = NULL,
                 locked_by_user_id = NULL
             WHERE locked_until IS NOT NULL 
               AND locked_until <= NOW()`
    );

    if (result.affectedRows > 0) {
      console.log(`Cleaned up ${result.affectedRows} expired locks`);
    }

    await connection.commit();
    return result.affectedRows + expiredBookings.length;
  } catch (error) {
    await connection.rollback();
    console.error("Error cleaning up expired locks:", error);
    return 0;
  } finally {
    connection.release();
  }
}

function startLockExpiryJob() {
  // Run every 30 seconds
  setInterval(() => {
    releaseExpiredLocks().catch((err) =>
      console.warn("Lock expiry job failed:", err.message)
    );
  }, 30 * 1000);
  console.log("🕒 Lock expiry job started");
}

module.exports = {
  lockSlot,
  releaseSlot,
  transferSlotLock,
  releaseExpiredLocks,
  startLockExpiryJob,
};