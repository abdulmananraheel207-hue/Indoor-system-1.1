// components/OwnerLogin.jsx
import React, { useState } from "react";
import axios from "axios";

const OwnerLogin = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: "",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setErrors({ api: "Email and password are required" });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/owner/login",
        formData
      );

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("owner", JSON.stringify(response.data.owner));
      localStorage.setItem("role", "owner");

      // Redirect to owner dashboard
      window.location.href = "/owner/dashboard";
    } catch (error) {
      console.error("Owner login error:", error);
      if (error.response?.data?.error) {
        setErrors({ api: error.response.data.error });
      } else {
        setErrors({ api: "Login failed. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {errors.api && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {errors.api}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password *
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-500 text-white py-3 rounded-lg font-bold hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Owner Login"}
        </button>

        <p className="text-center text-gray-600 text-sm">
          Need help? Contact support at support@arenabook.com
        </p>
      </form>
    </div>
  );
};

export default OwnerLogin;
