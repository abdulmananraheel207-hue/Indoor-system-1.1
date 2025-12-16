import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const OwnerAuth = (props) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
      sunday: true,
    },

    // For login
    loginEmail: "",
    loginPassword: "",
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });

    if (error) setError("");
  };

  const handleCourtChange = (index, field, value) => {
    const updatedCourts = [...formData.courts];
    updatedCourts[index] = {
      ...updatedCourts[index],
      [field]:
        field === "court_number" || field === "size_sqft" || field === "price_per_hour"
          ? parseFloat(value) || 0
          : value,
    };
    setFormData({
      ...formData,
      courts: updatedCourts,
    });
  };

  const handleSportToggle = (sportId) => {
    const isSelected = formData.selected_sports.includes(sportId);
    setFormData({
      ...formData,
      selected_sports: isSelected
        ? formData.selected_sports.filter((id) => id !== sportId)
        : [...formData.selected_sports, sportId],
    });
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.arena_name.trim()) return "Arena name is required";
        if (!formData.email.trim()) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
          return "Invalid email format";
        if (!formData.password) return "Password is required";
        if (formData.password.length < 6)
          return "Password must be at least 6 characters";
        if (formData.password !== formData.confirm_password)
          return "Passwords don't match";
        if (!formData.phone_number.trim()) return "Phone number is required";
        if (!formData.business_address.trim()) return "Business address is required";
        if (!formData.google_maps_location.trim())
          return "Google Maps location is required";
        if (!formData.agreed_to_terms)
          return "You must agree to terms and conditions";
        return null;

      case 2:
        if (!formData.description.trim()) return "Arena description is required";
        if (formData.number_of_courts < 1)
          return "Number of courts must be at least 1";
        if (!formData.base_price_per_hour || formData.base_price_per_hour <= 0)
          return "Base price must be greater than 0";
        return null;

      case 3:
        const invalidCourts = formData.courts.filter(
          (court) =>
            !court.court_name.trim() || !court.size_sqft || !court.price_per_hour
        );
        if (invalidCourts.length > 0) return "Please fill all court details";
        return null;

      case 4:
        if (formData.selected_sports.length === 0)
          return "Select at least one sport";
        return null;

      default:
        return null;
    }
  };

  const nextStep = () => {
    const error = validateStep(currentStep);
    if (error) {
      setError(error);
      return;
    }

    // Initialize courts on step 2->3 transition
    if (currentStep === 2 && formData.courts.length === 0) {
      const courts = [];
      const numCourts = parseInt(formData.number_of_courts) || 1;

      for (let i = 1; i <= numCourts; i++) {
        courts.push({
          court_number: i,
          court_name: `Court ${i}`,
          size_sqft: 2000,
          price_per_hour: parseFloat(formData.base_price_per_hour) || 500,
          description: "",
          sports: [...formData.selected_sports],
        });
      }

      setFormData({
        ...formData,
        courts,
      });
    }

    setCurrentStep(currentStep + 1);
    setError("");
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        // LOGIN
        const response = await fetch("http://localhost:5000/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.loginEmail,
            password: formData.loginPassword,
            userType: "owner",
          }),
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("userRole", "owner");
          localStorage.setItem("ownerData", JSON.stringify(data.owner || data.user));

          if (props.onLogin) {
            props.onLogin(data.token, data.owner || data.user);
          } else {
            navigate("/owner/dashboard");
          }
        } else {
          setError(data.message || "Login failed");
        }
      } else {
        // REGISTRATION
        const error = validateStep(currentStep);
        if (error) {
          setError(error);
          setLoading(false);
          return;
        }

        if (currentStep < 5) {
          setError("Please complete all registration steps");
          setLoading(false);
          return;
        }

        // Normalize phone number
        let normalizedPhone = formData.phone_number.trim().replace(/[\s\-()]/g, "");

        if (normalizedPhone.startsWith("0")) {
          normalizedPhone = "+92" + normalizedPhone.substring(1);
        } else if (
          normalizedPhone.startsWith("92") &&
          !normalizedPhone.startsWith("+92")
        ) {
          normalizedPhone = "+" + normalizedPhone;
        } else if (!normalizedPhone.startsWith("+")) {
          normalizedPhone = "+92" + normalizedPhone;
        }

        const phoneRegex = /^\+923[0-9]{9}$/;
        if (!phoneRegex.test(normalizedPhone)) {
          setError(
            "Please enter a valid Pakistani mobile number (e.g., 03001234567)"
          );
          setLoading(false);
          return;
        }

        // Prepare payload - FLAT STRUCTURE matching backend expectations
        const registrationData = {
          arena_name: formData.arena_name,
          email: formData.email,
          password: formData.password,
          phone_number: normalizedPhone,
          business_address: formData.business_address,
          google_maps_location: formData.google_maps_location,
          number_of_courts: parseInt(formData.number_of_courts),
          agreed_to_terms: formData.agreed_to_terms,
          description: formData.description,
          base_price_per_hour: parseFloat(formData.base_price_per_hour),
          sports: formData.selected_sports,
          courts: formData.courts.map((court) => ({
            court_number: court.court_number,
            court_name: court.court_name,
            size_sqft: parseFloat(court.size_sqft),
            price_per_hour: parseFloat(court.price_per_hour),
            description: court.description,
            sports: court.sports || formData.selected_sports,
          })),
          opening_time: formData.opening_time,
          closing_time: formData.closing_time,
          slot_duration: formData.slot_duration,
          days_available: formData.days_available,
        };

        console.log("Sending registration data:", registrationData);

        const response = await fetch(
          "http://localhost:5000/api/owners/register/complete",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(registrationData),
          }
        );

        const data = await response.json();

        console.log("Response status:", response.status);
        console.log("Response data:", data);

        if (response.ok) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("userRole", "owner");
          localStorage.setItem("ownerData", JSON.stringify(data.owner));

          alert("Registration successful! You can now upload photos from your dashboard.");
          navigate("/owner/dashboard");
        } else {
          setError(data.message || "Registration failed. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setCurrentStep(1);
    setError("");
    setFormData({
      arena_name: "",
      email: "",
      password: "",
      confirm_password: "",
      phone_number: "",
      business_address: "",
      google_maps_location: "",
      agreed_to_terms: false,
      description: "",
      number_of_courts: 1,
      base_price_per_hour: 500,
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
        sunday: true,
      },
      loginEmail: "",
      loginPassword: "",
    });
  };

  // LOGIN FORM
  if (isLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center py-6 px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="w-full max-w-xl md:max-w-2xl bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <svg
                className="h-8 w-8 text-white"
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
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Owner Portal Login
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Manage your arena, bookings, and revenue
            </p>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form
            className="mt-6 sm:mt-8 space-y-4 sm:space-y-5 md:space-y-6"
            onSubmit={handleSubmit}
          >
            <div>
              <label
                htmlFor="loginEmail"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address *
              </label>
              <input
                id="loginEmail"
                name="loginEmail"
                type="email"
                required
                value={formData.loginEmail}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="owner@arena.com"
              />
            </div>

            <div>
              <label
                htmlFor="loginPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password *
              </label>
              <input
                id="loginPassword"
                name="loginPassword"
                type="password"
                required
                minLength="6"
                value={formData.loginPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${loading
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
                } transition-all duration-200 shadow-lg`}
            >
              {loading ? "Processing..." : "Sign In to Owner Portal"}
            </button>

            <button
              type="button"
              onClick={toggleMode}
              disabled={loading}
              className="w-full text-indigo-600 hover:text-indigo-500 text-sm font-medium disabled:opacity-50"
            >
              Don't have an account? Register your arena
            </button>
          </form>
        </div>
      </div>
    );
  }

  // REGISTRATION FORM
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center py-6 px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="w-full max-w-4xl bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <svg
              className="h-8 w-8 text-white"
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
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Register Your Arena Business
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Complete all steps to register your sports arena
          </p>

          {/* Progress Steps */}
          <div className="mt-6">
            <div className="flex justify-between items-center">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${currentStep >= step
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 text-gray-500"
                      }`}
                  >
                    {step}
                  </div>
                  <span className="mt-2 text-xs text-gray-600 text-center">
                    {step === 1 && "Owner Info"}
                    {step === 2 && "Arena Details"}
                    {step === 3 && "Courts"}
                    {step === 4 && "Sports"}
                    {step === 5 && "Hours"}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${(currentStep / 5) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Owner Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Owner Information
              </h3>

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
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Sports Arena"
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
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="03001234567"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Pakistani mobile number format
                </p>
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
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Paste Google Maps link"
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
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Full address of your arena"
                />
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="agreed_to_terms"
                  required
                  checked={formData.agreed_to_terms}
                  onChange={handleChange}
                  className="h-4 w-4 mt-1 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  I agree to the Terms and Conditions for arena owners
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Arena Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Arena Details
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Arena Description *
                </label>
                <textarea
                  name="description"
                  rows="4"
                  required
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? "Court" : "Courts"}
                      </option>
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
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Courts Configuration */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Court Configuration ({formData.courts.length} courts)
              </h3>

              {formData.courts.map((court, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <h4 className="font-medium text-gray-900 mb-4">
                    Court {court.court_number}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Court Name
                      </label>
                      <input
                        type="text"
                        value={court.court_name}
                        onChange={(e) =>
                          handleCourtChange(index, "court_name", e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="e.g., Main Court"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Size (sq ft)
                      </label>
                      <input
                        type="number"
                        value={court.size_sqft}
                        onChange={(e) =>
                          handleCourtChange(index, "size_sqft", e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="2000"
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
                        onChange={(e) =>
                          handleCourtChange(
                            index,
                            "price_per_hour",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (Optional)
                      </label>
                      <input
                        type="text"
                        value={court.description}
                        onChange={(e) =>
                          handleCourtChange(
                            index,
                            "description",
                            e.target.value
                          )
                        }
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
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Sports Selection
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Select which sports are available at your arena
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {availableSports.map((sport) => (
                  <button
                    type="button"
                    key={sport.id}
                    onClick={() => handleSportToggle(sport.id)}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center transition-all ${formData.selected_sports.includes(sport.id)
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    <span className="text-3xl mb-2">{sport.icon}</span>
                    <span className="text-sm font-medium">{sport.name}</span>
                  </button>
                ))}
              </div>

              {formData.selected_sports.length > 0 && (
                <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
                  <h4 className="font-medium text-indigo-900 mb-2">
                    Selected Sports:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.selected_sports.map((sportId) => {
                      const sport = availableSports.find((s) => s.id === sportId);
                      return sport ? (
                        <span
                          key={sportId}
                          className="px-3 py-1 bg-white border border-indigo-200 rounded-full text-sm flex items-center"
                        >
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
          {currentStep === 5 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Operating Hours
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opening Time
                  </label>
                  <select
                    name="opening_time"
                    value={formData.opening_time}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const hour = i + 6;
                      const time = `${hour.toString().padStart(2, "0")}:00`;
                      return (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      );
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
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const hour = i + 12;
                      const time = `${hour.toString().padStart(2, "0")}:00`;
                      return (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      );
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
                    onChange={handleChange}
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
                  {Object.keys(formData.days_available).map((day) => (
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
                              [day]: e.target.checked,
                            },
                          });
                        }}
                        className="h-5 w-5 text-indigo-600 rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  Time Slots Preview:
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <strong>Days:</strong>{" "}
                    {Object.keys(formData.days_available)
                      .filter((day) => formData.days_available[day])
                      .map((day) => day.charAt(0).toUpperCase() + day.slice(1))
                      .join(", ")}
                  </p>
                  <p>
                    <strong>Hours:</strong> {formData.opening_time} to{" "}
                    {formData.closing_time}
                  </p>
                  <p>
                    <strong>Slot Duration:</strong> {formData.slot_duration / 60}{" "}
                    hour(s)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between gap-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 ml-auto"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-3 rounded-lg text-white ml-auto ${loading
                    ? "bg-indigo-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
              >
                {loading ? "Processing..." : "Complete Registration"}
              </button>
            )}
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerAuth;