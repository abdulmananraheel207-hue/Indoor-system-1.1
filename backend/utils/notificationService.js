const pool = require("../db");

async function sendNotification({
  userId = null,
  ownerId = null,
  managerId = null,
  bookingId = null,
  type,
  title,
  message,
}) {
  if (!type || !title || !message) return;

  try {
    await pool.execute(
      `INSERT INTO notifications 
       (user_id, owner_id, manager_id, booking_id, type, title, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, ownerId, managerId, bookingId, type, title, message]
    );
  } catch (error) {
    console.warn("sendNotification failed:", error.message);
  }
}

async function notifyBookingStatusChange({ booking, status, actor }) {
  if (!booking) return;
  const title = `Booking ${status}`;
  const baseMessage = booking.time_window
    ? `Booking for ${booking.time_window}`
    : "Booking updated";

  await sendNotification({
    userId: booking.user_id,
    ownerId: booking.owner_id || booking.ownerId,
    bookingId: booking.booking_id,
    type: `booking.${status}`,
    title,
    message: `${baseMessage} was ${status} by ${actor || "system"}`,
  });
}

module.exports = {
  sendNotification,
  notifyBookingStatusChange,
};
