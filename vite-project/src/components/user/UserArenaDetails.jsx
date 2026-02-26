
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import integrationService from "../../services/integrationService";
import useRequireAuth from "../../hooks/useRequireAuth";

const UserArenaDetails = () => {
  const { arenaId } = useParams();
  const navigate = useNavigate();
  const { requireAuth, Modal } = useRequireAuth();
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
  const [lockExpiry, setLockExpiry] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastBookingId, setLastBookingId] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [successMessage, setSuccessMessage] = useState('Your booking request has been sent to the arena owner. They will review and respond soon.');
  const [bookingResponse, setBookingResponse] = useState(null);
  useEffect(() => {
    fetchArenaDetails();
    fetchArenaReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arenaId]);

  useEffect(() => {
    if (arena && selectedDate && selectedCourt?.court_id) {
      fetchAvailableSlots();
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

      console.log('Arena details received:', {
        name: details.name,
        address: details.address,
        google_maps_location: details.google_maps_location,
        all_fields: Object.keys(details)
      });

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

  // Replace the handleSlotSelect function with this enhanced version
  const handleSlotSelect = async (slot) => {
    const isSlotAvailable = slot.actually_available ?? slot.is_available;
    if (!isSlotAvailable || slot.is_blocked) return;

    const now = new Date();
    const slotDateObj = new Date(slot.date);
    const [hours, minutes] = slot.start_time.split(":").map(Number);
    slotDateObj.setHours(hours, minutes, 0, 0);

    if (slotDateObj < now) {
      alert(`Cannot select past time slots. Please choose a future time.`);
      return;
    }

    // Check if slot is already selected
    const exists = selectedSlots.some((s) => s.slot_id === slot.slot_id);

    try {
      if (exists) {
        // Release the slot
        setSelectedSlots((prev) => prev.filter((s) => s.slot_id !== slot.slot_id));
        await integrationService.releaseSlot(slot.slot_id);
        return;
      }

      // For multi-slot, check if slots are consecutive
      if (selectedSlots.length > 0) {
        const sorted = [...selectedSlots, slot].sort((a, b) =>
          a.start_time.localeCompare(b.start_time)
        );

        // Check if slots are consecutive
        let isValid = true;
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i].end_time !== sorted[i + 1].start_time) {
            isValid = false;
            break;
          }
        }

        if (!isValid) {
          alert("Please select consecutive time slots only");
          return;
        }
      }

      // Lock the slot
      await integrationService.lockSlot(slot.slot_id);
      const nextExpiry = new Date(Date.now() + 10 * 60 * 1000);
      setLockExpiry(nextExpiry);
      setTimeLeft("10:00");
      setSelectedSlots((prev) => [...prev, slot]);
    } catch (error) {
      console.error("Error handling slot selection:", error);
      alert(error.response?.data?.message || "Slot is no longer available.");
      fetchAvailableSlots();
    }
  };
  const getConsolidatedBookingInfo = () => {
    if (!selectedSlots || selectedSlots.length === 0) return null;

    const sorted = [...selectedSlots].sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    );

    // Check if slots are consecutive
    let isConsecutive = true;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].end_time !== sorted[i + 1].start_time) {
        isConsecutive = false;
        break;
      }
    }

    return {
      startTime: sorted[0].start_time,
      endTime: sorted[sorted.length - 1].end_time,
      totalHours: sorted.length,
      isConsecutive,
      totalPrice: sorted.reduce((sum, s) => sum + Number(s.price || 0), 0)
    };
  };

  const handleBooking = async () => {
    const canProceed = await requireAuth(() => { }, "book a court");
    if (!canProceed) return;

    if (!selectedSportId) {
      alert("Please select a sport before booking");
      return;
    }

    if (!selectedSlots || selectedSlots.length === 0) {
      alert("Please select at least one time slot");
      return;
    }

    if (!selectedCourt || !selectedCourt.court_id) {
      alert("Please select a court first");
      return;
    }

    try {
      setBookingInProgress(true);

      const sorted = [...selectedSlots].sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      );
      const startTime = sorted[0].start_time;
      const endTime = sorted[sorted.length - 1].end_time;

      // FIX: Calculate total price properly as a number
      const totalPrice = sorted.reduce(
        (sum, s) => sum + Number(s.price || 0),
        0
      );

      // Ensure totalPrice is a number with 2 decimal places
      const formattedTotalPrice = Number(totalPrice.toFixed(2));

      console.log("Booking details:", {
        arenaId: parseInt(arenaId),
        slotIds: selectedSlots.map((s) => s.slot_id),
        selectedSportId,
        totalPrice: formattedTotalPrice,
        courtId: selectedCourt.court_id
      });

      let sportToSend = selectedSportId;

      if (!sportToSend) {
        alert("Please select a sport before booking.");
        setBookingInProgress(false);
        return;
      }

      const slotIds = selectedSlots.map((s) => s.slot_id).filter(Boolean);
      let bookingResponse;

      if (slotIds.length > 1) {
        bookingResponse = await integrationService.createBooking({
          arenaId: parseInt(arenaId),
          slot_ids: slotIds,
          sportId: selectedSportId,
          totalPrice: formattedTotalPrice, // Use the formatted number
          courtId: selectedCourt.court_id,
          notes: "",
        });
      } else if (slotIds.length === 1) {
        bookingResponse = await integrationService.createBooking({
          arenaId: parseInt(arenaId),
          slot_id: slotIds[0],
          sport_id: selectedSportId,
          totalPrice: formattedTotalPrice, // Use the formatted number
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
          totalPrice: formattedTotalPrice, // Use the formatted number
          sportId: sportToSend,
          notes: "",
        });
      }
      // Store bookingResponse in state
      setBookingResponse(bookingResponse);

      setLastBookingId(
        bookingResponse?.bookings?.[0]?.booking_id ||
        bookingResponse?.booking?.booking_id
      );

      // Add this new logic for advance payment handling
      if (bookingResponse?.bookings?.[0]?.requires_advance) {
        setShowSuccessModal(true);
        setSuccessMessage(
          bookingResponse.bookings[0].advance_amount
            ? `Advance payment of Rs ${bookingResponse.bookings[0].advance_amount} required. You'll be notified when owner approves.`
            : "This arena requires advance payment. You'll be notified when owner approves."
        );
      } else {
        setShowSuccessModal(true);
        setSuccessMessage('Your booking request has been sent to the arena owner. They will review and respond soon.');
      }

      setSelectedSlots([]);
      setLockExpiry(null);
      setTimeLeft(null);

      fetchAvailableSlots();
    } catch (error) {
      console.error("Error creating booking:", error);
      alert(error.response?.data?.message || "Failed to create booking.");
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleAddFavorite = async () => {
    const canProceed = await requireAuth(() => { }, "add arenas to favorites");
    if (!canProceed) return;

    try {
      if (isFavorited) {
        alert("This arena is already in your favorites!");
        return;
      }

      await integrationService.addToFavorites(arenaId);
      setIsFavorited(true);
      alert("Arena added to favorites!");
    } catch (error) {
      console.error("Error adding favorite:", error);
      if (error.response?.status === 400 &&
        error.response?.data?.message?.includes("already in favorites")) {
        setIsFavorited(true);
        alert("This arena is already in your favorites!");
      } else {
        alert("Failed to add to favorites");
      }
    }
  };

  const getCurrentCourtImages = () => {
    if (!selectedCourt || !selectedCourt.images) return [];
    return selectedCourt.images;
  };

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

  const handleCourtChange = (court) => {
    setSelectedCourt(court);
    setCurrentImageIndex(0);
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
              className={`${isFavorited ? "text-red-700" : "text-red-500 hover:text-red-700"}`}
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
                <img
                  src={courtImages[currentImageIndex].image_url}
                  alt={`${selectedCourt.court_name} - Photo ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
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
                <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
                  {currentImageIndex + 1} / {courtImages.length}
                </div>
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
                    className={`flex-shrink-0 focus:outline-none ${currentImageIndex === index ? 'ring-2 ring-blue-500' : ''}`}
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
                {/* Location with Link */}
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
                    {/* Google Maps Link */}
                    {arena.google_maps_location && (
                      <a
                        href={arena.google_maps_location}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-2 text-sm text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        View on Google Maps
                      </a>
                    )}
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
                        if (lower.includes("football") || lower.includes("soccer")) return "⚽";
                        if (lower.includes("table") || lower.includes("ping")) return "🏓";
                        return "🎯";
                      };

                      return (
                        <div
                          key={index}
                          className="flex flex-col items-center justify-center w-16 text-center group"
                          title={sportName}
                        >
                          <div className="w-12 h-12 flex items-center justify-center bg-blue-50 rounded-full mb-2 border border-blue-100 group-hover:bg-blue-100 transition-colors">
                            <span className="text-2xl">{getEmoji(sportName)}</span>
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

              {/* Reviews Section - READ ONLY - NO WRITE BUTTONS */}
              <div className="border-t pt-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  Customer Reviews
                </h3>

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
                    <p className="text-gray-500 text-sm mt-1">
                      Be the first to share your experience after completing a booking!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Booking Section */}
          <div className="lg:col-span-1 booking-section">
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


              {sportsList && sportsList.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Sport
                  </label>
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

                    {/* FILTER sports to only show what this arena offers */}
                    {sportsList
                      .filter(sport => {
                        // Check if this sport is offered by the arena
                        if (!arena?.sports_list || arena.sports_list.length === 0) {
                          return false;
                        }

                        // Check by sport name (case insensitive)
                        const sportName = (sport.name || sport.sport_name || '').toLowerCase();
                        return arena.sports_list.some(arenaSport =>
                          arenaSport.toLowerCase() === sportName
                        );
                      })
                      .map((sport) => (
                        <option
                          key={sport.sport_id || sport.id}
                          value={sport.sport_id || sport.id}
                        >
                          {sport.name || sport.sport_name}
                        </option>
                      ))}
                  </select>

                  {/* Show message if no sports available */}
                  {(!arena?.sports_list || arena.sports_list.length === 0) && (
                    <p className="mt-2 text-sm text-yellow-600">
                      No sports information available for this arena
                    </p>
                  )}
                </div>
              )}

              {/* Time Slots */}
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
                      const isAvailable = slot.actually_available ?? slot.is_available;
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

              {/* Enhanced Booking Summary */}
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

                    {(() => {
                      const info = getConsolidatedBookingInfo();
                      if (!info) return null;

                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Time Range:</span>
                            <span>
                              {info.startTime} - {info.endTime}
                              {info.isConsecutive && info.totalHours > 1 && (
                                <span className="ml-2 text-green-600 text-xs">
                                  ({info.totalHours} hour{info.totalHours > 1 ? 's' : ''} continuous)
                                </span>
                              )}
                            </span>
                          </div>

                          {!info.isConsecutive && info.totalHours > 1 && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                              <p className="text-xs text-yellow-700">
                                ⚠️ Non-consecutive slots will be booked separately
                              </p>
                            </div>
                          )}

                          <div className="flex justify-between">
                            <span className="text-gray-600">Court:</span>
                            <span>{selectedCourt?.court_name || `Court ${selectedCourt?.court_number}`}</span>
                          </div>

                          <div className="flex justify-between font-medium pt-2 border-t">
                            <span>Total:</span>
                            <span>Rs {info.totalPrice}</span>
                          </div>

                          <div>
                            <p className="text-sm text-gray-600 mb-1">Selected slots:</p>
                            <div className="text-sm max-h-32 overflow-y-auto space-y-1">
                              {selectedSlots.map((s) => (
                                <div key={s.slot_id} className="flex justify-between text-xs">
                                  <span>{s.start_time} - {s.end_time}</span>
                                  <span>Rs {s.price}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Book Button */}
              {selectedSlots.length > 0 && (
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      selectedSlots.forEach((s) =>
                        integrationService.releaseSlot(s.slot_id).catch(() => { })
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
                    )}
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
                  ? "bg-primary-600 text-black hover:bg-primary-700 shadow-md hover:shadow-lg"
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

      {/* Success Modal */}
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
                {successMessage}
              </p>

              {/* Add advance payment info section */}
              {bookingResponse?.bookings?.[0]?.requires_advance && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-yellow-700">
                      <span className="font-semibold">Advance Payment Required:</span> Once owner approves, you'll have 10 minutes to upload payment proof.
                    </p>
                  </div>
                </div>
              )}

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
                    navigate("/user/dashboard");
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
      <Modal />
    </div>
  );
};

export default UserArenaDetails;