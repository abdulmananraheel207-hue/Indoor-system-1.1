// constants/bookingStatus.js
module.exports = {
    // Existing statuses
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',

    // New statuses for advance payment flow
    PENDING_ADVANCE: 'pending_advance',     // Initial state - waiting for owner to review
    AWAITING_PAYMENT: 'awaiting_payment',    // Owner approved - slots locked for payment
    PAYMENT_VERIFICATION: 'payment_verification', // User uploaded screenshot - owner verifying

    // Payment statuses
    PAYMENT_PENDING: 'pending',
    PAYMENT_COMPLETED: 'completed',
    PAYMENT_FAILED: 'failed'
};