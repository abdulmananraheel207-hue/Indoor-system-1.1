import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import UserAuth from "./components/auth/UserAuth";
import OwnerAuth from "./components/auth/OwnerAuth";
import AdminAuth from "./components/auth/AdminAuth";
import ManagerAuth from "./components/auth/ManagerAuth";
import GuestAuth from "./components/auth/GuestAuth";
import UserHome from "./components/user/UserHome";
import UserTeams from "./components/user/UserTeams";
import UserBooking from "./components/user/UserBooking";
import UserProfile from "./components/user/UserProfile";
import OwnerDashboard from "./components/owner/OwnerDashboard";

// Import the new OwnerRegistration component
import OwnerRegistration from "./components/owner/OwnerRegistration";

// Import Admin Components
import AdminDashboard from "./components/admin/AdminDashboard";
import ArenasManagement from "./components/admin/ArenasManagement";
import UsersManagement from "./components/admin/UsersManagement";
import OwnersManagement from "./components/admin/OwnersManagement";
import FinancialReports from "./components/admin/FinancialReports";
import CommissionPayments from "./components/admin/CommisionPayments";
import AdminLayout from "./components/admin/AdminLayout";

// Import Manager Components
import ManagerDashboard from "./components/manager/ManagerDashboard";

// Import new User Components
import UserArenaDetails from "./components/user/UserArenaDetails";
import UserBookingChat from "./components/user/UserBookingChat";
import UserTournament from "./components/user/UserTournament";

// Test admin credentials
const TEST_ADMIN = {
  username: "admin",
  email: "admin@arenafinder.com",
  password: "admin123",
  name: "System Administrator",
  role: "admin",
};

// Helper function to check authentication status
const getInitialAuthStatus = (role) => {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole");

  // Check for admin separately
  if (role === "admin") {
    return !!localStorage.getItem("adminToken");
  }

  // Check for regular roles
  return !!token && userRole === role;
};

function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("token"));
  const [adminAuthenticated, setAdminAuthenticated] = useState(
    !!localStorage.getItem("adminToken")
  );

  // Admin login handler
  const handleAdminLogin = (credentials) => {
    // Simple test authentication
    if (
      credentials.username === TEST_ADMIN.username &&
      credentials.password === TEST_ADMIN.password
    ) {
      localStorage.setItem("adminToken", "test-token-123");
      localStorage.setItem("adminUser", JSON.stringify(TEST_ADMIN));
      localStorage.setItem("userRole", "admin");
      setAdminAuthenticated(true);
      return true;
    }
    return false;
  };

  // Admin logout handler
  const handleAdminLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    localStorage.removeItem("userRole");
    setAdminAuthenticated(false);
  };

  // General logout handler for all roles except admin
  const handleGeneralLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("ownerData");
    localStorage.removeItem("managerData");
    setLoggedIn(false);
  };

  //user auth wrapper
  const UserAuthWrapper = () => {
    const navigate = useNavigate();

    const handleLogin = () => {
      // Use callback to ensure state is updated before navigation
      setLoggedIn((prev) => {
        navigate("/user/dashboard");
        return true;
      });
    };

    return <UserAuth onLogin={handleLogin} />;
  };

  // Owner auth wrapper - updated to handle registration
  const OwnerAuthWrapper = () => {
    const navigate = useNavigate();

    const handleLogin = (token, ownerData) => {
      setLoggedIn(true);
      setTimeout(() => {
        navigate("/owner/dashboard");
      }, 100);
    };

    return <OwnerAuth onLogin={handleLogin} />;
  };

  // App.jsx - Update ManagerAuthWrapper:

  const ManagerAuthWrapper = () => {
    const navigate = useNavigate();

    const handleLogin = () => {
      setLoggedIn((prev) => {
        navigate("/manager/dashboard");
        return true;
      });
    };

    return <ManagerAuth onLogin={handleLogin} />;
  };

  // Admin auth wrapper
  const AdminAuthWrapper = () => {
    const navigate = useNavigate();

    const handleLogin = (credentials) => {
      const success = handleAdminLogin(credentials);
      if (success) {
        navigate("/admin/dashboard");
      }
      return success;
    };

    return <AdminAuth onLogin={handleLogin} />;
  };

  // Guest auth wrapper
  const GuestAuthWrapper = () => {
    const navigate = useNavigate();

    const handleLogin = () => {
      setLoggedIn(true);
      navigate("/user/dashboard");
    };

    return <GuestAuth onLogin={handleLogin} />;
  };

  // Admin Protected Route Component
  const AdminProtectedRoute = ({ children }) => {
    if (!adminAuthenticated) {
      return <Navigate to="/auth/admin" />;
    }
    return children;
  };

  // Login Selection Component - Updated with new registration option
  const LoginSelection = () => {
    const navigate = useNavigate();

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ArenaFinder Pro
          </h1>
          <p className="text-gray-600">
            Your Complete Sports Arena Management Solution
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
          {/* User Login Card */}
          <button
            onClick={() => navigate("/auth/user")}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-left border border-gray-100"
          >
            <div className="flex items-center">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">👤</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Player Login</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Book courts, join teams, play sports
                </p>
              </div>
            </div>
          </button>

          {/* Arena Owner Registration Card */}
          <button
            onClick={() => navigate("/owner/register")}
            className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-left border border-green-100"
          >
            <div className="flex items-center">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl text-green-600">🏢</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Register Arena</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Start your arena business with us
                </p>
                <span className="inline-block mt-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                  New Business
                </span>
              </div>
            </div>
          </button>

          {/* Arena Owner Login Card */}
          <button
            onClick={() => navigate("/auth/owner")}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-left border border-gray-100"
          >
            <div className="flex items-center">
              <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Owner Portal</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Manage bookings, revenue & staff
                </p>
              </div>
            </div>
          </button>

          {/* Admin Login Card */}
          <button
            onClick={() => navigate("/auth/admin")}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-left border border-gray-100"
          >
            <div className="flex items-center">
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">⚙️</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Admin Portal</h3>
                <p className="text-sm text-gray-600 mt-1">
                  System administration & monitoring
                </p>
              </div>
            </div>
          </button>

          {/* Manager Login Card */}
          <button
            onClick={() => navigate("/auth/manager")}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-left border border-gray-100"
          >
            <div className="flex items-center">
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">👨‍💼</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Manager Portal</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Handle arena operations & schedules
                </p>
              </div>
            </div>
          </button>

          {/* Guest View Card */}
          <button
            onClick={() => navigate("/auth/guest")}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-left border border-gray-100"
          >
            <div className="flex items-center">
              <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">👁️</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Guest Preview</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Explore features without login
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Information Section */}
        <div className="mt-12 max-w-2xl text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4">
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">🏆</span>
              </div>
              <h4 className="font-medium text-gray-900">Multiple Sports</h4>
              <p className="text-sm text-gray-600 mt-1">
                Badminton, Tennis, Squash & more
              </p>
            </div>

            <div className="p-4">
              <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">💰</span>
              </div>
              <h4 className="font-medium text-gray-900">Revenue Management</h4>
              <p className="text-sm text-gray-600 mt-1">
                Track earnings & commissions
              </p>
            </div>

            <div className="p-4">
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">📱</span>
              </div>
              <h4 className="font-medium text-gray-900">Mobile Friendly</h4>
              <p className="text-sm text-gray-600 mt-1">
                Access from any device
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} ArenaFinder Pro. All rights reserved.
          </p>
          <div className="mt-2 space-x-4">
            <a href="#" className="text-sm text-blue-600 hover:text-blue-800">
              Terms of Service
            </a>
            <a href="#" className="text-sm text-blue-600 hover:text-blue-800">
              Privacy Policy
            </a>
            <a href="#" className="text-sm text-blue-600 hover:text-blue-800">
              Contact Support
            </a>
          </div>
        </div>
      </div>
    );
  };

  // User Dashboard Layout
  const UserDashboard = () => {
    const navigate = useNavigate();
    const [currentTab, setCurrentTab] = useState("home");

    const handleLogout = () => {
      handleGeneralLogout();
      navigate("/");
    };

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Simple Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => navigate("/")}
                  className="text-xl font-bold text-gray-900"
                >
                  ArenaFinder Pro
                </button>
                <div className="ml-8 flex space-x-4">
                  <button
                    onClick={() => setCurrentTab("home")}
                    className={`px-3 py-2 rounded-lg ${
                      currentTab === "home"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Home
                  </button>
                  <button
                    onClick={() => setCurrentTab("teams")}
                    className={`px-3 py-2 rounded-lg ${
                      currentTab === "teams"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Teams
                  </button>
                  <button
                    onClick={() => setCurrentTab("booking")}
                    className={`px-3 py-2 rounded-lg ${
                      currentTab === "booking"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Booking
                  </button>
                  <button
                    onClick={() => setCurrentTab("profile")}
                    className={`px-3 py-2 rounded-lg ${
                      currentTab === "profile"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Profile
                  </button>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main>
          {currentTab === "home" && <UserHome />}
          {currentTab === "teams" && <UserTeams />}
          {currentTab === "booking" && <UserBooking />}
          {currentTab === "profile" && <UserProfile />}
        </main>
      </div>
    );
  };

  // Admin Layout Wrapper
  const AdminWrapper = () => {
    return (
      <AdminLayout onLogout={handleAdminLogout}>
        <Routes>
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="arenas" element={<ArenasManagement />} />
          <Route path="users" element={<UsersManagement />} />
          <Route path="owners" element={<OwnersManagement />} />
          <Route path="financial-reports" element={<FinancialReports />} />
          <Route path="commission-payments" element={<CommissionPayments />} />
        </Routes>
      </AdminLayout>
    );
  };

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LoginSelection />} />
        <Route path="/auth/user" element={<UserAuthWrapper />} />
        <Route path="/auth/owner" element={<OwnerAuthWrapper />} />
        <Route path="/auth/admin" element={<AdminAuthWrapper />} />
        <Route path="/auth/manager" element={<ManagerAuthWrapper />} />
        <Route path="/auth/guest" element={<GuestAuthWrapper />} />

        {/* New Owner Registration Route */}
        <Route path="/owner/register" element={<OwnerRegistration />} />

        {/* Protected User Routes */}
        <Route
          path="/user/dashboard"
          element={
            getInitialAuthStatus("user") ? (
              <UserDashboard />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        {/* New User Routes */}
        <Route
          path="/user/arenas/:arenaId"
          element={
            getInitialAuthStatus("user") ? (
              <UserArenaDetails />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/user/bookings/:bookingId/chat"
          element={
            getInitialAuthStatus("user") ? (
              <UserBookingChat />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/user/tournaments/create"
          element={
            getInitialAuthStatus("user") ? (
              <UserTournament />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        {/* Protected Owner Routes */}
        <Route
          path="/owner/dashboard"
          element={
            getInitialAuthStatus("owner") ? (
              <OwnerDashboard />
            ) : (
              <Navigate to="/auth/owner" />
            )
          }
        />

        {/* Protected Manager Routes */}
        <Route
          path="/manager/dashboard"
          element={
            getInitialAuthStatus("manager") ? (
              <ManagerDashboard />
            ) : (
              <Navigate to="/auth/manager" />
            )
          }
        />

        {/* Protected Admin Routes */}
        <Route
          path="/admin/*"
          element={
            adminAuthenticated ? (
              <AdminWrapper />
            ) : (
              <Navigate to="/auth/admin" />
            )
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
