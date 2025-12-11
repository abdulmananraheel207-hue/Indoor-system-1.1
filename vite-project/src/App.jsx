// App.jsx - FIXED VERSION
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginSelector from "./components/LoginSelector";
import MainApp from "./components/MainApp";
import UserLogin from "./components/UserLogin";
import UserRegister from "./components/UserRegister";
import OwnerLogin from "./components/OwnerLogin";
import OwnerRegister from "./components/OwnerRegister";
import OwnerDashboard from "./components/OwnerDashboard";
import ManagerLogin from "./components/ManagerLogin";
import ManagerDashboard from "./components/ManagerDashboard";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard"; // ADD THIS IMPORT
import Arenas from "./components/Arenas";
import Profile from "./components/Profile";
import Bookings from "./components/Bookings";
import NotFound from "./components/NotFound";

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
        {/* Admin routes - FIXED */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />{" "}
        {/* CHANGED FROM AdminLogin TO AdminDashboard */}
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
