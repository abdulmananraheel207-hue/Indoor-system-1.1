// OwnerRegistration.jsx - Updated version

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const OwnerRegistration = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [currentArenaIndex, setCurrentArenaIndex] = useState(0);

    const stepTitles = [
        "Owner Information",
        "Number of Arenas",
        "Arena Details",
        "Court Configuration", // Changed from "Sports Selection"
        "Sports & Operating Hours", // Combined sports and hours
        "Review & Submit"
    ];

    const [formData, setFormData] = useState({
        // Step 1: Owner Basic Info
        owner_name: "",
        personal_number: "",
        email: "",
        password: "",
        confirm_password: "",
        agreed_to_terms: false,

        // Step 2: Number of Arenas
        number_of_arenas: 1,

        // Step 3-5: Arena details (for multiple arenas)
        arenas: [{
            arena_name: "",
            phone_number: "",
            business_address: "",
            google_maps_location: "",
            description: "",
            number_of_courts: 1,
            // REMOVED base_price_per_hour from top level

            // Courts configuration
            courts: [],

            // Sports selection
            selected_sports: [],

            // Operating hours (per arena)
            opening_time: "06:00",
            closing_time: "22:00",
            slot_duration: 60,
            days_available: {
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: true,
                sunday: false,
            }
        }]
    });

    const [availableSports] = useState([
        { id: 1, name: "Badminton", icon: "🏸" },
        { id: 2, name: "Tennis", icon: "🎾" },
        { id: 3, name: "Squash", icon: "🥎" },
        { id: 4, name: "Basketball", icon: "🏀" },
        { id: 5, name: "Volleyball", icon: "🏐" },
        { id: 6, name: "Cricket Nets", icon: "🏏" },
        { id: 7, name: "Football", icon: "⚽" },
        { id: 8, name: "Table Tennis", icon: "🏓" },
    ]);

    // Initialize courts when number_of_courts changes
    useEffect(() => {
        if (formData.arenas[currentArenaIndex]) {
            initializeCourts(currentArenaIndex);
        }
    }, [formData.arenas[currentArenaIndex]?.number_of_courts]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value,
        });
        if (error) setError("");
    };

    const handlePersonalNumberChange = (value) => {
        setFormData({
            ...formData,
            personal_number: value
        });
        if (error) setError("");
    };

    const handleArenaChange = (index, field, value) => {
        const updatedArenas = [...formData.arenas];
        updatedArenas[index] = {
            ...updatedArenas[index],
            [field]: value
        };
        setFormData({
            ...formData,
            arenas: updatedArenas
        });
    };

    const handleCourtChange = (arenaIndex, courtIndex, field, value) => {
        const updatedArenas = [...formData.arenas];

        if (!updatedArenas[arenaIndex].courts) {
            updatedArenas[arenaIndex].courts = [];
        }

        if (!updatedArenas[arenaIndex].courts[courtIndex]) {
            updatedArenas[arenaIndex].courts[courtIndex] = {
                court_number: courtIndex + 1,
                court_name: `Court ${courtIndex + 1}`,
                size_sqft: 2000,
                price_per_hour: 500,
                description: ""
            };
        }

        updatedArenas[arenaIndex].courts[courtIndex] = {
            ...updatedArenas[arenaIndex].courts[courtIndex],
            [field]: field === 'court_number' || field === 'size_sqft' || field === 'price_per_hour'
                ? parseFloat(value) || 0
                : value
        };

        setFormData({
            ...formData,
            arenas: updatedArenas
        });
    };

    const handleSportToggle = (arenaIndex, sportId) => {
        const updatedArenas = [...formData.arenas];
        const currentSports = updatedArenas[arenaIndex].selected_sports || [];
        const isSelected = currentSports.includes(sportId);

        updatedArenas[arenaIndex].selected_sports = isSelected
            ? currentSports.filter(id => id !== sportId)
            : [...currentSports, sportId];

        // Also update sports for all courts if needed
        if (updatedArenas[arenaIndex].courts && updatedArenas[arenaIndex].courts.length > 0) {
            updatedArenas[arenaIndex].courts = updatedArenas[arenaIndex].courts.map(court => ({
                ...court,
                sports: isSelected
                    ? (court.sports || []).filter(id => id !== sportId)
                    : [...(court.sports || []), sportId]
            }));
        }

        setFormData({
            ...formData,
            arenas: updatedArenas
        });
    };

    const handleDaysChange = (arenaIndex, day, checked) => {
        const updatedArenas = [...formData.arenas];
        updatedArenas[arenaIndex].days_available = {
            ...updatedArenas[arenaIndex].days_available,
            [day]: checked
        };
        setFormData({
            ...formData,
            arenas: updatedArenas
        });
    };

    const initializeCourts = (arenaIndex) => {
        const updatedArenas = [...formData.arenas];
        const arena = updatedArenas[arenaIndex];
        const numCourts = parseInt(arena.number_of_courts) || 1;
        const courts = [];

        for (let i = 1; i <= numCourts; i++) {
            const existingCourt = arena.courts && arena.courts[i - 1];
            courts.push({
                court_number: i,
                court_name: existingCourt?.court_name || `Court ${i}`,
                size_sqft: existingCourt?.size_sqft || 2000,
                price_per_hour: existingCourt?.price_per_hour || 500,
                description: existingCourt?.description || "",
                sports: existingCourt?.sports || (arena.selected_sports ? [...arena.selected_sports] : [])
            });
        }

        updatedArenas[arenaIndex].courts = courts;
        setFormData({
            ...formData,
            arenas: updatedArenas
        });
    };

    const validateStep = (step) => {
        switch (step) {
            case 1:
                if (!formData.owner_name?.trim()) return "Owner name is required";
                if (!formData.email?.trim()) return "Email is required";
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Invalid email format";
                if (!formData.password) return "Password is required";
                if (formData.password.length < 6) return "Password must be at least 6 characters";
                if (formData.password !== formData.confirm_password) return "Passwords don't match";
                if (!formData.agreed_to_terms) return "You must agree to terms and conditions";
                return null;

            case 2:
                if (formData.number_of_arenas < 1) return "Number of arenas must be at least 1";
                return null;

            case 3:
                const currentArena = formData.arenas[currentArenaIndex];
                if (!currentArena.arena_name?.trim()) return "Arena name is required";
                if (!currentArena.phone_number) return "Business phone number is required";
                if (!currentArena.business_address?.trim()) return "Business address is required";
                if (!currentArena.google_maps_location?.trim()) return "Google Maps location is required";
                if (!currentArena.description?.trim()) return "Arena description is required";
                if (currentArena.number_of_courts < 1) return "Number of courts must be at least 1";
                return null;

            case 4:
                const arenaForCourts = formData.arenas[currentArenaIndex];
                if (!arenaForCourts.courts || arenaForCourts.courts.length === 0) {
                    return "Please configure at least one court";
                }

                // Validate each court has required fields
                for (let i = 0; i < arenaForCourts.courts.length; i++) {
                    const court = arenaForCourts.courts[i];
                    if (!court.court_name?.trim()) return `Court ${i + 1}: Court name is required`;
                    if (!court.size_sqft || court.size_sqft <= 0) return `Court ${i + 1}: Valid size is required`;
                    if (!court.price_per_hour || court.price_per_hour <= 0) return `Court ${i + 1}: Valid price per hour is required`;
                }
                return null;

            case 5:
                const arenaForSports = formData.arenas[currentArenaIndex];
                if (!arenaForSports.selected_sports || arenaForSports.selected_sports.length === 0) {
                    return "Select at least one sport";
                }
                return null;

            default:
                return null;
        }
    };

    const nextStep = () => {
        const error = validateStep(step);
        if (error) {
            setError(error);
            return;
        }

        if (step === 2) {
            // Initialize arenas array based on number selected
            const newArenas = [];
            for (let i = 0; i < formData.number_of_arenas; i++) {
                if (formData.arenas[i]) {
                    newArenas[i] = formData.arenas[i];
                } else {
                    newArenas[i] = {
                        arena_name: "",
                        phone_number: "",
                        business_address: "",
                        google_maps_location: "",
                        description: "",
                        number_of_courts: 1,
                        courts: [],
                        selected_sports: [],
                        opening_time: "06:00",
                        closing_time: "22:00",
                        slot_duration: 60,
                        days_available: {
                            monday: true,
                            tuesday: true,
                            wednesday: true,
                            thursday: true,
                            friday: true,
                            saturday: true,
                            sunday: false,
                        }
                    };
                }
            }
            setFormData({
                ...formData,
                arenas: newArenas
            });
        }

        if (step === 3) {
            // Initialize courts when moving to court configuration step
            initializeCourts(currentArenaIndex);
        }

        if (step === 5) {
            // Check if we have more arenas to configure
            if (currentArenaIndex < formData.arenas.length - 1) {
                setCurrentArenaIndex(currentArenaIndex + 1);
                setStep(3); // Go back to arena details for next arena
                return;
            }
        }

        setStep(step + 1);
        setError("");
    };

    const prevStep = () => {
        if (step === 4 && currentArenaIndex > 0) {
            setCurrentArenaIndex(currentArenaIndex - 1);
            setStep(3);
        } else if (step === 5 && currentArenaIndex > 0) {
            setCurrentArenaIndex(currentArenaIndex - 1);
            setStep(3);
        } else {
            setStep(step - 1);
        }
        setError("");
    };

    const generateTimeSlotsPreview = (arenaIndex) => {
        const arena = formData.arenas[arenaIndex];
        const startHour = parseInt(arena.opening_time.split(':')[0]);
        const endHour = parseInt(arena.closing_time.split(':')[0]);
        const durationHours = arena.slot_duration / 60;
        const slots = [];

        for (let hour = startHour; hour < endHour; hour += durationHours) {
            const startHourStr = hour.toString().padStart(2, '0');
            const endHourStr = (hour + durationHours).toString().padStart(2, '0');
            slots.push(`${startHourStr}:00 - ${endHourStr}:00`);
        }

        return slots;
    };

    const handleSubmit = async () => {
        if (step < 6) {
            setError("Please complete all registration steps");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // Prepare data for API
            const registrationData = {
                owner_name: formData.owner_name,
                personal_number: formData.personal_number || null,
                email: formData.email,
                password: formData.password,
                phone_number: formData.arenas[0]?.phone_number,
                agreed_to_terms: formData.agreed_to_terms ? 1 : 0,

                arenas: formData.arenas.map(arena => ({
                    arena_name: arena.arena_name,
                    business_address: arena.business_address,
                    google_maps_location: arena.google_maps_location || "",
                    description: arena.description || "",
                    number_of_courts: parseInt(arena.number_of_courts) || 1,

                    // Courts configuration
                    courts: (arena.courts || []).map(court => ({
                        court_number: court.court_number,
                        court_name: court.court_name,
                        size_sqft: parseFloat(court.size_sqft) || 2000,
                        price_per_hour: parseFloat(court.price_per_hour) || 500,
                        description: court.description || "",
                        sports: court.sports || arena.selected_sports || []
                    })),

                    // Sports
                    selected_sports: arena.selected_sports || [],

                    // Operating hours (per arena)
                    opening_time: arena.opening_time || "06:00",
                    closing_time: arena.closing_time || "22:00",
                    slot_duration: parseInt(arena.slot_duration) || 60,
                    days_available: arena.days_available || {
                        monday: true,
                        tuesday: true,
                        wednesday: true,
                        thursday: true,
                        friday: true,
                        saturday: true,
                        sunday: false
                    }
                }))
            };

            console.log("Sending registration data:", registrationData);

            const response = await fetch("http://localhost:5000/api/owners/register/complete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(registrationData),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("userRole", "owner");
                localStorage.setItem("ownerData", JSON.stringify(data.owner));

                alert(`Registration successful! You have registered ${data.arenas.length} arena(s). You can now upload photos from your Settings.`);
                navigate("/owner/dashboard");
            } else {
                setError(data.message || "Registration failed. Please try again.");
            }
        } catch (error) {
            console.error("Error:", error);
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Render form based on current step
    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-900">Owner Information</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Owner Name *
                            </label>
                            <input
                                type="text"
                                name="owner_name"
                                required
                                value={formData.owner_name}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., John Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address *
                            </label>
                            <input
                                type="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="owner@arena.com"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password *
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    minLength="6"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="At least 6 characters"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Confirm Password *
                                </label>
                                <input
                                    type="password"
                                    name="confirm_password"
                                    required
                                    value={formData.confirm_password}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Confirm your password"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Personal Number (Optional)
                            </label>
                            <PhoneInput
                                international
                                defaultCountry="PK"
                                value={formData.personal_number}
                                onChange={handlePersonalNumberChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter phone number"
                            />
                            <p className="mt-1 text-sm text-gray-500">Your personal contact number with country code</p>
                        </div>

                        <div className="flex items-start">
                            <input
                                type="checkbox"
                                name="agreed_to_terms"
                                required
                                checked={formData.agreed_to_terms}
                                onChange={handleInputChange}
                                className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900">
                                I agree to the Terms and Conditions for arena owners
                            </label>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-900">How many arenas do you own?</h2>
                        <p className="text-gray-600">You can register multiple arenas in different locations</p>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Number of Arenas *
                            </label>
                            <select
                                name="number_of_arenas"
                                value={formData.number_of_arenas}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                    <option key={num} value={num}>{num} {num === 1 ? 'Arena' : 'Arenas'}</option>
                                ))}
                            </select>
                            <p className="mt-2 text-sm text-gray-500">
                                You can configure each arena separately in the next steps
                            </p>
                        </div>
                    </div>
                );

            case 3:
                return formData.arenas[currentArenaIndex] && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Arena Details {formData.arenas.length > 1 && `- Arena ${currentArenaIndex + 1}`}
                        </h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Arena Name *
                            </label>
                            <input
                                type="text"
                                value={formData.arenas[currentArenaIndex].arena_name}
                                onChange={(e) => handleArenaChange(currentArenaIndex, 'arena_name', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., Sports Arena Lahore"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Business Phone Number *
                            </label>
                            <PhoneInput
                                international
                                defaultCountry="PK"
                                value={formData.arenas[currentArenaIndex].phone_number}
                                onChange={(value) => handleArenaChange(currentArenaIndex, 'phone_number', value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter phone number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Google Maps Location *
                            </label>
                            <input
                                type="text"
                                value={formData.arenas[currentArenaIndex].google_maps_location}
                                onChange={(e) => handleArenaChange(currentArenaIndex, 'google_maps_location', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Paste Google Maps link here"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Business Address *
                            </label>
                            <textarea
                                rows="3"
                                value={formData.arenas[currentArenaIndex].business_address}
                                onChange={(e) => handleArenaChange(currentArenaIndex, 'business_address', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Full address of your arena"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Arena Description *
                            </label>
                            <textarea
                                rows="4"
                                value={formData.arenas[currentArenaIndex].description}
                                onChange={(e) => handleArenaChange(currentArenaIndex, 'description', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Describe your arena facilities, amenities, parking, etc."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Number of Courts *
                                </label>
                                <select
                                    value={formData.arenas[currentArenaIndex].number_of_courts}
                                    onChange={(e) => handleArenaChange(currentArenaIndex, 'number_of_courts', parseInt(e.target.value))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                        <option key={num} value={num}>{num} {num === 1 ? 'Court' : 'Courts'}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                );

            case 4:
                return formData.arenas[currentArenaIndex] && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Court Configuration {formData.arenas.length > 1 && `- Arena ${currentArenaIndex + 1}`}
                        </h2>
                        <p className="text-gray-600">Configure details for each court. You can upload photos later.</p>

                        {formData.arenas[currentArenaIndex].courts &&
                            formData.arenas[currentArenaIndex].courts.map((court, courtIndex) => (
                                <div key={courtIndex} className="p-4 border border-gray-200 rounded-lg mb-4">
                                    <h3 className="font-medium text-gray-900 mb-3">Court {courtIndex + 1}</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Court Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={court.court_name}
                                                onChange={(e) => handleCourtChange(currentArenaIndex, courtIndex, 'court_name', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="e.g., Main Court, VIP Court"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Size (square feet) *
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={court.size_sqft}
                                                onChange={(e) => handleCourtChange(currentArenaIndex, courtIndex, 'size_sqft', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="e.g., 2000"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Price per Hour (Rs) *
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={court.price_per_hour}
                                                onChange={(e) => handleCourtChange(currentArenaIndex, courtIndex, 'price_per_hour', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="e.g., 500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Description (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={court.description}
                                                onChange={(e) => handleCourtChange(currentArenaIndex, courtIndex, 'description', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Any special features?"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                );

            case 5:
                return formData.arenas[currentArenaIndex] && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Sports & Operating Hours {formData.arenas.length > 1 && `- Arena ${currentArenaIndex + 1}`}
                        </h2>

                        {/* Sports Selection */}
                        <div>
                            <h3 className="font-medium text-gray-900 mb-3">Select Sports *</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {availableSports.map(sport => (
                                    <button
                                        type="button"
                                        key={sport.id}
                                        onClick={() => handleSportToggle(currentArenaIndex, sport.id)}
                                        className={`p-4 border-2 rounded-lg flex flex-col items-center transition-all hover:scale-105 ${formData.arenas[currentArenaIndex].selected_sports?.includes(sport.id)
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <span className="text-3xl mb-2">{sport.icon}</span>
                                        <span className="text-sm font-medium">{sport.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Operating Hours */}
                        <div className="mt-8">
                            <h3 className="font-medium text-gray-900 mb-3">Operating Hours</h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Opening Time
                                    </label>
                                    <select
                                        value={formData.arenas[currentArenaIndex].opening_time}
                                        onChange={(e) => handleArenaChange(currentArenaIndex, 'opening_time', e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => {
                                            const hour = i + 6;
                                            const time = `${hour.toString().padStart(2, '0')}:00`;
                                            return <option key={time} value={time}>{time}</option>;
                                        })}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Closing Time
                                    </label>
                                    <select
                                        value={formData.arenas[currentArenaIndex].closing_time}
                                        onChange={(e) => handleArenaChange(currentArenaIndex, 'closing_time', e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => {
                                            const hour = i + 12;
                                            const time = `${hour.toString().padStart(2, '0')}:00`;
                                            return <option key={time} value={time}>{time}</option>;
                                        })}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Slot Duration
                                    </label>
                                    <select
                                        value={formData.arenas[currentArenaIndex].slot_duration}
                                        onChange={(e) => handleArenaChange(currentArenaIndex, 'slot_duration', parseInt(e.target.value))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                                    >
                                        <option value="60">1 hour</option>
                                        <option value="90">1.5 hours</option>
                                        <option value="120">2 hours</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Available Days
                                </label>
                                <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                                    {Object.keys(formData.arenas[currentArenaIndex].days_available).map(day => (
                                        <div key={day} className="flex flex-col items-center">
                                            <label className="text-sm font-medium text-gray-700 capitalize mb-2">
                                                {day.substring(0, 3)}
                                            </label>
                                            <input
                                                type="checkbox"
                                                checked={formData.arenas[currentArenaIndex].days_available[day]}
                                                onChange={(e) => handleDaysChange(currentArenaIndex, day, e.target.checked)}
                                                className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-2">Time Slots Preview:</h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p><strong>Days:</strong> {Object.keys(formData.arenas[currentArenaIndex].days_available)
                                        .filter(day => formData.arenas[currentArenaIndex].days_available[day])
                                        .map(day => day.charAt(0).toUpperCase() + day.slice(1))
                                        .join(', ')}
                                    </p>
                                    <p><strong>Hours:</strong> {formData.arenas[currentArenaIndex].opening_time} to {formData.arenas[currentArenaIndex].closing_time}</p>
                                    <p><strong>Slot Duration:</strong> {formData.arenas[currentArenaIndex].slot_duration / 60} hour(s)</p>
                                    <div className="mt-2">
                                        <p className="font-medium">Generated Slots:</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {generateTimeSlotsPreview(currentArenaIndex).map((slot, index) => (
                                                <span key={index} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs">
                                                    {slot}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 6:
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-900">Review & Submit</h2>
                        <p className="text-gray-600">Review your information before submitting</p>

                        <div className="space-y-4">
                            <div className="border-b pb-4">
                                <h3 className="font-medium text-gray-900 mb-2">Owner Information</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div><span className="text-gray-500">Owner Name:</span> {formData.owner_name}</div>
                                    <div><span className="text-gray-500">Email:</span> {formData.email}</div>
                                    <div><span className="text-gray-500">Personal Number:</span> {formData.personal_number || 'Not provided'}</div>
                                </div>
                            </div>

                            {formData.arenas.map((arena, idx) => (
                                <div key={idx} className="border-b pb-4">
                                    <h3 className="font-medium text-gray-900 mb-2">Arena {idx + 1}: {arena.arena_name}</h3>

                                    <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                        <div><span className="text-gray-500">Business Phone:</span> {arena.phone_number}</div>
                                        <div><span className="text-gray-500">Courts:</span> {arena.number_of_courts}</div>
                                        <div className="col-span-2"><span className="text-gray-500">Address:</span> {arena.business_address}</div>
                                    </div>

                                    <div className="mt-3">
                                        <span className="text-gray-500 text-sm">Courts:</span>
                                        <div className="mt-1 space-y-2">
                                            {arena.courts && arena.courts.map((court, courtIdx) => (
                                                <div key={courtIdx} className="bg-gray-50 p-2 rounded text-sm">
                                                    <div className="font-medium">{court.court_name}</div>
                                                    <div className="grid grid-cols-3 gap-2 mt-1 text-xs">
                                                        <div>Size: {court.size_sqft} sq ft</div>
                                                        <div>Price: Rs{court.price_per_hour}/hr</div>
                                                        {court.description && <div className="col-span-3">{court.description}</div>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-2">
                                        <span className="text-gray-500 text-sm">Sports:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {arena.selected_sports.map(sportId => {
                                                const sport = availableSports.find(s => s.id === sportId);
                                                return sport ? (
                                                    <span key={sportId} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                                                        {sport.icon} {sport.name}
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>

                                    <p className="text-sm text-gray-600 mt-2">
                                        <span className="text-gray-500">Hours:</span> {arena.opening_time} to {arena.closing_time} •
                                        {Object.keys(arena.days_available).filter(d => arena.days_available[d]).length} days/week
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-blue-50 rounded-lg">
                            <div className="flex items-center">
                                <svg className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm text-blue-700">
                                    <strong>Note:</strong> You have registered {formData.arenas.length} arena(s). You can upload photos for each arena after registration from your Settings.
                                </p>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Register Your Sports Arena(s)</h1>
                    <p className="text-gray-600 mt-2">Complete all steps to start your arena business</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        {stepTitles.map((title, index) => (
                            <div key={index} className="text-center flex-1">
                                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-2
                                    ${step > index + 1 ? 'bg-green-500 text-white' :
                                        step === index + 1 ? 'bg-blue-600 text-white' :
                                            'bg-gray-200 text-gray-500'}`}>
                                    {index + 1}
                                </div>
                                <span className="text-xs hidden md:block">{title}</span>
                            </div>
                        ))}
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${(step / 6) * 100}%` }}>
                        </div>
                    </div>
                </div>

                {/* Arena Progress Indicator for steps 3-5 */}
                {step >= 3 && step <= 5 && formData.arenas.length > 1 && (
                    <div className="mb-4 flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                        <span className="text-sm font-medium text-blue-700">
                            Configuring Arena {currentArenaIndex + 1} of {formData.arenas.length}
                        </span>
                        <div className="flex gap-1">
                            {formData.arenas.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-8 h-2 rounded-full ${idx === currentArenaIndex ? 'bg-blue-600' : 'bg-blue-200'}`}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center">
                            <svg className="h-5 w-5 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span className="text-red-700">{error}</span>
                        </div>
                    </div>
                )}

                {/* Form Content */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    {renderStep()}

                    {/* Navigation Buttons */}
                    <div className="mt-8 flex justify-between">
                        {step > 1 ? (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                disabled={loading}
                            >
                                Back
                            </button>
                        ) : (
                            <Link to="/owner/login" className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                                Back to Login
                            </Link>
                        )}

                        {step < 6 ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ml-auto"
                                disabled={loading}
                            >
                                {step === 5 && currentArenaIndex < formData.arenas.length - 1
                                    ? "Next Arena"
                                    : "Continue"}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                className={`px-6 py-3 rounded-lg text-white ml-auto flex items-center ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    `Complete Registration (${formData.arenas.length} Arena${formData.arenas.length > 1 ? 's' : ''})`
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="mt-6 text-center text-sm text-gray-500">
                    Step {step} of 6 • {stepTitles[step - 1]}
                    {step >= 3 && step <= 5 && formData.arenas.length > 1 && ` • Arena ${currentArenaIndex + 1} of ${formData.arenas.length}`}
                </div>

                {/* Login Link */}
                <div className="mt-8 text-center">
                    <p className="text-gray-600">
                        Already have an account?{' '}
                        <Link to="/owner/login" className="text-blue-600 hover:text-blue-700 font-medium">
                            Sign in here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OwnerRegistration;