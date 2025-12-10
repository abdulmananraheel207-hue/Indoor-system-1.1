import React, { useState } from "react";
import UserLogin from "./UserLogin";
import UserRegister from "./UserRegister";
import OwnerLogin from "./OwnerLogin";
import OwnerRegister from "./OwnerRegister";
import AdminLogin from "./AdminLogin";
import ManagerLogin from "./ManagerLogin";

const LoginSelector = () => {
  const [selectedRole, setSelectedRole] = useState("user");
  const [isLogin, setIsLogin] = useState(true);

  const roles = [
    { id: "user", label: "Player/User", icon: "👤" },
    { id: "owner", label: "Arena Owner", icon: "🏟️" },
    { id: "admin", label: "Admin", icon: "⚙️" },
    { id: "manager", label: "Manager", icon: "👔" },
    { id: "guest", label: "Continue as Guest", icon: "🎮" },
  ];

  const handleGuestLogin = () => {
    // Redirect to main app without authentication
    window.location.href = "/home";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Left Side - Role Selection */}
          <div className="md:w-1/3 bg-gradient-to-b from-blue-600 to-teal-600 p-8 text-white">
            <h2 className="text-3xl font-bold mb-2">Welcome Back!</h2>
            <p className="text-blue-100 mb-8">
              Choose how you want to access the platform
            </p>

            <div className="space-y-3">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => {
                    if (role.id === "guest") {
                      handleGuestLogin();
                    } else {
                      setSelectedRole(role.id);
                      if (role.id === "admin" || role.id === "manager") {
                        setIsLogin(true); // Only login for admin/manager
                      }
                    }
                  }}
                  className={`w-full flex items-center p-3 rounded-lg transition-all ${
                    selectedRole === role.id
                      ? "bg-white/20 border-2 border-white"
                      : "hover:bg-white/10"
                  }`}
                >
                  <span className="text-2xl mr-3">{role.icon}</span>
                  <span className="font-medium">{role.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-10">
              <h3 className="font-bold text-lg mb-3">About the Platform</h3>
              <p className="text-sm text-blue-100">
                Book indoor sports arenas for cricket, futsal, padel, and
                badminton. Find the best courts, compare prices, and book
                instantly!
              </p>
            </div>
          </div>

          {/* Right Side - Login/Register Form */}
          <div className="md:w-2/3 p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {selectedRole === "user" &&
                    (isLogin ? "Player Login" : "Player Registration")}
                  {selectedRole === "owner" &&
                    (isLogin
                      ? "Arena Owner Login"
                      : "Arena Owner Registration")}
                  {selectedRole === "admin" && "Admin Login"}
                  {selectedRole === "manager" && "Manager Login"}
                </h1>
                <p className="text-gray-600">
                  {selectedRole === "user" &&
                    "Book your favorite sports arenas"}
                  {selectedRole === "owner" && "Manage your arena and bookings"}
                  {selectedRole === "admin" && "Platform administration"}
                  {selectedRole === "manager" &&
                    "Staff access for arena management"}
                </p>
              </div>

              {(selectedRole === "user" || selectedRole === "owner") && (
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setIsLogin(true)}
                    className={`px-4 py-2 rounded-md font-medium ${
                      isLogin ? "bg-white shadow" : "text-gray-600"
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setIsLogin(false)}
                    className={`px-4 py-2 rounded-md font-medium ${
                      !isLogin ? "bg-white shadow" : "text-gray-600"
                    }`}
                  >
                    Register
                  </button>
                </div>
              )}
            </div>

            {/* Render appropriate form */}
            {selectedRole === "user" && isLogin && <UserLogin />}
            {selectedRole === "user" && !isLogin && <UserRegister />}
            {selectedRole === "owner" && isLogin && <OwnerLogin />}
            {selectedRole === "owner" && !isLogin && <OwnerRegister />}
            {selectedRole === "admin" && <AdminLogin />}
            {selectedRole === "manager" && <ManagerLogin />}

            {/* Guest message */}
            {selectedRole === "guest" && (
              <div className="text-center py-12">
                <div className="text-6xl mb-6">🎮</div>
                <h2 className="text-2xl font-bold mb-4">Continue as Guest</h2>
                <p className="text-gray-600 mb-8">
                  You can browse arenas, check availability, and view prices.
                  Register to book courts and access all features.
                </p>
                <button
                  onClick={handleGuestLogin}
                  className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-8 py-3 rounded-lg font-bold text-lg hover:opacity-90 transition"
                >
                  Explore Arenas Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginSelector;
