import React, { useState } from 'react';

const PhotoUpload = ({
    type = 'arena',
    entityId,
    entityName,
    onUploadComplete,
    maxFiles = 20,
    accept = "image/*"
}) => {
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);

        if (selectedFiles.length > maxFiles) {
            setError(`Maximum ${maxFiles} files allowed`);
            return;
        }

        // Validate file types and sizes
        const validFiles = selectedFiles.filter(file => {
            if (!file.type.startsWith('image/')) {
                setError('Only image files are allowed');
                return false;
            }
            if (file.size > 10 * 1024 * 1024) { // 10MB
                setError(`File "${file.name}" is too large (max 10MB)`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) {
            setError('No valid files selected');
            return;
        }

        setFiles(validFiles);
        setError('');
        setSuccess('');

        // Create previews
        const newPreviews = validFiles.map(file => ({
            name: file.name,
            url: URL.createObjectURL(file),
            size: (file.size / 1024 / 1024).toFixed(2) + 'MB'
        }));
        setPreviews(newPreviews);
    };

    const handleUpload = async () => {
        if (files.length === 0) {
            setError('Please select files to upload');
            return;
        }

        setUploading(true);
        setError('');
        setSuccess('');

        const formData = new FormData();
        files.forEach(file => {
            if (type === 'arena') {
                formData.append('arena_images', file);
            } else if (type === 'court') {
                formData.append('court_images', file);
            } else if (type === 'profile') {
                formData.append('profile_picture', file);
            }
        });

        try {
            const token = localStorage.getItem('token');
            let endpoint = '';

            if (type === 'arena') {
                endpoint = `http://localhost:5000/api/owners/arenas/${entityId}/photos`;
            } else if (type === 'court') {
                endpoint = `http://localhost:5000/api/owners/courts/${entityId}/photos`;
            } else if (type === 'profile') {
                endpoint = `http://localhost:5000/api/users/profile/picture`;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Don't set Content-Type for FormData
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Upload failed');
            }

            // Clean up preview URLs
            previews.forEach(preview => URL.revokeObjectURL(preview.url));

            // Reset state
            setFiles([]);
            setPreviews([]);

            // Show success
            setSuccess(`Successfully uploaded ${data.count || 1} ${type === 'profile' ? 'profile picture' : 'photos'}`);

            // Callback
            if (onUploadComplete) {
                onUploadComplete(data);
            }

        } catch (error) {
            console.error('Upload error:', error);
            setError(error.message || 'Failed to upload files');
        } finally {
            setUploading(false);
        }
    };

    const removeFile = (index) => {
        const newFiles = [...files];
        const newPreviews = [...previews];

        URL.revokeObjectURL(newPreviews[index].url);

        newFiles.splice(index, 1);
        newPreviews.splice(index, 1);

        setFiles(newFiles);
        setPreviews(newPreviews);
    };

    const getUploadTitle = () => {
        switch (type) {
            case 'arena': return `Upload Arena Photos${entityName ? ` for ${entityName}` : ''}`;
            case 'court': return `Upload Court Photos${entityName ? ` for ${entityName}` : ''}`;
            case 'profile': return 'Upload Profile Picture';
            default: return 'Upload Photos';
        }
    };

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">{getUploadTitle()}</h3>
                <p className="text-sm text-gray-600 mt-1">
                    Upload images to showcase your {type === 'profile' ? 'profile' : type}
                </p>
            </div>

            {/* Success Message */}
            {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center">
                        <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-green-700">{success}</span>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                        <svg className="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-red-700">{error}</span>
                    </div>
                </div>
            )}

            {/* File Upload Area */}
            <div className="mb-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>

                    <div className="flex items-center justify-center text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none">
                            <span>Choose files</span>
                            <input
                                type="file"
                                multiple={type !== 'profile'}
                                accept={accept}
                                onChange={handleFileChange}
                                className="sr-only"
                            />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                        PNG, JPG, GIF, WEBP up to 10MB each
                        {type !== 'profile' && `, maximum ${maxFiles} files`}
                    </p>
                </div>
            </div>

            {/* File Previews */}
            {previews.length > 0 && (
                <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Selected Files ({previews.length})
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {previews.map((preview, index) => (
                            <div key={index} className="relative group">
                                <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                                    <img
                                        src={preview.url}
                                        alt={preview.name}
                                        className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                                    />
                                </div>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-sm"
                                        title="Remove file"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="mt-1 text-xs text-gray-500 truncate">
                                    {preview.name}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Upload Button */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                    {files.length > 0 ? (
                        <span>{files.length} file{files.length !== 1 ? 's' : ''} selected</span>
                    ) : (
                        <span>No files selected</span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading || files.length === 0}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${uploading || files.length === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow'
                        }`}
                >
                    {uploading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Uploading...
                        </>
                    ) : (
                        `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`
                    )}
                </button>
            </div>
        </div>
    );
};

export default PhotoUpload;