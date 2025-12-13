import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const UserArenaDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingDetails, setBookingDetails] = useState({
        date: '',
        time: '',
        hours: 1,
        paymentMethod: 'pay_now'
    });

    // Sample arena data
    const arena = {
        id: 1,
        name: 'Elite Sports Arena',
        description: 'Premier indoor sports facility with multiple courts for various sports. State-of-the-art equipment and professional maintenance.',
        address: '123 Sports Street, City Center, 10001',
        rating: 4.5,
        totalReviews: 128,
        basePrice: 2000,
        sports: ['Cricket', 'Futsal', 'Badminton', 'Basketball'],
        amenities: ['Parking', 'Changing Rooms', 'Cafeteria', 'Equipment Rental', 'Showers'],
        images: [
            'https://via.placeholder.com/800x400',
            'https://via.placeholder.com/800x400/4299E1/FFFFFF',
            'https://via.placeholder.com/800x400/48BB78/FFFFFF'
        ],
        owner: 'Elite Sports Group',
        contact: '+1 (555) 123-4567',
        openingHours: '6:00 AM - 11:00 PM',
        courts: [
            { id: 1, name: 'Court 1', sport: 'Cricket', size: 'Standard', price: 2000 },
            { id: 2, name: 'Court 2', sport: 'Futsal', size: 'Standard', price: 1800 },
            { id: 3, name: 'Court 3', sport: 'Badminton', size: 'Standard', price: 1500 },
            { id: 4, name: 'Court 4', sport: 'Basketball', size: 'Full', price: 2500 },
        ]
    };

    // Sample time slots
    const timeSlots = [
        { id: 1, time: '08:00 - 09:00', available: true, price: 2000 },
        { id: 2, time: '09:00 - 10:00', available: true, price: 2000 },
        { id: 3, time: '10:00 - 11:00', available: false, price: 2000 },
        { id: 4, time: '11:00 - 12:00', available: true, price: 2000 },
        { id: 5, time: '12:00 - 13:00', available: true, price: 2200 },
        { id: 6, time: '13:00 - 14:00', available: true, price: 2200 },
        { id: 7, time: '14:00 - 15:00', available: true, price: 2200 },
        { id: 8, time: '15:00 - 16:00', available: true, price: 2000 },
        { id: 9, time: '16:00 - 17:00', available: false, price: 2000 },
        { id: 10, time: '17:00 - 18:00', available: true, price: 2500 },
        { id: 11, time: '18:00 - 19:00', available: true, price: 2500 },
        { id: 12, time: '19:00 - 20:00', available: true, price: 2500 },
    ];

    // Sample reviews
    const reviews = [
        {
            id: 1,
            user: 'John Smith',
            rating: 5,
            date: '2024-12-10',
            comment: 'Excellent facility! Well-maintained courts and friendly staff.',
            avatar: 'https://via.placeholder.com/40'
        },
        {
            id: 2,
            user: 'Sarah Johnson',
            rating: 4,
            date: '2024-12-08',
            comment: 'Good arena but could use better lighting in the evening.',
            avatar: 'https://via.placeholder.com/40'
        },
        {
            id: 3,
            user: 'Mike Chen',
            rating: 5,
            date: '2024-12-05',
            comment: 'Best indoor arena in the city. Highly recommended!',
            avatar: 'https://via.placeholder.com/40'
        }
    ];

    const handleTimeSlotSelect = (slot) => {
        if (slot.available) {
            setSelectedTimeSlot(slot);
            setBookingDetails({
                ...bookingDetails,
                time: slot.time,
                date: selectedDate || new Date().toISOString().split('T')[0]
            });
        }
    };

    const handleBookNow = () => {
        if (!selectedTimeSlot) {
            alert('Please select a time slot');
            return;
        }
        setShowBookingModal(true);
    };

    const handleConfirmBooking = () => {
        console.log('Confirm booking:', bookingDetails);
        // Implement booking logic
        setShowBookingModal(false);
        alert('Booking request sent successfully!');
        navigate('/user/bookings');
    };

    const renderStars = (rating) => {
        return (
            <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                        key={star}
                        className={`h-5 w-5 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Image Gallery */}
            <div className="relative h-64 sm:h-80 md:h-96">
                <img
                    src={arena.images[0]}
                    alt={arena.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                </div>
                <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg"
                >
                    <svg
                        className={`h-5 w-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-600'}`}
                        fill={isFavorite ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </button>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative">
                {/* Arena Header Card */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{arena.name}</h1>
                            <div className="flex items-center mt-2">
                                {renderStars(arena.rating)}
                                <span className="ml-2 text-gray-600">{arena.rating} ({arena.totalReviews} reviews)</span>
                            </div>
                            <div className="flex items-center mt-2 text-gray-600">
                                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{arena.address}</span>
                            </div>
                        </div>
                        <div className="mt-4 md:mt-0">
                            <div className="text-3xl font-bold text-gray-900">Rs {arena.basePrice}</div>
                            <div className="text-gray-600">per hour</div>
                        </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                            Book Now
                        </button>
                        <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                            Share
                        </button>
                        <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                            Contact Owner
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'overview'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('timeslots')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'timeslots'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Time Slots
                        </button>
                        <button
                            onClick={() => setActiveTab('courts')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'courts'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Courts
                        </button>
                        <button
                            onClick={() => setActiveTab('reviews')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'reviews'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Reviews
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-8">
                                <div className="bg-white rounded-xl shadow-sm p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
                                    <p className="text-gray-600">{arena.description}</p>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Sports</h2>
                                    <div className="flex flex-wrap gap-3">
                                        {arena.sports.map((sport, index) => (
                                            <span key={index} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg">
                                                {sport}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {arena.amenities.map((amenity, index) => (
                                            <div key={index} className="flex items-center">
                                                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>{amenity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Time Slots Tab */}
                        {activeTab === 'timeslots' && (
                            <div className="space-y-8">
                                <div className="bg-white rounded-xl shadow-sm p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-6">Select Date & Time</h2>

                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Date
                                        </label>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>

                                    <h3 className="text-sm font-medium text-gray-700 mb-4">Available Time Slots</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {timeSlots.map((slot) => (
                                            <button
                                                key={slot.id}
                                                onClick={() => handleTimeSlotSelect(slot)}
                                                className={`p-4 rounded-lg border text-center transition-all ${slot.id === selectedTimeSlot?.id
                                                        ? 'border-primary-500 bg-primary-50'
                                                        : slot.available
                                                            ? 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
                                                            : 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50'
                                                    }`}
                                                disabled={!slot.available}
                                            >
                                                <div className="font-medium">{slot.time}</div>
                                                <div className="text-sm text-gray-600">Rs {slot.price}</div>
                                                {!slot.available && (
                                                    <div className="text-xs text-red-600 mt-1">Booked</div>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {selectedTimeSlot && (
                                        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium text-gray-900">Selected Slot</div>
                                                    <div className="text-gray-600">{selectedDate} • {selectedTimeSlot.time}</div>
                                                </div>
                                                <div className="text-lg font-bold text-gray-900">Rs {selectedTimeSlot.price}</div>
                                            </div>
                                            <button
                                                onClick={handleBookNow}
                                                className="w-full mt-4 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                            >
                                                Proceed to Book
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Courts Tab */}
                        {activeTab === 'courts' && (
                            <div className="space-y-8">
                                <div className="bg-white rounded-xl shadow-sm p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-6">Available Courts</h2>
                                    <div className="space-y-4">
                                        {arena.courts.map((court) => (
                                            <div key={court.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">{court.name}</h3>
                                                        <div className="flex items-center mt-1 space-x-3">
                                                            <span className="text-sm text-gray-600">{court.sport}</span>
                                                            <span className="text-sm text-gray-600">{court.size} Court</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-xl font-bold text-gray-900">Rs {court.price}/hr</div>
                                                </div>
                                                <button className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                                                    Book This Court
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Reviews Tab */}
                        {activeTab === 'reviews' && (
                            <div className="space-y-8">
                                <div className="bg-white rounded-xl shadow-sm p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-lg font-semibold text-gray-900">Customer Reviews</h2>
                                        <button className="px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50">
                                            Write a Review
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        {reviews.map((review) => (
                                            <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center">
                                                        <img
                                                            src={review.avatar}
                                                            alt={review.user}
                                                            className="h-10 w-10 rounded-full mr-3"
                                                        />
                                                        <div>
                                                            <h4 className="font-medium text-gray-900">{review.user}</h4>
                                                            <div className="flex items-center">
                                                                {renderStars(review.rating)}
                                                                <span className="ml-2 text-sm text-gray-600">{review.date}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-gray-600">{review.comment}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="space-y-6">
                        {/* Owner Info */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Arena Owner</h3>
                            <div className="flex items-center">
                                <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                                    <span className="font-semibold text-primary-600">{arena.owner.charAt(0)}</span>
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900">{arena.owner}</div>
                                    <div className="text-sm text-gray-600">{arena.contact}</div>
                                </div>
                            </div>
                        </div>

                        {/* Operating Hours */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Operating Hours</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Monday - Sunday</span>
                                    <span className="font-medium">{arena.openingHours}</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Booking */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Quick Book</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Select Date
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Select Time
                                    </label>
                                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                                        <option>08:00 - 09:00</option>
                                        <option>09:00 - 10:00</option>
                                        <option>10:00 - 11:00</option>
                                    </select>
                                </div>
                                <button className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                                    Check Availability
                                </button>
                            </div>
                        </div>

                        {/* Map */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Location</h3>
                            <div className="h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                                <div className="text-center">
                                    <svg className="h-8 w-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                    </svg>
                                    <span className="text-sm text-gray-600">Map View</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Booking Modal */}
            {showBookingModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Booking</h3>

                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Arena:</span>
                                    <span className="font-medium">{arena.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Date:</span>
                                    <span className="font-medium">{bookingDetails.date}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Time:</span>
                                    <span className="font-medium">{bookingDetails.time}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Duration:</span>
                                    <span className="font-medium">{bookingDetails.hours} hour</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold pt-4 border-t">
                                    <span>Total Amount:</span>
                                    <span>Rs {selectedTimeSlot?.price}</span>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Payment Method
                                </label>
                                <select
                                    value={bookingDetails.paymentMethod}
                                    onChange={(e) => setBookingDetails({ ...bookingDetails, paymentMethod: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                >
                                    <option value="pay_now">Pay Now</option>
                                    <option value="pay_after">Pay at Arena</option>
                                    <option value="advance_payment">Advance Payment</option>
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowBookingModal(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmBooking}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                >
                                    Confirm Booking
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