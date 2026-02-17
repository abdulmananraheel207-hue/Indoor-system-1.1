import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import integrationService from "../../services/integrationService";

const ReviewReminderModal = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [pendingReviews, setPendingReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [hoverRating, setHoverRating] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        checkPendingReviews();
    }, []);

    const checkPendingReviews = async () => {
        try {
            setLoading(true);

            // REMOVED: localStorage check for dismissals

            // Fetch pending reviews
            console.log("Fetching pending reviews...");
            const response = await integrationService.getPendingReviews();
            console.log("Pending reviews response:", response);

            if (response?.pending_reviews?.length > 0) {
                console.log("Showing modal with", response.pending_reviews.length, "reviews");
                setPendingReviews(response.pending_reviews);
                setIsVisible(true);
                // Reset form for first review
                setRating(5);
                setComment("");
            } else {
                console.log("No pending reviews found");
            }
        } catch (error) {
            console.error("Error checking pending reviews:", error);
        } finally {
            setLoading(false);
        }
    };

    // REMOVED: handleDismiss function

    // REMOVED: handleSkipAll function

    const handleSubmitReview = async () => {
        if (!comment.trim()) {
            alert("Please write a review comment");
            return;
        }

        if (rating < 1 || rating > 5) {
            alert("Please select a rating between 1 and 5 stars");
            return;
        }

        const currentReview = pendingReviews[currentReviewIndex];
        if (!currentReview) return;

        try {
            setSubmitting(true);

            // Submit the review with booking_id
            await integrationService.submitReview(
                currentReview.arena_id,
                rating,
                comment.trim(),
                currentReview.booking_id
            );

            // Remove this review from pending list
            const updatedPending = pendingReviews.filter(
                review => review.booking_id !== currentReview.booking_id
            );

            if (updatedPending.length === 0) {
                // No more reviews, close modal and show success
                setIsVisible(false);
                setPendingReviews([]);
                alert("Thank you for your review! It helps other players make better choices.");
            } else {
                setPendingReviews(updatedPending);
                // Reset form for next review
                setRating(5);
                setComment("");
                // If we're at the last review, adjust index
                if (currentReviewIndex >= updatedPending.length) {
                    setCurrentReviewIndex(updatedPending.length - 1);
                }

                // Show success message but keep modal open for next review
                alert("Review submitted successfully! You have more reviews to complete.");
            }

        } catch (error) {
            console.error("Error submitting review:", error);
            alert(error.message || "Failed to submit review. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleNext = () => {
        if (currentReviewIndex < pendingReviews.length - 1) {
            setCurrentReviewIndex(currentReviewIndex + 1);
            // Reset form for next review
            setRating(5);
            setComment("");
        }
    };

    const handlePrevious = () => {
        if (currentReviewIndex > 0) {
            setCurrentReviewIndex(currentReviewIndex - 1);
            // Reset form for previous review
            setRating(5);
            setComment("");
        }
    };

    const currentReview = pendingReviews[currentReviewIndex];

    // Don't render anything if not visible or loading
    if (!isVisible || loading || !currentReview) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">📝 Rate Your Experience</h2>
                            <p className="text-blue-100 mt-1">
                                Share your feedback to help other players
                            </p>
                        </div>
                        <div className="bg-white bg-opacity-20 rounded-full px-3 py-1">
                            <span className="font-bold">
                                {currentReviewIndex + 1} / {pendingReviews.length}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Arena Details */}
                    <div className="flex items-start space-x-4 mb-6">
                        <div className="bg-blue-100 p-3 rounded-full">
                            <span className="text-2xl">🏟️</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">
                                {currentReview.arena_name}
                            </h3>
                            <p className="text-gray-600 text-sm mt-1">
                                Court {currentReview.court_number} • {currentReview.court_name || `Court ${currentReview.court_number}`}
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                                Played on {new Date(currentReview.date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Rating Stars */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Rating
                        </label>
                        <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="text-3xl focus:outline-none transition-transform hover:scale-110"
                                >
                                    <span className={
                                        (hoverRating ? star <= hoverRating : star <= rating)
                                            ? "text-yellow-400"
                                            : "text-gray-300"
                                    }>
                                        ★
                                    </span>
                                </button>
                            ))}
                            <span className="ml-2 text-sm text-gray-600">
                                {rating} out of 5
                            </span>
                        </div>
                    </div>

                    {/* Review Text */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Review
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows="4"
                            placeholder="Tell others about your experience at this arena. How were the courts? The facilities? The staff?"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            maxLength={500}
                        />
                        <div className="text-right text-xs text-gray-500 mt-1">
                            {comment.length}/500
                        </div>
                    </div>

                    {/* Navigation between multiple reviews */}
                    {pendingReviews.length > 1 && (
                        <div className="flex justify-between items-center mb-4">
                            <button
                                onClick={handlePrevious}
                                disabled={currentReviewIndex === 0}
                                className="text-blue-600 font-medium disabled:text-gray-400 flex items-center"
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Previous
                            </button>
                            <span className="text-sm text-gray-500">
                                {currentReviewIndex + 1} of {pendingReviews.length}
                            </span>
                            <button
                                onClick={handleNext}
                                disabled={currentReviewIndex === pendingReviews.length - 1}
                                className="text-blue-600 font-medium disabled:text-gray-400 flex items-center"
                            >
                                Next
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 pb-6">
                    <div className="flex flex-col space-y-3">
                        <button
                            onClick={handleSubmitReview}
                            disabled={submitting || !comment.trim()}
                            className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center ${submitting || !comment.trim()
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                } transition-colors`}
                        >
                            {submitting ? (
                                <>
                                    <svg
                                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <span className="mr-2">⭐</span>
                                    Submit Review
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewReminderModal;