// // frontend/src/components/uploads/LogoUpload.jsx
// import React, { useState, useRef } from 'react';

// const LogoUpload = ({ arenaId, arenaName, onUploadComplete, onCancel }) => {
//     const [selectedFile, setSelectedFile] = useState(null);
//     const [preview, setPreview] = useState(null);
//     const [uploading, setUploading] = useState(false);
//     const [error, setError] = useState(null);
//     const fileInputRef = useRef(null);

//     const handleFileSelect = (e) => {
//         const file = e.target.files[0];
//         setError(null);

//         if (!file) return;

//         console.log("📁 File selected:", {
//             name: file.name,
//             type: file.type,
//             size: file.size,
//             lastModified: new Date(file.lastModified)
//         });

//         // Validate file type
//         const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
//         if (!validTypes.includes(file.type)) {
//             setError('Please select a valid image file (JPEG, PNG, GIF, WEBP)');
//             return;
//         }

//         // Validate file size (max 10MB)
//         if (file.size > 10 * 1024 * 1024) {
//             setError('File size must be less than 10MB');
//             return;
//         }

//         setSelectedFile(file);

//         // Create preview
//         const reader = new FileReader();
//         reader.onloadend = () => {
//             console.log("✅ Preview created");
//             setPreview(reader.result);
//         };
//         reader.onerror = () => {
//             console.error("❌ Error creating preview");
//             setError("Failed to create preview");
//         };
//         reader.readAsDataURL(file);
//     };

//     const handleUpload = async () => {
//         if (!selectedFile) {
//             setError('Please select a file first');
//             return;
//         }

//         setUploading(true);
//         setError(null);

//         try {
//             const token = localStorage.getItem('token');

//             if (!token) {
//                 throw new Error('No authentication token found. Please login again.');
//             }

//             console.log("🔑 Token exists:", token.substring(0, 20) + "...");
//             console.log("📤 Uploading logo for arena:", arenaId);
//             console.log("📤 File details:", {
//                 name: selectedFile.name,
//                 type: selectedFile.type,
//                 size: selectedFile.size
//             });

//             const formData = new FormData();
//             formData.append('arena_logo', selectedFile);

//             // Log FormData contents
//             console.log("📦 FormData entries:");
//             for (let pair of formData.entries()) {
//                 console.log("  -", pair[0], ":", pair[1] instanceof File ? `File (${pair[1].name})` : pair[1]);
//             }

//             const url = `http://localhost:5000/api/owners/arenas/${arenaId}/logo`;
//             console.log("🌐 Sending request to:", url);

//             const response = await fetch(url, {
//                 method: 'POST',
//                 headers: {
//                     'Authorization': `Bearer ${token}`
//                     // Don't set Content-Type - browser will set it with boundary for FormData
//                 },
//                 body: formData
//             });

//             console.log("📥 Response status:", response.status);
//             console.log("📥 Response headers:", Object.fromEntries([...response.headers]));

//             // Try to get response as text first for debugging
//             const responseText = await response.text();
//             console.log("📥 Raw response:", responseText);

//             let data;
//             try {
//                 data = JSON.parse(responseText);
//             } catch (e) {
//                 console.error("❌ Failed to parse JSON response:", e);
//                 throw new Error(`Server returned invalid JSON. Status: ${response.status}`);
//             }

//             if (!response.ok) {
//                 throw new Error(data.message || data.error || `Upload failed with status ${response.status}`);
//             }

//             console.log('✅ Logo uploaded successfully:', data);

//             // Call the completion callback
//             if (onUploadComplete) {
//                 onUploadComplete(data);
//             }

//             // Reset form
//             setSelectedFile(null);
//             setPreview(null);
//             if (fileInputRef.current) {
//                 fileInputRef.current.value = '';
//             }

//             alert('✅ Logo uploaded successfully!');

//         } catch (error) {
//             console.error('❌ Logo upload error:', error);
//             setError(error.message || 'Failed to upload logo. Please try again.');
//         } finally {
//             setUploading(false);
//         }
//     };

//     const handleCancel = () => {
//         setSelectedFile(null);
//         setPreview(null);
//         setError(null);
//         if (fileInputRef.current) {
//             fileInputRef.current.value = '';
//         }
//         if (onCancel) {
//             onCancel();
//         }
//     };

//     return (
//         <div className="bg-white rounded-lg border border-gray-200 p-6">
//             <h3 className="text-lg font-medium text-gray-900 mb-4">
//                 Upload Arena Logo for {arenaName || `Arena #${arenaId}`}
//             </h3>

//             {error && (
//                 <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
//                     <p className="text-sm text-red-600 font-medium">Error:</p>
//                     <p className="text-sm text-red-600">{error}</p>
//                 </div>
//             )}

//             <div className="space-y-4">
//                 {/* File input */}
//                 <div>
//                     <input
//                         type="file"
//                         ref={fileInputRef}
//                         onChange={handleFileSelect}
//                         accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
//                         className="hidden"
//                         id="logo-upload"
//                     />
//                     <label
//                         htmlFor="logo-upload"
//                         className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
//                     >
//                         <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
//                         </svg>
//                         Choose Logo File
//                     </label>
//                     <p className="mt-1 text-xs text-gray-500">
//                         Recommended: Square image, at least 400x400px. Max 10MB.
//                     </p>
//                     {selectedFile && (
//                         <p className="mt-2 text-sm text-green-600">
//                             Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
//                         </p>
//                     )}
//                 </div>

//                 {/* Preview */}
//                 {preview && (
//                     <div className="mt-4">
//                         <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
//                         <div className="border rounded-lg p-4 bg-gray-50 inline-block">
//                             <img
//                                 src={preview}
//                                 alt="Logo preview"
//                                 className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
//                             />
//                         </div>
//                     </div>
//                 )}

//                 {/* Action buttons */}
//                 <div className="flex space-x-3 pt-4">
//                     <button
//                         onClick={handleUpload}
//                         disabled={!selectedFile || uploading}
//                         className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center"
//                     >
//                         {uploading ? (
//                             <>
//                                 <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
//                                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                                 </svg>
//                                 Uploading...
//                             </>
//                         ) : (
//                             'Upload Logo'
//                         )}
//                     </button>
//                     <button
//                         onClick={handleCancel}
//                         className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
//                     >
//                         Cancel
//                     </button>
//                 </div>
//             </div>

//             <div className="mt-4 p-3 bg-blue-50 rounded-lg">
//                 <h4 className="text-xs font-bold text-blue-800 uppercase mb-1">Debug Info:</h4>
//                 <ul className="text-xs text-blue-700 space-y-1 font-mono">
//                     <li>• Arena ID: {arenaId}</li>
//                     <li>• Token present: {localStorage.getItem('token') ? '✅ Yes' : '❌ No'}</li>
//                     <li>• File selected: {selectedFile ? '✅ Yes' : '❌ No'}</li>
//                     <li>• Uploading: {uploading ? '✅' : '❌'}</li>
//                 </ul>
//             </div>
//         </div>
//     );
// };

// export default LogoUpload;