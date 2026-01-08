const pool = require("../db");
const config = require("../config");

async function columnExists(table, column) {
  const [rows] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [config.DB_DATABASE, table, column]
  );
  return rows.length > 0;
}

async function ensureColumn(table, column, definition) {
  const exists = await columnExists(table, column);
  if (!exists) {
    await pool.execute(
      `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`
    );
  }
}

async function ensureNotificationsTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      owner_id INT NULL,
      manager_id INT NULL,
      booking_id INT NULL,
      type VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_owner_id (owner_id),
      INDEX idx_manager_id (manager_id),
      INDEX idx_booking_id (booking_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function applySchemaPatches() {
  try {
    await ensureNotificationsTable();
  } catch (error) {
    console.warn("Notification table ensure failed:", error.message);
  }

  try {
    await ensureColumn("bookings", "owner_id", "INT NULL");
    await ensureColumn("bookings", "court_id", "INT NULL");
    await ensureColumn("bookings", "lock_expires_at", "DATETIME NULL");
  } catch (error) {
    console.warn("Booking column patch failed:", error.message);
  }

  try {
    await ensureColumn("time_slots", "court_id", "INT NULL");
  } catch (error) {
    console.warn("Time slot patch failed:", error.message);
  }
}

module.exports = {
  applySchemaPatches,
};
