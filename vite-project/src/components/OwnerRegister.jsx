// components/OwnerRegister.jsx
import React, { useState } from "react";
import axios from "axios";

const OwnerRegister = () => {
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
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: "",
      });
    }
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

    if (!formData.agreed_to_terms)
      newErrors.agreed_to_terms = "You must agree to the terms";

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/owner/register",
        {
          arena_name: formData.arena_name,
          email: formData.email,
          password: formData.password,
          phone_number: formData.phone_number,
          business_address: formData.business_address,
          google_maps_location: formData.google_maps_location,
          number_of_courts: formData.number_of_courts,
          agreed_to_terms: formData.agreed_to_terms,
        }
      );

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("owner", JSON.stringify(response.data.owner));
      localStorage.setItem("role", "owner");

      setSuccess(true);

      setTimeout(() => {
        window.location.href = "/owner/dashboard";
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

  return (
    <div>
      {success ? (
        <div className="text-center py-8">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h3 className="text-xl font-bold text-green-600 mb-2">
            Registration Successful!
          </h3>
          <p className="text-gray-600">Redirecting to owner dashboard...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {errors.api && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {errors.api}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Arena Name *
            </label>
            <input
              type="text"
              name="arena_name"
              value={formData.arena_name}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.arena_name ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter your arena name"
            />
            {errors.arena_name && (
              <p className="text-red-500 text-sm mt-1">{errors.arena_name}</p>
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
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter your email"
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
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.password ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Create a password"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
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
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.confirmPassword ? "border-red-500" : "border-gray-300"
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
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.phone_number ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter your phone number"
            />
            {errors.phone_number && (
              <p className="text-red-500 text-sm mt-1">{errors.phone_number}</p>
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your arena address"
              rows="2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Courts
            </label>
            <input
              type="number"
              name="number_of_courts"
              value={formData.number_of_courts}
              onChange={handleChange}
              min="1"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="agreed_to_terms"
              checked={formData.agreed_to_terms}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label className="ml-2 text-sm text-gray-600">
              I agree to the{" "}
              <a href="#" className="text-blue-600 hover:underline">
                Terms and Conditions
              </a>
            </label>
          </div>
          {errors.agreed_to_terms && (
            <p className="text-red-500 text-sm mt-1">
              {errors.agreed_to_terms}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-500 text-white py-3 rounded-lg font-bold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Register Arena"}
          </button>
        </form>
      )}
    </div>
  );
};

export default OwnerRegister;
