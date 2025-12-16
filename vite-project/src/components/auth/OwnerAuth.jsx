
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const OwnerAuth = (props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    loginEmail: "",
    loginPassword: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
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
    } catch (error) {
      console.error("Error:", error);
      setError("An error occurred. Please try again.");
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

          <div className="text-center">
            <Link
              to="/owner/register"
              className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
            >
              Don't have an account? Register your arena
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OwnerAuth;
