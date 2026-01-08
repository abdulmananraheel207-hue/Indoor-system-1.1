const pool = require("../db");
const { notifyBookingStatusChange } = require("./notificationService");

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

async function releaseExpiredLocks() {
  const connection = await pool.getConnection();
  try {
    const [expired] = await connection.execute(
      `SELECT b.booking_id, b.slot_id, b.user_id, b.arena_id, b.commission_amount,
              b.owner_id, ts.date, ts.start_time, ts.end_time
       FROM bookings b
       JOIN time_slots ts ON b.slot_id = ts.slot_id
       WHERE b.status = 'pending'
         AND (b.payment_screenshot_url IS NULL OR b.payment_screenshot_url = '')
         AND ts.locked_until IS NOT NULL
         AND ts.locked_until < NOW()`
    );

    if (expired.length === 0) return;

    await connection.beginTransaction();
    try {
      for (const booking of expired) {
        await connection.execute(
          `UPDATE bookings 
           SET status = 'expired',
               cancelled_by = 'system',
               cancellation_time = NOW(),
               lock_expires_at = NULL
           WHERE booking_id = ?`,
          [booking.booking_id]
        );

        await releaseSlot(booking.slot_id, connection);

        if (booking.commission_amount) {
          await connection.execute(
            `UPDATE arenas 
             SET total_commission_due = GREATEST(total_commission_due - ?, 0)
             WHERE arena_id = ?`,
            [booking.commission_amount, booking.arena_id]
          );
        }

        await notifyBookingStatusChange({
          booking: {
            ...booking,
            time_window: `${booking.date} ${booking.start_time}-${booking.end_time}`,
          },
          status: "expired",
          actor: "system",
        });
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    }
  } catch (error) {
    console.warn("releaseExpiredLocks failed:", error.message);
  } finally {
    connection.release();
  }
}

function startLockExpiryJob() {
  setInterval(() => {
    releaseExpiredLocks().catch((err) =>
      console.warn("Lock expiry job failed:", err.message)
    );
  }, 60 * 1000);
}

module.exports = {
  lockSlot,
  releaseSlot,
  releaseExpiredLocks,
  startLockExpiryJob,
};
