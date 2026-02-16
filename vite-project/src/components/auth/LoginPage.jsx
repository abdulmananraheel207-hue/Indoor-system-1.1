// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { ShieldCheckIcon, UserIcon, BuildingOfficeIcon, EyeIcon } from '@heroicons/react/24/outline';
// import integrationService from '../../services/integrationService';

// const LoginPage = () => {
//     const [email, setEmail] = useState('');
//     const [password, setPassword] = useState('');
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState('');
//     const [userType, setUserType] = useState('user'); // 'user', 'owner', 'admin'
//     const [showPassword, setShowPassword] = useState(false);
//     const [blockedInfo, setBlockedInfo] = useState(null);
//     const navigate = useNavigate();

//     const handleLogin = async (e) => {
//         e.preventDefault();

//         // Basic validation
//         if (!email || !password) {
//             setError('Please fill in all fields');
//             return;
//         }

//         if (password.length < 6) {
//             setError('Password must be at least 6 characters');
//             return;
//         }

//         setLoading(true);
//         setError('');
//         setBlockedInfo(null);

//         try {
//             // Sanitize inputs
//             const sanitizedEmail = email.trim().toLowerCase();
//             const sanitizedPassword = password.trim();

//             // Different handling for admin - USING EXISTING integrationService
//             if (userType === 'admin') {
//                 try {
//                     // Use the existing adminLogin method from integrationService
//                     const result = await integrationService.adminLogin({
//                         username: sanitizedEmail,
//                         password: sanitizedPassword
//                     });

//                     if (result.success && result.token) {
//                         // The integrationService already handles storage
//                         navigate('/super-admin');
//                     } else {
//                         setError(result.message || 'Admin login failed');
//                     }
//                 } catch (err) {
//                     console.error('Admin login error:', err);
//                     setError(err.message || 'Admin login failed. Please check your credentials.');
//                 }
//                 return;
//             }

//             // For user and owner login
//             const response = await fetch('http://localhost:5000/api/auth/login', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({
//                     email: sanitizedEmail,
//                     password: sanitizedPassword,
//                     userType: userType
//                 }),
//             });

//             const data = await response.json();

//             // Check for blocked account
//             if (response.status === 403 && data.message === 'ACCOUNT_BLOCKED') {
//                 setBlockedInfo(data.details);
//                 setLoading(false);
//                 return;
//             }

//             if (response.ok && data.token) {
//                 // Clear any existing data
//                 localStorage.clear();
//                 sessionStorage.clear();

//                 // Store token with expiration
//                 const tokenData = {
//                     token: data.token,
//                     expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
//                 };

//                 localStorage.setItem('authToken', JSON.stringify(tokenData));
//                 localStorage.setItem('userRole', userType);

//                 // Store minimal user data
//                 const userData = data.user || data.owner || data.manager;
//                 if (userData) {
//                     const safeUserData = {
//                         id: userData.id || userData.user_id || userData.owner_id,
//                         name: userData.name || userData.owner_name || userData.arena_name,
//                         email: userData.email,
//                         role: userType
//                     };
//                     localStorage.setItem('userData', JSON.stringify(safeUserData));
//                 }

//                 // Redirect based on user type
//                 if (userType === 'user') {
//                     navigate('/user/dashboard');
//                 } else if (userType === 'owner') {
//                     navigate('/owner/dashboard');
//                 }
//             } else {
//                 setError(data.message || 'Invalid credentials');
//             }
//         } catch (err) {
//             console.error('Login error:', err);
//             setError('Connection error. Please check your network and try again.');
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleGuestAccess = () => {
//         // Clear any existing data
//         localStorage.clear();
//         sessionStorage.clear();

//         // Set guest session with expiration
//         const guestSession = {
//             token: 'guest-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
//             expiresAt: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
//         };

//         localStorage.setItem('authToken', JSON.stringify(guestSession));
//         localStorage.setItem('userRole', 'guest');
//         localStorage.setItem('isGuest', 'true');

//         navigate('/user/dashboard');
//     };

//     // Blocked account message
//     if (blockedInfo) {
//         return (
//             <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
//                 <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
//                     <div className="text-center">
//                         <div className="mx-auto h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
//                             <ShieldCheckIcon className="h-10 w-10 text-red-600" />
//                         </div>
//                         <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Blocked</h2>
//                         <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left">
//                             <p className="text-red-800 font-medium mb-2">Reason:</p>
//                             <p className="text-red-700 text-sm">{blockedInfo.reason}</p>
//                             <p className="text-red-800 font-medium mt-3 mb-1">Blocked on:</p>
//                             <p className="text-red-700 text-sm">{blockedInfo.blocked_date}</p>
//                         </div>
//                         <div className="border-t border-gray-200 pt-4 mt-4">
//                             <p className="text-gray-700 font-medium mb-3">Contact support:</p>
//                             <div className="space-y-2 text-sm">
//                                 <p className="text-gray-600">📧 {blockedInfo.support_email || 'support@arenafinder.com'}</p>
//                                 <p className="text-gray-600">📞 {blockedInfo.support_phone || '+92 300 1234567'}</p>
//                             </div>
//                             <button
//                                 onClick={() => {
//                                     setBlockedInfo(null);
//                                     setEmail('');
//                                     setPassword('');
//                                 }}
//                                 className="mt-6 w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
//                             >
//                                 Try Again
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
//             <div className="w-full max-w-6xl mx-auto">
//                 <div className="grid lg:grid-cols-2 gap-8 items-center">

//                     {/* Left Side - Hero Section */}
//                     <div className="hidden lg:block space-y-8">
//                         <div className="space-y-4">
//                             <h1 className="text-5xl font-bold text-gray-900 leading-tight">
//                                 Welcome to{' '}
//                                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
//                                     ArenaFinder
//                                 </span>
//                             </h1>
//                             <p className="text-xl text-gray-600">
//                                 Your premier destination for sports arena bookings and management
//                             </p>
//                         </div>

//                         <div className="grid grid-cols-2 gap-4">
//                             <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-200">
//                                 <div className="text-3xl mb-2">🏸</div>
//                                 <h3 className="font-semibold text-gray-900">Badminton</h3>
//                                 <p className="text-sm text-gray-600">Book courts instantly</p>
//                             </div>
//                             <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-200">
//                                 <div className="text-3xl mb-2">🎾</div>
//                                 <h3 className="font-semibold text-gray-900">Tennis</h3>
//                                 <p className="text-sm text-gray-600">Find partners</p>
//                             </div>
//                             <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-200">
//                                 <div className="text-3xl mb-2">⚽</div>
//                                 <h3 className="font-semibold text-gray-900">Football</h3>
//                                 <p className="text-sm text-gray-600">Join tournaments</p>
//                             </div>
//                             <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-200">
//                                 <div className="text-3xl mb-2">🏊</div>
//                                 <h3 className="font-semibold text-gray-900">Swimming</h3>
//                                 <p className="text-sm text-gray-600">Pool booking</p>
//                             </div>
//                         </div>

//                         <div className="flex items-center space-x-4 text-sm text-gray-500">
//                             <div className="flex items-center">
//                                 <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
//                                 500+ Arenas
//                             </div>
//                             <div className="flex items-center">
//                                 <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
//                                 10K+ Users
//                             </div>
//                             <div className="flex items-center">
//                                 <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
//                                 24/7 Support
//                             </div>
//                         </div>
//                     </div>

//                     {/* Right Side - Login Form */}
//                     <div className="w-full max-w-md mx-auto lg:mx-0">
//                         <div className="bg-white rounded-2xl shadow-2xl p-8">
//                             <div className="text-center mb-8">
//                                 <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
//                                     <ShieldCheckIcon className="h-8 w-8 text-white" />
//                                 </div>
//                                 <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
//                                 <p className="text-sm text-gray-600 mt-1">Access your account securely</p>
//                             </div>

//                             {/* User Type Selection */}
//                             <div className="grid grid-cols-3 gap-2 mb-6">
//                                 <button
//                                     type="button"
//                                     onClick={() => setUserType('user')}
//                                     className={`flex flex-col items-center p-3 rounded-xl transition-all ${userType === 'user'
//                                             ? 'bg-blue-50 border-2 border-blue-500'
//                                             : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
//                                         }`}
//                                 >
//                                     <UserIcon className={`h-6 w-6 ${userType === 'user' ? 'text-blue-600' : 'text-gray-600'}`} />
//                                     <span className={`text-xs font-medium mt-1 ${userType === 'user' ? 'text-blue-600' : 'text-gray-600'}`}>
//                                         Player
//                                     </span>
//                                 </button>

//                                 <button
//                                     type="button"
//                                     onClick={() => setUserType('owner')}
//                                     className={`flex flex-col items-center p-3 rounded-xl transition-all ${userType === 'owner'
//                                             ? 'bg-green-50 border-2 border-green-500'
//                                             : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
//                                         }`}
//                                 >
//                                     <BuildingOfficeIcon className={`h-6 w-6 ${userType === 'owner' ? 'text-green-600' : 'text-gray-600'}`} />
//                                     <span className={`text-xs font-medium mt-1 ${userType === 'owner' ? 'text-green-600' : 'text-gray-600'}`}>
//                                         Owner
//                                     </span>
//                                 </button>

//                                 <button
//                                     type="button"
//                                     onClick={() => setUserType('admin')}
//                                     className={`flex flex-col items-center p-3 rounded-xl transition-all ${userType === 'admin'
//                                             ? 'bg-purple-50 border-2 border-purple-500'
//                                             : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
//                                         }`}
//                                 >
//                                     <ShieldCheckIcon className={`h-6 w-6 ${userType === 'admin' ? 'text-purple-600' : 'text-gray-600'}`} />
//                                     <span className={`text-xs font-medium mt-1 ${userType === 'admin' ? 'text-purple-600' : 'text-gray-600'}`}>
//                                         Admin
//                                     </span>
//                                 </button>
//                             </div>

//                             {error && (
//                                 <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
//                                     <p className="text-sm text-red-600">{error}</p>
//                                 </div>
//                             )}

//                             <form onSubmit={handleLogin} className="space-y-6">
//                                 <div>
//                                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                                         {userType === 'admin' ? 'Username' : 'Email Address'}
//                                     </label>
//                                     <input
//                                         type={userType === 'admin' ? 'text' : 'email'}
//                                         value={email}
//                                         onChange={(e) => setEmail(e.target.value)}
//                                         required
//                                         className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
//                                         placeholder={userType === 'admin' ? 'Enter username' : 'Enter your email'}
//                                         autoComplete={userType === 'admin' ? 'username' : 'email'}
//                                     />
//                                 </div>

//                                 <div>
//                                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                                         Password
//                                     </label>
//                                     <div className="relative">
//                                         <input
//                                             type={showPassword ? 'text' : 'password'}
//                                             value={password}
//                                             onChange={(e) => setPassword(e.target.value)}
//                                             required
//                                             minLength="6"
//                                             className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-12"
//                                             placeholder="Enter your password"
//                                             autoComplete="current-password"
//                                         />
//                                         <button
//                                             type="button"
//                                             onClick={() => setShowPassword(!showPassword)}
//                                             className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
//                                         >
//                                             {showPassword ? '👁️' : '👁️‍🗨️'}
//                                         </button>
//                                     </div>
//                                 </div>

//                                 <button
//                                     type="submit"
//                                     disabled={loading}
//                                     className={`w-full py-3 px-4 bg-gradient-to-r ${userType === 'user'
//                                             ? 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
//                                             : userType === 'owner'
//                                                 ? 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
//                                                 : 'from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
//                                         } text-white font-medium rounded-xl transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
//                                 >
//                                     {loading ? (
//                                         <div className="flex items-center justify-center">
//                                             <svg className="animate-spin h-5 w-5 mr-2 text-white" fill="none" viewBox="0 0 24 24">
//                                                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                                                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
//                                             </svg>
//                                             Signing in...
//                                         </div>
//                                     ) : (
//                                         `Sign In as ${userType === 'user' ? 'Player' : userType === 'owner' ? 'Arena Owner' : 'Admin'}`
//                                     )}
//                                 </button>
//                             </form>

//                             {/* Registration Options */}
//                             <div className="mt-8 pt-6 border-t border-gray-200">
//                                 <p className="text-center text-sm text-gray-600 mb-4">New to ArenaFinder?</p>

//                                 <div className="space-y-3">
//                                     <button
//                                         onClick={() => navigate('/owner/register')}
//                                         className="w-full flex items-center justify-center px-4 py-3 border-2 border-green-500 text-green-600 rounded-xl hover:bg-green-50 transition font-medium text-sm"
//                                     >
//                                         <BuildingOfficeIcon className="h-5 w-5 mr-2" />
//                                         Register as Arena Owner
//                                     </button>

//                                     <button
//                                         onClick={handleGuestAccess}
//                                         className="w-full flex items-center justify-center px-4 py-3 border-2 border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
//                                     >
//                                         <EyeIcon className="h-5 w-5 mr-2" />
//                                         Continue as Guest
//                                     </button>
//                                 </div>
//                             </div>

//                             <div className="mt-6 text-center text-xs text-gray-500">
//                                 By signing in, you agree to our{' '}
//                                 <a href="#" className="text-blue-600 hover:text-blue-800">Terms</a>
//                                 {' '}and{' '}
//                                 <a href="#" className="text-blue-600 hover:text-blue-800">Privacy Policy</a>
//                             </div>
//                         </div>

//                         <div className="mt-4 text-center text-sm text-gray-500">
//                             © {new Date().getFullYear()} ArenaFinder. All rights reserved.
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default LoginPage;