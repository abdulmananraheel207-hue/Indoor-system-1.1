const pool = require("../db");
const { lockSlot, releaseSlot } = require("./slotLockService");
const { sendNotification } = require("./notificationService");

async function getBookingWithAccess(bookingId, ownerId) {
  const [rows] = await pool.execute(
    `SELECT b.*, ts.slot_id, ts.date, ts.start_time, ts.end_time, ts.court_id,
            a.owner_id, a.name AS arena_name
     FROM bookings b
     JOIN time_slots ts ON b.slot_id = ts.slot_id
     JOIN arenas a ON b.arena_id = a.arena_id
     WHERE b.booking_id = ? AND a.owner_id = ?`,
    [bookingId, ownerId]
  );
  return rows[0];
}

async function acceptBooking({ bookingId, ownerId, actorType = "owner" }) {
  const booking = await getBookingWithAccess(bookingId, ownerId);

  if (!booking) {
    return { status: 404, message: "Booking not found or access denied" };
  }

  if (booking.status !== "pending") {
    return { status: 400, message: "Only pending bookings can be accepted" };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE bookings 
       SET status = 'accepted',
           lock_expires_at = NULL,
           owner_id = ?,
           court_id = COALESCE(court_id, ?)
       WHERE booking_id = ?`,
      [ownerId, booking.court_id, bookingId]
    );

    await lockSlot(booking.slot_id, booking.user_id, 120, connection);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await sendNotification({
    userId: booking.user_id,
    ownerId,
    bookingId,
    type: "booking.accepted",
    title: "Booking accepted",
    message: `Your booking for ${booking.date} ${booking.start_time}-${booking.end_time} is confirmed.`,
  });

  return { status: 200, message: "Booking accepted successfully" };
}

async function rejectBooking({
  bookingId,
  ownerId,
  reason = "",
  actorType = "owner",
}) {
  const booking = await getBookingWithAccess(bookingId, ownerId);

  if (!booking) {
    return { status: 404, message: "Booking not found or access denied" };
  }

  if (booking.status !== "pending") {
    return { status: 400, message: "Only pending bookings can be rejected" };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE bookings 
       SET status = 'rejected',
           cancellation_time = NOW(),
           cancelled_by = ?,
           lock_expires_at = NULL
       WHERE booking_id = ?`,
      [actorType, reason || "Not provided", bookingId]
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

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await sendNotification({
    userId: booking.user_id,
    ownerId,
    bookingId,
    type: "booking.rejected",
    title: "Booking rejected",
    message: reason
      ? `Your booking was rejected: ${reason}`
      : "Your booking was rejected by the arena",
  });

  return { status: 200, message: "Booking rejected successfully" };
}

module.exports = {
  acceptBooking,
  rejectBooking,
};
