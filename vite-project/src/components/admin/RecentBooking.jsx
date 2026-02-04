// // components/admin/RecentBooking.jsx
// import React from 'react';
// import { ClockIcon, CheckCircleIcon, XCircleIcon, CurrencyDollarIcon, UserIcon } from '@heroicons/react/24/outline';

// const RecentBookings = ({ bookings }) => {
//     const getStatusIcon = (status) => {
//         switch (status?.toLowerCase()) {
//             case 'completed':
//                 return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
//             case 'pending':
//                 return <ClockIcon className="h-4 w-4 text-yellow-500" />;
//             case 'cancelled':
//                 return <XCircleIcon className="h-4 w-4 text-red-500" />;
//             default:
//                 return <ClockIcon className="h-4 w-4 text-gray-500" />;
//         }
//     };

//     const getStatusColor = (status) => {
//         switch (status?.toLowerCase()) {
//             case 'completed':
//                 return 'bg-green-100 text-green-800';
//             case 'accepted':
//                 return 'bg-blue-100 text-blue-800';
//             case 'pending':
//                 return 'bg-yellow-100 text-yellow-800';
//             case 'cancelled':
//                 return 'bg-red-100 text-red-800';
//             default:
//                 return 'bg-gray-100 text-gray-800';
//         }
//     };

//     if (!bookings || bookings.length === 0) {
//         return (
//             <div className="bg-white rounded-xl shadow-sm border border-gray-200">
//                 <div className="px-6 py-4 border-b border-gray-200">
//                     <div className="flex items-center justify-between">
//                         <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
//                         <span className="text-sm text-gray-500">No recent bookings</span>
//                     </div>
//                 </div>
//                 <div className="p-8 text-center">
//                     <div className="mx-auto h-12 w-12 text-gray-300 mb-3">
//                         <ClockIcon className="h-12 w-12" />
//                     </div>
//                     <h3 className="text-sm font-medium text-gray-900">No recent bookings</h3>
//                     <p className="text-sm text-gray-500 mt-1">Bookings will appear here as they are made</p>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="bg-white rounded-xl shadow-sm border border-gray-200">
//             <div className="px-6 py-4 border-b border-gray-200">
//                 <div className="flex items-center justify-between">
//                     <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
//                     <span className="text-sm text-primary-600 hover:text-primary-500 cursor-pointer">
//                         View All
//                     </span>
//                 </div>
//             </div>
//             <div className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
//                 {bookings.map((booking) => (
//                     <div key={booking.booking_id || booking.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
//                         <div className="flex items-start justify-between">
//                             <div className="flex-1">
//                                 <div className="flex items-center space-x-2 mb-2">
//                                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
//                                         {getStatusIcon(booking.status)}
//                                         <span className="ml-1">{booking.status || 'Unknown'}</span>
//                                     </span>
//                                     <span className="text-sm font-medium text-gray-900">
//                                         #{booking.booking_id || booking.id}
//                                     </span>
//                                 </div>

//                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
//                                     <div className="space-y-1">
//                                         <div className="flex items-center text-sm text-gray-900">
//                                             <UserIcon className="h-4 w-4 mr-1 flex-shrink-0" />
//                                             <span className="truncate">{booking.user_name || 'Unknown User'}</span>
//                                         </div>
//                                         <div className="text-sm text-gray-600">
//                                             {booking.arena_name || 'Unknown Arena'}
//                                         </div>
//                                     </div>

//                                     <div className="space-y-1">
//                                         <div className="flex items-center text-sm text-gray-900">
//                                             <CurrencyDollarIcon className="h-4 w-4 mr-1 flex-shrink-0" />
//                                             <span>Rs {booking.total_amount?.toLocaleString() || '0'}</span>
//                                         </div>
//                                         <div className="text-sm text-gray-600">
//                                             {booking.sport_name || 'Unknown Sport'}
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="text-right ml-4 flex-shrink-0">
//                                 <div className="text-sm text-gray-500">
//                                     {booking.booking_date
//                                         ? new Date(booking.booking_date).toLocaleDateString()
//                                         : 'No date'}
//                                 </div>
//                                 <div className="text-xs text-gray-400 mt-1">
//                                     {booking.booking_date
//                                         ? new Date(booking.booking_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
//                                         : ''}
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// };

// export default RecentBookings;