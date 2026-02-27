// File: PaymentScreenshotModal.jsx - UPDATED with actual upload functionality
import React, { useState, useRef, useEffect } from 'react';
import paymentService from '../../services/paymentService';

const PaymentScreenshotModal = ({
    isOpen,
    onClose,
    booking,
    timeRemaining,
    onSubmit
}) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [notes, setNotes] = useState('');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [localTimeRemaining, setLocalTimeRemaining] = useState(timeRemaining || 600);
    const fileInputRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        // Start timer
        timerRef.current = setInterval(() => {
            setLocalTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isOpen]);

    useEffect(() => {
        // Reset time when booking changes
        setLocalTimeRemaining(timeRemaining || 600);
        // Reset form when modal opens with new booking
        if (isOpen) {
            setSelectedFile(null);
            setPreview(null);
            setNotes('');
            setError('');
        }
    }, [booking, timeRemaining, isOpen]);

    if (!isOpen) return null;

    const formatTimeRemaining = (seconds) => {
        if (!seconds && seconds !== 0) return '10:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        setError('');

        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file (JPEG, PNG, etc.)');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('File size must be less than 5MB');
            return;
        }

        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async () => {
        if (!selectedFile) {
            setError('Please select a payment screenshot');
            return;
        }

        setUploading(true);
        setError('');

        try {
            // Upload the screenshot
            const result = await paymentService.uploadScreenshot(
                booking.booking_id,
                selectedFile,
                notes
            );

            // Clear timer
            if (timerRef.current) clearInterval(timerRef.current);

            // Call onSubmit callback if provided
            if (onSubmit) {
                await onSubmit({
                    booking_id: booking.booking_id,
                    screenshot: result.screenshot
                });
            }

            // Show success message
            alert('✅ Payment screenshot uploaded successfully! The owner will verify your payment.');

            // Close modal
            onClose();

        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message || 'Failed to upload screenshot');
        } finally {
            setUploading(false);
        }
    };

    const handleCancel = () => {
        // Clean up preview URL
        if (preview) URL.revokeObjectURL(preview);

        // Reset form
        setSelectedFile(null);
        setPreview(null);
        setNotes('');
        setError('');

        // Close modal
        onClose();
    };

    const isExpired = localTimeRemaining === 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className={`p-6 ${isExpired ? 'bg-red-600' : 'bg-blue-600'} text-white sticky top-0`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="bg-white bg-opacity-20 p-3 rounded-xl mr-4">
                                <span className="text-3xl">💰</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Advance Payment Required</h2>
                                <p className="text-blue-100 text-sm mt-1">
                                    Booking #{booking?.booking_id}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleCancel}
                            className="text-white hover:text-gray-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Timer */}
                    {!isExpired && (
                        <div className="mt-4 bg-white bg-opacity-20 rounded-lg p-3 text-center">
                            <p className="text-sm opacity-90">Time remaining to upload payment:</p>
                            <p className="text-2xl font-mono font-bold">
                                {formatTimeRemaining(localTimeRemaining)}
                            </p>
                        </div>
                    )}

                    {isExpired && (
                        <div className="mt-4 bg-red-500 bg-opacity-30 rounded-lg p-3 text-center">
                            <p className="font-bold">⏰ Payment window expired</p>
                            <p className="text-sm mt-1">You can still pay from the Bookings page</p>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Booking Summary */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                        <h3 className="font-semibold text-gray-900 mb-3">Booking Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Arena:</span>
                                <span className="font-medium">{booking?.arena_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Court:</span>
                                <span className="font-medium">{booking?.court_name || `Court ${booking?.court_number}`}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Date:</span>
                                <span className="font-medium">
                                    {new Date(booking?.date).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Time:</span>
                                <span className="font-medium">
                                    {booking?.start_time} - {booking?.end_time}
                                </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t mt-2">
                                <span className="text-gray-600 font-semibold">Advance Amount:</span>
                                <span className="text-xl font-bold text-blue-600">
                                    Rs {booking?.advance_amount || booking?.total_amount}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Instructions */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                        <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Payment Instructions
                        </h4>
                        <p className="text-sm text-yellow-700">
                            1. Make advance payment to the bank account below<br />
                            2. Take a screenshot of the transaction<br />
                            3. Upload the screenshot here<br />
                            4. Owner will verify and confirm your booking
                        </p>
                        <div className="mt-3 p-3 bg-white rounded-lg border border-yellow-200">
                            <p className="text-xs text-gray-500">Bank Account Details:</p>
                            <p className="text-sm font-medium">Bank: HBL</p>
                            <p className="text-sm font-medium">Account: 1234-5678-9012-3456</p>
                            <p className="text-sm font-medium">IBAN: PK36HBLP1234567890123456</p>
                            <p className="text-sm font-medium">Title: ArenaFinder Pro</p>
                        </div>
                    </div>

                    {/* File Upload */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Payment Screenshot
                        </label>

                        {!preview ? (
                            <div
                                onClick={() => !isExpired && !uploading && fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isExpired || uploading
                                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                                        : 'border-gray-300 hover:border-blue-500'
                                    }`}
                            >
                                <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                <p className="text-sm text-gray-600">
                                    {isExpired
                                        ? 'Payment window expired'
                                        : uploading
                                            ? 'Upload in progress...'
                                            : 'Click to select screenshot'}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    PNG, JPG up to 5MB
                                </p>
                            </div>
                        ) : (
                            <div className="relative">
                                <img
                                    src={preview}
                                    alt="Payment screenshot preview"
                                    className="w-full h-48 object-cover rounded-xl border border-gray-300"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        URL.revokeObjectURL(preview);
                                        setPreview(null);
                                        setSelectedFile(null);
                                    }}
                                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                                    disabled={isExpired || uploading}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                            disabled={isExpired || uploading}
                        />
                    </div>

                    {/* Notes (Optional) */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Additional Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any additional information about the payment..."
                            rows="3"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isExpired || uploading}
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col space-y-3">
                        {!isExpired ? (
                            <>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={uploading || !selectedFile}
                                    className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center ${uploading || !selectedFile
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    {uploading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Uploading...
                                        </>
                                    ) : (
                                        'Submit Payment Proof'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={uploading}
                                    className="border border-gray-300 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50"
                                >
                                    Pay Later
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="w-full py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                            >
                                Close
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentScreenshotModal;