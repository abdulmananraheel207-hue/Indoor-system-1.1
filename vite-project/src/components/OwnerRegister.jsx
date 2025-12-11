import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const OwnerRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    arena_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone_number: "",
    business_address: "",
    google_maps_location: "",
    number_of_courts: 1,
    agreed_to_terms: false,
  });

  // Time slots for different days
  const [timeSlots, setTimeSlots] = useState({
    monday: { isOpen: true, startTime: "09:00", endTime: "22:00" },
    tuesday: { isOpen: true, startTime: "09:00", endTime: "22:00" },
    wednesday: { isOpen: true, startTime: "09:00", endTime: "22:00" },
    thursday: { isOpen: true, startTime: "09:00", endTime: "22:00" },
    friday: { isOpen: true, startTime: "09:00", endTime: "22:00" },
    saturday: { isOpen: true, startTime: "09:00", endTime: "22:00" },
    sunday: { isOpen: true, startTime: "09:00", endTime: "22:00" },
  });

  // Court details (based on number_of_courts)
  const [courtDetails, setCourtDetails] = useState([
    {
      courtNumber: 1,
      name: "Court 1",
      size: "", // in square feet
      pricePerHour: 0,
      images: [],
      description: "",
      sportTypes: [],
    },
  ]);

  const days = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ];

  const sportsOptions = [
    "Cricket",
    "Futsal",
    "Badminton",
    "Tennis",
    "Basketball",
    "Squash",
    "Volleyball",
    "Padel",
    "Table Tennis",
  ];

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeStep, setActiveStep] = useState(1); // 1: Basic Info, 2: Time Slots, 3: Court Details

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "phone_number") {
      const digitsOnly = value.replace(/\D/g, "");
      setFormData({
        ...formData,
        [name]: digitsOnly,
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? checked : value,
      });
    }

    if (errors[name] || errors.api) {
      setErrors({
        ...errors,
        [name]: "",
        api: "",
      });
    }
  };

  // Update court details when number of courts changes
  React.useEffect(() => {
    const currentCount = courtDetails.length;
    const newCount = formData.number_of_courts;

    if (newCount > currentCount) {
      // Add new courts
      const newCourts = [...courtDetails];
      for (let i = currentCount; i < newCount; i++) {
        newCourts.push({
          courtNumber: i + 1,
          name: `Court ${i + 1}`,
          size: "",
          pricePerHour: 0,
          images: [],
          description: "",
          sportTypes: [],
        });
      }
      setCourtDetails(newCourts);
    } else if (newCount < currentCount) {
      // Remove extra courts
      setCourtDetails(courtDetails.slice(0, newCount));
    }
  }, [formData.number_of_courts]);

  const handleTimeSlotChange = (day, field, value) => {
    setTimeSlots({
      ...timeSlots,
      [day]: {
        ...timeSlots[day],
        [field]: value,
      },
    });
  };

  const handleDayToggle = (day) => {
    setTimeSlots({
      ...timeSlots,
      [day]: {
        ...timeSlots[day],
        isOpen: !timeSlots[day].isOpen,
      },
    });
  };

  const handleCourtChange = (index, field, value) => {
    const newCourtDetails = [...courtDetails];
    newCourtDetails[index][field] = value;
    setCourtDetails(newCourtDetails);
  };

  const handleSportToggle = (courtIndex, sport) => {
    const newCourtDetails = [...courtDetails];
    const currentSports = newCourtDetails[courtIndex].sportTypes;

    if (currentSports.includes(sport)) {
      // Remove sport
      newCourtDetails[courtIndex].sportTypes = currentSports.filter(
        (s) => s !== sport
      );
    } else {
      // Add sport
      newCourtDetails[courtIndex].sportTypes = [...currentSports, sport];
    }

    setCourtDetails(newCourtDetails);
  };

  const handleImageUpload = (courtIndex, e) => {
    const files = Array.from(e.target.files);
    const newCourtDetails = [...courtDetails];

    // For demo, store file objects (in real app, upload to cloud storage)
    newCourtDetails[courtIndex].images = [
      ...newCourtDetails[courtIndex].images,
      ...files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
      })),
    ];

    setCourtDetails(newCourtDetails);
  };

  const removeImage = (courtIndex, imageIndex) => {
    const newCourtDetails = [...courtDetails];
    newCourtDetails[courtIndex].images.splice(imageIndex, 1);
    setCourtDetails(newCourtDetails);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.arena_name.trim())
      newErrors.arena_name = "Arena name is required";

    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Email is invalid";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";

    if (!formData.confirmPassword)
      newErrors.confirmPassword = "Please confirm password";
    else if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    if (!formData.phone_number.trim())
      newErrors.phone_number = "Phone number is required";
    else if (formData.phone_number.length < 10)
      newErrors.phone_number = "Phone number must be at least 10 digits";
    else if (formData.phone_number.length > 15)
      newErrors.phone_number = "Phone number is too long";

    // Validate court details
    courtDetails.forEach((court, index) => {
      if (!court.size) {
        newErrors[`court_${index}_size`] = `Court ${
          index + 1
        } size is required`;
      }
      if (court.pricePerHour <= 0) {
        newErrors[`court_${index}_price`] = `Court ${
          index + 1
        } price must be greater than 0`;
      }
      if (court.sportTypes.length === 0) {
        newErrors[
          `court_${index}_sports`
        ] = `Select at least one sport for Court ${index + 1}`;
      }
    });

    if (!formData.agreed_to_terms)
      newErrors.agreed_to_terms = "You must agree to the terms";

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (activeStep < 3) {
      setActiveStep(activeStep + 1);
      return;
    }

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Go to step with first error
      if (Object.keys(validationErrors).some((key) => key.includes("court"))) {
        setActiveStep(3);
      } else {
        setActiveStep(1);
      }
      return;
    }

    setLoading(true);
    try {
      const registrationData = {
        arena_name: formData.arena_name,
        email: formData.email,
        password: formData.password,
        phone_number: formData.phone_number,
        business_address: formData.business_address,
        google_maps_location: formData.google_maps_location,
        number_of_courts: formData.number_of_courts,
        agreed_to_terms: formData.agreed_to_terms,
        time_slots: timeSlots,
        court_details: courtDetails,
      };

      const response = await axios.post(
        "http://localhost:5000/api/auth/owner/register",
        registrationData
      );

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("owner", JSON.stringify(response.data.owner));
      localStorage.setItem("role", "owner");

      setSuccess(true);

      setTimeout(() => {
        navigate("/owner/dashboard", { state: { registerSuccess: true } });
      }, 2000);
    } catch (error) {
      console.error("Owner registration error:", error);
      if (error.response?.data?.error) {
        setErrors({ api: error.response.data.error });
      } else {
        setErrors({ api: "Registration failed. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              activeStep >= step
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {step}
          </div>
          {step < 3 && (
            <div
              className={`w-20 h-1 ${
                activeStep > step ? "bg-green-600" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
      <div className="ml-4 flex items-center space-x-2">
        <span className="text-sm text-gray-600">Step {activeStep} of 3:</span>
        <span className="font-medium">
          {activeStep === 1 && "Basic Information"}
          {activeStep === 2 && "Time Slots & Hours"}
          {activeStep === 3 && "Court Details"}
        </span>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <span className="mr-2">←</span>
          Back to Login Options
        </button>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Register Your Arena
      </h2>

      {renderStepIndicator()}

      {success ? (
        <div className="text-center py-8">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h3 className="text-xl font-bold text-green-600 mb-2">
            Registration Successful!
          </h3>
          <p className="text-gray-600">Your arena has been registered.</p>
          <div className="animate-pulse mt-4">
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {errors.api && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {errors.api}
            </div>
          )}

          {/* Step 1: Basic Information */}
          {activeStep === 1 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Arena Name *
                </label>
                <input
                  type="text"
                  name="arena_name"
                  value={formData.arena_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.arena_name ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="e.g., Sports Arena Lahore, Islamabad Sports Complex"
                />
                {errors.arena_name && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.arena_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="owner@arena.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.password ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Create a password"
                  />
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.password}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 6 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.confirmPassword
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="Confirm your password"
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.phone_number ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="03XX-XXXXXXX"
                  maxLength="11"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Pakistani format: 03XX-XXXXXXX
                </p>
                {errors.phone_number && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.phone_number}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Address
                </label>
                <textarea
                  name="business_address"
                  value={formData.business_address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Full address of your arena in Pakistan"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google Maps Location (Optional)
                </label>
                <input
                  type="text"
                  name="google_maps_location"
                  value={formData.google_maps_location}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Paste Google Maps link or coordinates"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Courts *
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        number_of_courts: Math.max(
                          1,
                          prev.number_of_courts - 1
                        ),
                      }))
                    }
                    className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl"
                  >
                    -
                  </button>
                  <span className="text-2xl font-bold">
                    {formData.number_of_courts}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        number_of_courts: prev.number_of_courts + 1,
                      }))
                    }
                    className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl"
                  >
                    +
                  </button>
                  <span className="text-gray-600">courts</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Each court can have different specifications, prices, and
                  images
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Time Slots & Hours */}
          {activeStep === 2 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Arena Opening Hours (Pakistan Standard Time)
                </h3>
                <p className="text-sm text-gray-600">
                  Set when your arena is available for bookings. Users can only
                  book during these hours.
                </p>
              </div>

              {days.map((day) => (
                <div
                  key={day.key}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`open-${day.key}`}
                        checked={timeSlots[day.key].isOpen}
                        onChange={() => handleDayToggle(day.key)}
                        className="h-5 w-5 text-green-600 rounded"
                      />
                      <label
                        htmlFor={`open-${day.key}`}
                        className="ml-3 font-medium text-gray-700"
                      >
                        {day.label}
                      </label>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        timeSlots[day.key].isOpen
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {timeSlots[day.key].isOpen ? "Open" : "Closed"}
                    </span>
                  </div>

                  {timeSlots[day.key].isOpen && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Opening Time
                        </label>
                        <input
                          type="time"
                          value={timeSlots[day.key].startTime}
                          onChange={(e) =>
                            handleTimeSlotChange(
                              day.key,
                              "startTime",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Closing Time
                        </label>
                        <input
                          type="time"
                          value={timeSlots[day.key].endTime}
                          onChange={(e) =>
                            handleTimeSlotChange(
                              day.key,
                              "endTime",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">
                  💡 Typical Pakistani Arena Hours
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Weekdays: 9 AM - 11 PM</li>
                  <li>• Weekends: 8 AM - 12 AM (late night matches)</li>
                  <li>• Friday prayers break: 1 PM - 3 PM (optional)</li>
                  <li>• Ramadan timing: Usually evening to late night</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 3: Court Details */}
          {activeStep === 3 && (
            <div className="space-y-8 animate-fadeIn">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Court Details ({formData.number_of_courts} courts)
                </h3>
                <p className="text-sm text-gray-600">
                  Configure each court individually with its own specifications,
                  prices, and images
                </p>
              </div>

              {courtDetails.map((court, courtIndex) => (
                <div
                  key={courtIndex}
                  className="p-6 border border-gray-300 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-gray-800">
                      Court {courtIndex + 1}
                    </h4>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      Required
                    </span>
                  </div>

                  {/* Court Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Court Name
                    </label>
                    <input
                      type="text"
                      value={court.name}
                      onChange={(e) =>
                        handleCourtChange(courtIndex, "name", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Main Court, Ground #1, VIP Court"
                    />
                  </div>

                  {/* Court Size */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Court Size (Square Feet) *
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="number"
                        min="500"
                        max="10000"
                        step="50"
                        value={court.size}
                        onChange={(e) =>
                          handleCourtChange(courtIndex, "size", e.target.value)
                        }
                        className={`w-40 px-4 py-2 border rounded-lg ${
                          errors[`court_${courtIndex}_size`]
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="e.g., 1200"
                      />
                      <span className="text-gray-600">sq ft</span>
                    </div>
                    {errors[`court_${courtIndex}_size`] && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors[`court_${courtIndex}_size`]}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Common sizes: Cricket (70x25ft = 1750 sq ft), Futsal
                      (80x40ft = 3200 sq ft), Badminton (44x20ft = 880 sq ft)
                    </p>
                  </div>

                  {/* Price per Hour */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price per Hour (PKR) *
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-700">₨</span>
                      <input
                        type="number"
                        min="500"
                        max="10000"
                        step="100"
                        value={court.pricePerHour}
                        onChange={(e) =>
                          handleCourtChange(
                            courtIndex,
                            "pricePerHour",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className={`w-40 px-4 py-2 border rounded-lg ${
                          errors[`court_${courtIndex}_price`]
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="e.g., 2000"
                      />
                      <span className="text-gray-600">/ hour</span>
                    </div>
                    {errors[`court_${courtIndex}_price`] && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors[`court_${courtIndex}_price`]}
                      </p>
                    )}
                  </div>

                  {/* Sports Available */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Sports *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {sportsOptions.map((sport) => (
                        <button
                          key={sport}
                          type="button"
                          onClick={() => handleSportToggle(courtIndex, sport)}
                          className={`px-3 py-1 rounded-full text-sm ${
                            court.sportTypes.includes(sport)
                              ? "bg-green-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          {sport}
                        </button>
                      ))}
                    </div>
                    {errors[`court_${courtIndex}_sports`] && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors[`court_${courtIndex}_sports`]}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Select sports that can be played on this court
                    </p>
                  </div>

                  {/* Court Description */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Court Description
                    </label>
                    <textarea
                      value={court.description}
                      onChange={(e) =>
                        handleCourtChange(
                          courtIndex,
                          "description",
                          e.target.value
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Describe special features: covered court, floodlights, artificial turf, etc."
                      rows="3"
                    />
                  </div>

                  {/* Image Upload */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Court Images (Max 5 images)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleImageUpload(courtIndex, e)}
                        className="w-full"
                        disabled={court.images.length >= 5}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Upload clear photos of this court. Show different
                        angles.
                      </p>
                    </div>

                    {/* Preview Images */}
                    {court.images.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
                        {court.images.map((image, imgIndex) => (
                          <div key={imgIndex} className="relative">
                            <img
                              src={image.preview}
                              alt={`Court ${courtIndex + 1} - ${imgIndex + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(courtIndex, imgIndex)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Court Specifications Preview */}
                  <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
                    <h5 className="font-medium text-gray-700 mb-2">
                      Court Preview:
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Size:</span>
                        <span className="ml-2 font-medium">
                          {court.size ? `${court.size} sq ft` : "Not set"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Price:</span>
                        <span className="ml-2 font-medium">
                          {court.pricePerHour
                            ? `₨${court.pricePerHour}/hour`
                            : "Not set"}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Sports:</span>
                        <span className="ml-2 font-medium">
                          {court.sportTypes.length > 0
                            ? court.sportTypes.join(", ")
                            : "No sports selected"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Terms & Conditions */}
              <div className="flex items-start p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <input
                  type="checkbox"
                  name="agreed_to_terms"
                  checked={formData.agreed_to_terms}
                  onChange={handleChange}
                  className="h-5 w-5 text-green-600 rounded mt-1"
                />
                <div className="ml-3">
                  <label className="text-sm text-gray-700">
                    I agree to the{" "}
                    <a href="#" className="text-green-600 hover:underline">
                      Terms and Conditions
                    </a>{" "}
                    and understand that:
                  </label>
                  <ul className="mt-2 text-xs text-gray-600 space-y-1">
                    <li>• Platform commission: 5% of each booking</li>
                    <li>• Payments are processed weekly</li>
                    <li>• Must maintain accurate court specifications</li>
                    <li>• Images must accurately represent the court</li>
                  </ul>
                </div>
              </div>
              {errors.agreed_to_terms && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.agreed_to_terms}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-between pt-6 border-t">
            {activeStep > 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep - 1)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                ← Previous
              </button>
            ) : (
              <div></div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-8 py-3 rounded-lg font-bold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading
                ? "Processing..."
                : activeStep === 3
                ? "Complete Registration"
                : "Next Step →"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default OwnerRegister;
