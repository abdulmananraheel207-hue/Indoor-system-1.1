import React, { useState } from "react";
import axios from "../utils/axiosConfig"; // Keep your existing import path
import { useNavigate } from "react-router-dom";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post("/auth/admin/login", {
        email: email.trim(),
        password: password,
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("admin", JSON.stringify(response.data.admin));
      localStorage.setItem("role", "admin");
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col page-enter">
      {/* Mobile Header */}
      <div className="mobile-header border-b-0">
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
        <span className="font-bold text-gray-800 text-lg">Admin Panel</span>
        <div className="w-10"></div>
      </div>

      <div className="mobile-content flex flex-col justify-center -mt-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 border border-gray-200">
            ⚙️
          </div>
          <h2 className="text-2xl font-bold text-gray-900">System Admin</h2>
          <p className="text-gray-500">Authorized personnel only</p>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mobile-input focus:border-gray-500 focus:ring-gray-200"
              placeholder="admin@arena.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mobile-input focus:border-gray-500 focus:ring-gray-200"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary bg-gray-800 shadow-gray-300 mt-4 active:bg-gray-900"
          >
            {loading ? "Authenticating..." : "Admin Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
