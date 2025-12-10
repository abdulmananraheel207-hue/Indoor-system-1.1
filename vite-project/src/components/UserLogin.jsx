import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const UserLogin = () => {
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
        "http://localhost:5000/api/auth/user/login",
        loginData
      );

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.setItem("role", "user");

      // Use navigate with state
      navigate("/dashboard", { state: { loginSuccess: true } });
    } catch (error) {
      console.error("Login error:", error);
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
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        User Login
      </h2>

      <div className="flex mb-6 border-b">
        <button
          type="button"
          className={`flex-1 py-3 text-center font-medium ${loginMethod === "email"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
            }`}
          onClick={() => handleLoginMethodChange("email")}
        >
          Login with Email
        </button>
        <button
          type="button"
          className={`flex-1 py-3 text-center font-medium ${loginMethod === "phone"
              ? "text-blue-600 border-b-2 border-blue-600"
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
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.email ? "border-red-500" : "border-gray-300"
                }`}
              placeholder="Enter your email address"
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
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.phone_number ? "border-red-500" : "border-gray-300"
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
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.password ? "border-red-500" : "border-gray-300"
              }`}
            placeholder="Enter your password"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
              Remember me
            </label>
          </div>
          <a href="#" className="text-sm text-blue-600 hover:underline">
            Forgot password?
          </a>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-teal-500 text-white py-3 rounded-lg font-bold hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-center text-gray-600 text-sm">
          Don't have an account?{" "}
          <a href="/register" className="text-blue-600 font-medium hover:underline">
            Register here
          </a>
        </p>
      </form>
    </div>
  );
};

export default UserLogin;