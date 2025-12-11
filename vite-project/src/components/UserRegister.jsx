import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const UserRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone_number: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "phone_number" ? value.replace(/\D/g, "") : value,
    });
    if (errors[name] || errors.api)
      setErrors({ ...errors, [name]: "", api: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/user/register",
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone_number: formData.phone_number,
        }
      );

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.setItem("role", "user");
      navigate("/dashboard", { state: { registerSuccess: true } });
    } catch (error) {
      setErrors({ api: error.response?.data?.error || "Registration failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col page-enter">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button
          onClick={() => navigate("/login")}
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
        <span className="font-bold text-gray-800 text-lg">Create Account</span>
        <div className="w-10"></div>
      </div>

      <div className="mobile-content">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Get Started</h2>
        <p className="text-gray-500 mb-6">Create your player profile</p>

        {errors.api && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100">
            {errors.api}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="mobile-input"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mobile-input"
              placeholder="name@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">
              Phone
            </label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              className="mobile-input"
              placeholder="03001234567"
              maxLength="11"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="mobile-input"
              placeholder="Minimum 6 chars"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`mobile-input ${
                errors.confirmPassword ? "border-red-500" : ""
              }`}
              placeholder="Repeat password"
              required
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1 ml-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <div className="flex items-start py-2">
            <input
              type="checkbox"
              id="terms"
              className="w-5 h-5 text-blue-600 rounded mt-0.5"
              required
            />
            <label
              htmlFor="terms"
              className="ml-3 text-sm text-gray-600 leading-tight"
            >
              I agree to the{" "}
              <span className="text-blue-600">Terms of Service</span> and{" "}
              <span className="text-blue-600">Privacy Policy</span>
            </label>
          </div>

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6 mb-4">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 font-bold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default UserRegister;
