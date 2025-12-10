import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const OwnerLogin = () => {
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState("email");
  const [formData, setFormData] = useState({
    email: "",
    phone_number: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleLoginMethodChange = (method) => {
    setLoginMethod(method);
    if (method === "email") {
      setFormData({
        ...formData,
        phone_number: "",
      });
    } else {
      setFormData({
        ...formData,
        email: "",
      });
    }
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone_number") {
      const digitsOnly = value.replace(/\D/g, '');
      setFormData({
        ...formData,
        [name]: digitsOnly,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
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

  const validateForm = () => {
    const newErrors = {};

    if (loginMethod === "email") {
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    } else {
      if (!formData.phone_number.trim()) {
        newErrors.phone_number = "Phone number is required";
      } else if (formData.phone_number.length < 10) {
        newErrors.phone_number = "Phone number must be at least 10 digits";
      } else if (formData.phone_number.length > 15) {
        newErrors.phone_number = "Phone number is too long";
      }
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

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
    setErrors({});

    try {
      const loginData = {
        password: formData.password
      };

      if (loginMethod === "email") {
        loginData.email = formData.email.trim();
      } else {
        loginData.phone_number = formData.phone_number;
      }

      const response = await axios.post(
        "http://localhost:5000/api/auth/owner/login",
        loginData
      );

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("owner", JSON.stringify(response.data.owner));
      localStorage.setItem("role", "owner");

      navigate("/owner/dashboard", { state: { loginSuccess: true } });
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
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
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
        Arena Owner Login
      </h2>

      <div className="flex mb-6 border-b">
        <button
          type="button"
          className={`flex-1 py-3 text-center font-medium ${loginMethod === "email"
              ? "text-green-600 border-b-2 border-green-600"
              : "text-gray-500 hover:text-gray-700"
            }`}
          onClick={() => handleLoginMethodChange("email")}
        >
          Login with Email
        </button>
        <button
          type="button"
          className={`flex-1 py-3 text-center font-medium ${loginMethod === "phone"
              ? "text-green-600 border-b-2 border-green-600"
              : "text-gray-500 hover:text-gray-700"
            }`}
          onClick={() => handleLoginMethodChange("phone")}
        >
          Login with Phone
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {errors.api && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {errors.api}
          </div>
        )}

        {loginMethod === "email" ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${errors.email ? "border-red-500" : "border-gray-300"
                }`}
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${errors.phone_number ? "border-red-500" : "border-gray-300"
                }`}
              placeholder="Enter your phone number"
              maxLength="15"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter digits only (e.g., 3001234567)
            </p>
            {errors.phone_number && (
              <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password *
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${errors.password ? "border-red-500" : "border-gray-300"
              }`}
            placeholder="Enter your password"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
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