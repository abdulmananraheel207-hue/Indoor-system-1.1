// File: PaymentVerificationModal.jsx - UPDATED to fetch screenshot from backend
import React, { useState, useEffect } from 'react';
import integrationService from '../../services/integrationService';

const PaymentVerificationModal = ({
    isOpen,
    onClose,
    onConfirm,
    onReject,
    booking,
    isOwner,
    permissions
}) => {
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [activeImage, setActiveImage] = useState(null);

    // NEW: State for fetched screenshot data
    const [screenshotData, setScreenshotData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // NEW: Fetch screenshot when modal opens
    useEffect(() => {
        if (isOpen && booking?.booking_id) {
            fetchPaymentScreenshot();
        }
    }, [isOpen, booking?.booking_id]);

    const fetchPaymentScreenshot = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log("📸 Fetching payment screenshot for booking:", booking.booking_id);
            const response = await integrationService.getPaymentScreenshot(booking.booking_id);

            if (response.success) {
                setScreenshotData({
                    screenshot_url: response.screenshot_url,
                    bank_details: response.bank_details,
                    user_name: response.user_name,
                    user_email: response.user_email,
                    advance_amount: response.advance_amount,
                    total_amount: response.total_amount
                });
            } else {
                setError('Failed to load payment screenshot');
            }
        } catch (error) {
            console.error('Error fetching screenshot:', error);
            setError(error.message || 'Failed to load payment screenshot');
        } finally {
            setLoading(false);
        }
    };

    const canVerify = isOwner || permissions?.manage_bookings;

    const handleConfirm = async () => {
        setProcessing(true);
        try {
            await onConfirm(booking.booking_id);
            onClose();
        } catch (error) {
            console.error('Error confirming payment:', error);
            alert('Failed to confirm payment: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason && showRejectInput) {
            alert('Please provide a reason for rejection');
            return;
        }

        setProcessing(true);
        try {
            await onReject(booking.booking_id, rejectReason);
            onClose();
        } catch (error) {
            console.error('Error rejecting payment:', error);
            alert('Failed to reject payment: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    if (!isOpen || !booking) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white sticky top-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="bg-white bg-opacity-20 p-3 rounded-xl mr-4">
                                <span className="text-3xl">🔍</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Verify Payment</h2>
                                <p className="text-blue-100 text-sm mt-1">
                                    Booking #{booking.booking_id} • {booking.user_name || screenshotData?.user_name}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-gray-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Loading State */}
                    {loading && (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                            <p className="mt-2 text-gray-600">Loading payment screenshot...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !loading && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                            <p className="text-red-600">{error}</p>
                            <button
                                onClick={fetchPaymentScreenshot}
                                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Main Content - Show only when not loading */}
                    {!loading && !error && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <div className="bg-gray-50 rounded-xl p-5 mb-6">
                                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        Booking Details
                                    </h3>

                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Customer:</span>
                                            <span className="font-medium">{booking.user_name || screenshotData?.user_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Phone:</span>
                                            <span className="font-medium">{booking.user_phone}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Email:</span>
                                            <span className="font-medium">{booking.user_email || screenshotData?.user_email}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Sport:</span>
                                            <span className="font-medium">{booking.sport_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Court:</span>
                                            <span className="font-medium">{booking.court_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Date:</span>
                                            <span className="font-medium">{formatDate(booking.date)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Time:</span>
                                            <span className="font-medium">
                                                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                            </span>
                                        </div>

                                        {/* Multi-slot info */}
                                        {booking.is_multi_slot && booking.slot_count > 1 && (
                                            <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                                                <p className="text-sm text-purple-800">
                                                    ⏱️ {booking.slot_count} consecutive slots
                                                </p>
                                            </div>
                                        )}

                                        <div className="pt-3 border-t mt-3">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 font-semibold">Total Amount:</span>
                                                <span className="text-xl font-bold text-gray-900">
                                                    Rs {booking.total_amount}
                                                </span>
                                            </div>
                                            <div className="flex justify-between mt-2">
                                                <span className="text-gray-600">Advance Required:</span>
                                                <span className="font-medium text-blue-600">
                                                    Rs {booking.advance_amount || screenshotData?.advance_amount || booking.total_amount}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Info */}
                                <div className="bg-gray-50 rounded-xl p-5">
                                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                                        <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        Payment Information
                                    </h3>

                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Payment Method:</span>
                                            <span className="font-medium">Advance Payment</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Payment Status:</span>
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                Awaiting Verification
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Uploaded At:</span>
                                            <span className="font-medium">
                                                {new Date(booking.updated_at || booking.booking_date).toLocaleString()}
                                            </span>
                                        </div>
                                        {screenshotData?.bank_details && (
                                            <div className="mt-3">
                                                <p className="text-gray-600 mb-1">User Notes:</p>
                                                <p className="text-sm bg-white p-2 rounded border">
                                                    {screenshotData.bank_details}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Screenshot */}
                            <div>
                                <div className="bg-gray-50 rounded-xl p-5">
                                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                                        <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Payment Screenshot
                                    </h3>

                                    {screenshotData?.screenshot_url ? (
                                        <div className="space-y-4">
                                            {/* Thumbnail */}
                                            <div
                                                className="border rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition"
                                                onClick={() => setActiveImage(screenshotData.screenshot_url)}
                                            >
                                                <img
                                                    src={screenshotData.screenshot_url}
                                                    alt="Payment screenshot"
                                                    className="w-full h-64 object-contain bg-gray-100"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = 'https://via.placeholder.com/400x300?text=Failed+to+load+image';
                                                    }}
                                                />
                                            </div>

                                            {/* Fullscreen Modal */}
                                            {activeImage && (
                                                <div
                                                    className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
                                                    onClick={() => setActiveImage(null)}
                                                >
                                                    <div className="relative max-w-4xl max-h-[90vh]">
                                                        <img
                                                            src={activeImage}
                                                            alt="Payment screenshot full"
                                                            className="max-w-full max-h-[90vh] object-contain"
                                                        />
                                                        <button
                                                            onClick={() => setActiveImage(null)}
                                                            className="absolute top-4 right-4 text-white bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70"
                                                        >
                                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Download Link */}
                                            <a
                                                href={screenshotData.screenshot_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                                            >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                Open in new tab
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 bg-gray-100 rounded-lg">
                                            <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <p className="mt-2 text-gray-500">No screenshot uploaded yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reject Reason Input */}
                    {showRejectInput && !loading && (
                        <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason for Rejection
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Please explain why the payment is being rejected..."
                                rows="3"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            />
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {canVerify && !loading && (
                    <div className="border-t border-gray-200 p-6 bg-gray-50 sticky bottom-0">
                        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                            {!showRejectInput ? (
                                <>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={processing}
                                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                                    >
                                        {processing ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Processing...
                                            </>
                                        ) : (
                                            '✅ Confirm Payment'
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setShowRejectInput(true)}
                                        disabled={processing}
                                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                    >
                                        ❌ Reject Payment
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleReject}
                                        disabled={processing || !rejectReason}
                                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {processing ? 'Processing...' : 'Submit Rejection'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowRejectInput(false);
                                            setRejectReason('');
                                        }}
                                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}
                            <button
                                onClick={onClose}
                                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentVerificationModal;