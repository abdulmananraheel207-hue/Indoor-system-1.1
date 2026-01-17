import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import integrationService from "../../services/integrationService";

const UserArenaDetails = () => {
  const { arenaId } = useParams();
  const navigate = useNavigate();
  const [arena, setArena] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [sportsList, setSportsList] = useState([]);
  const [selectedSportId, setSelectedSportId] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [lockExpiry, setLockExpiry] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastBookingId, setLastBookingId] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchArenaDetails();
    fetchArenaReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arenaId]);

  useEffect(() => {
    if (arena && selectedDate && selectedCourt?.court_id) {
      fetchAvailableSlots();
      // clear any previously selected slots when date changes
      setSelectedSlots([]);
      setLockExpiry(null);
      setTimeLeft(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arena, selectedDate, selectedCourt?.court_id]);

  useEffect(() => {
    if (!lockExpiry) return;
    const interval = setInterval(() => {
      const diff = new Date(lockExpiry).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("00:00");
        setLockExpiry(null);
        setSelectedSlots([]);
        fetchAvailableSlots();
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(
          `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`
        );
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockExpiry]);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        const favorites = await integrationService.getFavoriteArenas();

        // Check if current arena is already in favorites
        const isAlreadyFavorited = favorites.some(
          (favorite) =>
            favorite.id === parseInt(arenaId) ||
            favorite.arena_id === parseInt(arenaId) ||
            favorite.arenaId === parseInt(arenaId)
        );

        setIsFavorited(isAlreadyFavorited);
      } catch (error) {
        console.error("Error checking favorite status:", error);
      }
    };

    checkFavoriteStatus();
  }, [arenaId]);

  const fetchArenaDetails = async () => {
    try {
      setLoading(true);
      const details = await integrationService.getArenaDetails(arenaId);

      // Transform court data to match expected format
      const transformedCourts = details.courts.map((court) => ({
        court_id: court.court_id,
        court_name: court.court_name || `Court ${court.court_number}`,
        court_number: court.court_number,
        size_sqft: court.size_sqft,
        price_per_hour: court.price_per_hour,
        description: court.description,
        sports: court.sports || [],
        sports_names: court.sports_names || [],
        images: court.images || [],
      }));

      setArena({
        ...details,
        courts: transformedCourts,
      });

      if (transformedCourts.length > 0) {
        setSelectedCourt(transformedCourts[0]);
        setCurrentImageIndex(0);
      }

      // fetch sports categories for sport selection
      try {
        const sports = await integrationService.getSportsCategories();
        setSportsList(sports || []);
      } catch (e) {
        console.warn("Could not load sports list", e);
      }
    } catch (error) {
      console.error("Error fetching arena details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArenaReviews = async () => {
    try {
      setLoadingReviews(true);
      const response = await integrationService.getArenaReviews(arenaId);
      
      // Handle different response formats
      if (response.reviews) {
        setReviews(response.reviews);
      } else if (Array.isArray(response)) {
        setReviews(response);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error("Error fetching arena reviews:", error);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const dateStr = integrationService.formatDate(selectedDate);

      if (!selectedCourt?.court_id) {
        console.error("No court selected");
        setAvailableSlots([]);
        return;
      }

      // Use court-specific endpoint
      const slots = await integrationService.getCourtSlots(
        arenaId,
        selectedCourt.court_id,
        dateStr,
        selectedSportId
      );

      setAvailableSlots(slots || []);
    } catch (error) {
      console.error("Error fetching court slots:", error);
      setAvailableSlots([]);
    }
  };

  const handleSlotSelect = (slot) => {
    // ... (keep existing slot selection logic)
    const isSlotAvailable = slot.actually_available ?? slot.is_available;
    if (!isSlotAvailable || slot.is_blocked) return;

    const now = new Date();

    // FIX: Create date in LOCAL timezone, not UTC
    const slotDateObj = new Date(slot.date);
    const [hours, minutes] = slot.start_time.split(":").map(Number);
    slotDateObj.setHours(hours, minutes, 0, 0);

    // Simple check: if slot start time is before current time
    if (slotDateObj < now) {
      const slotDateStr = slotDateObj.toLocaleDateString();
      const nowDateStr = now.toLocaleDateString();

      if (slotDateStr === nowDateStr) {
        // Same day
        alert(
          `Cannot select past time slots. ${slot.start_time} has already passed. Please choose a future time.`
        );
      } else {
        // Different day
        alert(
          `Cannot select past dates. ${slotDateStr} has already passed. Please choose today or a future date.`
        );
      }
      return;
    }

    // toggle selection
    const exists = selectedSlots.some((s) => s.slot_id === slot.slot_id);
    const toggleSelection = async () => {
      try {
        if (exists) {
          setSelectedSlots((prev) =>
            prev.filter((s) => s.slot_id !== slot.slot_id)
          );
          await integrationService.releaseSlot(slot.slot_id);
          return;
        }

        await integrationService.lockSlot(slot.slot_id);
        const nextExpiry = new Date(Date.now() + 10 * 60 * 1000);
        setLockExpiry(nextExpiry);
        setTimeLeft("10:00");
        setSelectedSlots((prev) => [...prev, slot]);
      } catch (error) {
        console.error("Error locking slot", error);
        alert(
          error.response?.data?.message ||
          "Slot is no longer available. Please choose another slot."
        );
        fetchAvailableSlots();
      }
    };

    toggleSelection();
  };

  const handleBooking = async () => {
    // ... (keep existing booking logic)
    // 1. Check if sport is selected
    if (!selectedSportId) {
      alert("Please select a sport before booking");
      const sportSelect = document.querySelector(
        'select[value*="selectedSportId"]'
      );
      if (sportSelect) {
        sportSelect.scrollIntoView({ behavior: "smooth", block: "center" });
        sportSelect.focus();
        sportSelect.classList.add("border-red-500", "ring-2", "ring-red-200");
        setTimeout(() => {
          sportSelect.classList.remove(
            "border-red-500",
            "ring-2",
            "ring-red-200"
          );
        }, 3000);
      }
      return;
    }

    // 2. Check if time slots are selected
    if (!selectedSlots || selectedSlots.length === 0) {
      alert("Please select at least one time slot");
      return;
    }

    // 3. Check if court is selected
    if (!selectedCourt || !selectedCourt.court_id) {
      alert("Please select a court first");
      return;
    }

    try {
      setBookingInProgress(true);

      // compute booking range and total price from selected slots
      const sorted = [...selectedSlots].sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      );
      const startTime = sorted[0].start_time;
      const endTime = sorted[sorted.length - 1].end_time;
      const totalPrice = sorted.reduce(
        (sum, s) => sum + Number(s.price || 0),
        0
      );

      // Ensure we have a sport id to send
      let sportToSend = selectedSportId;

      // Validate sport is in available sports for this arena/court
      if (sportsList && sportsList.length > 0) {
        const selectedSport = sportsList.find(
          (s) => s.sport_id === selectedSportId || s.id === selectedSportId
        );

        if (!selectedSport) {
          alert("Invalid sport selected. Please choose from available sports.");
          setBookingInProgress(false);
          return;
        }
      }

      if (!sportToSend) {
        alert("Please select a sport before booking.");
        setBookingInProgress(false);
        return;
      }

      // Collect all selected owner-created slot IDs for multi-slot booking
      const slotIds = selectedSlots.map((s) => s.slot_id).filter(Boolean);
      let bookingResponse;

      if (slotIds.length > 1) {
        bookingResponse = await integrationService.createBooking({
          arenaId: parseInt(arenaId),
          slot_ids: slotIds,
          sportId: selectedSportId,
          totalPrice,
          courtId: selectedCourt.court_id,
          notes: "",
        });
      } else if (slotIds.length === 1) {
        bookingResponse = await integrationService.createBooking({
          arenaId: parseInt(arenaId),
          slot_id: slotIds[0],
          sport_id: selectedSportId,
          totalPrice,
          courtId: selectedCourt.court_id,
          notes: "",
        });
      } else {
        bookingResponse = await integrationService.createBooking({
          arenaId: parseInt(arenaId),
          courtId: selectedCourt.court_id,
          date: integrationService.formatDate(selectedDate),
          startTime,
          endTime,
          totalPrice,
          sportId: sportToSend,
          notes: "",
        });
      }

      setLastBookingId(
        bookingResponse?.bookings?.[0]?.booking_id ||
        bookingResponse?.booking?.booking_id
      );
      setShowSuccessModal(true);

      setSelectedSlots([]);
      setLockExpiry(null);
      setTimeLeft(null);

      fetchAvailableSlots();
    } catch (error) {
      console.error("Error creating booking:", error);
      alert(
        error.response?.data?.message ||
        "Failed to create booking. Please try again."
      );
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleAddFavorite = async () => {
    try {
      // Check if already favorited first
      if (isFavorited) {
        alert("This arena is already in your favorites!");
        return;
      }

      console.log("Adding favorite with arenaId:", arenaId);
      await integrationService.addToFavorites(arenaId);

      // Update state to reflect it's now favorited
      setIsFavorited(true);
      alert("Arena added to favorites!");
    } catch (error) {
      console.error("Error adding favorite:", error);
      console.error("Error response:", error.response);

      // Check if it's the "already in favorites" error
      if (
        error.response?.status === 400 &&
        error.response?.data?.message?.includes("already in favorites")
      ) {
        setIsFavorited(true);
        alert("This arena is already in your favorites!");
      } else {
        alert("Failed to add to favorites");
      }
    }
  };

  const handleSubmitReview = async () => {
    if (!newReview.comment.trim()) {
      alert("Please enter a comment");
      return;
    }

    if (newReview.rating < 1 || newReview.rating > 5) {
      alert("Please select a rating between 1 and 5 stars");
      return;
    }

    try {
      setSubmittingReview(true);
      await integrationService.submitReview(
        arenaId,
        newReview.rating,
        newReview.comment
      );
      
      alert("Review submitted successfully!");
      setNewReview({ rating: 5, comment: "" });
      setShowReviewForm(false);
      
      // Refresh reviews
      await fetchArenaReviews();
      
    } catch (error) {
      console.error("Error submitting review:", error);
      alert(error.response?.data?.message || "Failed to submit review. You may need to complete a booking first.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Get current court images
  const getCurrentCourtImages = () => {
    if (!selectedCourt || !selectedCourt.images) return [];
    return selectedCourt.images;
  };

  // Handle next/previous image
  const nextImage = () => {
    const images = getCurrentCourtImages();
    if (images.length === 0) return;
    setCurrentImageIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevImage = () => {
    const images = getCurrentCourtImages();
    if (images.length === 0) return;
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  // Handle court change - reset image index
  const handleCourtChange = (court) => {
    setSelectedCourt(court);
    setCurrentImageIndex(0);
    // Clear selected slots when changing court
    setSelectedSlots([]);
    setLockExpiry(null);
    setTimeLeft(null);
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

  const courtImages = getCurrentCourtImages();
  const hasCourtImages = courtImages.length > 0;

  // Calculate average rating
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : "No ratings yet";

  return (
    <div className="min-h-screen bg-gray-50">
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
              className={`${isFavorited ? "text-red-700" : "text-red-500 hover:text-red-700"
                }`}
              disabled={isFavorited}
              title={isFavorited ? "Already in favorites" : "Add to favorites"}
            >
              <svg
                className="h-6 w-6"
                fill={isFavorited ? "currentColor" : "none"}
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
        {/* Court Images Carousel */}
        <div className="mb-8">
          <div className="relative h-96 bg-gray-200 rounded-2xl overflow-hidden">
            {hasCourtImages ? (
              <>
                {/* Main Image */}
                <img
                  src={courtImages[currentImageIndex].image_url}
                  alt={`${selectedCourt.court_name} - Photo ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Navigation Arrows */}
                {courtImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Image Counter */}
                <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
                  {currentImageIndex + 1} / {courtImages.length}
                </div>

                {/* Court Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
                  <div className="text-white">
                    <h2 className="text-2xl font-bold">{selectedCourt.court_name}</h2>
                    <p className="text-gray-200">Court {selectedCourt.court_number} • {selectedCourt.size_sqft} sqft</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                <div className="text-gray-400 text-6xl mb-4">🏟️</div>
                <span className="text-gray-400 text-lg mb-2">No images available</span>
                <p className="text-gray-500 text-sm">Select a court to view its photos</p>
              </div>
            )}
          </div>

          {/* Image Thumbnails */}
          {hasCourtImages && courtImages.length > 1 && (
            <div className="mt-4">
              <div className="flex space-x-2 overflow-x-auto py-2 px-1">
                {courtImages.map((image, index) => (
                  <button
                    key={image.image_id || index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 focus:outline-none ${currentImageIndex === index ? 'ring-2 ring-blue-500' : ''
                      }`}
                  >
                    <img
                      src={image.image_url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-20 h-14 object-cover rounded-lg border border-gray-300"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
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
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`h-6 w-6 ${i < Math.floor(arena.rating || averageRating)
                            ? "text-yellow-400"
                            : "text-gray-300"
                            }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="ml-2 font-semibold text-lg">
                        {averageRating}
                      </span>
                      <span className="ml-2 text-gray-600">
                        ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                      </span>
                    </div>
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
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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

              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Available Sports
                </h3>
                <div className="flex flex-wrap gap-3">
                  {arena.sports_list && arena.sports_list.length > 0 ? (
                    arena.sports_list.map((sportName, index) => {
                      const getEmoji = (name) => {
                        const lower = name.toLowerCase();
                        if (lower.includes("badminton")) return "🏸";
                        if (lower.includes("tennis")) return "🎾";
                        if (lower.includes("squash")) return "🥎";
                        if (lower.includes("basketball")) return "🏀";
                        if (lower.includes("volleyball")) return "🏐";
                        if (lower.includes("cricket")) return "🏏";
                        if (lower.includes("football") || lower.includes("soccer"))
                          return "⚽";
                        if (lower.includes("table") || lower.includes("ping"))
                          return "🏓";
                        return "🎯";
                      };

                      return (
                        <div
                          key={index}
                          className="flex flex-col items-center justify-center w-16 text-center group"
                          title={sportName}
                        >
                          <div className="w-12 h-12 flex items-center justify-center bg-blue-50 rounded-full mb-2 border border-blue-100 group-hover:bg-blue-100 transition-colors">
                            <span className="text-2xl">
                              {getEmoji(sportName)}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-gray-700 truncate w-full group-hover:text-blue-600">
                            {sportName}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-gray-500">No sports specified</span>
                  )}
                </div>
              </div>

              {/* Reviews Section - ALWAYS VISIBLE */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Customer Reviews
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {showReviewForm ? "Cancel Review" : "Write a Review"}
                  </button>
                </div>

                {/* Add Review Form */}
                {showReviewForm && (
                  <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-4 text-lg">
                      Share Your Experience
                    </h4>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Rating
                      </label>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewReview({ ...newReview, rating: star })}
                            className="text-3xl focus:outline-none transition-transform hover:scale-110"
                          >
                            <span className={star <= newReview.rating ? "text-yellow-400" : "text-gray-300"}>
                              {star <= newReview.rating ? "★" : "☆"}
                            </span>
                          </button>
                        ))}
                        <span className="ml-2 text-sm text-gray-600">
                          {newReview.rating} out of 5
                        </span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Review
                      </label>
                      <textarea
                        value={newReview.comment}
                        onChange={(e) =>
                          setNewReview({ ...newReview, comment: e.target.value })
                        }
                        rows="4"
                        placeholder="Tell others about your experience at this arena..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowReviewForm(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitReview}
                        disabled={submittingReview}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submittingReview ? "Submitting..." : "Submit Review"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Reviews List */}
                {loadingReviews ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : reviews.length > 0 ? (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div
                        key={review.review_id || review.id}
                        className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center">
                            {review.profile_picture_url ? (
                              <img
                                src={review.profile_picture_url}
                                alt={review.user_name}
                                className="w-10 h-10 rounded-full object-cover mr-3"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                <span className="text-gray-500 font-medium">
                                  {review.user_name?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{review.user_name}</p>
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
                                <span className="ml-2 text-sm text-gray-600">
                                  {review.rating}.0
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(review.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-gray-200 rounded-lg">
                    <div className="text-gray-400 text-4xl mb-3">📝</div>
                    <p className="text-gray-600 font-medium">No reviews yet</p>
                    <p className="text-gray-500 text-sm mt-1">Be the first to share your experience!</p>
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(true)}
                      className="mt-4 px-4 py-2 text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Write the first review
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Booking Section (Keep existing) */}
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

              {/* Court Selection (Keep existing) */}
              {arena.courts && arena.courts.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Court
                  </label>
                  <div className="space-y-3">
                    {arena.courts.map((court) => (
                      <button
                        key={court.court_id}
                        type="button"
                        onClick={() => handleCourtChange(court)}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${selectedCourt?.court_id === court.court_id
                            ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
                            : "border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-gray-900">
                                {court.court_name || `Court ${court.court_number}`}
                              </p>
                              {court.images && court.images.length > 0 && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  {court.images.length} photo{court.images.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              Rs {court.price_per_hour}/hour
                            </p>
                            {court.sports && court.sports.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {court.sports.map((sport, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                                  >
                                    {sport}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              Court {court.court_number}
                            </p>
                            {court.size_sqft && (
                              <p className="text-xs text-gray-400">
                                {court.size_sqft} sqft
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sport Selection (Keep existing) */}
              {sportsList && sportsList.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Sport
                  </label>
                  {(() => {
                    const getSafeArray = (data) => {
                      if (!data) return [];
                      if (Array.isArray(data)) return data;
                      if (typeof data === 'string') {
                        try {
                          return data.split(',').map(item => item.trim());
                        } catch (e) {
                          return [data];
                        }
                      }
                      return [];
                    };

                    const courtSports = getSafeArray(selectedCourt?.sports || selectedCourt?.sports_names);
                    const arenaSports = getSafeArray(arena?.sports || arena?.sports_list);

                    const getSportId = (sport) => {
                      if (!sport) return null;
                      if (typeof sport === 'number') return sport;
                      if (typeof sport === 'object') {
                        return sport.sport_id || sport.id;
                      }
                      if (typeof sport === 'string') {
                        const parsed = parseInt(sport);
                        if (!isNaN(parsed)) return parsed;
                        const found = sportsList.find(s =>
                          (s.name && s.name.toLowerCase() === sport.toLowerCase()) ||
                          (s.sport_name && s.sport_name.toLowerCase() === sport.toLowerCase())
                        );
                        return found ? (found.sport_id || found.id) : null;
                      }
                      return null;
                    };

                    const availableSportIds = new Set();
                    courtSports.forEach(sport => {
                      const id = getSportId(sport);
                      if (id) availableSportIds.add(id);
                    });
                    arenaSports.forEach(sport => {
                      const id = getSportId(sport);
                      if (id) availableSportIds.add(id);
                    });

                    const filteredSports = sportsList.filter((sport) => {
                      const sportId = sport.sport_id || sport.id;
                      return availableSportIds.has(sportId);
                    });

                    const sportsToShow = filteredSports.length > 0 ? filteredSports : sportsList;

                    return (
                      <>
                        <select
                          value={selectedSportId || ""}
                          onChange={(e) =>
                            setSelectedSportId(
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        >
                          <option value="">-- Select a Sport --</option>
                          {sportsToShow.map((sport) => (
                            <option
                              key={sport.sport_id || sport.id}
                              value={sport.sport_id || sport.id}
                            >
                              {sport.name || sport.sport_name}
                            </option>
                          ))}
                        </select>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Time Slots (Keep existing) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Time Slots for {selectedCourt?.court_name || "Selected Court"}
                </label>
                {availableSlots.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No time slots available for {selectedDate.toLocaleDateString()}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlots.some(
                        (s) => s.slot_id === slot.slot_id
                      );
                      const isAvailable =
                        slot.actually_available ?? slot.is_available;
                      const lockedLabel =
                        !isAvailable || slot.is_blocked ? "Locked" : null;
                      return (
                        <button
                          key={slot.slot_id}
                          type="button"
                          onClick={() => handleSlotSelect(slot)}
                          disabled={!isAvailable || slot.is_blocked}
                          className={`p-3 rounded-lg border text-center ${isSelected
                            ? "border-primary-500 bg-primary-50 text-primary-700"
                            : isAvailable && !slot.is_blocked
                              ? "border-gray-300 hover:bg-gray-50"
                              : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                            }`}
                        >
                          <div className="font-medium">
                            {slot.start_time} - {slot.end_time}
                          </div>
                          <div className="text-sm">Rs {slot.price}</div>
                          {!isAvailable && (
                            <div className="text-xs text-red-500">
                              {lockedLabel || "Unavailable"}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {timeLeft && (
                <div className="mt-2 text-sm text-primary-700">
                  Slot held for you: {timeLeft} remaining
                </div>
              )}

              {/* Booking Summary (Keep existing) */}
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
                          const sorted = [...selectedSlots].sort((a, b) =>
                            a.start_time.localeCompare(b.start_time)
                          );
                          return `${sorted[0].start_time} - ${sorted[sorted.length - 1].end_time}`;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Court:</span>
                      <span>{selectedCourt?.court_name || `Court ${selectedCourt?.court_number}`}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span>
                        Rs{" "}
                        {selectedSlots.reduce(
                          (s, it) => s + Number(it.price || 0),
                          0
                        )}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Selected slots:</p>
                      <div className="text-sm">
                        {selectedSlots.map((s) => (
                          <div key={s.slot_id}>
                            {s.start_time} - {s.end_time}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Book Button (Keep existing) */}
              {selectedSlots.length > 0 && (
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      selectedSlots.forEach((s) =>
                        integrationService
                          .releaseSlot(s.slot_id)
                          .catch(() => { })
                      );
                      setSelectedSlots([]);
                      setLockExpiry(null);
                      setTimeLeft(null);
                      fetchAvailableSlots();
                    }}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Clear All
                  </button>
                  <div className="text-sm text-gray-600">
                    Selected: {selectedSlots.length}{" "}
                    {timeLeft && (
                      <span className="text-primary-600 ml-2">
                        Hold expires in {timeLeft}
                      </span>
                    )}{" "}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleBooking}
                disabled={
                  !selectedCourt ||
                  selectedSlots.length === 0 ||
                  bookingInProgress ||
                  !selectedSportId
                }
                className={`w-full py-3 rounded-lg font-medium transition-all duration-200 ${selectedCourt &&
                  selectedSlots.length > 0 &&
                  selectedSportId &&
                  !bookingInProgress
                  ? "bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:shadow-lg"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
              >
                {bookingInProgress ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline"
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
                    Processing...
                  </>
                ) : !selectedCourt ? (
                  "Select Court"
                ) : selectedSlots.length > 0 && selectedSportId ? (
                  `Book ${selectedCourt.court_name}`
                ) : selectedSlots.length > 0 ? (
                  "Select Sport"
                ) : (
                  "Select Time Slots"
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
      {showSuccessModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Booking Request Sent!
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Your booking request has been sent to the arena owner. They will
                review and respond soon.
              </p>

              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <p className="text-sm font-medium text-gray-900">
                  Booking Details:
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedCourt?.court_name} •{" "}
                  {selectedDate.toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedSlots.length} Time slot{selectedSlots.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Book Another
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    navigate("/user/bookings");
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  View My Bookings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserArenaDetails;