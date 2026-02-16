import React, { useState, useEffect, useRef } from "react";
import integrationService from "../../services/integrationService";
import { useNavigate } from "react-router-dom";
import useRequireAuth from "../../hooks/useRequireAuth";

const UserBooking = () => {
  const navigate = useNavigate();
  const { requireAuth, Modal } = useRequireAuth();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const previousStatuses = useRef({});

  // State for review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  // State for booking details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Check guest access
  useEffect(() => {
    const isGuest = localStorage.getItem("isGuest") === "true";
    if (isGuest && bookings.length === 0) {
      // Just show empty state, no action needed
    }
  }, [bookings]);

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      let status;
      if (activeTab === "upcoming") {
        status = "pending,accepted";
      } else if (activeTab === "past") {
        status = "completed,cancelled,rejected";
      }

      const data = await integrationService.getUserBookings({ status });
      const list = data.bookings || [];

      list.forEach((booking) => {
        const prev = previousStatuses.current[booking.booking_id];
        if (prev && prev !== booking.status) {
          alert(
            `Booking #${booking.booking_id
            } is now ${booking.status.toUpperCase()}`
          );
        }
        previousStatuses.current[booking.booking_id] = booking.status;
      });

      setBookings(list);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setError(error.response?.data?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleCancelBooking = async (bookingId) => {
    const canProceed = await requireAuth(async () => {
      if (window.confirm("Are you sure you want to cancel this booking?")) {
        try {
          const reason = prompt("Please enter reason for cancellation:");
          if (!reason) return;

          await integrationService.cancelBooking(bookingId, reason);
          alert("Booking cancelled successfully");
          fetchBookings();
        } catch (error) {
          console.error("Error cancelling booking:", error);
          alert(error.response?.data?.message || "Failed to cancel booking");
        }
      }
    }, "cancel a booking");

    if (!canProceed) return;
  };

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleMakePayment = (bookingId) => {
    const canProceed = requireAuth(() => {
      navigate(`/user/payment/${bookingId}`);
    }, "make a payment");

    if (!canProceed) return;
  };

  // Open review modal for specific booking
  const handleWriteReview = (booking) => {
    setSelectedBookingForReview(booking);
    setRating(5);
    setComment("");
    setShowReviewModal(true);
  };

  // Handle review submission
  const handleSubmitReview = async () => {
    if (!comment.trim()) {
      alert("Please write a review comment");
      return;
    }

    if (rating < 1 || rating > 5) {
      alert("Please select a rating between 1 and 5 stars");
      return;
    }

    try {
      setSubmitting(true);

      await integrationService.submitReview(
        selectedBookingForReview.arena_id,
        rating,
        comment.trim(),
        selectedBookingForReview.booking_id
      );

      setShowReviewModal(false);
      setSelectedBookingForReview(null);
      alert("Thank you for your review! It helps other players make better choices.");
      fetchBookings(); // Refresh bookings
    } catch (error) {
      console.error("Error submitting review:", error);
      alert(error.message || "Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Close review modal
  const handleCloseReviewModal = () => {
    setShowReviewModal(false);
    setSelectedBookingForReview(null);
    setRating(5);
    setComment("");
  };

  // Close details modal
  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedBooking(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Bookings</h1>
          <p className="text-gray-600 mb-8">
            Manage your upcoming and past bookings
          </p>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("upcoming")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "upcoming"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                Upcoming Bookings
              </button>
              <button
                onClick={() => setActiveTab("past")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "past"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                Booking History
              </button>
            </nav>
          </div>

          {/* Bookings List */}
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <p className="text-red-600 font-semibold mb-4">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    fetchBookings();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            )}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No {activeTab} bookings
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {activeTab === "upcoming"
                    ? "You have no upcoming bookings. Book an arena to get started!"
                    : "Your past bookings will appear here."}
                </p>
                {activeTab === "upcoming" && (
                  <div className="mt-6">
                    <button
                      onClick={() => navigate("/user")}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                    >
                      Book an Arena
                    </button>
                  </div>
                )}
              </div>
            ) : (
              bookings.map((booking) => (
                <div
                  key={booking.booking_id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {booking.arena_name}
                      </h3>
                      <div className="flex items-center mt-2 space-x-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {booking.sport_name}
                        </span>
                        <span className="text-sm text-gray-600">
                          Court {booking.court_number || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 md:mt-0 flex items-center space-x-3">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status.charAt(0).toUpperCase() +
                          booking.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="flex items-center">
                      <svg
                        className="h-5 w-5 text-gray-400 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm text-gray-600">Date</p>
                        <p className="font-medium">
                          {new Date(booking.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <svg
                        className="h-5 w-5 text-gray-400 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm text-gray-600">Time</p>
                        <p className="font-medium">
                          {booking.start_time} - {booking.end_time}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <svg
                        className="h-5 w-5 text-gray-400 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm text-gray-600">Amount</p>
                        <p className="font-medium">Rs {booking.total_amount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {activeTab === "upcoming" && booking.status === "pending" && (
                      <button
                        onClick={() => handleCancelBooking(booking.booking_id)}
                        className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Cancel Booking
                      </button>
                    )}

                    {activeTab === "upcoming" &&
                      booking.payment_status === "pending" && (
                        <button
                          onClick={() => handleMakePayment(booking.booking_id)}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          Make Payment
                        </button>
                      )}

                    {/* Write Review Button - Only for completed bookings */}
                    {booking.status === "completed" && (
                      <button
                        onClick={() => handleWriteReview(booking)}
                        className="px-4 py-2 bg-purple-600 text-black rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                      >
                        <span className="mr-2">⭐</span>
                        Write a Review
                      </button>
                    )}

                    <button
                      onClick={() => handleViewDetails(booking)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Booking Details Modal */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white sticky top-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 p-3 rounded-xl mr-4">
                    <span className="text-3xl">🏟️</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Booking Details</h2>
                    <p className="text-blue-100 text-sm mt-1">
                      Booking ID: #{selectedBooking.booking_id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseDetailsModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Status Badge */}
              <div className="flex justify-end mb-6">
                <span className={`px-4 py-2 text-sm font-semibold rounded-full ${getStatusColor(selectedBooking.status)}`}>
                  {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                </span>
              </div>

              {/* Arena Information */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Arena Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Arena Name</p>
                    <p className="font-medium text-gray-900">{selectedBooking.arena_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sport</p>
                    <p className="font-medium text-gray-900">{selectedBooking.sport_name}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium text-gray-900">{selectedBooking.arena_address || selectedBooking.address || 'Address not available'}</p>
                  </div>
                </div>
              </div>

              {/* Court & Time Information */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Court & Time Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Court</p>
                    <p className="font-medium text-gray-900">Court {selectedBooking.court_number || 'N/A'} - {selectedBooking.court_name || `Court ${selectedBooking.court_number}`}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedBooking.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Start Time</p>
                    <p className="font-medium text-gray-900">{formatTime(selectedBooking.start_time)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">End Time</p>
                    <p className="font-medium text-gray-900">{formatTime(selectedBooking.end_time)}</p>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Payment Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-xl font-bold text-gray-900">Rs {selectedBooking.total_amount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedBooking.payment_method?.replace('_', ' ') || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Status</p>
                    <p className={`font-medium ${selectedBooking.payment_status === 'completed'
                      ? 'text-green-600'
                      : selectedBooking.payment_status === 'pending'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                      }`}>
                      {selectedBooking.payment_status?.charAt(0).toUpperCase() + selectedBooking.payment_status?.slice(1) || 'Pending'}
                    </p>
                  </div>

                </div>
              </div>



              {/* Cancellation Information (if cancelled) */}
              {selectedBooking.status === 'cancelled' && selectedBooking.cancellation_time && (
                <div className="bg-red-50 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancellation Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-red-700">Cancelled By</p>
                      <p className="font-medium text-red-900 capitalize">{selectedBooking.cancelled_by}</p>
                    </div>
                    <div>
                      <p className="text-sm text-red-700">Cancellation Time</p>
                      <p className="font-medium text-red-900">
                        {new Date(selectedBooking.cancellation_time).toLocaleString()}
                      </p>
                    </div>
                    {selectedBooking.cancellation_fee > 0 && (
                      <div>
                        <p className="text-sm text-red-700">Cancellation Fee</p>
                        <p className="font-medium text-red-900">Rs {selectedBooking.cancellation_fee}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Booking Timeline */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Booking Timeline
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-24 text-sm text-gray-600">Booked on:</div>
                    <div className="font-medium text-gray-900">
                      {new Date(selectedBooking.booking_date).toLocaleString()}
                    </div>
                  </div>
                  {selectedBooking.status === 'completed' && (
                    <div className="flex items-center">
                      <div className="w-24 text-sm text-gray-600">Completed:</div>
                      <div className="font-medium text-green-600">
                        {new Date(selectedBooking.updated_at || selectedBooking.booking_date).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 p-6 bg-gray-50 sticky bottom-0">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCloseDetailsModal}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
                {selectedBooking.status === "pending" && (
                  <button
                    onClick={() => {
                      handleCloseDetailsModal();
                      handleCancelBooking(selectedBooking.booking_id);
                    }}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Cancel Booking
                  </button>
                )}
                {selectedBooking.status === "completed" && (
                  <button
                    onClick={() => {
                      handleCloseDetailsModal();
                      handleWriteReview(selectedBooking);
                    }}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                  >
                    <span className="mr-2">⭐</span>
                    Write a Review
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedBookingForReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
              <h2 className="text-2xl font-bold">📝 Rate Your Experience</h2>
              <p className="text-blue-100 mt-1">
                Share your feedback to help other players
              </p>
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
                    {selectedBookingForReview.arena_name}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Court {selectedBookingForReview.court_number} • {selectedBookingForReview.court_name || `Court ${selectedBookingForReview.court_number}`}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Played on {new Date(selectedBookingForReview.date).toLocaleDateString('en-US', {
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

                <button
                  onClick={handleCloseReviewModal}
                  disabled={submitting}
                  className="border border-gray-300 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal />
    </>
  );
};

export default UserBooking;