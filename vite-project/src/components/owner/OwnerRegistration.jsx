
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const OwnerRegistration = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        // Step 1: Owner Basic Info
        arena_name: "",
        email: "",
        password: "",
        confirm_password: "",
        phone_number: "",
        business_address: "",
        google_maps_location: "",
        agreed_to_terms: false,

        // Step 2: Arena Details
        description: "",
        number_of_courts: 1,
        base_price_per_hour: 500,

        // Step 3: Courts Configuration
        courts: [],

        // Step 4: Sports Selection
        selected_sports: [],

        // Step 5: Time Slots
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
        },
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

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value,
        });

        // Clear error when user types
        if (error) setError("");
    };

    const handleCourtChange = (index, field, value) => {
        const updatedCourts = [...formData.courts];
        updatedCourts[index] = {
            ...updatedCourts[index],
            [field]: field === 'court_number' || field === 'size_sqft' || field === 'price_per_hour'
                ? parseFloat(value) || 0
                : value
        };

        setFormData({
            ...formData,
            courts: updatedCourts
        });
    };

    const handleSportToggle = (sportId) => {
        const isSelected = formData.selected_sports.includes(sportId);
        setFormData({
            ...formData,
            selected_sports: isSelected
                ? formData.selected_sports.filter(id => id !== sportId)
                : [...formData.selected_sports, sportId]
        });
    };

    const validateStep = (step) => {
        switch (step) {
            case 1:
                if (!formData.arena_name.trim()) return "Arena name is required";
                if (!formData.email.trim()) return "Email is required";
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Invalid email format";
                if (!formData.password) return "Password is required";
                if (formData.password.length < 6) return "Password must be at least 6 characters";
                if (formData.password !== formData.confirm_password) return "Passwords don't match";

                // Validate Pakistani phone number
                const phoneRegex = /^(?:\+92|0|92)?[0-9]{10}$/;
                if (!phoneRegex.test(formData.phone_number.replace(/[\s\-()]/g, ""))) {
                    return "Please enter a valid Pakistani phone number (e.g., 03001234567)";
                }

                if (!formData.business_address.trim()) return "Business address is required";
                if (!formData.google_maps_location.trim()) return "Google Maps location is required";
                if (!formData.agreed_to_terms) return "You must agree to terms and conditions";
                return null;

            case 2:
                if (!formData.description.trim()) return "Arena description is required";
                if (formData.number_of_courts < 1) return "Number of courts must be at least 1";
                if (!formData.base_price_per_hour || formData.base_price_per_hour <= 0)
                    return "Base price must be greater than 0";
                return null;

            case 4:
                if (formData.selected_sports.length === 0) return "Select at least one sport";
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

        // If moving to step 3 and courts haven't been initialized
        if (step === 2 && formData.courts.length === 0) {
            const courts = [];
            const numCourts = parseInt(formData.number_of_courts) || 1;

            for (let i = 1; i <= numCourts; i++) {
                courts.push({
                    court_number: i,
                    court_name: `Court ${i}`,
                    size_sqft: 2000,
                    price_per_hour: parseFloat(formData.base_price_per_hour) || 500,
                    description: "",
                    sports: [...formData.selected_sports]
                });
            }

            setFormData({
                ...formData,
                courts
            });
        }

        setStep(step + 1);
        setError("");
    };

    const prevStep = () => {
        setStep(step - 1);
        setError("");
    };

    const generateTimeSlotsPreview = () => {
        const startHour = parseInt(formData.opening_time.split(':')[0]);
        const endHour = parseInt(formData.closing_time.split(':')[0]);
        const durationHours = formData.slot_duration / 60;
        const slots = [];

        for (let hour = startHour; hour < endHour; hour += durationHours) {
            const startHourStr = hour.toString().padStart(2, '0');
            const endHourStr = (hour + durationHours).toString().padStart(2, '0');
            slots.push(`${startHourStr}:00 - ${endHourStr}:00`);
        }

        return slots;
    };

    const handleSubmit = async () => {
        const error = validateStep(step);
        if (error) {
            setError(error);
            return;
        }

        if (step < 6) {
            setError("Please complete all registration steps");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // Prepare the data for the API
            const registrationData = {
                arena_name: formData.arena_name,
                email: formData.email,
                password: formData.password,
                phone_number: formData.phone_number,
                business_address: formData.business_address,
                google_maps_location: formData.google_maps_location,
                number_of_courts: formData.number_of_courts,
                agreed_to_terms: formData.agreed_to_terms,
                description: formData.description,
                base_price_per_hour: formData.base_price_per_hour,
                sports: formData.selected_sports,
                courts: formData.courts.map(court => ({
                    court_number: court.court_number,
                    court_name: court.court_name,
                    size_sqft: court.size_sqft,
                    price_per_hour: court.price_per_hour,
                    description: court.description,
                    sports: court.sports
                })),
                opening_time: formData.opening_time,
                closing_time: formData.closing_time,
                slot_duration: formData.slot_duration,
                days_available: formData.days_available
            };

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

                alert("Registration successful! You can now upload photos from your dashboard.");
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

    const stepTitles = [
        "Owner Information",
        "Arena Details",
        "Court Configuration",
        "Sports Selection",
        "Operating Hours",
        "Review & Submit"
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Register Your Sports Arena</h1>
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
                    {/* Step 1: Owner Basic Info */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900">Owner Information</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Arena Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="arena_name"
                                        required
                                        value={formData.arena_name}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="e.g., Sports Arena Lahore"
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
                                    Phone Number *
                                </label>
                                <input
                                    type="tel"
                                    name="phone_number"
                                    required
                                    value={formData.phone_number}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="03001234567"
                                />
                                <p className="mt-1 text-sm text-gray-500">Pakistani mobile number format</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Google Maps Location *
                                </label>
                                <input
                                    type="text"
                                    name="google_maps_location"
                                    required
                                    value={formData.google_maps_location}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Paste Google Maps link here"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Business Address *
                                </label>
                                <textarea
                                    name="business_address"
                                    rows="3"
                                    required
                                    value={formData.business_address}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Full address of your arena"
                                />
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
                    )}

                    {/* Step 2: Arena Details */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900">Arena Details</h2>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Arena Description *
                                </label>
                                <textarea
                                    name="description"
                                    rows="4"
                                    required
                                    value={formData.description}
                                    onChange={handleInputChange}
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
                                        name="number_of_courts"
                                        value={formData.number_of_courts}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                            <option key={num} value={num}>{num} {num === 1 ? 'Court' : 'Courts'}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Base Price per Hour (₹) *
                                    </label>
                                    <input
                                        type="number"
                                        name="base_price_per_hour"
                                        required
                                        min="0"
                                        value={formData.base_price_per_hour}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Courts Configuration */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Court Configuration ({formData.courts.length} courts)
                            </h2>
                            <p className="text-gray-600">Configure details for each court. You can upload photos later.</p>

                            {formData.courts.map((court, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                                    <h3 className="font-medium text-gray-900 mb-4 text-lg">Court {court.court_number}</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Court Name
                                            </label>
                                            <input
                                                type="text"
                                                value={court.court_name}
                                                onChange={(e) => handleCourtChange(index, 'court_name', e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                placeholder="e.g., Main Court, VIP Court"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Size (square feet)
                                            </label>
                                            <input
                                                type="number"
                                                value={court.size_sqft}
                                                onChange={(e) => handleCourtChange(index, 'size_sqft', e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                placeholder="e.g., 2000"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Price per Hour (₹)
                                            </label>
                                            <input
                                                type="number"
                                                value={court.price_per_hour}
                                                onChange={(e) => handleCourtChange(index, 'price_per_hour', e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                                                onChange={(e) => handleCourtChange(index, 'description', e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                placeholder="Any special features?"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Step 4: Sports Selection */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900">Sports Selection</h2>
                            <p className="text-gray-600">Select which sports are available at your arena</p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {availableSports.map(sport => (
                                    <button
                                        type="button"
                                        key={sport.id}
                                        onClick={() => handleSportToggle(sport.id)}
                                        className={`p-4 border-2 rounded-lg flex flex-col items-center transition-all hover:scale-105 ${formData.selected_sports.includes(sport.id)
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <span className="text-3xl mb-2">{sport.icon}</span>
                                        <span className="text-sm font-medium">{sport.name}</span>
                                    </button>
                                ))}
                            </div>

                            {formData.selected_sports.length > 0 && (
                                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                    <h4 className="font-medium text-blue-900 mb-2">Selected Sports:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.selected_sports.map(sportId => {
                                            const sport = availableSports.find(s => s.id === sportId);
                                            return sport ? (
                                                <span key={sportId} className="px-3 py-1 bg-white border border-blue-200 rounded-full text-sm flex items-center">
                                                    <span className="mr-2">{sport.icon}</span>
                                                    {sport.name}
                                                </span>
                                            ) : null;
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 5: Operating Hours */}
                    {step === 5 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900">Operating Hours</h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Opening Time
                                    </label>
                                    <select
                                        name="opening_time"
                                        value={formData.opening_time}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => {
                                            const hour = i + 6; // 6 AM to 5 PM
                                            const time = `${hour.toString().padStart(2, '0')}:00`;
                                            return <option key={time} value={time}>{time} AM</option>;
                                        })}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Closing Time
                                    </label>
                                    <select
                                        name="closing_time"
                                        value={formData.closing_time}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => {
                                            const hour = i + 12; // 12 PM to 11 PM
                                            const time = `${hour.toString().padStart(2, '0')}:00`;
                                            const displayHour = hour > 12 ? hour - 12 : hour;
                                            const ampm = hour >= 12 ? 'PM' : 'AM';
                                            return <option key={time} value={time}>{displayHour}:00 {ampm}</option>;
                                        })}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Slot Duration
                                    </label>
                                    <select
                                        name="slot_duration"
                                        value={formData.slot_duration}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                                    >
                                        <option value="60">1 hour</option>
                                        <option value="90">1.5 hours</option>
                                        <option value="120">2 hours</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Available Days
                                </label>
                                <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                                    {Object.keys(formData.days_available).map(day => (
                                        <div key={day} className="flex flex-col items-center">
                                            <label className="text-sm font-medium text-gray-700 capitalize mb-2">
                                                {day.substring(0, 3)}
                                            </label>
                                            <input
                                                type="checkbox"
                                                checked={formData.days_available[day]}
                                                onChange={(e) => {
                                                    setFormData({
                                                        ...formData,
                                                        days_available: {
                                                            ...formData.days_available,
                                                            [day]: e.target.checked
                                                        }
                                                    });
                                                }}
                                                className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-2">Time Slots Preview:</h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p><strong>Days:</strong> {Object.keys(formData.days_available)
                                        .filter(day => formData.days_available[day])
                                        .map(day => day.charAt(0).toUpperCase() + day.slice(1))
                                        .join(', ')}
                                    </p>
                                    <p><strong>Hours:</strong> {formData.opening_time} to {formData.closing_time}</p>
                                    <p><strong>Slot Duration:</strong> {formData.slot_duration / 60} hour(s)</p>
                                    <div className="mt-2">
                                        <p className="font-medium">Generated Slots:</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {generateTimeSlotsPreview().map((slot, index) => (
                                                <span key={index} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs">
                                                    {slot}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 6: Review & Submit */}
                    {step === 6 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900">Review & Submit</h2>
                            <p className="text-gray-600">Review your information before submitting</p>

                            <div className="space-y-4">
                                <div className="border-b pb-4">
                                    <h3 className="font-medium text-gray-900 mb-2">Owner Information</h3>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div><span className="text-gray-500">Arena Name:</span> {formData.arena_name}</div>
                                        <div><span className="text-gray-500">Email:</span> {formData.email}</div>
                                        <div><span className="text-gray-500">Phone:</span> {formData.phone_number}</div>
                                        <div><span className="text-gray-500">Address:</span> {formData.business_address}</div>
                                    </div>
                                </div>

                                <div className="border-b pb-4">
                                    <h3 className="font-medium text-gray-900 mb-2">Arena Details</h3>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div><span className="text-gray-500">Courts:</span> {formData.number_of_courts}</div>
                                        <div><span className="text-gray-500">Base Price:</span> ₹{formData.base_price_per_hour}/hour</div>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2">{formData.description}</p>
                                </div>

                                <div className="border-b pb-4">
                                    <h3 className="font-medium text-gray-900 mb-2">Sports</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.selected_sports.map(sportId => {
                                            const sport = availableSports.find(s => s.id === sportId);
                                            return sport ? (
                                                <span key={sportId} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                                                    {sport.icon} {sport.name}
                                                </span>
                                            ) : null;
                                        })}
                                    </div>
                                </div>

                                <div className="border-b pb-4">
                                    <h3 className="font-medium text-gray-900 mb-2">Courts</h3>
                                    {formData.courts.map((court, index) => (
                                        <div key={index} className="text-sm mb-2">
                                            <span className="font-medium">Court {court.court_number}:</span> {court.court_name} -
                                            {court.size_sqft} sq ft - ₹{court.price_per_hour}/hour
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <h3 className="font-medium text-gray-900 mb-2">Operating Hours</h3>
                                    <div className="text-sm space-y-1">
                                        <p><span className="text-gray-500">Timing:</span> {formData.opening_time} to {formData.closing_time}</p>
                                        <p><span className="text-gray-500">Days:</span> {Object.keys(formData.days_available)
                                            .filter(day => formData.days_available[day])
                                            .map(day => day.charAt(0).toUpperCase() + day.slice(1))
                                            .join(', ')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50 rounded-lg">
                                <div className="flex items-center">
                                    <svg className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-sm text-blue-700">
                                        <strong>Note:</strong> You can upload arena and court photos after registration from your dashboard.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

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
                                Continue
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
                                    'Complete Registration'
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="mt-6 text-center text-sm text-gray-500">
                    Step {step} of 6 • {stepTitles[step - 1]}
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