import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const OwnerAuth = (props) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    arena_name: "",
    email: "",
    password: "",
    phone_number: "",
    business_address: "",
    google_maps_location: "",
    number_of_courts: 1,
    agreed_to_terms: false,
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!isLogin && !formData.agreed_to_terms) {
      alert("Please agree to terms and conditions");
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin
        ? "http://localhost:5000/api/auth/login"
        : "http://localhost:5000/api/auth/register/owner";

      let payload;

      if (isLogin) {
        payload = {
          email: formData.email,
          password: formData.password,
          userType: "owner",
        };
      } else {
        // Normalize phone number for all Pakistani formats
        let normalizedPhone = formData.phone_number.trim();

        // Remove all spaces, dashes, and parentheses
        normalizedPhone = normalizedPhone.replace(/[\s\-()]/g, "");

        // Check and normalize different Pakistani formats
        if (normalizedPhone.startsWith("0")) {
          // Convert 03XXXXXXXXX to +923XXXXXXXXX
          normalizedPhone = "+92" + normalizedPhone.substring(1);
        } else if (
          normalizedPhone.startsWith("92") &&
          !normalizedPhone.startsWith("+92")
        ) {
          // Convert 923XXXXXXXXX to +923XXXXXXXXX
          normalizedPhone = "+" + normalizedPhone;
        } else if (!normalizedPhone.startsWith("+")) {
          // If no prefix, assume it's already 3XXXXXXXXX and add +92
          normalizedPhone = "+92" + normalizedPhone;
        }

        // Basic validation for Pakistani mobile numbers
        const phoneRegex = /^\+923[0-9]{9}$/;
        if (!phoneRegex.test(normalizedPhone)) {
          alert(
            "Please enter a valid Pakistani mobile number (e.g., 03001234567, +923001234567, or 923001234567)"
          );
          setLoading(false);
          return;
        }

        payload = {
          arena_name: formData.arena_name,
          email: formData.email,
          password: formData.password,
          phone_number: normalizedPhone,
          business_address: formData.business_address,
          number_of_courts: parseInt(formData.number_of_courts) || 1,
          agreed_to_terms: formData.agreed_to_terms,
          google_maps_location: formData.google_maps_location || "",
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      // In OwnerAuth.jsx, update the successful response handler:
      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userRole", "owner");
        localStorage.setItem(
          "ownerData",
          JSON.stringify(data.owner || data.user)
        );

        // Call the onLogin prop if it exists (from App.jsx)
        if (props.onLogin) {
          props.onLogin(data.token, data.owner || data.user);
        } else {
          // Fallback navigation if onLogin prop is not provided
          navigate("/owner/dashboard");
        }
      } else {
        if (data.errors && data.errors.length > 0) {
          const errorMessages = data.errors
            .map((err) => `${err.path}: ${err.msg}`)
            .join("\n");
          alert(errorMessages);
        } else {
          alert(
            data.message ||
              `${isLogin ? "Login" : "Registration"} failed (${
                response.status
              })`
          );
        }
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
            {isLogin ? "Owner Portal Login" : "Register Your Arena Business"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin
              ? "Manage your arena, bookings, and revenue"
              : "Start your sports arena business with us"}
          </p>
        </div>

        <form
          className="mt-6 sm:mt-8 space-y-4 sm:space-y-5 md:space-y-6"
          onSubmit={handleSubmit}
        >
          {!isLogin && (
            <>
              <div>
                <label
                  htmlFor="arena_name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Arena Name *
                </label>
                <div className="relative">
                  <input
                    id="arena_name"
                    name="arena_name"
                    type="text"
                    required
                    value={formData.arena_name}
                    onChange={handleChange}
                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="Sports Arena"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
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
                </div>
              </div>

              <div>
                <label
                  htmlFor="business_address"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Business Address *
                </label>
                <div className="relative">
                  <textarea
                    id="business_address"
                    name="business_address"
                    rows="2"
                    required
                    value={formData.business_address}
                    onChange={handleChange}
                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="Full address of your arena"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 pt-3 flex items-start pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
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
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="number_of_courts"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Number of Courts *
                  </label>
                  <div className="relative">
                    <select
                      id="number_of_courts"
                      name="number_of_courts"
                      value={formData.number_of_courts}
                      onChange={handleChange}
                      className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? "Court" : "Courts"}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="google_maps_location"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Google Maps Location
                  </label>
                  <div className="relative">
                    <input
                      id="google_maps_location"
                      name="google_maps_location"
                      type="text"
                      value={formData.google_maps_location}
                      onChange={handleChange}
                      className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      placeholder="Paste Google Maps link"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <input
                  id="agreed_to_terms"
                  name="agreed_to_terms"
                  type="checkbox"
                  required
                  checked={formData.agreed_to_terms}
                  onChange={handleChange}
                  className="h-4 w-4 mt-1 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="agreed_to_terms"
                  className="ml-2 block text-xs sm:text-sm text-gray-900"
                >
                  I agree to the Terms and Conditions for arena owners
                </label>
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address *
            </label>
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="owner@arena.com"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <label
              htmlFor="phone_number"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Phone Number *
            </label>
            <div className="relative">
              <input
                id="phone_number"
                name="phone_number"
                type="tel"
                required
                value={formData.phone_number}
                onChange={handleChange}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="03001234567 or +923001234567 or 923001234567"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Accepted formats: 03001234567, +923001234567, or 923001234567
            </p>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password *
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength="6"
                value={formData.password}
                onChange={handleChange}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="••••••••"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Must be at least 6 characters
            </p>
          </div>

          {/* Main Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${
                loading
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              } transition-all duration-200 shadow-lg hover:shadow-xl`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
              ) : isLogin ? (
                "Sign In to Owner Portal"
              ) : (
                "Register Arena Business"
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  arena_name: "",
                  email: "",
                  password: "",
                  phone_number: "",
                  business_address: "",
                  google_maps_location: "",
                  number_of_courts: 1,
                  agreed_to_terms: false,
                });
                setIsLogin(!isLogin);
              }}
              disabled={loading}
              className="text-indigo-600 hover:text-indigo-500 text-sm font-medium disabled:opacity-50 transition-colors duration-200"
            >
              {isLogin
                ? "Don't have an owner account? Register your arena"
                : "Already have an owner account? Sign in"}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-600">
              By continuing, you agree to our{" "}
              <a
                href="#"
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Business Terms
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerAuth;
