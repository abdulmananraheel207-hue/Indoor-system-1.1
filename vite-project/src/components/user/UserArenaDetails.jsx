import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import integrationService from "../../services/integrationService";
import { bookingAPI, arenaAPI } from "../../services/api";

const UserArenaDetails = () => {
  const { arenaId } = useParams();
  const navigate = useNavigate();
  const [arena, setArena] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [sportsList, setSportsList] = useState([]);
  const [selectedSportId, setSelectedSportId] = useState(null);
  const [selectedSportName, setSelectedSportName] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [showReviews, setShowReviews] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });

  useEffect(() => {
    fetchArenaDetails();
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arenaId]);

  useEffect(() => {
    if (arena && selectedDate && selectedCourt) {
      fetchAvailableSlots();
      // clear any previously selected slots when date changes
      setSelectedSlots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arena, selectedDate, selectedCourt, selectedSportId]);

  // Helper function to find sport by name
  const findSportByName = (sportName) => {
    if (!sportName || !sportsList.length) return null;

    return sportsList.find(s => {
      const sName = s.name || s.sport_name || "";
      return sName.toLowerCase() === sportName.toLowerCase();
    });
  };

  const fetchArenaDetails = async () => {
    try {
      setLoading(true);
      const details = await integrationService.getArenaDetails(arenaId);
      console.log("Raw arena details:", details);
      console.log("First court:", details.courts[0]);

      // First, fetch sports list to have it available
      let sportsData = [];
      try {
        sportsData = await integrationService.getSportsCategories();
        setSportsList(sportsData || []);
        console.log("Sports list loaded:", sportsData);
      } catch (e) {
        console.warn('Could not load sports list', e);
      }

      // Transform court data to match expected format
      const transformedCourts = details.courts.map((court) => {
        // Extract sport information from court
        let sportId = court.sport_id || null;
        let sportName = null;

        if (court.sports && court.sports.length > 0) {
          sportName = court.sports[0];

          // Try to find sport_id if not already present
          if (!sportId && sportName && sportsData.length > 0) {
            const sport = findSportByName(sportName);
            if (sport) {
              sportId = sport.sport_id || sport.id || null;
              console.log(`Found sport_id for ${sportName}:`, sportId);
            }
          }
        }

        return {
          court_id: court.court_id,
          court_name: court.court_name || `Court ${court.court_number}`,
          court_number: court.court_number,
          size_sqft: court.size_sqft,
          price_per_hour: court.price_per_hour,
          description: court.description,
          sports: court.sports || [],
          sports_names: court.sports_names || [],
          sport_id: sportId,
          sport_name: sportName
        };
      });

      console.log("Transformed courts:", transformedCourts);

      setArena({
        ...details.arena,
        courts: transformedCourts,
        sports: Array.isArray(details.arena.sports)
          ? details.arena.sports
          : typeof details.arena.sports === 'string'
            ? details.arena.sports.split(',').map(s => s.trim())
            : []
      });
      setReviews(details.reviews || []);

      if (transformedCourts.length > 0) {
        const firstCourt = transformedCourts[0];
        setSelectedCourt(firstCourt);

        // Set sport based on the first court
        if (firstCourt.sport_id) {
          setSelectedSportId(firstCourt.sport_id);
          setSelectedSportName(firstCourt.sport_name || firstCourt.sports[0]);
          console.log("Set sport from court:", {
            sportId: firstCourt.sport_id,
            sportName: firstCourt.sport_name || firstCourt.sports[0]
          });
        } else if (firstCourt.sports && firstCourt.sports.length > 0) {
          const sportName = firstCourt.sports[0];
          setSelectedSportName(sportName);

          // Try to find sport_id from sports list
          if (sportsData.length > 0) {
            const sport = findSportByName(sportName);
            if (sport) {
              const foundSportId = sport.sport_id || sport.id;
              setSelectedSportId(foundSportId);
              console.log("Found sport_id from list:", foundSportId);
            }
          }
        }
      }

    } catch (error) {
      console.error("Error fetching arena details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const dateStr = integrationService.formatDate(selectedDate);
      console.log("Fetching slots with:", {
        arenaId,
        dateStr,
        selectedSportId,
        selectedSportName,
        courtId: selectedCourt?.court_id
      });

      let slots = [];

      // Try with sport_id first (most reliable)
      if (selectedSportId) {
        console.log("Fetching slots with sport_id:", selectedSportId);
        slots = await integrationService.getAvailableSlots(
          arenaId,
          dateStr,
          selectedSportId
        );
      }
      // If no sport_id, try with sport name
      else if (selectedSportName) {
        console.log("Fetching slots with sport name:", selectedSportName);
        slots = await integrationService.getAvailableSlots(
          arenaId,
          dateStr,
          selectedSportName
        );
      }
      // Fallback: try without sport filter
      else {
        console.log("Fetching slots without sport filter");
        slots = await integrationService.getAvailableSlots(
          arenaId,
          dateStr
        );
      }

      console.log("Available slots fetched:", slots.length, "slots");
      setAvailableSlots(slots || []);
    } catch (error) {
      console.error("Error fetching slots:", error);
      setAvailableSlots([]);
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

  // Handle court selection
  const handleCourtSelect = (court) => {
    console.log("Court selected:", court);
    setSelectedCourt(court);
    // Clear selected slots when court changes
    setSelectedSlots([]);

    // Update sport based on selected court
    if (court.sport_id) {
      setSelectedSportId(court.sport_id);
      setSelectedSportName(court.sport_name || court.sports[0]);
      console.log("Set sport from court selection:", {
        sportId: court.sport_id,
        sportName: court.sport_name || court.sports[0]
      });
    } else if (court.sports && court.sports.length > 0) {
      const sportName = court.sports[0];
      setSelectedSportName(sportName);

      // Try to find sport_id from sports list
      const sport = findSportByName(sportName);
      if (sport) {
        const sportId = sport.sport_id || sport.id;
        setSelectedSportId(sportId);
        console.log("Found sport_id for court:", sportId);
      } else {
        setSelectedSportId(null);
        console.log("Could not find sport_id for:", sportName);
      }
    } else {
      setSelectedSportId(null);
      setSelectedSportName(null);
    }
  };

  const handleSlotSelect = (slot) => {
    if (!slot.is_available || slot.is_blocked) return;

    // toggle selection
    console.log("Slot clicked:", slot);
    const exists = selectedSlots.some((s) => s.slot_id === slot.slot_id);
    if (exists) {
      const next = selectedSlots.filter((s) => s.slot_id !== slot.slot_id);
      setSelectedSlots(next);
      console.log("Slot deselected. Remaining:", next.length);
    } else {
      // Add court_id to slot for booking
      const slotWithCourt = {
        ...slot,
        court_id: selectedCourt?.court_id
      };
      const next = [...selectedSlots, slotWithCourt];
      setSelectedSlots(next);
      console.log("Slot selected. Total:", next.length);
    }
  };

  const handleBooking = async () => {
    try {
      if (selectedSlots.length === 0) {
        alert("Please select at least one time slot");
        return;
      }

      // Check if we have sport_id
      if (!selectedSportId) {
        alert("Error: Could not determine sport. Please try selecting a different court or refresh the page.");
        return;
      }

      setBookingInProgress(true);

      // Format date
      const dateStr = integrationService.formatDate(selectedDate) ||
        selectedDate.toISOString().split('T')[0];

      // Get current user ID (replace with your actual auth method)
      const userId = localStorage.getItem('userId') ||
        sessionStorage.getItem('userId') ||
        "current_user";

      console.log("Starting booking process...", {
        selectedSlotsCount: selectedSlots.length,
        selectedSportId,
        selectedSportName,
        dateStr,
        userId,
        arenaId,
        courtId: selectedCourt?.court_id
      });

      // STEP 1: Check availability for all selected slots
      try {
        console.log("Checking slot availability...");
        const res = await arenaAPI.getAvailableSlots(
          arenaId,
          dateStr,
          selectedSportId
        );

        const availableSlots = res.data || res || [];
        const availableSlotIds = availableSlots.map(s => s.slot_id);
        console.log("Available slot IDs:", availableSlotIds);

        // Find which slots are no longer available
        const unavailableSlots = selectedSlots.filter(
          slot => !availableSlotIds.includes(slot.slot_id)
        );

        if (unavailableSlots.length > 0) {
          const slotTimes = unavailableSlots.map(s => `${s.start_time}-${s.end_time}`).join(', ');
          alert(`The following time slots are no longer available: ${slotTimes}\nPlease refresh and select different slots.`);
          setBookingInProgress(false);
          return;
        }
      } catch (error) {
        console.warn("Could not verify slot availability, proceeding anyway:", error);
      }

      // STEP 2: Create booking(s) - one booking per slot
      let successfulBookings = 0;
      let failedBookings = [];

      console.log("Creating bookings for", selectedSlots.length, "slots...");

      for (const slot of selectedSlots) {
        try {
          // Prepare booking data according to your API requirements
          const bookingData = {
            arena_id: parseInt(arenaId),
            slot_id: slot.slot_id, // SINGULAR slot_id (not array)
            sport_id: selectedSportId, // This is now guaranteed to have a value
            date: dateStr,
            user_id: userId,
            total_amount: slot.price || 0,
            court_id: selectedCourt?.court_id || slot.court_id
          };

          console.log(`Booking slot ${slot.start_time}-${slot.end_time}:`, bookingData);

          // Use integrationService to create booking
          await integrationService.createBooking({
            arenaId: parseInt(arenaId),
            slotId: slot.slot_id,
            sportId: selectedSportId,
            date: dateStr,
            totalPrice: slot.price || 0,
            courtId: selectedCourt?.court_id
          });

          successfulBookings++;
          console.log(`✓ Slot ${slot.start_time}-${slot.end_time} booked successfully`);

        } catch (slotError) {
          console.error(`✗ Failed to book slot ${slot.start_time}-${slot.end_time}:`, slotError);

          // Try alternative format
          try {
            console.log("Trying alternative booking format...");
            const altBookingData = {
              arena_id: parseInt(arenaId),
              sport_id: selectedSportId,
              date: dateStr,
              start_time: slot.start_time,
              end_time: slot.end_time,
              total_amount: slot.price || 0,
              user_id: userId
            };

            await bookingAPI.createBooking(altBookingData);
            successfulBookings++;
            console.log(`✓ Slot booked with alternative format`);

          } catch (altError) {
            console.error(`✗ Alternative format also failed:`, altError);
            failedBookings.push(`${slot.start_time}-${slot.end_time}`);
          }
        }
      }

      // Show results
      if (successfulBookings > 0) {
        if (failedBookings.length === 0) {
          alert(`Successfully booked ${successfulBookings} time slot(s)!`);
        } else {
          alert(`Successfully booked ${successfulBookings} slot(s), but failed to book: ${failedBookings.join(', ')}`);
        }

        // Reset selections and refresh
        setSelectedSlots([]);
        fetchAvailableSlots();

        // Navigate to bookings page or show confirmation
        setTimeout(() => {
          navigate('/my-bookings');
        }, 1500);

      } else {
        alert(`Failed to book all selected time slots. Please try again.`);
      }

    } catch (error) {
      console.error("Unexpected error in handleBooking:", error);
      alert(`Booking error: ${error.response?.data?.message || error.message || "Please try again."}`);
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleAddFavorite = async () => {
    try {
      await integrationService.addToFavorites(arenaId);
      alert("Arena added to favorites!");
    } catch (error) {
      console.error("Error adding favorite:", error);
      alert("Failed to add to favorites");
    }
  };

  const handleSubmitReview = async () => {
    if (!newReview.comment.trim()) {
      alert("Please enter a comment");
      return;
    }

    try {
      await integrationService.submitReview(arenaId, newReview.rating, newReview.comment);
      alert("Review submitted successfully!");
      setNewReview({ rating: 5, comment: "" });
      fetchReviews();
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review");
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
              type="button"
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
              type="button"
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
                          className={`h-5 w-5 ${i < Math.floor(arena.rating || 0)
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
                      type="button"
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
                  {arena.sports && arena.sports.length > 0
                    ? arena.sports.map((sport, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {sport}
                      </span>
                    ))
                    : <span className="text-gray-500">No sports listed</span>
                  }
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
                          type="button"
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
                    type="button"
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
                                className={`h-4 w-4 ${i < review.rating
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
              <h3 className="text-xl font-semibold text-black-1000 mb-6">
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
                        type="button"
                        onClick={() => handleCourtSelect(court)}
                        className={`w-full text-left p-3 rounded-lg border ${selectedCourt?.court_id === court.court_id
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
                          {court.sports && court.sports.length > 0 && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {court.sports[0]}
                            </span>
                          )}
                        </div>
                        {court.sport_id && (
                          <div className="text-xs text-gray-500 mt-1">
                            Sport ID: {court.sport_id}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sport Info Display */}
              {selectedSportName && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Selected Sport:</span> {selectedSportName}
                    {selectedSportId && ` (ID: ${selectedSportId})`}
                  </p>
                </div>
              )}

              {/* Time Slots */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Time Slots
                </label>
                {availableSlots.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    {selectedCourt
                      ? `No time slots available for ${selectedCourt.court_name} on ${selectedDate.toLocaleDateString()}`
                      : "Select a court and date to see available time slots"
                    }
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlots.some((s) => s.slot_id === slot.slot_id);

                      return (
                        <button
                          key={slot.slot_id}
                          type="button"
                          onClick={() => handleSlotSelect(slot)}
                          disabled={!slot.is_available || slot.is_blocked}
                          className={`p-3 rounded-lg border text-center ${isSelected
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
                          {slot.sport_id && (
                            <div className="text-xs text-gray-500">Sport ID: {slot.sport_id}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Booking Summary */}
              {selectedSlots && selectedSlots.length > 0 && (
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
                      <span className="text-gray-600">Time Range:</span>
                      <span>
                        {(() => {
                          const sorted = [...selectedSlots].sort((a, b) => a.start_time.localeCompare(b.start_time));
                          return `${sorted[0].start_time} - ${sorted[sorted.length - 1].end_time}`;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Court:</span>
                      <span>{selectedCourt?.court_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sport:</span>
                      <span>{selectedSportName || "Not specified"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sport ID:</span>
                      <span>{selectedSportId || "Not found"}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span>Rs {selectedSlots.reduce((s, it) => s + Number(it.price || 0), 0)}</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Selected slots:</p>
                      <div className="text-sm">
                        {selectedSlots.map((s) => (
                          <div key={s.slot_id}>{s.start_time} - {s.end_time}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Book Button */}
              {selectedSlots.length > 0 && (
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => { setSelectedSlots([]); console.log('cleared selectedSlots'); }}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Clear All
                  </button>
                  <div className="text-sm text-gray-600">Selected: {selectedSlots.length}</div>
                </div>
              )}

              <button
                type="button"
                onClick={handleBooking}
                disabled={selectedSlots.length === 0 || bookingInProgress || !selectedSportId}
                className={`w-full py-3 rounded-lg font-medium ${selectedSlots.length > 0 && !bookingInProgress && selectedSportId
                  ? "bg-primary-600 text-white hover:bg-primary-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
              >
                {bookingInProgress
                  ? `Booking ${selectedSlots.length} slot(s)...`
                  : !selectedSportId
                    ? "Sport ID missing"
                    : selectedSlots.length > 0
                      ? `Book ${selectedSlots.length} slot(s)`
                      : "Select a time slot"}
              </button>

              {/* Debug panel visible on-page to help when console isn't available */}
              <div className="mt-4 p-3 bg-gray-50 border rounded text-sm text-gray-700">
                <div className="font-medium mb-2">Debug Info</div>
                <div>Selected Sport ID: <span className={selectedSportId ? "text-green-600" : "text-red-600"}>
                  {selectedSportId || "NULL (This will cause booking to fail)"}
                </span></div>
                <div>Selected Sport Name: {selectedSportName || "null"}</div>
                <div>Selected Court: {selectedCourt ? `${selectedCourt.court_name} (ID: ${selectedCourt.court_id})` : "none"}</div>
                <div>Selected Slots: {selectedSlots.length}</div>
                <div>Available Slots: {availableSlots ? availableSlots.length : 0}</div>
                <div>Sports List: {sportsList ? sportsList.length : 0} items</div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-gray-600">Show selected slots</summary>
                  <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(selectedSlots, null, 2)}</pre>
                </details>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserArenaDetails;