// File: OwnerAuth.jsx - FIXED for your backend
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const OwnerAuth = (props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [blockedInfo, setBlockedInfo] = useState(null);
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
    if (blockedInfo) setBlockedInfo(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setBlockedInfo(null);

    try {
      // Clear previous auth data
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userData');
      localStorage.removeItem('ownerData');
      localStorage.removeItem('managerData');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');

      // 🔥 IMPORTANT: Use the exact format your backend expects
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.loginEmail,
          password: formData.loginPassword,
          userType: "owner" // Your backend expects this for owners
        }),
      });

      const data = await response.json();
      console.log("Login response:", { status: response.status, data });

      // Check for blocked account
      if (response.status === 403 && data.message === 'ACCOUNT_BLOCKED') {
        setBlockedInfo(data.details);
        setLoading(false);
        return;
      }

      if (response.ok) {
        // Store token
        localStorage.setItem("token", data.token);

        // Check if this is a manager or owner from the response
        // Your owner login endpoint might return owner data, not manager
        // Managers should use the /api/managers/login endpoint
        const isManager = data.user?.role === "manager" || data.role === "manager";

        if (isManager) {
          localStorage.setItem("userRole", "manager");
          localStorage.setItem("userData", JSON.stringify(data.user || data.manager));
          localStorage.setItem("managerData", JSON.stringify(data.user || data.manager));
        } else {
          localStorage.setItem("userRole", "owner");
          localStorage.setItem("ownerData", JSON.stringify(data.owner || data.user));
        }

        console.log(`✅ Login successful as ${isManager ? 'manager' : 'owner'}`);

        if (props.onLogin) {
          props.onLogin(data.token, isManager ? (data.user || data.manager) : (data.owner || data.user));
        } else {
          // Navigate to appropriate dashboard
          if (isManager) {
            navigate("/manager/dashboard");
          } else {
            navigate("/owner/dashboard");
          }
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

  // Blocked account message
  if (blockedInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center py-6 px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="w-full max-w-xl md:max-w-2xl bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
              Account Blocked
            </h2>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left">
              <p className="text-red-800 font-medium mb-2">Reason:</p>
              <p className="text-red-700 text-sm">{blockedInfo.reason}</p>

              <p className="text-red-800 font-medium mt-3 mb-1">Blocked on:</p>
              <p className="text-red-700 text-sm">{blockedInfo.blocked_date}</p>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="text-gray-700 font-medium mb-3">Need help? Contact support:</p>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  📧 {blockedInfo.support_email || 'support@arenafinder.com'}
                </p>
                <p className="text-gray-600">
                  📞 {blockedInfo.support_phone || '+92 300 1234567'}
                </p>
              </div>

              <button
                onClick={() => {
                  setBlockedInfo(null);
                  setFormData({
                    loginEmail: "",
                    loginPassword: "",
                  });
                }}
                className="mt-6 w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login Form
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
          <p className="mt-1 text-xs text-blue-600">
            Managers: Please use the Manager Login page
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