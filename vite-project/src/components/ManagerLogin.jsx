import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ManagerLogin = () => {
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState("email");
  const [formData, setFormData] = useState({
    email: "",
    phone_number: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleMethodChange = (method) => {
    setLoginMethod(method);
    setError("");
    setFormData({ ...formData, email: "", phone_number: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        password: formData.password,
        ...(loginMethod === "email"
          ? { email: formData.email }
          : { phone_number: formData.phone_number }),
      };

      const response = await axios.post(
        "http://localhost:5000/api/auth/manager/login",
        payload
      );
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("manager", JSON.stringify(response.data.manager));
      localStorage.setItem("role", "manager");
      navigate("/manager/dashboard", { state: { loginSuccess: true } });
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
        <span className="font-bold text-gray-800 text-lg">Staff Login</span>
        <div className="w-10"></div>
      </div>

      <div className="mobile-content flex flex-col justify-center">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
            👔
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Manager Access</h2>
          <p className="text-gray-500">Staff portal login</p>
        </div>

        {/* Mobile Segmented Control */}
        <div className="bg-gray-100 p-1 rounded-xl flex mb-6">
          <button
            onClick={() => handleMethodChange("email")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              loginMethod === "email"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-500"
            }`}
          >
            Email
          </button>
          <button
            onClick={() => handleMethodChange("phone")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              loginMethod === "phone"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-500"
            }`}
          >
            Phone
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {loginMethod === "email" ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">
                Manager Email
              </label>
              <input
                type="email"
                className="mobile-input focus:border-purple-500 focus:ring-purple-100"
                placeholder="manager@arena.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">
                Phone Number
              </label>
              <input
                type="tel"
                className="mobile-input focus:border-purple-500 focus:ring-purple-100"
                placeholder="03001234567"
                value={formData.phone_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    phone_number: e.target.value.replace(/\D/g, ""),
                  })
                }
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">
              Password
            </label>
            <input
              type="password"
              className="mobile-input focus:border-purple-500 focus:ring-purple-100"
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
            className="btn-primary bg-purple-600 shadow-purple-200 mt-4"
          >
            {loading ? "Verifying..." : "Manager Login"}
          </button>
        </form>

        <div className="mt-auto pt-8 text-center px-4">
          <p className="text-xs text-gray-400">
            Access restricted to authorized staff only. Contact your arena owner
            for credentials.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ManagerLogin;
