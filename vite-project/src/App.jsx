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

// Import Admin Components
import AdminDashboard from "./components/admin/AdminDashboard";
import ArenasManagement from "./components/admin/ArenasManagement";
import UsersManagement from "./components/admin/UsersManagement";
import OwnersManagement from "./components/admin/OwnersManagement";
import FinancialReports from "./components/admin/FinancialReports";
import CommissionPayments from "./components/admin/CommisionPayments";
import AdminLayout from "./components/admin/AdminLayout";

// Test admin credentials
const TEST_ADMIN = {
  username: 'admin',
  email: 'admin@arenafinder.com',
  password: 'admin123',
  name: 'System Administrator',
  role: 'admin'
};

// --- NEW/MODIFIED LOGIC ---
const getInitialAuthStatus = (role) => {
  return (
    !!localStorage.getItem("token") && localStorage.getItem("userRole") === role
  );
};

function App() {
  // Initialize loggedIn state by checking if a token and a role exist
  // We'll treat any valid token as "logged in" for the user dashboard wrapper
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("token"));

  // Admin authentication state
  const [adminAuthenticated, setAdminAuthenticated] = useState(
    !!localStorage.getItem("adminToken")
  );
  // --- END NEW/MODIFIED LOGIC ---

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

  //user auth wrapper
  const UserAuthWrapper = () => {
    const navigate = useNavigate();

    const handleLogin = () => {
      setLoggedIn(true);
      navigate("/user/dashboard");
    };

    return <UserAuth onLogin={handleLogin} />;
  };

  // Wrapper component for OwnerAuth
  const OwnerAuthWrapper = () => {
    const navigate = useNavigate();

    const handleLogin = (token, userData) => {
      console.log("Owner login successful, updating state...");
      // Update React state
      setLoggedIn(true);

      // Navigate to dashboard
      navigate("/owner/dashboard");
    };

    return <OwnerAuth onLogin={handleLogin} />;
  };

  // Wrapper for AdminAuth
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

  // Wrapper for other auth components
  const AuthWrapper = ({ Component }) => {
    const navigate = useNavigate();

    const handleLogin = () => {
      setLoggedIn(true);
      navigate("/user/dashboard");
    };

    return <Component onLogin={handleLogin} />;
  };

  // Admin Protected Route Component
  const AdminProtectedRoute = ({ children }) => {
    if (!adminAuthenticated) {
      return <Navigate to="/auth/admin" />;
    }
    return children;
  };

  const LoginSelection = () => {
    const navigate = useNavigate();

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Indoor Booking System
          </h1>
          <p className="text-gray-600">Choose how you want to login</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
          <button
            onClick={() => navigate("/auth/user")}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">👤</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">User Login</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Book arenas as a player
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate("/auth/owner")}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">🏢</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Owner Login</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your arena business
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate("/auth/admin")}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center">
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">⚙️</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Admin Login</h3>
                <p className="text-sm text-gray-600 mt-1">
                  System administration
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate("/auth/manager")}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center">
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">👨‍💼</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Manager Login</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Manage arena operations
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate("/auth/guest")}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center">
              <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">👁️</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Guest View</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Preview without login
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  };

  // User Dashboard Layout
  const UserDashboard = () => {
    const navigate = useNavigate();
    const [currentTab, setCurrentTab] = useState("home");

    const handleLogout = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      setLoggedIn(false);
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
                  Indoor Booking
                </button>
                <div className="ml-8 flex space-x-4">
                  <button
                    onClick={() => setCurrentTab("home")}
                    className={`px-3 py-2 rounded-lg ${currentTab === "home"
                      ? "bg-primary-100 text-primary-700"
                      : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    Home
                  </button>
                  <button
                    onClick={() => setCurrentTab("teams")}
                    className={`px-3 py-2 rounded-lg ${currentTab === "teams"
                      ? "bg-primary-100 text-primary-700"
                      : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    Teams
                  </button>
                  <button
                    onClick={() => setCurrentTab("booking")}
                    className={`px-3 py-2 rounded-lg ${currentTab === "booking"
                      ? "bg-primary-100 text-primary-700"
                      : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    Booking
                  </button>
                  <button
                    onClick={() => setCurrentTab("profile")}
                    className={`px-3 py-2 rounded-lg ${currentTab === "profile"
                      ? "bg-primary-100 text-primary-700"
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
        <Route
          path="/auth/manager"
          element={<AuthWrapper Component={ManagerAuth} />}
        />
        <Route
          path="/auth/guest"
          element={<AuthWrapper Component={GuestAuth} />}
        />

        {/* Protected User Routes */}
        <Route
          path="/user/dashboard"
          element={loggedIn ? <UserDashboard /> : <Navigate to="/" />}
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