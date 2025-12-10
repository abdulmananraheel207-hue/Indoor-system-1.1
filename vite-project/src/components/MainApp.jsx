// components/MainApp.jsx
import React, { useState } from "react";

const MainApp = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState("guest");

  const handleLoginRedirect = () => {
    window.location.href = "/";
  };

  const handleRegisterRedirect = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="text-2xl font-bold text-blue-600 mr-2">🏟️</div>
            <h1 className="text-xl font-bold text-gray-800">
              Indoor Sports Arena
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            {userRole === "guest" ? (
              <>
                <button
                  onClick={handleLoginRedirect}
                  className="px-4 py-2 text-blue-600 font-medium hover:bg-blue-50 rounded-lg"
                >
                  Login
                </button>
                <button
                  onClick={handleRegisterRedirect}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                >
                  Register
                </button>
              </>
            ) : (
              <div className="text-sm text-gray-600">Welcome, {userRole}!</div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome to Indoor Booking System
          </h2>
          <p className="text-gray-600">
            {userRole === "guest"
              ? "You're browsing as a guest. Register to book courts and access all features."
              : "Explore arenas, book courts, and manage your activities."}
          </p>
        </div>

        {/* Sports Categories */}
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
                className="bg-white rounded-lg shadow p-4 text-center hover:shadow-md transition"
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

        {/* Arenas Preview */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Available Arenas</h3>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 mb-4">
              {userRole === "guest"
                ? "Register to view available arenas, check prices, and book time slots."
                : "Browse arenas and book your favorite courts."}
            </p>
            <button
              onClick={userRole === "guest" ? handleRegisterRedirect : () => {}}
              className="bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 transition"
            >
              {userRole === "guest" ? "Register to Book Now" : "Browse Arenas"}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p>© 2024 Indoor Booking System. All rights reserved.</p>
          <p className="text-sm text-gray-400 mt-2">
            {userRole === "guest"
              ? "Guest access - Limited features available"
              : "Full access enabled"}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainApp;
