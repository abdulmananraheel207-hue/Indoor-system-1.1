import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const OwnerLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/owner/login",
        formData
      );
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("owner", JSON.stringify(response.data.owner));
      localStorage.setItem("role", "owner");
      navigate("/owner/dashboard", { state: { loginSuccess: true } });
    } catch (err) {
      setError(err.response?.data?.error || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col page-enter">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button
          onClick={() => navigate("/")}
          className="p-2 -ml-2 text-gray-600"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 19l-7-7 7-7"
            ></path>
          </svg>
        </button>
        <span className="font-bold text-gray-800 text-lg">Owner Login</span>
        <div className="w-10"></div>
      </div>

      <div className="mobile-content flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
            🏟️
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Arena Owner</h2>
          <p className="text-gray-500">Manage your business on the go</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">
              Email
            </label>
            <input
              type="email"
              className="mobile-input focus:border-green-500 focus:ring-green-100"
              placeholder="owner@arena.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 ml-1">
              <label className="block text-sm font-semibold text-gray-700">
                Password
              </label>
              <a href="#" className="text-xs text-green-600 font-medium">
                Forgot?
              </a>
            </div>
            <input
              type="password"
              className="mobile-input focus:border-green-500 focus:ring-green-100"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary bg-green-600 shadow-green-200 mt-4"
          >
            {loading ? "Signing in..." : "Owner Sign In"}
          </button>
        </form>

        <div className="mt-auto pt-8 text-center">
          <p className="text-gray-600">
            Want to list your arena?{" "}
            <Link to="/owner/register" className="text-green-600 font-bold">
              Register Business
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OwnerLogin;
