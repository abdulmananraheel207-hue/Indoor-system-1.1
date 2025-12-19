import React, { useState, useEffect } from "react";
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
import OwnerRegistration from "./components/owner/OwnerRegistration";
import AdminDashboard from "./components/admin/AdminDashboard";
import ArenasManagement from "./components/admin/ArenasManagement";
import UsersManagement from "./components/admin/UsersManagement";
import OwnersManagement from "./components/admin/OwnersManagement";
import FinancialReports from "./components/admin/FinancialReports";
import CommissionPayments from "./components/admin/CommisionPayments";
import AdminLayout from "./components/admin/AdminLayout";
import ManagerDashboard from "./components/manager/ManagerDashboard";
import UserArenaDetails from "./components/user/UserArenaDetails";
import UserBookingChat from "./components/user/UserBookingChat";

// Test admin credentials
const TEST_ADMIN = {
  username: "admin",
  email: "admin@arenafinder.com",
  password: "admin123",
  name: "System Administrator",
  role: "admin",
};

// Custom hook to check authentication status
const useAuth = () => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userRole: null,
    isLoading: true,
  });

  useEffect(() => {
    checkAuthStatus();

    // Listen for storage changes (like when login happens in another tab)
    const handleStorageChange = () => {
      checkAuthStatus();
    };

    window.addEventListener('storage', handleStorageChange);

    // Also check on focus
    window.addEventListener('focus', checkAuthStatus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', checkAuthStatus);
    };
  }, []);

  const checkAuthStatus = () => {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("userRole");
    const adminToken = localStorage.getItem("adminToken");

    if (adminToken) {
      setAuthState({
        isAuthenticated: true,
        userRole: "admin",
        isLoading: false,
      });
    } else if (token && userRole) {
      setAuthState({
        isAuthenticated: true,
        userRole,
        isLoading: false,
      });
    } else {
      setAuthState({
        isAuthenticated: false,
        userRole: null,
        isLoading: false,
      });
    }
  };

  const login = (token, role, userData = null) => {
    localStorage.setItem("token", token);
    localStorage.setItem("userRole", role);
    if (userData) {
      localStorage.setItem("userData", JSON.stringify(userData));
    }
    checkAuthStatus();
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userData");
    localStorage.removeItem("ownerData");
    localStorage.removeItem("managerData");
    setAuthState({
      isAuthenticated: false,
      userRole: null,
      isLoading: false,
    });
  };

  const adminLogin = (token) => {
    localStorage.setItem("adminToken", token);
    localStorage.setItem("userRole", "admin");
    checkAuthStatus();
  };

  const adminLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("userRole");
    setAuthState({
      isAuthenticated: false,
      userRole: null,
      isLoading: false,
    });
  };

  return {
    ...authState,
    login,
    logout,
    adminLogin,
    adminLogout,
    checkAuthStatus,
  };
};

function App() {
  const auth = useAuth();

  // User auth wrapper
  const UserAuthWrapper = () => {
    const navigate = useNavigate();

    const handleLogin = (token, userData) => {
      // Determine role from response or default to 'user'
      const role = userData?.role || "user";
      auth.login(token, role, userData);

      // Small delay to ensure state updates
      setTimeout(() => {
        if (role === "owner") {
          navigate("/owner/dashboard");
        } else if (role === "manager") {
          navigate("/manager/dashboard");
        } else {
          navigate("/user/dashboard");
        }
      }, 50);
    };

    return <UserAuth onLogin={handleLogin} />;
  };

  // Owner auth wrapper
  const OwnerAuthWrapper = () => {
    const navigate = useNavigate();

    const handleLogin = (token, ownerData) => {
      auth.login(token, "owner", ownerData);

      setTimeout(() => {
        navigate("/owner/dashboard");
      }, 50);
    };

    return <OwnerAuth onLogin={handleLogin} />;
  };

  // Manager auth wrapper
  const ManagerAuthWrapper = () => {
    const navigate = useNavigate();

    const handleLogin = (token, managerData) => {
      auth.login(token, "manager", managerData);

      setTimeout(() => {
        navigate("/manager/dashboard");
      }, 50);
    };

    return <ManagerAuth onLogin={handleLogin} />;
  };

  // Admin auth wrapper
  const AdminAuthWrapper = () => {
    const navigate = useNavigate();

    const handleLogin = (credentials) => {
      // Simple test authentication
      if (
        credentials.username === TEST_ADMIN.username &&
        credentials.password === TEST_ADMIN.password
      ) {
        auth.adminLogin("test-token-123");
        setTimeout(() => {
          navigate("/admin/dashboard");
        }, 50);
        return true;
      }
      return false;
    };

    return <AdminAuth onLogin={handleLogin} />;
  };

  // Guest auth wrapper
  const GuestAuthWrapper = () => {
    const navigate = useNavigate();

    const handleLogin = () => {
      // Guest login - create a temporary token
      const tempToken = "guest-" + Date.now();
      auth.login(tempToken, "guest");

      setTimeout(() => {
        navigate("/user/dashboard");
      }, 50);
    };

    return <GuestAuth onLogin={handleLogin} />;
  };

  // Protected Route Component
  const ProtectedRoute = ({ children, requiredRole }) => {
    if (auth.isLoading) {
      return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>;
    }

    if (!auth.isAuthenticated) {
      return <Navigate to="/" />;
    }

    if (requiredRole && auth.userRole !== requiredRole) {
      // Redirect to appropriate dashboard based on actual role
      if (auth.userRole === "owner") {
        return <Navigate to="/owner/dashboard" />;
      } else if (auth.userRole === "manager") {
        return <Navigate to="/manager/dashboard" />;
      } else if (auth.userRole === "admin") {
        return <Navigate to="/admin/dashboard" />;
      } else {
        return <Navigate to="/user/dashboard" />;
      }
    }

    return children;
  };

  // Admin Layout Wrapper
  const AdminWrapper = () => {
    return (
      <AdminLayout onLogout={auth.adminLogout}>
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

  // User Dashboard Layout
  const UserDashboard = () => {
    const navigate = useNavigate();
    const [currentTab, setCurrentTab] = useState("home");

    const handleLogout = () => {
      auth.logout();
      navigate("/");
    };

    return (
      <div className="min-h-screen bg-gray-50">
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
                    className={`px-3 py-2 rounded-lg ${currentTab === "home"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    Home
                  </button>
                  <button
                    onClick={() => setCurrentTab("teams")}
                    className={`px-3 py-2 rounded-lg ${currentTab === "teams"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    Teams
                  </button>
                  <button
                    onClick={() => setCurrentTab("booking")}
                    className={`px-3 py-2 rounded-lg ${currentTab === "booking"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    Booking
                  </button>
                  <button
                    onClick={() => setCurrentTab("profile")}
                    className={`px-3 py-2 rounded-lg ${currentTab === "profile"
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

        <main>
          {currentTab === "home" && <UserHome />}
          {currentTab === "teams" && <UserTeams />}
          {currentTab === "booking" && <UserBooking />}
          {currentTab === "profile" && <UserProfile />}
        </main>
      </div>
    );
  };

  // Login Selection Component
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
        <Route path="/owner/register" element={<OwnerRegistration />} />

        {/* Protected User Routes */}
        <Route
          path="/user/dashboard"
          element={
            <ProtectedRoute requiredRole="user">
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/arenas/:arenaId"
          element={
            <ProtectedRoute requiredRole="user">
              <UserArenaDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/bookings/:bookingId/chat"
          element={
            <ProtectedRoute requiredRole="user">
              <UserBookingChat />
            </ProtectedRoute>
          }
        />

        {/* Protected Owner Routes */}
        <Route
          path="/owner/dashboard"
          element={
            <ProtectedRoute requiredRole="owner">
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected Manager Routes */}
        <Route
          path="/manager/dashboard"
          element={
            <ProtectedRoute requiredRole="manager">
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminWrapper />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;