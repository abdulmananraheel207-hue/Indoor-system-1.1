import React, { useState, useEffect } from 'react';

const UserHome = () => {
    const [location, setLocation] = useState(null);
    const [sports, setSports] = useState([]);
    const [selectedSport, setSelectedSport] = useState(null);
    const [arenas, setArenas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Sample data - replace with API calls
    const sampleSports = [
        { id: 1, name: 'Cricket', icon: '🏏' },
        { id: 2, name: 'Futsal', icon: '⚽' },
        { id: 3, name: 'Padel', icon: '🎾' },
        { id: 4, name: 'Badminton', icon: '🏸' },
        { id: 5, name: 'Basketball', icon: '🏀' },
        { id: 6, name: 'Tennis', icon: '🎾' },
    ];

    const sampleArenas = [
        {
            id: 1,
            name: 'Elite Sports Arena',
            address: '123 Sports Street, City',
            rating: 4.5,
            price: 2000,
            distance: '2.5 km',
            sports: ['Cricket', 'Futsal'],
            image: 'https://via.placeholder.com/300x200'
        },
        {
            id: 2,
            name: 'Pro Badminton Court',
            address: '456 Game Road, City',
            rating: 4.2,
            price: 1500,
            distance: '3.1 km',
            sports: ['Badminton'],
            image: 'https://via.placeholder.com/300x200'
        },
        {
            id: 3,
            name: 'City Padel Club',
            address: '789 Sports Avenue, City',
            rating: 4.8,
            price: 2500,
            distance: '1.8 km',
            sports: ['Padel', 'Tennis'],
            image: 'https://via.placeholder.com/300x200'
        },
    ];

    useEffect(() => {
        // Request location permission on component mount
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    console.log('User location:', position.coords);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    setLocation({ lat: 0, lng: 0 }); // Default location
                }
            );
        }

        // Load sports and arenas
        setSports(sampleSports);
        setArenas(sampleArenas);
        setLoading(false);
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        console.log('Search query:', searchQuery);
        // Implement search logic
    };

    const handleSportSelect = (sport) => {
        setSelectedSport(sport);
        console.log('Selected sport:', sport);
        // Filter arenas by sport
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header with Location */}
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Find Arena</h1>
                            {location ? (
                                <div className="flex items-center mt-1 text-gray-600">
                                    <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm">Near your location</span>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        if (navigator.geolocation) {
                                            navigator.geolocation.getCurrentPosition(
                                                (pos) => setLocation({
                                                    lat: pos.coords.latitude,
                                                    lng: pos.coords.longitude
                                                }),
                                                console.error
                                            );
                                        }
                                    }}
                                    className="mt-1 text-sm text-primary-600 hover:text-primary-500"
                                >
                                    Enable location to find nearby arenas
                                </button>
                            )}
                        </div>
                        <div className="flex items-center space-x-4">
                            <button className="p-2 text-gray-600 hover:text-gray-900">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="mt-6">
                        <form onSubmit={handleSearch} className="relative">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search arena name, location..."
                                    className="w-full px-4 py-3 pl-12 pr-10 text-gray-900 placeholder-gray-500 bg-gray-100 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                                <div className="absolute left-4 top-3.5">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <button
                                    type="submit"
                                    className="absolute right-3 top-3 text-primary-600 hover:text-primary-700"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Sport Categories */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {sports.map((sport) => (
                            <button
                                key={sport.id}
                                onClick={() => handleSportSelect(sport)}
                                className={`flex flex-col items-center p-4 rounded-xl transition-all duration-200 ${selectedSport?.id === sport.id
                                        ? 'bg-primary-50 border-2 border-primary-500'
                                        : 'bg-white border border-gray-200 hover:border-primary-300'
                                    }`}
                            >
                                <span className="text-2xl mb-2">{sport.icon}</span>
                                <span className="text-sm font-medium text-gray-700">{sport.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Arenas Section */}
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            {selectedSport ? `${selectedSport.name} Arenas` : 'Nearby Arenas'}
                        </h2>
                        <button className="text-sm text-primary-600 hover:text-primary-500">
                            View All
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {arenas.map((arena) => (
                                <div key={arena.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                                    <div className="h-48 bg-gray-300 overflow-hidden relative">
                                        <img
                                            src={arena.image}
                                            alt={arena.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <button className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:shadow-lg">
                                            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="text-lg font-semibold text-gray-900">{arena.name}</h3>
                                            <div className="flex items-center bg-primary-50 text-primary-700 px-2 py-1 rounded">
                                                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                                <span className="font-semibold">{arena.rating}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center text-gray-600 text-sm mb-4">
                                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span>{arena.address}</span>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {arena.sports.map((sport, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                                                >
                                                    {sport}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-2xl font-bold text-gray-900">Rs {arena.price}</span>
                                                <span className="text-gray-600">/hour</span>
                                            </div>
                                            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                                                Book Now
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default UserHome;