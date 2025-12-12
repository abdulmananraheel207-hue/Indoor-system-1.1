// App.jsx - COMPLETE VERSION WITH ADMIN ROUTES
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginSelector from "./pages/LoginSelector";
import MainApp from "./pages/MainApp";
import UserLogin from "./components/Auth/UserLogin";
import UserRegister from "./components/Auth/UserRegister";
import OwnerLogin from "./components/Auth/OwnerLogin";
import OwnerRegister from "./components/Auth/OwnerRegister";
import OwnerDashboard from "./pages/OwnerDashboard";
import ManagerLogin from "./pages/ManagerLogin";
import ManagerDashboard from "./pages/ManagerDashboard";

// Admin Components
import AdminLogin from "./components/Auth/AdminLogin";
import AdminLayout from "./components/Admin/AdminLayout";
import AdminDashboard from "./components/Admin/AdminDashboard";
import AdminArenas from "./components/Admin/AdminArena";
import AdminReports from "./components/Admin/AdminReports";

// User Components
import Arenas from "./pages/Arenas";
import Profile from "./pages/Profile";
import Bookings from "./pages/Bookings";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route - Login selector */}
        <Route path="/" element={<LoginSelector />} />

        {/* Main user dashboard */}
        <Route path="/home" element={<MainApp />} />
        <Route path="/dashboard" element={<MainApp />} />

        {/* User auth routes */}
        <Route path="/login" element={<UserLogin />} />
        <Route path="/register" element={<UserRegister />} />

        {/* Owner routes */}
        <Route path="/owner/login" element={<OwnerLogin />} />
        <Route path="/owner/register" element={<OwnerRegister />} />
        <Route path="/owner/dashboard" element={<OwnerDashboard />} />

        {/* Manager routes */}
        <Route path="/manager/login" element={<ManagerLogin />} />
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin Protected Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="arenas" element={<AdminArenas />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>

        {/* Feature routes */}
        <Route path="/arenas" element={<Arenas />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/bookings" element={<Bookings />} />

        {/* Add a catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;