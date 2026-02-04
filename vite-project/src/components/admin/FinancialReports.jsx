// // File: src/components/admin/FinancialReports.jsx
// import React, { useState, useEffect } from 'react';
// import {
//     ChartBarIcon,
//     CurrencyDollarIcon,
//     CalendarIcon,
//     DocumentArrowDownIcon,
//     ArrowTrendingUpIcon,
//     ArrowTrendingDownIcon,
//     BuildingStorefrontIcon
// } from '@heroicons/react/24/outline';
// import integrationService from '../../services/integrationService';

// const FinancialReports = () => {
//     const [reports, setReports] = useState({
//         daily_reports: [],
//         arena_commission_report: [],
//         summary: {
//             total_days: 0,
//             total_bookings: 0,
//             total_revenue: 0,
//             total_commission: 0,
//             total_pending_commission: 0
//         }
//     });
//     const [loading, setLoading] = useState(true);
//     const [dateRange, setDateRange] = useState({
//         start_date: new Date().toISOString().split('T')[0],
//         end_date: new Date().toISOString().split('T')[0]
//     });

//     useEffect(() => {
//         loadFinancialReports();
//     }, [dateRange]);

//     const loadFinancialReports = async () => {
//         try {
//             const data = await integrationService.getFinancialReports(dateRange);
//             setReports(data);
//         } catch (error) {
//             console.error("Failed to load financial reports", error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const exportToCSV = () => {
//         // Implement CSV export logic
//         alert('Export feature coming soon!');
//     };

//     const getTrendIcon = (current, previous) => {
//         if (current > previous) {
//             return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
//         } else if (current < previous) {
//             return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
//         }
//         return null;
//     };

//     if (loading) {
//         return (
//             <div className="flex justify-center items-center h-96">
//                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
//             </div>
//         );
//     }

//     return (
//         <div className="space-y-6">
//             {/* Header */}
//             <div className="flex items-center justify-between">
//                 <div>
//                     <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
//                     <p className="text-gray-600">Detailed financial analytics and commission tracking</p>
//                 </div>
//                 <button
//                     onClick={exportToCSV}
//                     className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
//                 >
//                     <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
//                     Export Report
//                 </button>
//             </div>

//             {/* Date Range Filter */}
//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-2">
//                             Start Date
//                         </label>
//                         <input
//                             type="date"
//                             value={dateRange.start_date}
//                             onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
//                             className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
//                         />
//                     </div>
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-2">
//                             End Date
//                         </label>
//                         <input
//                             type="date"
//                             value={dateRange.end_date}
//                             onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
//                             className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
//                         />
//                     </div>
//                     <div className="flex items-end">
//                         <button
//                             onClick={loadFinancialReports}
//                             className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
//                         >
//                             Apply Filter
//                         </button>
//                     </div>
//                 </div>
//             </div>

//             {/* Summary Stats */}
//             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                 <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//                     <div className="flex items-center">
//                         <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center mr-4">
//                             <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
//                         </div>
//                         <div>
//                             <p className="text-sm text-gray-600">Total Revenue</p>
//                             <p className="text-2xl font-semibold text-gray-900">
//                                 Rs {reports.summary.total_revenue.toLocaleString()}
//                             </p>
//                         </div>
//                     </div>
//                 </div>
//                 <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//                     <div className="flex items-center">
//                         <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center mr-4">
//                             <ChartBarIcon className="h-6 w-6 text-green-600" />
//                         </div>
//                         <div>
//                             <p className="text-sm text-gray-600">Platform Commission</p>
//                             <p className="text-2xl font-semibold text-gray-900">
//                                 Rs {reports.summary.total_commission.toLocaleString()}
//                             </p>
//                         </div>
//                     </div>
//                 </div>
//                 <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//                     <div className="flex items-center">
//                         <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center mr-4">
//                             <BuildingStorefrontIcon className="h-6 w-6 text-orange-600" />
//                         </div>
//                         <div>
//                             <p className="text-sm text-gray-600">Pending Commission</p>
//                             <p className="text-2xl font-semibold text-gray-900">
//                                 Rs {reports.summary.total_pending_commission.toLocaleString()}
//                             </p>
//                         </div>
//                     </div>
//                 </div>
//                 <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//                     <div className="flex items-center">
//                         <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center mr-4">
//                             <CalendarIcon className="h-6 w-6 text-purple-600" />
//                         </div>
//                         <div>
//                             <p className="text-sm text-gray-600">Total Bookings</p>
//                             <p className="text-2xl font-semibold text-gray-900">
//                                 {reports.summary.total_bookings}
//                             </p>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Daily Revenue Chart */}
//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//                 <div className="flex items-center justify-between mb-6">
//                     <h2 className="text-lg font-semibold text-gray-900">Daily Revenue Trend</h2>
//                     <span className="text-sm text-gray-500">
//                         {reports.summary.total_days} days shown
//                     </span>
//                 </div>
//                 <div className="h-64 flex items-center justify-center">
//                     <div className="text-center">
//                         <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
//                         <p className="text-gray-500">Revenue chart will appear here</p>
//                     </div>
//                 </div>
//             </div>

//             {/* Arena Commission Report */}
//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
//                 <div className="px-6 py-4 border-b border-gray-200">
//                     <h2 className="text-lg font-semibold text-gray-900">Arena-wise Commission Report</h2>
//                 </div>
//                 <div className="overflow-x-auto">
//                     <table className="min-w-full divide-y divide-gray-200">
//                         <thead className="bg-gray-50">
//                             <tr>
//                                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                     Arena
//                                 </th>
//                                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                     Owner
//                                 </th>
//                                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                     Pending Commission
//                                 </th>
//                                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                     Total Bookings
//                                 </th>
//                                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                     Last Payment
//                                 </th>
//                             </tr>
//                         </thead>
//                         <tbody className="bg-white divide-y divide-gray-200">
//                             {reports.arena_commission_report.map((arena) => (
//                                 <tr key={arena.arena_id} className="hover:bg-gray-50">
//                                     <td className="px-6 py-4">
//                                         <div className="text-sm font-medium text-gray-900">
//                                             {arena.arena_name}
//                                         </div>
//                                     </td>
//                                     <td className="px-6 py-4">
//                                         <div className="text-sm text-gray-900">{arena.owner_name}</div>
//                                     </td>
//                                     <td className="px-6 py-4">
//                                         <div className="text-sm font-semibold text-red-600">
//                                             Rs {Number(arena.pending_commission || 0).toLocaleString()}
//                                         </div>
//                                     </td>
//                                     <td className="px-6 py-4">
//                                         <div className="text-sm text-gray-900">
//                                             {arena.total_bookings || 0}
//                                         </div>
//                                     </td>
//                                     <td className="px-6 py-4">
//                                         <div className="text-sm text-gray-500">
//                                             {arena.last_payment_date
//                                                 ? new Date(arena.last_payment_date).toLocaleDateString()
//                                                 : 'No payments yet'}
//                                         </div>
//                                     </td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default FinancialReports;