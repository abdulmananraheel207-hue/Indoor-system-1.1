import React from "react";
import { useNavigate } from "react-router-dom";

const LoginSelector = () => {
  const navigate = useNavigate();

  const roles = [
    {
      id: "player",
      label: "Player",
      sub: "Book courts & play",
      icon: "⚽",
      route: "/login",
      color: "bg-blue-50 text-blue-600",
    },
    {
      id: "owner",
      label: "Arena Owner",
      sub: "Manage your venue",
      icon: "🏟️",
      route: "/owner/login",
      color: "bg-green-50 text-green-600",
    },
    {
      id: "manager",
      label: "Manager",
      sub: "Staff access",
      icon: "👔",
      route: "/manager/login",
      color: "bg-purple-50 text-purple-600",
    },
    {
      id: "admin",
      label: "Admin",
      sub: "System control",
      icon: "⚙️",
      route: "/admin/login",
      color: "bg-gray-50 text-gray-600",
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col page-enter">
      {/* Hero Section */}
      <div className="pt-12 pb-6 px-6 bg-gradient-to-b from-blue-600 to-blue-500 rounded-b-[2.5rem] shadow-xl text-center z-10">
        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4 shadow-inner">
          🏆
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Sports Arena</h1>
        <p className="text-blue-100 text-sm">Select your role to continue</p>
      </div>

      {/* Role List */}
      <div className="flex-1 -mt-4 px-5 pb-8 overflow-y-auto space-y-3">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => navigate(role.route)}
            className="role-card w-full group"
          >
            <div
              className={`w-12 h-12 rounded-xl ${role.color} flex items-center justify-center text-2xl shadow-sm group-active:scale-110 transition-transform`}
            >
              {role.icon}
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-bold text-gray-800 text-lg leading-tight">
                {role.label}
              </h3>
              <p className="text-xs text-gray-500 font-medium">{role.sub}</p>
            </div>
            <div className="text-gray-300">
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
                  d="M9 5l7 7-7 7"
                ></path>
              </svg>
            </div>
          </button>
        ))}

        {/* Guest Option */}
        <div className="pt-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full py-4 text-center text-gray-500 font-medium text-sm hover:text-blue-600 transition-colors"
          >
            Just browsing? <span className="underline">Continue as Guest</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginSelector;
