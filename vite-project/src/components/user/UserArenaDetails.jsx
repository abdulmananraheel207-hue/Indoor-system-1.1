import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { arenaAPI, bookingAPI } from "../../services/api";

const UserArenaDetails = () => {
  const { arenaId } = useParams();
  const navigate = useNavigate();
  const [arena, setArena] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [showReviews, setShowReviews] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });

  useEffect(() => {
    fetchArenaDetails();
    fetchReviews();
  }, [arenaId]);

  useEffect(() => {
    if (arena && selectedDate) {
      fetchAvailableSlots();
    }
  }, [arena, selectedDate]);

  // In UserArenaDetails.jsx, replace the fetchArenaDetails function:
  const fetchArenaDetails = async () => {
    try {
      setLoading(true);

      // Fetch arena details
      const arenaResponse = await arenaAPI.getArenaDetails(arenaId);
      const arenaData = arenaResponse.data;

      // Fetch courts for this arena
      let courtsData = [];
      try {
        const courtsResponse = await arenaAPI.getArenaCourts(arenaId);
        courtsData = courtsResponse.data.courts || [];
      } catch (courtError) {
        console.error("Error fetching courts:", courtError);
        courtsData = [];
      }

      // Transform court data to match expected format
      const transformedCourts = courtsData.map((court) => ({
        court_id: court.court_id,
        court_name: court.court_name || `Court ${court.court_number}`,
        court_number: court.court_number,
        size_sqft: court.size_sqft,
        price_per_hour: court.price_per_hour,
        description: court.description,
        sports: court.sports || [],
        sports_names: court.sports_names || [],
      }));

      setArena({
        ...arenaData,
        courts: transformedCourts,
      });

      if (transformedCourts.length > 0) {
        setSelectedCourt(transformedCourts[0]);
      }
    } catch (error) {
      console.error("Error fetching arena details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const response = await arenaAPI.getAvailableSlots(
        arenaId,
        dateStr,
        selectedCourt?.sports?.[0]
      );
      setAvailableSlots(response.data);
    } catch (error) {
      console.error("Error fetching slots:", error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/arenas/${arenaId}/reviews`
      );
      const data = await response.json();
      if (response.ok) {
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const handleSlotSelect = async (slot) => {
    if (slot.is_available && !slot.is_blocked) {
      setSelectedSlot(slot);
      setBookingInProgress(true); // Just mark as in progress
      // Remove all locking/release logic for now
    }
  };
  const handleBooking = async () => {
    if (!selectedSlot) {
      alert("Please select a time slot");
      return;
    }

    // Add validation for selectedCourt
    if (!selectedCourt || !selectedCourt.court_id) {
      alert("Please select a court first");
      return;
    }

    try {
      const bookingData = {
        arena_id: parseInt(arenaId),
        court_id: selectedCourt.court_id,
        date: selectedDate.toISOString().split("T")[0],
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        total_amount: selectedSlot.price,
        payment_method: "pay_after", // Changed from "manual" to valid enum value
        requires_advance: false,
        sport_id: selectedCourt.sports?.[0] || selectedSlot.sport_id,
      };

      console.log("Sending booking data:", bookingData);
      const response = await bookingAPI.createBooking(bookingData);

      if (response.status === 201) {
        alert(response.data?.message || "Booking request sent successfully!");
        // Release the slot lock using correct endpoint
        if (selectedSlot.slot_id) {
          alert(response.data?.message || "Booking request sent successfully!");
        }
        navigate(`/user/bookings`);
      } else {
        alert(response.data?.message || "Failed to create booking");
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      console.error("Error details:", error.response?.data);
      // More specific error handling
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else if (error.response?.status === 400) {
        alert("Invalid booking data");
      } else {
        alert("Failed to create booking. Please try again.");
      }

      // Release slot lock on error
      if (selectedSlot?.slot_id) {
        try {
          await fetch(
            `http://localhost:5000/api/arenas/slots/${selectedSlot.slot_id}/release`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
        } catch (releaseError) {
          console.error("Error releasing slot:", releaseError);
        }
      }
      setBookingInProgress(false);
    }
  };

  const handleAddFavorite = async () => {
    try {
      await fetch(`http://localhost:5000/api/user/arenas/${arenaId}/favorite`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      alert("Arena added to favorites!");
    } catch (error) {
      console.error("Error adding favorite:", error);
    }
  };

  const handleSubmitReview = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/arenas/${arenaId}/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(newReview),
        }
      );

      if (response.ok) {
        alert("Review submitted successfully!");
        setNewReview({ rating: 5, comment: "" });
        fetchReviews();
      }
    } catch (error) {
      console.error("Error submitting review:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!arena) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p className="text-gray-600">Arena not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <svg
                className="h-5 w-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>
            <button
              onClick={handleAddFavorite}
              className="text-red-500 hover:text-red-700"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Arena Images Carousel */}
        <div className="mb-8">
          <div className="h-96 bg-gray-200 rounded-2xl overflow-hidden">
            {arena.images && arena.images.length > 0 ? (
              <img
                src={arena.images[0].image_url}
                alt={arena.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <span className="text-gray-400">No images available</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Arena Info */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {arena.name}
                  </h1>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`h-5 w-5 ${
                            i < Math.floor(arena.rating || 0)
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="ml-2 font-semibold">
                        {arena.rating || "New"}
                      </span>
                      <span className="ml-1 text-gray-600">
                        ({reviews.length} reviews)
                      </span>
                    </div>
                    <button
                      onClick={() => setShowReviews(!showReviews)}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {showReviews ? "Hide Reviews" : "Show Reviews"}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    Rs {arena.base_price_per_hour || 0}
                  </div>
                  <div className="text-gray-600">per hour</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-gray-400 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium">{arena.address}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-gray-400 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-600">Courts</p>
                    <p className="font-medium">{arena.number_of_courts}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Description
                </h3>
                <p className="text-gray-600">{arena.description}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Available Sports
                </h3>
                <div className="flex flex-wrap gap-2">
                  {arena.sports &&
                    arena.sports.split(",").map((sport, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {sport.trim()}
                      </span>
                    ))}
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            {showReviews && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Reviews
                </h3>

                {/* Add Review Form */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Add Your Review
                  </h4>
                  <div className="mb-3">
                    <div className="flex items-center mb-2">
                      <span className="text-sm text-gray-600 mr-3">
                        Rating:
                      </span>
                      {[...Array(5)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() =>
                            setNewReview({ ...newReview, rating: i + 1 })
                          }
                          className="text-2xl mr-1"
                        >
                          {i < newReview.rating ? "★" : "☆"}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={newReview.comment}
                      onChange={(e) =>
                        setNewReview({ ...newReview, comment: e.target.value })
                      }
                      rows="3"
                      placeholder="Share your experience..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <button
                    onClick={handleSubmitReview}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Submit Review
                  </button>
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.review_id}
                      className="border-b pb-4 last:border-0"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{review.user_name}</p>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "text-yellow-400"
                                    : "text-gray-300"
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-600">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Booking Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
              <h3 className="text-xl font-semibold text-blue-600 mb-6">
                Book Now
              </h3>
              {/* Date Picker */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  dateFormat="yyyy-MM-dd"
                  minDate={new Date()}
                />
              </div>

              {/* Court Selection */}
              {arena.courts && arena.courts.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Court
                  </label>
                  <div className="space-y-2">
                    {arena.courts.map((court) => (
                      <button
                        key={court.court_id}
                        onClick={() => setSelectedCourt(court)}
                        className={`w-full text-left p-3 rounded-lg border ${
                          selectedCourt?.court_id === court.court_id
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{court.court_name}</p>
                            <p className="text-sm text-gray-600">
                              Rs {court.price_per_hour}/hour
                            </p>
                          </div>
                          {court.sports && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {court.sports[0]}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Time Slots */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Time Slots
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.slot_id}
                      onClick={() => handleSlotSelect(slot)}
                      disabled={!slot.is_available || slot.is_blocked}
                      className={`p-3 rounded-lg border text-center ${
                        selectedSlot?.slot_id === slot.slot_id
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : slot.is_available && !slot.is_blocked
                          ? "border-gray-300 hover:bg-gray-50"
                          : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <div className="font-medium">
                        {slot.start_time} - {slot.end_time}
                      </div>
                      <div className="text-sm">Rs {slot.price}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Booking Summary */}
              {selectedSlot && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Booking Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span>{selectedDate.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span>
                        {selectedSlot.start_time} - {selectedSlot.end_time}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Court:</span>
                      <span>{selectedCourt?.court_name}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span>Rs {selectedSlot.price}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Book Button */}
              <button
                onClick={handleBooking}
                disabled={!selectedSlot || bookingInProgress}
                className={`w-full py-3 rounded-lg font-medium ${
                  selectedSlot && !bookingInProgress
                    ? "bg-primary-600 text-white hover:bg-primary-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {bookingInProgress
                  ? "Processing..."
                  : selectedSlot
                  ? "Book Now"
                  : "Select a time slot"}
              </button>

              {selectedSlot && bookingInProgress && (
                <p className="mt-3 text-sm text-gray-600 text-center">
                  Slot locked for 10 minutes
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserArenaDetails;
