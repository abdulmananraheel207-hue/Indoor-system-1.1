import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const MainApp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    if (location.state?.loginSuccess || location.state?.registerSuccess) {
      setShowSuccessMessage(true);
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
        navigate(location.pathname, { replace: true, state: {} });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    try {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");
      const role = localStorage.getItem("role");

      if (token && user && role === "user") {
        setIsLoggedIn(true);
        setUserData(JSON.parse(user));
      } else {
        setIsLoggedIn(false);
        setUserData(null);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsLoggedIn(false);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginRedirect = () => {
    navigate("/login");
  };

  const handleRegisterRedirect = () => {
    navigate("/register");
  };

  const handleBrowseArenas = () => {
    if (isLoggedIn) {
      navigate("/arenas");
    } else {
      handleRegisterRedirect();
    }
  };


  const handleLogout = () => {
    const token = localStorage.getItem("token");

    if (token) {
      fetch("http://localhost:5000/api/auth/user/logout", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }).catch(err => console.error("Logout API error:", err));
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");

    setIsLoggedIn(false);
    setUserData(null);

    // Navigate to root ("/") instead of "/login"
    navigate("/");
  };

  const handleProfile = () => {
    if (isLoggedIn) {
      navigate("/profile");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="text-2xl font-bold text-blue-600 mr-2">🏟️</div>
            <h1 className="text-xl font-bold text-gray-800">
              Indoor Sports Arena
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
              <>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-800">
                      Welcome, {userData?.name || "User"}!
                    </p>
                    <p className="text-xs text-gray-500">{userData?.email}</p>
                  </div>
                  <button
                    onClick={handleProfile}
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
                    title="Profile"
                  >
                    👤
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={handleLoginRedirect}
                  className="px-4 py-2 text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition"
                >
                  Login
                </button>
                <button
                  onClick={handleRegisterRedirect}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {isLoggedIn ? `Welcome back, ${userData?.name}!` : "Welcome to Indoor Booking System"}
          </h2>
          <p className="text-gray-600">
            {isLoggedIn
              ? "Explore arenas, book courts, and manage your activities."
              : "You're browsing as a guest. Register to book courts and access all features."}
          </p>

          {showSuccessMessage && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <span className="text-green-600 mr-2">
                  {location.state?.loginSuccess ? "✅" : "🎉"}
                </span>
                <p className="text-green-700 font-medium">
                  {location.state?.loginSuccess
                    ? "Login successful!"
                    : "Registration successful! Welcome to our platform."}
                </p>
              </div>
            </div>
          )}
        </div>

        {isLoggedIn && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg mr-4">
                  <span className="text-blue-600 text-xl">📅</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Upcoming Bookings</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg mr-4">
                  <span className="text-green-600 text-xl">⭐</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="text-lg font-bold">Today</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg mr-4">
                  <span className="text-purple-600 text-xl">🎯</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Favorite Sport</p>
                  <p className="text-lg font-bold">Not set</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-10">
          <h3 className="text-lg font-semibold mb-4">Popular Sports</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "Cricket",
              "Futsal",
              "Badminton",
              "Padel",
              "Tennis",
              "Basketball",
              "Squash",
              "Volleyball",
            ].map((sport) => (
              <div
                key={sport}
                className="bg-white rounded-lg shadow p-4 text-center hover:shadow-md transition cursor-pointer"
                onClick={() => {
                  if (isLoggedIn) {
                    navigate(`/arenas?sport=${sport.toLowerCase()}`);
                  } else {
                    handleRegisterRedirect();
                  }
                }}
              >
                <div className="text-3xl mb-2">
                  {sport === "Cricket" && "🏏"}
                  {sport === "Futsal" && "⚽"}
                  {sport === "Badminton" && "🏸"}
                  {sport === "Padel" && "🎾"}
                  {sport === "Tennis" && "🎾"}
                  {sport === "Basketball" && "🏀"}
                  {sport === "Squash" && "🎯"}
                  {sport === "Volleyball" && "🏐"}
                </div>
                <h4 className="font-medium">{sport}</h4>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Available Arenas</h3>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 mb-4">
              {isLoggedIn
                ? "Browse our premium arenas and book your favorite courts. Check real-time availability and prices."
                : "Register now to view available arenas, check prices, and book time slots instantly."}
            </p>
            <div className="flex space-x-4">
              <button
                onClick={handleBrowseArenas}
                className="bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 transition"
              >
                {isLoggedIn ? "Browse Arenas" : "Register to Book Now"}
              </button>

              {isLoggedIn && (
                <button
                  onClick={() => navigate('/bookings')}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition"
                >
                  View My Bookings
                </button>
              )}
            </div>
          </div>
        </div>

        {isLoggedIn && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/book')}
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-left"
              >
                <div className="text-2xl mb-2">➕</div>
                <h4 className="font-medium mb-1">New Booking</h4>
                <p className="text-sm text-gray-500">Book a court instantly</p>
              </button>

              <button
                onClick={() => navigate('/profile')}
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-left"
              >
                <div className="text-2xl mb-2">👤</div>
                <h4 className="font-medium mb-1">My Profile</h4>
                <p className="text-sm text-gray-500">Update personal info</p>
              </button>

              <button
                onClick={() => navigate('/arenas')}
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-left"
              >
                <div className="text-2xl mb-2">🏟️</div>
                <h4 className="font-medium mb-1">All Arenas</h4>
                <p className="text-sm text-gray-500">Explore venues</p>
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p>© 2024 Indoor Booking System. All rights reserved.</p>
          <p className="text-sm text-gray-400 mt-2">
            {isLoggedIn
              ? `Logged in as ${userData?.email} • Full access enabled`
              : "Guest access - Limited features available"}
          </p>
          <div className="mt-4 space-x-4">
            <a href="#" className="text-sm text-gray-300 hover:text-white">About</a>
            <a href="#" className="text-sm text-gray-300 hover:text-white">Contact</a>
            <a href="#" className="text-sm text-gray-300 hover:text-white">Terms</a>
            <a href="#" className="text-sm text-gray-300 hover:text-white">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainApp;