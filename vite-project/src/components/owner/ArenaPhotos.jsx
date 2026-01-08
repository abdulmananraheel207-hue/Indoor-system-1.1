import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PhotoUpload from '../uploads/PhotoUpload';
import integrationService from '../../services/integrationService';

const ArenaPhotos = () => {
    const { arenaId } = useParams();
    const navigate = useNavigate();
    const [arena, setArena] = useState(null);
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchArenaAndImages();
    }, [arenaId]);

    const fetchArenaAndImages = async () => {
        try {
            setLoading(true);

            // Get owner's arenas
            const token = localStorage.getItem('token');
            const response = await fetch(
                'http://localhost:5000/api/owners/arenas',
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                const arenasData = await response.json();
                const currentArena = arenasData.find(a => a.arena_id == arenaId);

                if (currentArena) {
                    setArena(currentArena);

                    // Get arena images
                    const imagesResponse = await fetch(
                        `http://localhost:5000/api/owners/arenas/${arenaId}/images`,
                        {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        }
                    );

                    if (imagesResponse.ok) {
                        const imagesData = await imagesResponse.json();
                        setImages(imagesData.images || []);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching arena photos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadComplete = (data) => {
        fetchArenaAndImages();
    };

    const setPrimaryImage = async (imageId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `http://localhost:5000/api/owners/arenas/${arenaId}/images/${imageId}/set-primary`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                fetchArenaAndImages();
            }
        } catch (error) {
            console.error('Error setting primary image:', error);
            alert('Failed to set primary image');
        }
    };

    const deleteImage = async (imageId) => {
        if (!window.confirm('Are you sure you want to delete this image?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `http://localhost:5000/api/owners/arenas/${arenaId}/images/${imageId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                fetchArenaAndImages();
                alert('Image deleted successfully');
            }
        } catch (error) {
            console.error('Error deleting image:', error);
            alert('Failed to delete image');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!arena) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Arena not found</h2>
                <button
                    onClick={() => navigate('/owner/dashboard')}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Manage Photos</h1>
                            <p className="text-gray-600">{arena.name}</p>
                        </div>
                        <div className="flex space-x-3">
                            <Link
                                to={`/owner/arenas/${arenaId}/courts`}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Manage Courts
                            </Link>
                            <Link
                                to="/owner/dashboard"
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            >
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Upload */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                            <PhotoUpload
                                type="arena"
                                entityId={arenaId}
                                entityName={arena.name}
                                onUploadComplete={handleUploadComplete}
                                maxFiles={20}
                            />
                        </div>

                        {/* Images Gallery */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                Gallery ({images.length} photos)
                            </h2>

                            {images.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="mt-2 text-gray-500">No photos uploaded yet</p>
                                    <p className="text-sm text-gray-400">Upload photos to showcase your arena</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {images.map((image) => (
                                        <div key={image.image_id} className="relative group">
                                            <img
                                                src={image.image_url}
                                                alt={`Arena photo ${image.image_id}`}
                                                className="w-full h-48 object-cover rounded-lg"
                                            />

                                            {/* Primary badge */}
                                            {image.is_primary && (
                                                <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded flex items-center">
                                                    <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                    Primary
                                                </div>
                                            )}

                                            {/* Actions overlay */}
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <div className="flex space-x-2">
                                                    {!image.is_primary && (
                                                        <button
                                                            onClick={() => setPrimaryImage(image.image_id)}
                                                            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-sm"
                                                            title="Set as primary"
                                                        >
                                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteImage(image.image_id)}
                                                        className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-sm"
                                                        title="Delete image"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                    <a
                                                        href={image.image_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-gray-800 text-white rounded-full hover:bg-gray-900 shadow-sm"
                                                        title="View full size"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Info */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Photo Guidelines</h3>

                            <div className="space-y-4">
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <h4 className="font-medium text-blue-900 mb-1">Best Practices</h4>
                                    <ul className="text-sm text-blue-700 space-y-1">
                                        <li>• Upload high-quality, well-lit photos</li>
                                        <li>• Showcase different areas of your arena</li>
                                        <li>• Include photos of courts, amenities, parking</li>
                                        <li>• Set your best photo as primary</li>
                                    </ul>
                                </div>

                                <div className="p-3 bg-yellow-50 rounded-lg">
                                    <h4 className="font-medium text-yellow-900 mb-1">Requirements</h4>
                                    <ul className="text-sm text-yellow-700 space-y-1">
                                        <li>• Maximum 20 photos per arena</li>
                                        <li>• Maximum file size: 10MB</li>
                                        <li>• Supported formats: JPG, PNG, GIF, WEBP</li>
                                    </ul>
                                </div>

                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <h4 className="font-medium text-gray-900 mb-1">Tips</h4>
                                    <ul className="text-sm text-gray-700 space-y-1">
                                        <li>• Primary photo is shown first to users</li>
                                        <li>• Upload photos of each court</li>
                                        <li>• Show locker rooms, showers, seating areas</li>
                                        <li>• Update photos seasonally</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h4 className="font-medium text-gray-900 mb-3">Photo Stats</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-primary-600">{images.length}</div>
                                        <div className="text-sm text-gray-600">Total Photos</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">
                                            {images.filter(img => img.is_primary).length}
                                        </div>
                                        <div className="text-sm text-gray-600">Primary Photos</div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => document.querySelector('input[type="file"]')?.click()}
                                        className="w-full py-2.5 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                                    >
                                        Add More Photos
                                    </button>
                                    <Link
                                        to={`/owner/arenas/${arenaId}/courts/photos`}
                                        className="block w-full py-2.5 px-4 text-center border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                                    >
                                        Upload Court Photos
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ArenaPhotos;