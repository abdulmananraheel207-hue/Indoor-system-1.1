import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import integrationService from "../../services/integrationService";

const ReviewReminderModal = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [pendingReviews, setPendingReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        checkPendingReviews();
    }, []);

    const checkPendingReviews = async () => {
        try {
            setLoading(true);

            // Check localStorage first (30-day timeout)
            const lastDismissed = localStorage.getItem("reviewRemindersDismissedUntil");
            if (lastDismissed && new Date(lastDismissed) > new Date()) {
                console.log("Reminders dismissed until:", lastDismissed);
                return;
            }

            // Fetch pending reviews (backend checks review_reminder_shown)
            const response = await integrationService.getPendingReviews();

            if (response?.pending_reviews?.length > 0) {
                setPendingReviews(response.pending_reviews);
                setIsVisible(true);
            }
        } catch (error) {
            console.error("Error checking pending reviews:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = async (bookingId) => {
        try {
            // Mark this specific reminder as dismissed
            await fetch("http://localhost:5000/api/users/reviews/dismiss-reminder", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ booking_id: bookingId }),
            });

            // Don't show again for 30 days (not 7)
            const nextMonth = new Date();
            nextMonth.setDate(nextMonth.getDate() + 30);
            localStorage.setItem("reviewRemindersDismissedUntil", nextMonth.toISOString());

            setIsVisible(false);
            setPendingReviews([]);

            alert("Reminder dismissed. You can still add a review from the arena details page anytime!");
        } catch (error) {
            console.error("Error dismissing reminder:", error);
        }
    };
    const handleSkipAll = async () => {
        try {
            await fetch("http://localhost:5000/api/users/reviews/skip-all-reminders", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json",
                },
            });

            // Don't show again for 30 days (not 7)
            const nextMonth = new Date();
            nextMonth.setDate(nextMonth.getDate() + 30);
            localStorage.setItem("reviewRemindersDismissedUntil", nextMonth.toISOString());

            setIsVisible(false);
            setPendingReviews([]);

            alert("All reminders skipped for 30 days. You can still add reviews from arena details pages!");
        } catch (error) {
            console.error("Error skipping all reminders:", error);
        }
    };
    const handleWriteReview = (arenaId) => {
        setIsVisible(false);
        // ✅ FIX: Navigate to arena details with showReviewForm parameter
        navigate(`/user/arenas/${arenaId}?showReviewForm=true`);
    };

    const currentReview = pendingReviews[currentReviewIndex];

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
                                Help others by sharing your experience
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
                    <div className="flex items-start space-x-4 mb-6">
                        <div className="bg-blue-100 p-3 rounded-full">
                            <span className="text-2xl">🏟️</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">
                                {currentReview.arena_name}
                            </h3>
                            <p className="text-gray-600 text-sm mt-1">
                                Court {currentReview.court_number} • {currentReview.court_name}
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                                Played on {new Date(currentReview.date).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <p className="text-gray-700 text-sm">
                            How was your experience at{" "}
                            <span className="font-semibold">{currentReview.arena_name}</span>?
                            Your review helps other players make better decisions.
                        </p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 pb-6">
                    <div className="flex flex-col space-y-3">
                        <button
                            onClick={() => handleWriteReview(currentReview.arena_id)}
                            className="bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                        >
                            <span className="mr-2">⭐</span>
                            Write a Review
                        </button>

                        <button
                            onClick={() => handleDismiss(currentReview.booking_id)}
                            className="border border-gray-300 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Maybe Later
                        </button>

                        {pendingReviews.length > 1 && (
                            <div className="flex justify-between pt-4 border-t">
                                <button
                                    onClick={() =>
                                        setCurrentReviewIndex((prev) =>
                                            prev > 0 ? prev - 1 : prev
                                        )
                                    }
                                    disabled={currentReviewIndex === 0}
                                    className="text-blue-600 font-medium disabled:text-gray-400"
                                >
                                    ← Previous
                                </button>
                                <button
                                    onClick={() =>
                                        setCurrentReviewIndex((prev) =>
                                            prev < pendingReviews.length - 1 ? prev + 1 : prev
                                        )
                                    }
                                    disabled={currentReviewIndex === pendingReviews.length - 1}
                                    className="text-blue-600 font-medium disabled:text-gray-400"
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 text-center">
                        <button
                            onClick={handleSkipAll}
                            className="text-gray-500 text-sm hover:text-gray-700"
                        >
                            Don't show these reminders again for 7 days
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewReminderModal;