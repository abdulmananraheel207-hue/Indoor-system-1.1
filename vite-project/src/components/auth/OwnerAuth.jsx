import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const OwnerAuth = (props) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    arena_name: "", // Changed from 'name' to 'arena_name'
    email: "",
    password: "",
    phone_number: "", // Use consistent name
    business_address: "",
    google_maps_location: "",
    number_of_courts: 1,
    agreed_to_terms: false,
  });
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

    if (!isLogin && !formData.agreed_to_terms) {
      alert("Please agree to terms and conditions");
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
        payload = {
          arena_name: formData.arena_name,
          email: formData.email,
          password: formData.password,
          phone_number: formData.phone_number,
          business_address: formData.business_address,
          number_of_courts: parseInt(formData.number_of_courts) || 1,
          agreed_to_terms: formData.agreed_to_terms,
          google_maps_location: formData.google_maps_location || "",
        };
      }

      console.log("Sending payload:", payload);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Response:", response.status, data);

      if (response.ok) {
        // Store token and role
        localStorage.setItem("token", data.token);
        localStorage.setItem("userRole", "owner");
        localStorage.setItem(
          "ownerData",
          JSON.stringify(data.owner || data.user)
        );

        // Show success message
        alert(isLogin ? "Login successful!" : "Registration successful!");

        // IMPORTANT: Call the onLogin prop if it exists
        if (props.onLogin) {
          props.onLogin(); // This updates loggedIn state in App.jsx
        } else {
          // Fallback: navigate directly
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
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? "Login as Arena Owner" : "Register Your Arena"}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div>
                <label
                  htmlFor="arena_name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Arena Name *
                </label>
                <input
                  id="arena_name"
                  name="arena_name" // This should match formData key
                  type="text"
                  required
                  value={formData.arena_name}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Sports Arena"
                />
              </div>

              <div>
                <label
                  htmlFor="business_address"
                  className="block text-sm font-medium text-gray-700"
                >
                  Business Address *
                </label>
                <textarea
                  id="business_address"
                  name="business_address"
                  rows="2"
                  required
                  value={formData.business_address}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Full address of your arena"
                />
              </div>

              <div>
                <label
                  htmlFor="number_of_courts"
                  className="block text-sm font-medium text-gray-700"
                >
                  Number of Courts *
                </label>
                <select
                  id="number_of_courts"
                  name="number_of_courts"
                  value={formData.number_of_courts}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add Google Maps Location here in registration section */}
              <div>
                <label
                  htmlFor="google_maps_location"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Google Maps Location (Optional)
                </label>
                <input
                  id="google_maps_location"
                  name="google_maps_location"
                  type="text"
                  value={formData.google_maps_location}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Paste Google Maps link or coordinates"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="agreed_to_terms"
                  name="agreed_to_terms"
                  type="checkbox"
                  required
                  checked={formData.agreed_to_terms}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="agreed_to_terms"
                  className="ml-2 block text-sm text-gray-900"
                >
                  I agree to the Terms and Conditions
                </label>
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="owner@arena.com"
            />
          </div>

          <div>
            <label
              htmlFor="phone_number" // Fixed ID
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Phone Number *
            </label>
            <input
              id="phone_number" // Fixed ID
              name="phone_number" // This matches formData key
              type="tel"
              required
              value={formData.phone_number}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="+923001234567"
            />
            <p className="text-xs text-gray-500 mt-1">Format: +923001234567</p>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength="6"
              value={formData.password}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 6 characters
            </p>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {isLogin ? "Sign In as Owner" : "Register Arena"}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                // Reset form when switching modes
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
              className="text-primary-600 hover:text-primary-500 text-sm"
            >
              {isLogin
                ? "Don't have an account? Register your arena"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OwnerAuth;
