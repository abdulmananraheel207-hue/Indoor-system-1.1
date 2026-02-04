// // components/admin/AdminDashboard.jsx
// import React, { useState, useEffect } from "react";
// import {
//   BuildingStorefrontIcon,
//   UsersIcon,
//   UserGroupIcon,
//   CurrencyDollarIcon,
//   ChartBarIcon,
//   ArrowTrendingUpIcon,
//   ClockIcon,
//   ExclamationTriangleIcon,
//   ArrowPathIcon,
//   CalendarIcon,
//   CheckCircleIcon,
// } from "@heroicons/react/24/outline";
// import RecentBookings from "./RecentBooking";
// import PendingCommissions from "./PendingCommissions";
// import integrationService from "../../services/integrationService";

// const AdminDashboard = () => {
//   const [dashboardData, setDashboardData] = useState({
//     monthlyCommission: 0,
//     activeArenas: 0,
//     pendingCommissionsCount: 0,
//     totalUsers: 0,
//     totalOwners: 0,
//     totalArenas: 0,
//     totalBookings: 0,
//     totalRevenue: 0,
//     totalPlatformCommission: 0,
//     completedBookings: 0,
//     pendingCommission: 0,
//     recentBookings: [],
//     pendingCommissions: [],
//   });

//   const [loading, setLoading] = useState(true);
//   const [lastUpdated, setLastUpdated] = useState(new Date());
//   const [systemStats, setSystemStats] = useState({});

//   useEffect(() => {
//     loadDashboard();
//   }, []);

//   const loadDashboard = async () => {
//     try {
//       setLoading(true);
//       const data = await integrationService.getAdminDashboard();

//       if (data.success) {
//         setDashboardData({
//           monthlyCommission: data.dashboard?.monthly_commission || 0,
//           activeArenas: data.dashboard?.active_arenas || 0,
//           pendingCommissionsCount: data.dashboard?.pending_commissions_count || 0,
//           totalUsers: data.overall_stats?.total_users || 0,
//           totalOwners: data.overall_stats?.total_owners || 0,
//           totalArenas: data.overall_stats?.total_arenas || 0,
//           totalBookings: data.overall_stats?.completed_bookings || 0,
//           totalRevenue: data.overall_stats?.total_revenue || 0,
//           totalPlatformCommission: data.overall_stats?.total_commission || 0,
//           pendingCommission: data.overall_stats?.pending_commission || 0,
//           recentBookings: data.recent_bookings || [],
//           pendingCommissions: data.pending_commissions || [],
//         });

//         setSystemStats(data.overall_stats || {});
//       }
//     } catch (error) {
//       console.error("Failed to load admin dashboard", error);
//     } finally {
//       setLoading(false);
//       setLastUpdated(new Date());
//     }
//   };

//   const refreshData = () => {
//     loadDashboard();
//   };

//   const handleMarkPaid = async (arenaId, amount) => {
//     if (window.confirm(`Mark Rs ${amount} as paid for this arena?`)) {
//       try {
//         await integrationService.markArenaPayment(arenaId, {
//           amount_paid: amount,
//           payment_date: new Date().toISOString().split('T')[0]
//         });
//         alert("✅ Payment marked as paid successfully!");
//         refreshData();
//       } catch (error) {
//         alert("❌ Failed to mark payment: " + error.message);
//       }
//     }
//   };

//   const stats = [
//     {
//       name: "Monthly Commission",
//       value: `Rs ${dashboardData.monthlyCommission.toLocaleString()}`,
//       icon: CurrencyDollarIcon,
//       color: "bg-green-500",
//       description: "This month's platform commission"
//     },
//     {
//       name: "Active Arenas",
//       value: dashboardData.activeArenas,
//       icon: BuildingStorefrontIcon,
//       color: "bg-blue-500",
//       description: "Currently active arenas"
//     },
//     {
//       name: "Total Users",
//       value: dashboardData.totalUsers,
//       icon: UsersIcon,
//       color: "bg-purple-500",
//       description: "Registered players"
//     },
//     {
//       name: "Total Owners",
//       value: dashboardData.totalOwners,
//       icon: UserGroupIcon,
//       color: "bg-yellow-500",
//       description: "Arena owners"
//     },
//     {
//       name: "Pending Commissions",
//       value: dashboardData.pendingCommissionsCount,
//       icon: ExclamationTriangleIcon,
//       color: "bg-red-500",
//       description: "Unpaid commissions"
//     },
//     {
//       name: "Total Revenue",
//       value: `Rs ${(dashboardData.totalRevenue || 0).toLocaleString()}`,
//       icon: ChartBarIcon,
//       color: "bg-indigo-500",
//       description: "Platform revenue"
//     },
//   ];

//   if (loading) {
//     return (
//       <div className="flex flex-col justify-center items-center h-96">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
//         <p className="mt-4 text-gray-600">Loading dashboard data...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">
//             Admin Dashboard
//           </h1>
//           <p className="text-gray-600">
//             Welcome back! Here's what's happening with your platform today.
//           </p>
//           <p className="text-xs text-gray-400 mt-1">
//             Last updated: {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
//           </p>
//         </div>
//         <button
//           onClick={refreshData}
//           className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
//         >
//           <ArrowPathIcon className="h-4 w-4 mr-2" />
//           Refresh
//         </button>
//       </div>

//       {/* Stats Grid */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
//         {stats.map((stat) => (
//           <div
//             key={stat.name}
//             className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
//           >
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-gray-600">{stat.name}</p>
//                 <p className="text-2xl font-semibold text-gray-900 mt-2">
//                   {stat.value}
//                 </p>
//                 <p className="text-xs text-gray-500 mt-1">
//                   {stat.description}
//                 </p>
//               </div>
//               <div className={`${stat.color} p-3 rounded-lg`}>
//                 <stat.icon className="h-6 w-6 text-white" />
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* System Summary */}
//       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//         <div className="flex items-center justify-between mb-4">
//           <h2 className="text-lg font-semibold text-gray-900">Platform Overview</h2>
//           <span className="text-sm text-gray-500">Real-time data</span>
//         </div>
//         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//           <div className="text-center p-4 bg-gray-50 rounded-lg">
//             <div className="text-2xl font-bold text-gray-900">{dashboardData.totalArenas || 0}</div>
//             <div className="text-sm text-gray-600">Total Arenas</div>
//           </div>
//           <div className="text-center p-4 bg-gray-50 rounded-lg">
//             <div className="text-2xl font-bold text-green-600">{dashboardData.totalBookings || 0}</div>
//             <div className="text-sm text-gray-600">Completed Bookings</div>
//           </div>
//           <div className="text-center p-4 bg-gray-50 rounded-lg">
//             <div className="text-2xl font-bold text-blue-600">Rs {(dashboardData.totalRevenue || 0).toLocaleString()}</div>
//             <div className="text-sm text-gray-600">Total Revenue</div>
//           </div>
//           <div className="text-center p-4 bg-gray-50 rounded-lg">
//             <div className="text-2xl font-bold text-red-600">Rs {(dashboardData.pendingCommission || 0).toLocaleString()}</div>
//             <div className="text-sm text-gray-600">Pending Commission</div>
//           </div>
//         </div>
//       </div>

//       {/* Recent Bookings & Pending Commissions */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         <RecentBookings bookings={dashboardData.recentBookings} />
//         <PendingCommissions
//           commissions={dashboardData.pendingCommissions}
//           onMarkPaid={handleMarkPaid}
//         />
//       </div>

//       {/* Quick Actions */}
//       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//         <h2 className="text-lg font-semibold text-gray-900 mb-4">
//           Quick Actions
//         </h2>
//         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//           <button
//             onClick={() => window.location.href = '/admin/arenas'}
//             className="flex flex-col items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
//           >
//             <BuildingStorefrontIcon className="h-8 w-8 text-gray-600 mb-2" />
//             <span className="text-sm font-medium text-gray-900">Manage Arenas</span>
//             <span className="text-xs text-gray-500 mt-1">
//               View all arenas
//             </span>
//           </button>
//           <button
//             onClick={() => window.location.href = '/admin/financial-reports'}
//             className="flex flex-col items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
//           >
//             <CurrencyDollarIcon className="h-8 w-8 text-gray-600 mb-2" />
//             <span className="text-sm font-medium text-gray-900">
//               Financial Reports
//             </span>
//             <span className="text-xs text-gray-500 mt-1">
//               View reports
//             </span>
//           </button>
//           <button
//             onClick={() => window.location.href = '/admin/owners'}
//             className="flex flex-col items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
//           >
//             <UserGroupIcon className="h-8 w-8 text-gray-600 mb-2" />
//             <span className="text-sm font-medium text-gray-900">
//               Manage Owners
//             </span>
//             <span className="text-xs text-gray-500 mt-1">
//               View all owners
//             </span>
//           </button>
//           <button
//             onClick={() => window.location.href = '/admin/users'}
//             className="flex flex-col items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
//           >
//             <UsersIcon className="h-8 w-8 text-gray-600 mb-2" />
//             <span className="text-sm font-medium text-gray-900">
//               Manage Users
//             </span>
//             <span className="text-xs text-gray-500 mt-1">
//               View all users
//             </span>
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AdminDashboard;